import { useCallback, useEffect, useMemo, useState } from "react"
import { useMsal } from "@azure/msal-react"
import {
  countOpenRequests,
  fetchAuthorizationFor,
  fetchAuthorizations,
  fetchMyOpenRequests,
  fetchRequests,
} from "@/lib/authorizations"
import { ensureMsalInitialized, isMsalConfigured, msalInstance } from "@/lib/msal"
import { APP_LOCK } from "@/lib/appLockPolicy"
import { catalogNameKey } from "@/lib/agentName"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  YÖNETİCİ KAPISI — kaynağı `tyro_authorizedapp.tyro_isadmin`
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ⚠️ **BU KAPI `useIsInGroup(ADMIN_GROUP_ID)` DEĞİL, ve bu bilinçli.**
 * `/security` sayfası Entra grubu "BT Ttech Business" üyeliğine bakar —
 * orada soru "BT ekibinden misin". Buradaki soru başka: "app yetkilerini
 * YÖNETEBİLİR misin". İki farklı kümeyi tek gruba bağlamak, yetki vermek
 * için Entra yöneticisine gitmeyi zorunlu kılardı; oysa bu listenin sahibi
 * işin kendisi ve kaynağı ekranda yönetilen tablonun ta kendisi.
 *
 * ⚠️ **TEK DOĞRULUK KAYNAĞI.** Kapı yalnız tablodan okunur; grup üyeliği
 * BURAYA KARIŞTIRILMAZ. İki kaynağı `||` ile birleştirmek, birbirini
 * tanımayan iki kapı demekti — "neden hâlâ göremiyorum" sorusunun cevabı
 * iki ayrı yerde aranırdı.
 *
 * ⚠️ **EŞLEŞME UPN İLE.** `account.username` MSAL'ın verdiği giriş adresi;
 * tablodaki `tyro_useremail` de (adına rağmen) o değeri taşır. Graph'tan
 * gelen posta adresiyle eşleştirmek, ölçülen 237 kişiyi sessizce dışarıda
 * bırakırdı — ayrıntı `lib/authorizations.js` başında.
 *
 * ⚠️ **FAIL-CLOSED.** Sorgu düşerse `"unknown"` döner, `true` DÖNMEZ.
 * Çağıranlar `=== true` ile kapı kurar (`useIsInGroup`in sözleşmesinin
 * aynısı), yani bir arıza kimseye yönetici yetkisi açmaz.
 *
 * Dönüş:
 *   true       → yönetici
 *   false      → soruldu, cevap hayır (satır yok ya da bayrak kapalı)
 *   "unknown"  → SORULAMADI (oturum yok, Dataverse hata verdi)
 *   undefined  → hâlâ çözülüyor
 */

export const UNKNOWN = "unknown"

// homeAccountId -> satir nesnesi | null (satiri yok) | UNKNOWN (sorulamadi)
const rowCache = new Map()

/**
 * ⚠️ **UÇUŞTAKİ İSTEK PAYLAŞILIR.** Önbellek yalnız CEVAP geldikten sonra
 * doluyor; soğuk açılışta bu satırı okuyan her tüketici aynı anda mount
 * oluyor ve hepsi önbelleği boş görüp KENDİ sorgusunu atıyordu. Kilit
 * sidebar'a ve favorilere yayılınca tüketici sayısı arttı (AppLauncher,
 * NavApps, NavFavorites, NavUser, ChatScreen…), yani her açılışta aynı
 * satır için üst üste Dataverse turu. Burada uçuştaki söz paylaşılıyor:
 * ilk çağıran isteği açar, gerisi aynı sözü bekler.
 */
const inflight = new Map()

function inflightRow(key, upn) {
  const existing = inflight.get(key)
  if (existing) return existing
  const promise = fetchAuthorizationFor(upn).finally(() => inflight.delete(key))
  inflight.set(key, promise)
  return promise
}

/** Çıkışta çağrılır (`src/lib/msal.js` LOGOUT_SUCCESS): aynı tarayıcıya
 *  giren ikinci kullanıcı birincinin yönetici kararını devralmasın. */
