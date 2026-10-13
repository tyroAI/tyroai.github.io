/**
 * Gönderi gövdesinin HTML'ini çerçeveye (`feedFrame.js`) hazırlayan saf yardımcılar: gömülü
 * `cid:` görselleri, yüklenemeyecek uzak görsellerin mühürlenmesi, ağ ipuçlarının sökülmesi.
 * `lib/feed.js`'ten ayrıldı (dosya kalite tabanında).
 */

/**
 * Postanın HTML'indeki `cid:` referanslarını gömülü görsellerle değiştirir.
 *
 * ⚠️ Eşleşme `contentId` ÜZERİNDEN, dosya adı üzerinden değil: aynı adlı iki
 * logo bir postada sık ve ad eşleşmesi yanlış görseli koyardı. `contentId`
 * bulunamayan bir `cid:` referansı OLDUĞU GİBİ bırakılıyor — çerçevenin
 * içerik politikası onu zaten yüklemiyor, yani kırık bir görsel yerine boş
 * bir kutu kalıyor.
 */
/** 1×1 saydam GIF — mühürlenmiş görselin yerini tutar. */
const SEALED_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"

/** Bu boyun altında bildirilen görsel AYRAÇ sayılır (takip pikseli, spacer). */
const SEALED_MIN_PX = 64

/** Etiketin BİLDİRDİĞİ en büyük kenar (öznitelik ya da satır içi stil). */
function declaredSize(tag) {
  let best = 0
  const attr = /\s(?:width|height)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/gi
  let m
  while ((m = attr.exec(tag))) {
    const v = Number.parseFloat(m[1] ?? m[2] ?? m[3] ?? "")
    if (Number.isFinite(v)) best = Math.max(best, v)
  }
  const css = /(?:width|height)\s*:\s*([\d.]+)\s*px/gi
  while ((m = css.exec(tag))) {
    const v = Number.parseFloat(m[1])
    if (Number.isFinite(v)) best = Math.max(best, v)
  }
  return best
}

/**
 * YÜKLENEMEYECEK görselleri yırtık ikon olmaktan çıkarır.
 *
 * ⚠️ **SAHADAN GELEN ŞİKÂYET BUYDU** (*"içine tıklayınca aramıza katılanlar
 * için resimler kırık çıkıyor"*). Çerçevenin içerik politikası yalnız `data:`
 * yüklüyor (gerekçe `feedFrame.js`), yani gömülemeyen her `cid:` ve uzakta
 * barındırılan her görsel tarayıcıda YIRTIK İKON olarak çiziliyordu. Yırtık
 * ikon iki yalanı birden söylüyor: uygulamanın bozulduğunu ve orada ne
 * olduğunu bilmediğimizi.
 *
 * İki farklı şey iki farklı muamele görüyor, ve ayrım ETİKETİN BİLDİRDİĞİ
 * BOYUT:
 *
 * | bildirilen kenar | ne olur | neden |
 * |---|---|---|
 * | < 64px ya da yok | etiket TAMAMEN silinir | bülten ayracı, imza süsü ve 1×1 takip pikseli; yerinde bir kutu bırakmak gürültü olurdu |
 * | ≥ 64px | MÜHÜRLENİR: saydam piksel + `data-sealed` | orası gerçekten bir görselin yeri; kesik kesik bir kutu "burada bir görsel vardı" der ve düzen bozulmaz |
 *
 * ⚠️ **SAYAÇ YALNIZ MÜHÜRLENENLERİ SAYAR.** Silinen ayraçları da saymak,
 * kullanıcıya "3 görsel yüklenmedi" diyip ekranda hiçbir boşluk
 * göstermemek olurdu — sayı ile ekran çelişirdi.
 *
 * ⚠️ `srcset` de sökülür: `src` mühürlenip `srcset` bırakılırsa tarayıcı
 * uzak adresi yine deniyor ve politika onu yine düşürüyor — yırtık ikon geri
 * geliyordu.
 */
// Yalnız piksel ya da sayı: yüzde ve CSS değeri oran söylemez.
const PLAIN_PX = /^\s*(\d+(?:\.\d+)?)\s*(?:px)?\s*$/i

/** Etiketin width ve height ÖZNİTELİKLERİ (ikisi de piksel) — yer tutucunun oranı için. */
function declaredBox(tag) {
  const read = (name) => {
    const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, "i"))
    const px = (m?.[1] ?? m?.[2] ?? m?.[3] ?? "").match(PLAIN_PX)
    const v = px ? Math.round(Number.parseFloat(px[1])) : 0
    return v > 0 ? Math.min(v, 4000) : 0
  }
  const w = read("width")
  const h = read("height")
  return w && h ? { w, h } : null
}

/** O oranda saydam SVG: `height:auto` kutuyu postanın ölçüsünde tutar. İçinde yalnız sayı var. */
function boxPixel({ w, h }) {
  return `data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27${w}%27 height=%27${h}%27 viewBox=%270 0 ${w} ${h}%27/%3E`
}

