import { useEffect, useState } from "react"
import { useMsal } from "@azure/msal-react"
import { graphGet, STATUS } from "@/lib/graph"
import { shareId } from "@/lib/shareId"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  PAYLAŞIM ADRESİNDEN KLASÖR OKUMA — SharePoint, uygulama içinde
 * ═══════════════════════════════════════════════════════════════════════
 *
 * İstek (2026-09-23): *"politika ve prosedürlerde o SharePoint yapısını o
 * kartın içinde yönetemez miyiz, bizim dosyalar yapısı gibi — link vermek
 * yerine"*.
 *
 * ── NASIL ──────────────────────────────────────────────────────────────
 * Graph'ın PAYLAŞIM ucu bir web adresini doğrudan sürücü öğesine çeviriyor:
 * adres `u!` + base64url'e kodlanıp `/shares/{id}/driveItem` çağrılıyor.
 * Böylece site kimliği, sürücü kimliği ve klasör yolu ayrı ayrı çözülmek
 * zorunda kalmıyor — elimizde zaten olan tek şey ADRES ve doğrudan onu
 * kullanıyoruz.
 *
 * ⚠️ **YENİ KAPSAM YOK.** `Files.Read.All` ve `Sites.Read.All` ikisi de
 * `loginRequest`te (dosya paneli için zaten orada). Bu kanca yalnız
 * okuyor; hiçbir yere yazmıyor.
 *
 * ⚠️ **KAPSAM İKİ AYRI DENEMEDE İSTENİR, TEK LİSTEDE DEĞİL.** `graph.js`in
 * kendi notu: iki kapsamı tek sessiz alımda birlikte istemek, biri
 * onaysızken İKİSİNİ birden düşürüyor. Önce `Files.Read.All`, o reddederse
 * `Sites.Read.All` — kitaplığın hangi kapsama açıldığı kiracıya göre
 * değişebiliyor.
 *
 * ⚠️ **SESSİZ YA DA HİÇ.** `graphGet` etkileşimli tur AÇMIYOR; bu çağrı
 * kullanıcı bir sekmeye bastığı için koşuyor ve tam sayfa bir AAD
 * yönlendirmesi onu işinin ortasında uygulamadan atardı (panellerin kuralı).
 * Alınamazsa kart kendi durumunu çizer ve SharePoint bağlantısı yerinde
 * kalır — yani bu yol düşse bile kullanıcı klasöre ulaşabiliyor.
 *
 * ⚠️ **BU YOL CANLI KİRACIDA ÖLÇÜLMEDİ** (oturum açmadan Graph çağrısı
 * yapılamıyor). Bu yüzden düşme dalı bir YEDEK taşıyor, sessiz bir boşluk
 * değil: hata durumunda kart "SharePoint'te aç" bağlantısını gösteriyor.
 * Kodlayıcı (`shareId`) ise ayrıca ve saf olarak sınandı.
 *
 * ⚠️ **ÖNBELLEK BELLEKTE, MODÜL DÜZEYİNDE.** Klasör listesi başkalarının
 * belge adlarını taşıyor: diske YAZILMAZ (posta/takvim panellerinin ve
 * Tebrikler kartının aynı kuralı). Sekme kapanınca gider.
 */

// Kodlayıcı `lib/shareId.js`te (Politika klasörünün yedek yolu da kullanıyor).
export { shareId } from "@/lib/shareId"

/** Sekme ömürlü önbellek: adres → sonuç. */
const cache = new Map()

export function clearSharedFolderCache() {
  cache.clear()
}

/** Graph `driveItem` → kartın çizdiği sade satır. */
function toRow(item) {
  return {
    id: item.id,
    name: item.name,
    isFolder: Boolean(item.folder),
    childCount: item.folder?.childCount ?? null,
    size: item.size ?? null,
    url: item.webUrl ?? null,
    driveId: item.parentReference?.driveId ?? null,
  }
}

async function fetchChildren(instance, account, { url, driveId, itemId }) {
  // Adresten geliniyorsa paylaşım ucu, klasöre inildiyse doğrudan sürücü.
  const path = url
    ? `/shares/${shareId(url)}/driveItem?$expand=children($select=id,name,folder,size,webUrl,parentReference)`
    : `/drives/${driveId}/items/${itemId}/children?$select=id,name,folder,size,webUrl,parentReference&$top=200`

  // ⚠️ İKİ KAPSAM, İKİ DENEME — tek listede istemek ikisini birden düşürür.
  for (const scopes of [["Files.Read.All"], ["Sites.Read.All"]]) {
    const res = await graphGet(instance, account, { path, scopes })
    if (res.status === STATUS.ready) {
      const raw = url ? (res.data?.children ?? []) : (res.data?.value ?? [])
      const self = url ? res.data : null
      return {
        status: STATUS.ready,
        rows: raw.map(toRow),
        // Klasöre inebilmek için sürücü kimliği: paylaşım cevabının kendi
        // `parentReference`ı ya da ilk çocuğunki.
        driveId:
          self?.parentReference?.driveId ?? raw[0]?.parentReference?.driveId ?? driveId ?? null,
      }
    }
    if (res.status !== STATUS.denied) return { status: res.status, rows: [], error: res.error }
  }
  return { status: STATUS.denied, rows: [] }
}

/**
 * @param {{url?: string, driveId?: string, itemId?: string}|null} target
 *   `url` verilirse paylaşım adresinden, `driveId`+`itemId` verilirse
 *   doğrudan sürücüden okur. `null` → hiç istek atılmaz.
 */
export function useSharedFolder(target) {
  const { instance, accounts } = useMsal()
  const account = accounts[0]
  const key = target ? (target.url ?? `${target.driveId}/${target.itemId}`) : null
  const [state, setState] = useState(() =>
    key && cache.has(key) ? cache.get(key) : { status: "loading", rows: [] },
  )

  useEffect(() => {
    if (!key) return
    if (cache.has(key)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState(cache.get(key))
      return
    }
    let alive = true

    setState({ status: "loading", rows: [] })
    fetchChildren(instance, account, target).then((res) => {
      // Yalnız BAŞARILI cevap önbelleğe girer: geçici bir ağ hatasını
      // sekme boyunca saklamak, tek bir kötü anı kalıcı yapardı.
      if (res.status === STATUS.ready) cache.set(key, res)
      if (alive) setState(res)
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, account])

  return state
}
