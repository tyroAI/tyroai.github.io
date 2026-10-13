import { htmlOf, isPrintableHtml } from "@/lib/botFiles"

/**
 * Araçtan gelen formu (bkz. botFiles) ekranda imzalanmış hâle getirir.
 *
 * İmzanın yeri formdaki "Personel İmzası" çizgisidir. HR MCP o satırı
 * `<div><b>{tarih}</b><span>Personel İmzası</span></div>` olarak basıyor
 * (`tyro-hr-mcp` › `services/leave_form.py`); biçim bir SÖZLEŞMEDİR. Satır
 * bulunamazsa form imzalanabilir sayılmaz ve düğme hiç çizilmez: yanlış yere
 * konmuş bir imza, imzasız bir formdan kötüdür.
 *
 * Saf metin işlemi (DOM yok): birim testlerinde Node'da çalışır.
 */
const SLOT_LABEL = "Personel İmzası"
const SLOT_RE = new RegExp(`<div><b>[^<]*</b><span>${SLOT_LABEL}</span></div>`)

// İmza çizginin ÜSTÜNE oturur; çizgi `.sig div`in üst kenarı. Beyan cümlesinin
// altındaki 13 mm boşluk 12 mm'lik imzaya yetiyor.
const SIGN_CSS =
  ".tyro-sign{position:relative}" +
  ".tyro-sign img{position:absolute;left:0;bottom:calc(100% + 1mm);" +
  "max-height:12mm;max-width:100%;width:auto;height:auto}"

// Ekranda `@media print` kuralları çalışmaz; PDF kâğıttaki görünümü almalı
// (gri zemin, kart gölgesi ve Yazdır düğmesi yok). Değerler form_theme.py'nin
// yazdırma bloğunun aynısı; genişlik A4 yatayın 12 mm kenar payı içi.
const PDF_CSS =
  "body{background:#fff!important;margin:0!important}" +
  ".sheet{width:273mm!important;margin:0!important;padding:2mm 1mm 0!important;" +
  "border-radius:0!important;box-shadow:none!important}" +
  ".print{display:none!important}"

const DATA_PNG = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/

function injectCss(html, css) {
  const tag = `<style>${css}</style>`
  return html.includes("</head>") ? html.replace("</head>", () => `${tag}</head>`) : tag + html
}

/** Belgenin imza satırı var mı (yalnız bizim ürettiğimiz HTML'de bakılır). */
export function canSignHtml(html) {
  return typeof html === "string" && SLOT_RE.test(html)
}

export function canSignAttachment(att) {
  return isPrintableHtml(att) && canSignHtml(htmlOf(att))
}

/** ERP'nin tarih biçimi (`5.10.2025`, gün sıfırsız, ay sıfırlı) + saat:dakika. */
export function formatSignedAt(date) {
  const p = (n) => String(n).padStart(2, "0")
  return `${date.getDate()}.${p(date.getMonth() + 1)}.${date.getFullYear()} ${p(date.getHours())}:${p(date.getMinutes())}`
}

/**
 * İmza görselini ve imza anını personel satırına koyar.
 * `signatureDataUrl` yalnız PNG data adresi olabilir: HTML'e ham girdi.
 */
export function signFormHtml(html, { signatureDataUrl, signedAt }) {
  if (!canSignHtml(html)) throw new Error("no-signature-slot")
  if (!DATA_PNG.test(signatureDataUrl)) throw new Error("bad-signature")
  const when = String(signedAt).replace(/[<>&"]/g, "")
  const slot = `<div class="tyro-sign"><img src="${signatureDataUrl}" alt=""><b>${when}</b><span>${SLOT_LABEL}</span></div>`
  return injectCss(
    html.replace(SLOT_RE, () => slot),
    SIGN_CSS,
  )
}

/**
 * PDF'e çevrilecek hâl: kâğıt görünümü, ekran süsleri yok.
 *
 * Bölüm başlıkları CSS ile büyük harfe çevriliyor; tarayıcı bunu belgenin
 * diline göre yapıyor ama PDF çizicisi yapmıyor ("İzin" → "İZIN"). Başlıklar
 * burada belgenin diliyle önceden büyütülür, CSS dönüşümü kapatılır.
 */
export function pdfReadyHtml(html) {
  const lang = String(html).match(/<html[^>]*\slang="([^"]+)"/)?.[1] || "tr"
  const upper = html.replace(
    /<h2>([^<]*)<\/h2>/g,
    (_, text) => `<h2>${text.toLocaleUpperCase(lang)}</h2>`,
  )
  return injectCss(upper, `${PDF_CSS}h2{text-transform:none!important}`)
}

/** `<title>` metni (posta konusu ve PDF başlığı için). */
export function formTitleOf(html) {
  const raw = String(html).match(/<title>([^<]*)<\/title>/)?.[1] ?? ""
  return raw
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .trim()
}

/** `Izin_Formu_7762_2025-10-05.html` → `Izin_Formu_7762_2025-10-05_imzali.pdf` */
export function signedPdfName(name) {
  const base = String(name || "Form").replace(/\.[^.]+$/, "") || "Form"
  return `${base}_imzali.pdf`
}