export function clearAdminCache() {
  rowCache.clear()
  inflight.clear()
}

/** Oturumun UPN'i — mock/dev modda yok, o hâlde kapı kapalı kalır. */
function activeUpn() {
  if (!isMsalConfigured) return null
  const account = msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0] ?? null
  return account?.username ?? null
}

/**
 * Oturumun KENDİ yetki satırı. Hem yönetici kapısı hem app kilidi bunu
 * okur — TEK fetch, TEK önbellek. İki ayrı kanca yazsaydım aynı satır her
 * mount'ta iki kez çekilirdi.
 *
 * Dört durum ve aralarındaki fark yük taşıyor:
 *   anonymous  oturum yok
 *   pending    henüz çözülmedi
 *   unknown    SORULAMADI (ağ / Dataverse hatası) — "satırı yok" ile aynı şey DEĞİL
 *   ready      cevap geldi; `row` null ise kişinin satırı YOK
 */
function useMyAuthorizationRow() {
  const { accounts } = useMsal()
  const account = accounts[0]
  const key = account?.homeAccountId ?? null
  const upn = activeUpn()
  const cached = key ? rowCache.get(key) : undefined
  const [resolved, setResolved] = useState({ key: null, value: undefined })

  useEffect(() => {
    if (!upn || !key) return
    if (rowCache.get(key) !== undefined) return
    let cancelled = false
    ;(async () => {
      try {
        await ensureMsalInitialized()
        const row = await inflightRow(key, upn)
        rowCache.set(key, row ?? null) // null = satiri yok, gecerli bir cevap
        if (!cancelled) setResolved({ key, value: row ?? null })
      } catch {
        // Cache'LENMEZ: gecici bir hataysa bir sonraki mount yeniden denesin.
        if (!cancelled) setResolved({ key, value: UNKNOWN })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [key, upn])

  // Cevap RENDER SIRASINDA türetiliyor, effect içinde setState ile değil
  // (`react-hooks/set-state-in-effect` — bu depoda bir kez deploy kapısını
  // düşürmüş kural).
  if (!upn || !key) return { state: "anonymous", row: null }
  const value = cached !== undefined ? cached : resolved.key === key ? resolved.value : undefined
  if (value === undefined) return { state: "pending", row: null }
  if (value === UNKNOWN) return { state: "unknown", row: null }
  return { state: "ready", row: value }
}

export function useIsAppAdmin() {
  const { state, row } = useMyAuthorizationRow()
  if (state === "anonymous") return false
  if (state === "pending") return undefined
  if (state === "unknown") return UNKNOWN
  return row?.isAdmin === true
}

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  APP KİLİDİ
 * ═══════════════════════════════════════════════════════════════════════
 *
 * `isLocked(appName)` — o app kilitli mi. Kural ve gerekçeleri
 * `lib/appLockPolicy.js`te; buradaki üç karar ayrıca yazılı:
 *
 * ⚠️ **SATIRI OLMAYAN KİŞİDE HER ŞEY KİLİTLİ** (istek üzerine, fail-closed).
 * Bu yüzden şalter varsayılan olarak KAPALI — açık gelseydi liste
 * doldurulmadan yayına çıkan sürüm herkesi dışarıda bırakırdı.
 *
 * ⚠️ **"SORULAMADI" KİLİTLEMEZ.** Ağ ya da Dataverse hatasında kilit
 * uygulanmaz. Bu depo aynı hatayı bir kez yaşadı: asistan kilidi
 * fail-closed'dı ve bir izin onaylanmadığı için KURALA UYAN kullanıcılar
 * da kilitli kaldı; kilit sonunda tümüyle kaldırıldı (bkz. constants.js).
 * Bir arıza bir yetki kararı değildir — üstelik kilit zaten bir güvenlik
 * sınırı değil (adresli app'lere tarayıcıdan girilebiliyor).
 *
 * ⚠️ **ÇÖZÜLENE KADAR KİLİT ÇİZİLMEZ.** Beklerken her kartı kilitli
 * göstermek, bir saniye sonra hepsini açmak demekti — ekranın yanıp
 * sönmesi, üstelik çoğu kullanıcı için yalan.
 */
export function useAppLock() {
  const { state, row } = useMyAuthorizationRow()
  return useMemo(() => {
    const off = { enabled: false, ready: true, isLocked: () => false }
    if (!APP_LOCK.enabled) return off
    if (state === "pending" || state === "unknown") {
      return { enabled: true, ready: state !== "pending", isLocked: () => false }
    }
    if (state === "ready" && APP_LOCK.adminBypass && row?.isAdmin === true) return off
    // Yetki satırı adı eski yazımla ("TYRO Office") taşıyabilir, katalog yenisiyle
    // ("Office"): ikisi aynı anahtara iner (`lib/agentName`).
    const allowed = new Set((state === "ready" ? (row?.apps ?? []) : []).map(catalogNameKey))
    return {
      enabled: true,
      ready: true,
      isLocked: (name) => !allowed.has(catalogNameKey(name)),
    }
  }, [state, row])
}

/**
 * Sayfanın iki listesi. TEK kanca, çünkü ikisi de aynı anda ve aynı
 * "Yenile" düğmesiyle tazeleniyor; ayrı kancalar iki ayrı yükleme durumu
 * ve ekranda iki ayrı iskelet demekti.
 *
 * Önbellek YOK: bu bir yönetim ekranı, gördüğü şey o anki hâl olmalı.
 */
export function useAuthorizationData(enabled) {
  const [state, setState] = useState({
    status: "idle",
    authorizations: [],
    requests: [],
    error: null,
    fetchedAt: null,
  })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: "loading", error: null }))
    try {
      await ensureMsalInitialized()
      const [authorizations, requests] = await Promise.all([fetchAuthorizations(), fetchRequests()])
      setState({
        status: "ready",
        authorizations,
        requests,
        error: null,
        fetchedAt: Date.now(),
      })
    } catch (err) {
      // Liste BOŞALTILMAZ: elde olan son hâl ekranda kalsın, üstünde hata
      // şeridiyle. Boş bir tablo "yetki yok" diye okunurdu.
      setState((s) => ({ ...s, status: "error", error: err }))
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    load()
  }, [enabled, load])

  return { ...state, reload: load }
}

/**
 * Oturumun AÇIK talepleri — app adından TALEBİN KENDİSİNE.
 *
 * Kilitli kart iki şeyi buradan okuyor: rozetin ne diyeceği ("Kilitli" mi
 * "Talep inceleniyor" mu) ve detay kutusunun ne göstereceği (tarih, kişinin
 * gerekçesi, yöneticinin notu). Eskiden yalnız adlar tutuluyordu; detay
 * kutusu gelince satırın kendisi gerekti.
 *
 * ⚠️ Yalnız kilit AÇIKKEN çekilir: kapalıyken kilitli kart da yok, yani
 * sorgu boşuna atılırdı.
 *
 * ⚠️ HATA SESSİZ ve kart NORMAL kilitli kalır. Talebi okuyamadığımızda
 * "Talep inceleniyor" yazmak, kullanıcıya var olmayan bir talep vaat etmek
 * olurdu; tersi (tekrar istemek) zararsız — sunucu tarafı aynı app için
 * ikinci açık kaydı zaten yazmıyor.
 */
export function useMyPendingRequests(enabled) {
  const { accounts } = useMsal()
  const account = accounts[0]
  const key = account?.homeAccountId ?? null
  const upn = activeUpn()
  const [state, setState] = useState({ key: null, rows: null })

  const load = useCallback(async () => {
    if (!enabled || !upn || !key) return
    try {
      await ensureMsalInitialized()
      const list = await fetchMyOpenRequests(upn)
      setState({ key, rows: list })
    } catch {
      setState({ key, rows: [] })
    }
  }, [enabled, upn, key])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (cancelled) return
      await load()
    })()
    return () => {
      cancelled = true
    }
  }, [load])

  const rows = state.key === key ? state.rows : null

  // Ad → satır. Eşleştirme ad anahtarıyla: katalogdaki ad elle yazılıyor ve
  // eski talepler adı marka önekiyle taşıyor (`lib/agentName`).
  const byApp = useMemo(() => {
    const m = new Map()
    for (const r of rows ?? []) m.set(catalogNameKey(r.app), r)
    return m
  }, [rows])

  const isPending = useCallback((name) => byApp.has(catalogNameKey(name)), [byApp])

  /** Kartın detay kutusunun gösterdiği satır. Yoksa `null`. */
  const getRequest = useCallback((name) => byApp.get(catalogNameKey(name)) ?? null, [byApp])

  // Gönderimden sonra listeye EKLENİR: yeniden sorgu atmadan kart hemen
  // "Talep inceleniyor"a döner. Sunucu satırı zaten geri verdi
  // (`return=representation`), yani elimizdeki tarih de gerçek damga.
  const markPending = useCallback(
    (name, row) => {
      const app = (name ?? "").trim()
      if (!app) return
      const entry = row ?? {
        id: null,
        upn: upn ?? "",
        app,
        isCompleted: false,
        createdOn: null,
        userNote: "",
        adminNote: "",
      }
      setState((s) => {
        const next = (s.key === key ? (s.rows ?? []) : []).filter(
          (r) => catalogNameKey(r.app) !== catalogNameKey(app),
        )
        return { key, rows: [entry, ...next] }
      })
    },
    [key, upn],
  )

  return { isPending, getRequest, markPending, refresh: load }
}

