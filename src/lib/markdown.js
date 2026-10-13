/**
 * Alıntı işaretleri — `[1]` ve altındaki `[1]: cite:1 "..."` tanımları.
 *
 * Copilot Studio "grounded" cevaplarda bunları gönderiyor; Markdown onları
 * BAĞLANTI olarak çiziyor ve kullanıcı "14 gün1" görüyor — tıklanan ama
 * hiçbir yere gitmeyen bir link, çünkü `cite:` şeması tarayıcıda çözülmüyor.
 * Kaynağı gösterecek bir yüzeyimiz olmadığı sürece işaret gürültüdür.
 *
 * GERÇEK adresler korunur: `[1](https://…)` bir kaynağa gidiyor.
 *
 * KOD DIŞINDA çalışır: `dizi[0]` ya da fenced bir blok içindeki `list[1]`
 * alıntı değil, koddur — orada silmek cevabı bozardı.
 */
function stripCitations(chunk) {
  return chunk
    .replace(/^\s*\[\d{1,3}\]:\s*(?!https?:)\S+.*$/gim, "")
    .replace(/\[(\d{1,3})\]\((?!https?:)[^)]*\)/g, "")
    .replace(/(?<=\S)[ \t]?\[\d{1,3}\](?=[\s.,;:!?)\]]|$)/gm, "")
}

/** Kod çitleri ve satır içi kod dışındaki parçalara `fn` uygular. */
function outsideCode(text, fn) {
  return text
    .split(/(```[\s\S]*?```|`[^`\n]*`)/g)
    .map((part, i) => (i % 2 === 1 ? part : fn(part)))
    .join("")
}

// Copilot Studio bot mesajları sık sık ham HTML etiketleri içerir:
// satır-sonu (<br>, <hr>), paragraf (<p>) ve inline biçimlendirme
// (<b>/<strong>, <i>/<em>). Markdown renderer'larımız ham HTML'i kapalı
// tutuyor (react-markdown rehype-raw yok; markdown-it html:false) — bu yüzden
// etiketler düz METİN olarak görünür. Render'dan önce CommonMark karşılıklarına
// çeviriyoruz: <br> → hard break, <hr> → ---, <p> → paragraf boşluğu,
// <b>/<strong> → **, <i>/<em> → *. Ham HTML enjeksiyonu açmadığı için XSS güvenli.
export function normalizeBotMarkdown(text) {
  if (typeof text !== "string") return text ?? ""
  return (
    outsideCode(text, stripCitations)
      .replace(/<br\s*\/?>/gi, "  \n")
      .replace(/<hr\s*\/?>/gi, "\n\n---\n\n")
      // Paragraf etiketleri (bot bunları çoğu zaman kapatmadan ayraç olarak kullanır)
      .replace(/<\/?p\s*\/?>/gi, "\n\n")
      // Kalın: <b>, <strong> (açma ve kapama ikisi de ** olur)
      .replace(/<\/?(?:b|strong)\s*>/gi, "**")
      // İtalik: <i>, <em>
      .replace(/<\/?(?:i|em)\s*>/gi, "*")
      // Markdown karşılığı olmayan inline etiketleri (altı çizili) at
      .replace(/<\/?u\s*>/gi, "")
      // Çizilemeyecek görselleri BAŞTAN at: kaynağı `http(s):` ya da `data:`
      // olmayan bir görsel tarayıcıda kırık ikon olarak çıkar ve cevabın
      // ortasında bir şey bozulmuş gibi durur. Ajan zaman zaman oturuma bağlı
      // ya da göreli bir adres gönderiyor; ikisi de bu sayfadan çözülemez.
      // (İkinci kademe `ChatMessage`'daki `img` bileşeni: yüklenemeyen bir
      // http adresi de sessizce düşer.)
      .replace(/!\[([^\]]*)\]\((?!https?:|data:)[^)]*\)/gi, "")
      // 3+ ardışık boş satırı tek paragraf boşluğuna indir, baş/son boşlukları kırp
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  )
}
