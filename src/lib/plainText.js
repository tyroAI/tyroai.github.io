/**
 * Markdown yanıtı, PAYLAŞILABİLİR düz metne çevirir.
 *
 * Sohbet cevapları markdown olarak geliyor ve ekranda öyle çiziliyor; ama
 * WhatsApp'a, e-postaya ya da bir nota yapıştırıldığında `**`, `##` ve
 * `| --- |` işaretleri metni okunmaz kılıyor. Paylaşılan şey CÜMLE olmalı,
 * kaynak kodu değil.
 *
 * ⚠️ Bu bir markdown AYRIŞTIRICISI DEĞİL, bir SADELEŞTİRİCİ. Amacı doğru
 * bir AST kurmak değil, insanın okuyacağı metni bırakmak: tanımadığı bir
 * yapıyı bozmaz, olduğu gibi geçirir. Tam bir ayrıştırıcı (uygulamada
 * zaten var, ekran onu kullanıyor) buraya bağlanmadı — çıktısı HTML ve
 * bize düz metin lazım.
 *
 * ⚠️ HEDEFİN BİÇİMLENDİRMESİNE ÇEVİRMİYORUZ. WhatsApp `*kalın*` ve
 * `_italik_` anlıyor, ama paylaşım sayfasında hedefi kullanıcı seçiyor:
 * aynı metin Mail'e, Notlar'a ya da Mesajlar'a da gidebilir. Bir hedefin
 * söz dizimine çevirmek, ötekilerde yeni bir işaret çöplüğü bırakırdı.
 */

/** Tabloların hücre ayracı. Boru işareti düz metinde ızgara değil, gürültü. */
const CELL = " · "

function isTableRow(line) {
  const s = line.trim()
  return s.startsWith("|") && s.endsWith("|") && s.length > 2
}

/** `|---|:--:|` gibi hizalama satırı — düz metinde karşılığı yok. */
function isTableDivider(line) {
  return /^\s*\|(\s*:?-{2,}:?\s*\|)+\s*$/.test(line)
}

function tableRowToText(line) {
  return line
    .trim()
    .slice(1, -1)
    .split("|")
    .map((c) => c.trim())
    .filter((c) => c !== "")
    .join(CELL)
}

/** Satır içi işaretler. Sıra önemli: bağlantılar kalın/italikten ÖNCE. */
function stripInline(text) {
  return (
    text
      // Görsel: metinde gösterilecek şey alt yazısıdır, adresi değil.
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
      // Bağlantı: adres KORUNUR — paylaşılan bir cevapta bağlantı çoğu zaman
      // asıl değerdir. Metin zaten adresin kendisiyse iki kez yazılmaz.
      .replace(/\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, label, url) =>
        !label || label === url ? url : `${label} (${url})`,
      )
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\*\*\*([^*]+)\*\*\*/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/~~([^~]+)~~/g, "$1")
      // Tek yıldız/alt çizgi yalnız KELİME SINIRINDA sökülür: `a*b*c` ve
      // `dosya_adı_v2` gibi metinlerde işaret vurgu değil, metnin kendisi.
      .replace(/(^|\s)\*([^*\n]+)\*(?=\s|$|[.,;:!?)])/g, "$1$2")
      .replace(/(^|\s)_([^_\n]+)_(?=\s|$|[.,;:!?)])/g, "$1$2")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/?[a-z][^>]*>/gi, "")
  )
}

export function markdownToPlainText(markdown) {
  const src = String(markdown ?? "").replace(/\r\n?/g, "\n")
  if (!src.trim()) return ""

  const out = []
  let inFence = false

  for (const raw of src.split("\n")) {
    // Kod bloğu: çitler düşer, İÇERİK OLDUĞU GİBİ kalır. Bir kod parçasının
    // girintisi ve işaretleri anlamının parçası; onları sadeleştirmek
    // paylaşılan şeyi bozardı.
    if (/^\s*(```|~~~)/.test(raw)) {
      inFence = !inFence
      continue
    }
    if (inFence) {
      out.push(raw)
      continue
    }

    if (isTableDivider(raw)) continue
    if (isTableRow(raw)) {
      out.push(stripInline(tableRowToText(raw)))
      continue
    }

    let line = raw
    // Yatay çizgi
    if (/^\s*([-*_]\s*){3,}$/.test(line)) {
      out.push("")
      continue
    }
    line = line.replace(/^\s{0,3}#{1,6}\s+/, "")
    line = line.replace(/^\s*>\s?/, "")
    // Madde imi: `-`/`*`/`+` yerine tek bir görünür im. Girinti KORUNUR,
    // iç içe listelerin kademesi paylaşılan metinde de okunsun.
    line = line.replace(/^(\s*)[-*+]\s+/, "$1• ")
    line = line.replace(/^(\s*)(\d+)[.)]\s+/, "$1$2. ")
    out.push(stripInline(line))
  }

  return (
    out
      .join("\n")
      // Üç ve daha fazla boş satır tek boşluğa iner: markdown'da yapıyı
      // taşıyan boşluk, düz metinde yalnız boşluktur.
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+$/gm, "")
      .trim()
  )
}
