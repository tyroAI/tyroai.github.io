import { useEffect, useState } from "react"
import { useMsal } from "@azure/msal-react"
import { isMsalConfigured } from "@/lib/msal"
import { graphGet, graphPost, STATUS } from "@/lib/graph"
import { FILES_SCOPES } from "@/hooks/useDriveItems"
import { decodeHtml, liveHtmlItems } from "@/lib/htmlPreview"

/**
 * Dosyanın BÜYÜK önizlemesi — gömülebilir bir sayfa adresi.
 *
 * Hover kartı küçük resim (`useDriveThumbnail`) kullanıyor: tek bir GET,
 * belirteçsiz çizilen bir görsel — bir hover için doğru maliyet. Ama küçük
 * resim tek karedir ve 800px'e sığdırılmıştır; bir sözleşmenin metnini
 * okumaya yetmez. Büyütünce Graph'ın `/preview` ucuna geçiyoruz: Office
 * Online'ın kendi görüntüleyicisini döndürüyor — sayfalanabilir,
 * yakınlaştırılabilir, keskin.
 *
 * Neden hover'da bu kullanılmıyor: POST istiyor, iframe gerektiriyor ve dış
 * bir sayfayı yüklüyor. Kullanıcının bilerek bastığı bir düğme bunu hak
 * ediyor, imlecin bir satırın üstünden geçmesi etmiyor.
 *
 * `getUrl` KISA ÖMÜRLÜDÜR, bu yüzden önbellek zaman aşımlıdır: aynı dosyayı
 * on dakika sonra yeniden açan kullanıcı ölü bir adres yerine yeni bir adres
 * alır.
 *
 * Her dosya önizlenemez (.zip, bilinmeyen türler). Uç o durumda hata döner ve
 * burada `unavailable` olur — çağıran küçük resme ve "tarayıcıda aç"a düşer.
 */

const TTL_MS = 4 * 60 * 1000
const cache = new Map() // `driveId::itemId` -> { at, state }
/**
 * Uçuştaki istek SÖZ olarak tutulur, küme olarak değil: ikinci bir çağıran
 * (StrictMode'un ikinci efekti, aynı dosyayı açan ikinci yüzey) isteği
 * yeniden atmaz ama SONUCUNU bekler. Eskiden yalnız "uçuşta" diye dönüyordu;
 * ilk efekt iptal edildiği için cevap kimseye ulaşmıyor ve pencere sonsuza
 * dek dönüyordu (geliştirmede her açılışta — 2026-10-02'de bulundu).
 */
const inflight = new Map() // key -> Promise

const LOADING = { status: "loading", url: null }
const UNAVAILABLE = { status: "unavailable", url: null }

/**
 * Bayat kaydı SİLER ve elde kalanı söyler. Tazelik kontrolü yalnızca etkinin
 * içinde yapılır: `Date.now()` render sırasında saf değildir ve aynı çizimde
 * iki farklı cevap üretebilir. Render yalnızca önbelleği okur.
 */
function takeFresh(key) {
  const hit = cache.get(key)
  if (!hit) return null
  if (Date.now() - hit.at >= TTL_MS) {
    cache.delete(key)
    return null
  }
  return hit.state
}

/**
 * Çıkışta çağrılır (bkz. `src/lib/msal.js`): adresler kısa ömürlü olsa da
 * hangi dosyalara bakıldığının kaydını aynı tarayıcıya giren başka bir
 * kullanıcıya bırakmayız.
 */
export function clearPreviewCache() {
  cache.clear()
  inflight.clear()
  dlCache.clear()
  dlInflight.clear()
  htmlCache.clear()
  htmlInflight.clear()
  liveHtmlItems.clear()
}

