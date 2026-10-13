import { useMemo, useState } from "react"
import { useLocale } from "@/hooks/useLocale"
import { useConfig } from "@/hooks/useConfig"
import {
  bumpRequestCount,
  useAuthorizationData,
  useIsAppAdmin,
  UNKNOWN,
} from "@/hooks/useAuthorizations"
import {
  approveRequest,
  createAuthorization,
  deleteAuthorization,
  deleteRequest,
  DV_DUPLICATE_UPN,
  setAuthorizationAdmin,
  setRequestAdminNote,
  setRequestCompleted,
  updateAuthorizedApps,
  updateAuthorizationUpn,
} from "@/lib/authorizations"
import { DV_FORBIDDEN, DV_SESSION_EXPIRED } from "@/lib/dataverse"
import { isMsalConfigured, msalInstance } from "@/lib/msal"

/**
 * Katalogdaki bütün app adları — asistanlar, AI uygulamaları ve iş
 * uygulamaları birlikte. `all*` kullanılıyor, süzülmüş liste değil: bir app
 * launcher'da geçici olarak kapalı olabilir ve yetkisi yine de anlamlıdır;
 * süzülmüş listeyle çalışmak onu seçilemez yapardı.
 */
function useCatalogAppNames() {
  const { allAgents, allAiApps, allBusinessApps } = useConfig()
  return useMemo(() => {
    const names = []
    for (const list of [allAgents, allAiApps, allBusinessApps]) {
      for (const item of list ?? []) {
        const n = (item?.name ?? "").trim()
        if (n) names.push(n)
      }
    }
    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b))
  }, [allAgents, allAiApps, allBusinessApps])
}

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  YETKİ YÖNETİMİ — veri, kapı ve eylemler TEK kancada
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ⚠️ **İKİ PANEL AMA TEK KANCA.** "Kullanıcı yetkileri" ile "Yetki
 * talepleri" artık `/security` sayfasında AYRI sekmeler. Her panel kendi
 * `useAuthorizationData`sını çağırsaydı sekme değiştirmek iki ayrı çekim
 * ve iki ayrı "Yenile" düğmesi demekti — üstelik onaylamak talebi de yetki
 * listesini de değiştiriyor, yani ikisi zaten tek tazelemeye bağlı.
 * Kanca sayfada BİR KEZ çağrılır, paneller `ctx` olarak alır.
 */