/**
 * BEKLEYEN talep sayısı — sidebar'daki kullanıcı düğmesinin rozeti.
 *
 * ⚠️ **AYRI BİR SORGU, `useAuthorizationData` DEĞİL.** O kanca iki tabloyu
 * birden çekiyor ve yönetim sekmesine ait; sidebar her rotada mount
 * oluyor. Bir rozet için iki tablo indirmek, hiç açılmayan bir ekranın
 * bedelini her gezinmede ödemek olurdu. Burada tek `$count` sorgusu var.
 *
 * ⚠️ **YALNIZ YETKİ YÖNETİCİSİNDE.** Kapı `useIsAppAdmin`; yetkisi olmayan
 * için sorgu HİÇ atılmaz (403 alıp yutmak yerine hiç sormamak).
 *
 * ⚠️ Hata SESSİZ ve rozet ÇİZİLMEZ. "Talep sayısı alınamadı" demek,
 * kullanıcının hiç istemediği bir konuda uyarı olurdu.
 */
/**
 * Rozet, yönetim ekranının DIŞINDA yaşıyor ve kendi sorgusunu bir kez
 * atıyor. Onaylamak/silmek sayıyı değiştirdiğinde haber vermenin yolu bu
 * sayaç: `useAuthorizationsAdmin.run()` her başarılı yazıştan sonra
 * artırıyor, kanca yeniden soruyor. Bir olay yayını yerine sayı, çünkü
 * tek tüketici var ve React'e zaten bağımlılık olarak verilebiliyor.
 */
let requestCountNonce = 0
const requestCountListeners = new Set()

export function bumpRequestCount() {
  requestCountNonce += 1
  for (const fn of requestCountListeners) fn()
}

export function useOpenRequestCount() {
  const isAdmin = useIsAppAdmin()
  const [count, setCount] = useState(0)
  const [nonce, setNonce] = useState(requestCountNonce)

  useEffect(() => {
    const onBump = () => setNonce(requestCountNonce)
    requestCountListeners.add(onBump)
    return () => {
      requestCountListeners.delete(onBump)
    }
  }, [])

  useEffect(() => {
    if (isAdmin !== true) return undefined
    let cancelled = false
    ;(async () => {
      try {
        await ensureMsalInitialized()
        const n = await countOpenRequests()
        if (!cancelled) setCount(n)
      } catch {
        if (!cancelled) setCount(0)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isAdmin, nonce])

  return isAdmin === true ? count : 0
}