export function useDrivePreview(driveId, itemId, enabled) {
  const { instance, accounts } = useMsal()
  const account = accounts[0] ?? null
  const key = driveId && itemId ? `${driveId}::${itemId}` : ""
  // Durum modül önbelleğindedir, bileşende değil: sayaç yalnızca cevap
  // geldiğinde yeniden çizim tetikler. `useState`i etkinin İÇİNDEN eşzamanlı
  // çağırmak zincirleme render demek — aynı sonucu doğuran ucuz yol bu.
  const [, bump] = useState(0)

  useEffect(() => {
    if (!enabled || !key || !isMsalConfigured || !account) return
    if (takeFresh(key)) return
    let cancelled = false
    let job = inflight.get(key)
    if (!job) {
      job = (async () => {
        // Gövde boş: sayfa ve yakınlaştırma parametreleri var ama varsayılan
        // görünüm (ilk sayfa, sığdır) tam olarak istenen şey.
        const res = await graphPost(instance, account, {
          path: `/drives/${driveId}/items/${itemId}/preview`,
          scopes: FILES_SCOPES,
          body: {},
        })
        // `postUrl` yolu BİLİNÇLİ olarak kullanılmıyor: form POST'u ile bir
        // iframe'e yazmak gerekir ve yalnızca bazı eski türlerde `getUrl`
        // gelmiyor. Onlar küçük resim + "tarayıcıda aç" ile karşılanıyor.
        const url = res.status === STATUS.ready ? (res.data?.getUrl ?? null) : null
        cache.set(key, { at: Date.now(), state: url ? { status: "ready", url } : UNAVAILABLE })
      })().finally(() => inflight.delete(key))
      inflight.set(key, job)
    }
    job.then(() => {
      if (!cancelled) bump((n) => n + 1)
    })
    return () => {
      cancelled = true
    }
  }, [enabled, key, driveId, itemId, account, instance])

  if (!enabled) return LOADING
  // Adresi olmayan satır (kimliği çözülemeyen öğe) önizlenemez: eskiden
  // burada LOADING dönüyordu ve pencere sonsuza dek dönüyordu (2026-09-30'da
  // bulundu). Artık küçük resme ve "Tarayıcıda aç"a düşüyor.
  if (!key) return UNAVAILABLE
  if (!isMsalConfigured || !account) return UNAVAILABLE
  return cache.get(key)?.state ?? LOADING
}

/**
 * İNDİRME ADRESİ — pencerenin "İndir" düğmesi için (2026-10-02, istek:
 * *"geniş önizleme açsa; TYRO özetle, indir, kaynakta aç gibi seçenekler
 * olsa"*). Graph'ın `@microsoft.graph.downloadUrl`i: önceden kimlik
 * doğrulanmış, kısa ömürlü (~1 sa) ve `Content-Disposition: attachment` ile
 * dönüyor — yani düğme düz bir `<a href>` olabiliyor, tıklama anında ağ
 * turu beklenmiyor (bir `await`ten sonra açılan pencereyi açılır pencere
 * engelleyicisi yutardı).
 *
 * Pencere AÇILINCA bir kez sorulur (önizlemenin POST'uyla aynı an); `$select`
 * YOK — açıklama satırı (`@…`) bazı kiracılarda `$select` içinde reddediliyor,
 * düz GET dosya öğesinde adresi zaten taşıyor. Önbellek bellekte, 10 dk.
 * Alınamazsa `null` — çağıran SharePoint'in `download=1`ine düşer.
 */
const DL_TTL_MS = 10 * 60 * 1000
const dlCache = new Map() // key -> { at, url }
const dlInflight = new Map() // key -> Promise (önizlemeyle aynı kural: ikinci çağıran SONUCU bekler)