export function useAuthorizationsAdmin() {
  const { t } = useLocale()
  const isAdmin = useIsAppAdmin()
  const allowed = isAdmin === true
  const { status, authorizations, requests, error, fetchedAt, reload } =
    useAuthorizationData(allowed)

  const catalog = useCatalogAppNames()
  const known = useMemo(() => new Set(catalog), [catalog])

  // Düzenlenen satır ve o satırın taslak seçimi. TEK state: hangi satırın
  // düzenlendiği ile taslağı ayrı tutmak, satır değişince bir render boyunca
  // öncekinin seçimini göstermek demekti.
  const [draft, setDraft] = useState({ id: null, apps: [] })
  const [busyId, setBusyId] = useState(null)
  const [writeError, setWriteError] = useState(null)
  // Silme geri alinamaz: onaydan geciyor. Onaylamak gecmiyor - yanlis
  // onaylanan bir talebin karsiligi zaten "Geri al" ve app'i listeden
  // cikarmak, yani kaybolan bir sey yok.
  const [confirmDelete, setConfirmDelete] = useState(null)
  // Yönetici notu düzenlenen talep + taslak metin. App listesindeki
  // `draft` ile aynı gerekçe: hangi satır ve ne yazıldığı tek state.
  const [noteDraft, setNoteDraft] = useState({ id: null, text: "" })
  // Yeni satır kutusu. `null` = kapalı. Açıkken taşıdığı şey bir TASLAK,
  // satır değil: hiçbir şey yazılmadan kapatılabilir.
  const [newRow, setNewRow] = useState(null)
  // Silme onayı ve kimlik (UPN) düzenleme onayı — ikisi de geri alınamaz
  // sonuçlar, ikisi de ayrı kutudan geçiyor.
  const [confirmDeleteAuth, setConfirmDeleteAuth] = useState(null)
  const [upnDraft, setUpnDraft] = useState({ id: null, text: "" })

  // Kendi satırını tanımak için oturumun GİRİŞ adresi (UPN) — tablodaki
  // değerle aynı cinsten. Karşılaştırma küçük harfe indirilerek yapılır:
  // Entra aynı adresi farklı harflerle döndürebiliyor.
  const myUpn = (
    (isMsalConfigured ? (msalInstance.getActiveAccount()?.username ?? "") : "") || ""
  ).toLowerCase()

  async function run(id, fn) {
    setBusyId(id)
    setWriteError(null)
    try {
      await fn()
      await reload()
      // Sidebar'daki bekleyen-talep rozeti bu ekranın DIŞINDA yaşıyor ve
      // kendi sorgusunu bir kez atıyor. Onaylamak/silmek sayıyı
      // değiştiriyor; haber vermezsek rozet sayfa yenilenene kadar eski
      // sayıyı gösterirdi — yani "2 bekliyor" deyip listede 0 gösterirdi.
      bumpRequestCount()
    } catch (err) {
      setWriteError(err)
    } finally {
      setBusyId(null)
    }
  }

  const saveApps = (row) =>
    run(row.id, async () => {
      await updateAuthorizedApps(row.id, draft.apps)
      setDraft({ id: null, apps: [] })
    })

  const toggleAdmin = (row) => run(row.id, () => setAuthorizationAdmin(row.id, !row.isAdmin))

  const toggleCompleted = (row) => run(row.id, () => setRequestCompleted(row.id, !row.isCompleted))

  const approve = (row) =>
    run(row.id, () => approveRequest({ upn: row.upn, app: row.app, requestId: row.id }))

  const removeRequest = (row) =>
    run(row.id, async () => {
      await deleteRequest(row.id)
      setConfirmDelete(null)
    })

  /**
   * ⚠️ **KENDİ SATIRINI SİLEMEZSİN** — yöneticiliğini kaldıramama kuralının
   * aynısı ve aynı gerekçeyle: satır gidince `tyro_isadmin` de gider, yani
   * tek tıkla bu sayfaya bir daha giremezsin ve geri almak maker portal
   * gerektirir. Başkasınınki silinebildiği için kural kimseyi kilitlemiyor.
   * Kapı ARAYÜZDE, veri katmanında değil — `deleteAuthorization` oturumdan
   * habersiz ve öyle kalmalı.
   */
  const isSelf = (row) => row.upn.trim().toLowerCase() === myUpn
  const canDelete = (row) => !isSelf(row)

  /**
   * ⚠️ **KENDİ GİRİŞ ADRESİNİ DEĞİŞTİREMEZSİN.** Silme ve yöneticilik
   * kurallarıyla aynı kapı ve aynı gerekçe — hatta daha keskini: adres
   * kaydın KİMİN olduğunu belirliyor, yani kendi satırının adresini
   * değiştirmek satırı bir başkasına vermek demek. Tek tıkla hem
   * yöneticiliğini hem app'lerini kaybeder, bu sayfaya bir daha giremez ve
   * geri almak maker portal gerektirirdi. Başkasınınki düzenlenebildiği
   * için kural kimseyi kilitlemiyor.
   */
  const canEditUpn = (row) => !isSelf(row)

  const removeAuthorization = (row) => {
    if (!canDelete(row)) return Promise.resolve()
    return run(row.id, async () => {
      await deleteAuthorization(row.id)
      setConfirmDeleteAuth(null)
    })
  }

  const saveNewRow = () =>
    // id YOK: `run`ın meşgul göstergesi satır kimliğine bakıyor, yeni satırın
    // henüz kimliği yok. Sabit bir anahtar veriliyor ki kutu da kilitlensin.
    run("new", async () => {
      await createAuthorization({
        upn: newRow.upn,
        apps: newRow.apps,
        isAdmin: newRow.isAdmin,
      })
      setNewRow(null)
    })

  const saveUpn = (row) => {
    if (!canEditUpn(row)) return Promise.resolve()
    return run(row.id, async () => {
      await updateAuthorizationUpn(row.id, upnDraft.text)
      setUpnDraft({ id: null, text: "" })
    })
  }

  const saveAdminNote = (row) =>
    run(row.id, async () => {
      await setRequestAdminNote(row.id, noteDraft.text)
      setNoteDraft({ id: null, text: "" })
    })

  // Hata KODU ne yapılacağını seçer: oturum kullanıcının kendi elinde,
  // yetki yöneticide, gerisi "tekrar dene". Ham mesaj teşhis için açılır
  // bir blokta durur — son kullanıcıya okutulacak bir cümle değil.
  // ⚠️ İKİ HATA AYRI TUTULUR. `error` listenin YÜKLENEMEMESİ, `writeError`
  // bir YAZMA denemesinin düşmesi. Kutu (yeni kayıt) yalnız ikincisini
  // göstermeli: liste hatasını modalın içine basmak, "kaydım bu yüzden mi
  // olmadı" diye düşündürürdü — oysa o hata kaydetmeden önce de oradaydı.
  const shownError = writeError ?? error
  const errorKey =
    shownError?.code === DV_SESSION_EXPIRED
      ? "authz.error.session"
      : shownError?.code === DV_FORBIDDEN
        ? "authz.error.forbidden"
        : // Tekillik ihlali bir ARIZA değil, bir BİLGİ: o kişinin satırı
          // zaten var. Genel hata metni ("tekrar dener misin") burada
          // yanlış yönlendirirdi — tekrar denemek aynı sonucu verir.
          shownError?.code === DV_DUPLICATE_UPN
          ? "authz.error.duplicate"
          : "authz.error.generic"

  const gateKey =
    isAdmin === undefined
      ? "authz.gate.pending"
      : isAdmin === UNKNOWN
        ? "authz.gate.unknown"
        : "authz.gate.denied"
  // Sayfa kapısı bu iki durumu ayırt edebilsin diye HAM hâli de dışarı
  // veriliyor: "henüz çözülmedi" ile "soramadık" ile "hayır" üç ayrı şey
  // ve üçüne aynı cümleyi yazmak, ikisinde yalan söylemek olur.
  const gateState =
    isAdmin === undefined
      ? "pending"
      : isAdmin === UNKNOWN
        ? "unknown"
        : isAdmin === true
          ? "yes"
          : "no"

  return {
    t,
    allowed,
    gateKey,
    gateState,
    status,
    authorizations,
    requests,
    error: shownError,
    errorKey,
    writeError,
    writeErrorKey:
      writeError?.code === DV_DUPLICATE_UPN
        ? "authz.error.duplicate"
        : writeError?.code === DV_SESSION_EXPIRED
          ? "authz.error.session"
          : writeError?.code === DV_FORBIDDEN
            ? "authz.error.forbidden"
            : "authz.error.generic",
    fetchedAt,
    reload,
    catalog,
    known,
    draft,
    setDraft,
    noteDraft,
    setNoteDraft,
    busyId,
    myUpn,
    saveApps,
    saveAdminNote,
    newRow,
    setNewRow,
    saveNewRow,
    canDelete,
    canEditUpn,
    removeAuthorization,
    confirmDeleteAuth,
    setConfirmDeleteAuth,
    upnDraft,
    setUpnDraft,
    saveUpn,
    toggleAdmin,
    toggleCompleted,
    approve,
    removeRequest,
    confirmDelete,
    setConfirmDelete,
  }
}