export function sealUnloadableImages(html) {
  if (!html) return { html, sealed: 0 }
  let sealed = 0
  const out = String(html).replace(/<img\b[^>]*>/gi, (tag) => {
    const src = tag.match(/\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i)
    const value = (src?.[1] ?? src?.[2] ?? src?.[3] ?? "").trim()
    if (/^data:/i.test(value)) return tag
    // Boyutu AÇIKÇA küçük olan takip pikseli/ayraçtır, silinir; boyutsuz uzak görsel
    // (bültenlerde CSS ile boyutlanır) silinmez, mühürlenip yer tutucu olur.
    const size = declaredSize(tag)
    if (size > 0 && size < SEALED_MIN_PX) return ""
    sealed += 1
    const box = declaredBox(tag)
    const pixel = box ? boxPixel(box) : SEALED_PIXEL
    const swapped = src
      ? tag.replace(src[0], ` src="${pixel}"`)
      : tag.replace(/<img/i, `<img src="${pixel}"`)
    return swapped
      .replace(/\ssrcset\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+)/gi, "")
      .replace(/<img/i, `<img data-sealed="${box ? "box" : size ? "" : "wide"}"`)
  })
  return { html: out, sealed }
}

/**
 * Gövdeden AĞA ÇIKABİLEN görünmez etiketleri söker.
 *
 * ⚠️ **CSP `<link rel="preconnect">` VE `dns-prefetch`İ ENGELLEMİYOR.** İçerik
 * politikası getirme yönergelerinden ibaret; bağlantı ipuçları onların
 * dışında ve tarayıcı DNS çözümlemesini/TLS el sıkışmasını yine yapıyor.
 * Yani `img-src data:` ile takip pikselini kestiğimiz hâlde, gövdesine
 * `<link rel="preconnect" href="https://izleme.example/abc">` koyan bir posta
 * "bu duyuru açıldı" sinyalini DIŞARI verebiliyordu — takip pikselinin
 * HTTP'siz hâli. `<meta http-equiv="refresh">` de aynı sınıfta.
 *
 * Çare sade: iki etiket gövdeden ATILIYOR. Duyurudan hiçbir şey kaybolmuyor —
 * ikisi de görünmez etiket.
 */
export function stripNetworkHints(html) {
  if (!html) return html
  return String(html)
    .replace(/<link\b[^>]*>/gi, "")
    .replace(/<meta\b[^>]*http-equiv\s*=\s*["']?refresh[^>]*>/gi, "")
}

export function inlineCidImages(html, images) {
  if (!html || !images?.length) return html
  const byCid = new Map(
    images.filter((i) => i.contentId).map((i) => [i.contentId.toLowerCase(), i.dataUrl]),
  )
  // Yedek: contentId'si olmayan ya da farklı biçimli eşleşmeler için dosya adı — yalnız ad
  // postada TEKSE (aynı adlı iki logo yanlış görseli koyardı).
  const names = images.map((i) => i.name.toLowerCase()).filter(Boolean)
  const byName = new Map(
    images
      .filter((i) => i.name && names.filter((n) => n === i.name.toLowerCase()).length === 1)
      .map((i) => [i.name.toLowerCase(), i.dataUrl]),
  )
  if (!byCid.size && !byName.size) return html
  return html.replace(/(["'(])cid:([^"')\s]+)(["')])/gi, (whole, open, cid, close) => {
    // ⚠️ `decodeURIComponent` TEK BAŞINA DURAN BİR `%` KARAKTERİNDE ATAR
    // (`URIError: URI malformed`) ve bu çağrı render yolunda: bir bültende
    // `cid:100%_logo.png` geçmesi bütün uygulamayı BEYAZ EKRANA düşürürdü.
    // Çözülemeyen değer HAM hâliyle denenir; o da tutmazsa satır olduğu gibi
    // kalır ve çerçeve boş bir kutu çizer — zaten doğru geri düşüş.
    let key
    try {
      key = decodeURIComponent(cid)
    } catch {
      key = cid
    }
    const lower = key.toLowerCase()
    const hit = byCid.get(lower) ?? byCid.get(cid.toLowerCase()) ?? byName.get(lower.split("@")[0])
    return hit ? `${open}${hit}${close}` : whole
  })
}

/**
 * Kalın etiketleri eşitler (`strong` → `b`): şablonlardaki `<b>…</strong>` çapraz kapanışında
 * tarayıcı `</strong>`ı yok sayar, açık kalan `<b>` her yeni paragrafta yeniden kurulur ve
 * postanın geri kalanı kalın çizilir. Tek adlı etiketle kapanış eşleşir; görünüm aynı.
 */
export function unifyBold(html) {
  if (!html) return html
  return String(html).replace(/<(\/?)strong(?=[\s>/])/gi, "<$1b")
}