export function useDriveDownload(driveId, itemId, enabled) {
  const { instance, accounts } = useMsal()
  const account = accounts[0] ?? null
  const key = driveId && itemId ? `${driveId}::${itemId}` : ""
  const [, bump] = useState(0)

  useEffect(() => {
    if (!enabled || !key || !isMsalConfigured || !account) return
    const hit = dlCache.get(key)
    if (hit && Date.now() - hit.at < DL_TTL_MS) return
    let cancelled = false
    let job = dlInflight.get(key)
    if (!job) {
      job = (async () => {
        const res = await graphGet(instance, account, {
          path: `/drives/${driveId}/items/${itemId}`,
          scopes: FILES_SCOPES,
        })
        const url =
          res.status === STATUS.ready ? (res.data?.["@microsoft.graph.downloadUrl"] ?? null) : null
        dlCache.set(key, { at: Date.now(), url })
      })().finally(() => dlInflight.delete(key))
      dlInflight.set(key, job)
    }
    job.then(() => {
      if (!cancelled) bump((n) => n + 1)
    })
    return () => {
      cancelled = true
    }
  }, [enabled, key, driveId, itemId, account, instance])

  if (!enabled || !key) return { status: "unavailable", url: null }
  const hit = dlCache.get(key)
  if (!hit) return { status: "loading", url: null }
  return hit.url ? { status: "ready", url: hit.url } : { status: "unavailable", url: null }
}

/**
 * HTML DOSYASININ KENDİSİ — önizleme penceresinin `srcDoc`u için (2026-10-02,
 * sahada: *"html önizleme açmıyor"*; gerekçe `lib/htmlPreview.js`te).
 *
 * Graph'ın `/content` ucu KULLANILMAZ: 302 ile SharePoint'e yönlendiriyor ve
 * belgeye göre `Authorization` başlıklı bir CORS isteğinde yönlendirme
 * yasak. Kısa ömürlü indirme adresi (`useDriveDownload` — pencerenin "İndir"
 * düğmesiyle AYNI istek, ikinci bir tur yok) belirteç istemiyor ve tarayıcıdan
 * okunabiliyor.
 *
 * ⚠️ **CANLI KİRACIDA ÖLÇÜLMEDİ: indirme adresinin CORS cevabı.** Okunamazsa
 * (`TypeError`, 4xx/5xx) durum `unavailable` olur ve pencere bugünkü gibi
 * küçük resim + "İndir · Tarayıcıda aç"a düşer — "çalışmazsa eski hâli".
 * ⚠️ Tavan 5 MB: bir HTML raporu nadiren bunu aşar; aşan dosya tek bir
 * `srcDoc` dizesi olarak sekmeyi yorardı.
 * ⚠️ İçerik BELLEKTE (10 dk) ve çıkışta düşer: başkasının belgesi.
 */
const HTML_CAP = 5 * 1024 * 1024
const htmlCache = new Map() // key -> { at, state }
const htmlInflight = new Map() // key -> Promise

async function readHtml(url) {
  let res
  try {
    res = await fetch(url, { credentials: "omit", referrerPolicy: "no-referrer" })
  } catch {
    return UNAVAILABLE
  }
  if (!res.ok) return UNAVAILABLE
  if (Number(res.headers.get("content-length") || 0) > HTML_CAP)
    return { status: "tooLarge", html: null }
  try {
    const buf = await res.arrayBuffer()
    if (buf.byteLength > HTML_CAP) return { status: "tooLarge", html: null }
    return { status: "ready", html: decodeHtml(buf, res.headers.get("content-type") || "") }
  } catch {
    return UNAVAILABLE
  }
}

export function useDriveHtml(driveId, itemId, enabled) {
  const dl = useDriveDownload(driveId, itemId, enabled)
  const key = driveId && itemId ? `${driveId}::${itemId}` : ""
  const [, bump] = useState(0)

  useEffect(() => {
    if (!enabled || !key || dl.status !== "ready") return
    const hit = htmlCache.get(key)
    if (hit && Date.now() - hit.at < DL_TTL_MS) return
    let cancelled = false
    let job = htmlInflight.get(key)
    if (!job) {
      job = readHtml(dl.url)
        .then((state) => {
          htmlCache.set(key, { at: Date.now(), state })
        })
        .finally(() => htmlInflight.delete(key))
      htmlInflight.set(key, job)
    }
    job.then(() => {
      if (!cancelled) bump((n) => n + 1)
    })
    return () => {
      cancelled = true
    }
  }, [enabled, key, dl.status, dl.url])

  if (!enabled || !key) return UNAVAILABLE
  if (dl.status === "unavailable") return UNAVAILABLE
  return htmlCache.get(key)?.state ?? LOADING
}
