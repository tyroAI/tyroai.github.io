/** Original vector mascot. No image assets or external dependencies. */
export const expressions = [
  ["neutral", "Nötr", "Buradayım. Hazır olduğunda başlayabiliriz."],
  ["attentive", "Dikkatli", "Tüm dikkatim sende."],
  ["happy", "Mutlu", "Güzel bir sonuç."],
  ["excited", "Heyecanlı", "Yeni bir şeye başlayalım."],
  ["curious", "Meraklı", "Biraz daha yakından bakalım."],
  ["thinking", "Düşünceli", "Olasılıkları değerlendiriyorum."],
  ["surprised", "Şaşkın", "Bu beklenmedik bir gelişme."],
  ["sad", "Üzgün", "Bir şeyler yolunda gitmedi."],
  ["determined", "Kararlı", "Çözümü birlikte bulacağız."],
  ["wink", "Göz kırp", "Anlaştık."],
  ["sleepy", "Uykulu", "Biraz yavaşlayalım."],
  ["sleeping", "Uyuyor", "İhtiyacın olduğunda buradayım."],
  ["listening", "Dinliyor", "Seni dinliyorum."],
  ["processing", "Düşünüyor", "Verileri bir araya getiriyorum."],
  ["speaking", "Konuşuyor", "Bulgularımı paylaşıyorum."],
]
export function eyesMarkup(expression = "neutral", color = "currentColor") {
  const pill = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w / 2}"/>`
  const path = (d) =>
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round"/>`
  let shapes
  switch (expression) {
    case "happy":
      shapes = path("M171 247 Q186 218 201 247 M239 247 Q254 218 269 247")
      break
    case "excited":
      shapes = pill(169, 212, 32, 59) + pill(239, 212, 32, 59)
      break
    case "curious":
      shapes = pill(171, 212, 29, 54) + pill(241, 228, 25, 34)
      break
    case "thinking":
    case "processing":
      shapes = pill(171, 242, 29, 12) + pill(240, 218, 29, 44)
      break
    case "surprised":
      shapes = '<circle cx="186" cy="240" r="19"/><circle cx="254" cy="240" r="19"/>'
      break
    case "sad":
      shapes =
        '<path d="M170 231 L201 215 V252 Q201 267 185 267 Q170 267 170 252Z M239 215 L270 231 V252 Q270 267 254 267 Q239 267 239 252Z"/>'
      break
    case "determined":
      shapes =
        '<path d="M170 218 L201 234 V251 Q201 265 185 265 Q170 265 170 251Z M239 234 L270 218 V251 Q270 265 254 265 Q239 265 239 251Z"/>'
      break
    case "wink":
      shapes = pill(171, 217, 29, 47) + path("M240 244 Q254 236 269 244")
      break
    case "sleepy":
      shapes = pill(171, 244, 29, 10) + pill(240, 244, 29, 10)
      break
    case "sleeping":
      shapes = path("M173 240 Q186 250 199 240 M241 240 Q254 250 267 240")
      break
    case "attentive":
    case "listening":
      shapes = pill(172, 212, 27, 56) + pill(241, 212, 27, 56)
      break
    default:
      shapes = pill(171, 220, 29, 44) + pill(240, 220, 29, 44)
  }
  return `<g fill="${color}">${shapes}</g>`
}

export const palettes = [
  ["insta", "Insta", ["#ffd65b", "#f34c9b", "#8534ba"]],
  ["ocean-breeze", "Ocean Breeze", ["#24c6f2", "#12aedd", "#06bea7"]],
  ["ocean-breeze-v2", "Ocean Breeze v2", ["#007aaa", "#00b8dd", "#36cddd"]],
  ["arctic-mint", "Arctic Mint", ["#245eff", "#12cbbb", "#a0f5cf"]],
  ["rose-blush", "Rose Blush", ["#8e063d", "#ed668e", "#ffc0c8"]],
  ["peach-sorbet", "Peach Sorbet", ["#ff7852", "#ffb0a2", "#d890f0"]],
  ["sunset", "Sunset Gradient", ["#ff7900", "#ffb900", "#ffe32a"]],
  ["pastel-lavender", "Pastel Lavender", ["#6640a5", "#9970cb", "#c5a3e5"]],
  ["green-garden", "Green Garden", ["#355622", "#6d913b", "#b3ca7c"]],
  ["fiery-red", "Fiery Red", ["#751b10", "#ee4c13", "#ffab0c"]],
  ["chocolate", "Chocolate Delight", ["#29100b", "#783719", "#c77812"]],
  ["midnight", "Midnight", ["#17263f", "#516582", "#b1c7e9"]],
]
export const agentStates = [
  ["greeting", "Selamlıyor", "Hafifçe yükselir, başını eğip selam verir.", "happy"],
  ["idle", "Idle", "Sakin bir nefes, hafif süzülme.", "neutral"],
  ["thinking", "Düşünüyor", "İç ışık döner, bakış yukarı kayar.", "thinking"],
  ["speaking", "Konuşuyor", "Gözler ve küre konuşma ritmiyle hareket eder.", "neutral"],
  ["orbiting", "Yörüngede", "Işık kürenin çevresinde dolaşır.", "curious"],
  ["listening", "Dinliyor", "Hafifçe yaklaşır, dikkatle dinler.", "attentive"],
  ["logging-in", "Giriş yapıyor", "Işık halkası bağlantıyı kurar.", "attentive"],
  ["searching", "Araştırıyor", "Bakış iki yana tarar, ışık takip eder.", "curious"],
  ["planning", "Planlıyor", "Üç adımlı, ölçülü bir düşünme ritmi.", "thinking"],
  ["working", "Çalışıyor", "Kararlı bir ritimle işine odaklanır.", "determined"],
  ["syncing", "Senkronize", "İki ışık akışı birbirini yakalar.", "neutral"],
  ["waiting", "Onay bekliyor", "Hafifçe yana eğilir ve bekler.", "curious"],
  ["success", "Tamamlandı", "Kısa bir sevinç hareketi, ardından sakinleşir.", "happy"],
  ["error", "Sorun oluştu", "Kısa bir baş hareketiyle sorunu bildirir.", "sad"],
  ["sleeping", "Uyku", "Hareketler yavaşlar, gözler kapanır.", "sleeping"],
  ["thumbs-up", "Thumbs up", "Aksiyon başarıyla tamamlandı.", "happy"],
  ["thumbs-down", "Thumbs down", "Aksiyon tamamlanamadı.", "sad"],
]
const validHex = (value) => /^#[a-f0-9]{6}$/i.test(value || "")
const mix = (a, b, t) =>
  "#" +
  [1, 3, 5]
    .map((i) =>
      Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")
/*
 * YUVARLAK GÖZLÜK — isteğe bağlı aksesuar (`glasses: true`; To-Do'nun panolu
 * küresi, 2026-09-30). ⚠️ Bakış grubunun (`data-look`) İÇİNDE ama göz kırpan
 * `lids` grubunun DIŞINDA: imleci izleyen bakışla birlikte kayar, göz kırpınca
 * çerçeve ezilmez; yüz animasyonunu (`face`) ayrı bir kuralla aynen alır.
 * Camlar gözlerin merkezinde (185.5 · 254.5, 242), r=32 — varsayılan göz
 * hapları çerçevenin içinde kalıyor.
 */
function specsMarkup(id, frame) {
  const lens = (cx) =>
    `<circle cx="${cx}" cy="242" r="32" fill="#ffffff" fill-opacity=".13" stroke="${frame}" stroke-width="7"/>`
  return `<g id="${id}" fill="none" stroke-linecap="round">${lens(185.5)}${lens(254.5)}
 <path d="M216 236Q220 228 224 236" stroke="${frame}" stroke-width="6"/>
 <path d="M154 234L117 222M286 234L323 222" stroke="${frame}" stroke-width="6" opacity=".8"/>
 <path d="M164 226Q170 215 182 212M233 226Q239 215 251 212" stroke="#ffffff" stroke-width="4" opacity=".55"/></g>`
}

/*
 * KUTLAMA KIYAFETİ — isteğe bağlı (`costume: {hat, outfit, years}`; Akışım'ın
 * yardım kartındaki kutlama sahnesi, kişinin kendi doğum günü / iş yıl dönümü,
 * 2026-10-02). Elde tutulan nesneler (pasta, balon ipleri) sahnenin kendisinde
 * (`myspace/CelebrationOrb.jsx`); burada yalnız GİYİLEN şey: şapka ve madalya.
 * ⚠️ Gövde grubunun (`orb`) İÇİNDE, bakışın (`data-look`) DIŞINDA: küre
 * zıplayınca şapka da zıplar, gözler imleci izlerken şapka kaymaz.
 * ⚠️ Şapka TUVALİN ÜSTÜNDEN TAŞAR (y < 0; SVG `overflow: visible`): yer açmak
 * çağıranın işi. Madalya gözlerin ALTINDA (y ≈ 268–347).
 * ⚠️ Gölgelendirme gerçek: külahın şeritleri koninin eğrisini izler ve üstüne
 * soldan ışık, sağdan gölge vuran bir katman biner; silindirin gövdesi
 * silindir gibi (koyu–açık–koyu), kenarında ışık çizgisi var. İlk tur düz
 * çizgili bir üçgendi ve "çıkartma gibi" okunuyordu.
 * Renkler paletten (şeritler, kurdele, bant); madalya ALTIN.
 */
function costumeMarkup(p, costume, { b, c, deep, light }) {
  if (!costume) return ""
  const parts = []
  if (costume.hat === "party") {
    const trim = mix(b, deep, 0.5),
      stripe2 = mix(b, deep, 0.3)
    parts.push(`<g transform="rotate(20 238 70)">
 <ellipse cx="238" cy="78" rx="56" ry="11" fill="${deep}" opacity=".42" filter="url(#${p("soft")})"/>
 <path d="${PARTY_HAT}" fill="url(#${p("hat-fill")})"/>
 <g clip-path="url(#${p("hat-clip")})" fill="none">
  <path d="M150 50Q238 74 326 50" stroke="${b}" stroke-width="14"/>
  <path d="M150 20Q238 42 326 20" stroke="${stripe2}" stroke-width="12"/>
  <path d="M150-8Q238 12 326-8" stroke="${b}" stroke-width="11"/>
  <path d="M150-34Q238-16 326-34" stroke="${stripe2}" stroke-width="10"/>
  <circle cx="226" cy="40" r="3" fill="#ffffff" opacity=".9"/><circle cx="252" cy="8" r="2.6" fill="#ffffff" opacity=".9"/><circle cx="232" cy="-22" r="2.2" fill="#ffffff" opacity=".9"/><circle cx="214" cy="12" r="2.2" fill="#f6c54a"/><circle cx="262" cy="44" r="2.4" fill="#f6c54a"/>
  <rect x="150" y="-80" width="180" height="170" fill="url(#${p("hat-shade")})"/>
 </g>
 <path d="${PARTY_HAT}" fill="none" stroke="${trim}" stroke-width="2.5" stroke-linejoin="round"/>
 <path d="M190 69Q238 87 286 69" fill="none" stroke="${mix(c, "#ffffff", 0.5)}" stroke-width="12" stroke-linecap="round"/>
 <path d="M190 68Q238 86 286 68" fill="none" stroke="#ffffff" stroke-width="13" stroke-linecap="round" stroke-dasharray=".1 12.5"/>
 <path d="M196 65Q238 80 280 65" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round" opacity=".9"/>
 <g transform="translate(238 -58)">
  <circle r="16" fill="${mix(c, "#ffffff", 0.45)}"/>
  <circle cx="-3" cy="-3" r="12.5" fill="#ffffff"/>
  <circle cx="9" cy="-8" r="6" fill="#ffffff"/><circle cx="-12" cy="4" r="6" fill="#ffffff"/><circle cx="7" cy="9" r="6" fill="${mix(c, "#ffffff", 0.65)}"/><circle cx="-6" cy="-12" r="5" fill="#ffffff"/>
  <circle cx="-5" cy="-6" r="4" fill="#ffffff" opacity=".9"/>
 </g>
 </g>`)
  } else if (costume.hat === "tophat") {
    const ink = mix(b, "#0b0f19", 0.86),
      bow = mix(b, deep, 0.15)
    parts.push(`<g transform="rotate(-10 214 64)">
 <ellipse cx="214" cy="74" rx="80" ry="11" fill="${deep}" opacity=".45" filter="url(#${p("soft")})"/>
 <path d="${TOP_HAT}" fill="url(#${p("hat-fill")})"/>
 <path d="M166 36Q214 47 262 36L263 55Q214 66 165 55Z" fill="url(#${p("band")})"/>
 <path d="M166 38Q214 49 262 38" fill="none" stroke="#ffffff" stroke-opacity=".35" stroke-width="1.5"/>
 <g transform="translate(244 47)">
  <path d="M0 0L-15-9Q-18 0-15 9Z" fill="${bow}" stroke="${mix(bow, deep, 0.4)}" stroke-width="1.2" stroke-linejoin="round"/>
  <path d="M0 0L15-9Q18 0 15 9Z" fill="${bow}" stroke="${mix(bow, deep, 0.4)}" stroke-width="1.2" stroke-linejoin="round"/>
  <rect x="-4" y="-5" width="8" height="10" rx="3" fill="${mix(bow, deep, 0.35)}"/>
 </g>
 <path d="${TOP_HAT}" fill="none" stroke="${light}" stroke-opacity=".3" stroke-width="2"/>
 <ellipse cx="214" cy="-22" rx="45" ry="8.5" fill="${mix(b, "#0b0f19", 0.74)}" stroke="${light}" stroke-opacity=".4" stroke-width="2"/>
 <path d="M178-14Q175 12 178 32" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round" opacity=".16"/>
 <ellipse cx="214" cy="64" rx="88" ry="16" fill="${ink}" stroke="${light}" stroke-opacity=".55" stroke-width="2.5"/>
 <path d="M134 60Q214 46 294 60" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" opacity=".28"/>
 </g>`)
  }
  if (costume.outfit === "medal") {
    const y = Number(costume.years)
    const years = Number.isFinite(y) && y >= 1 && y <= 99 ? Math.round(y) : null
    const label =
      years === null
        ? `<path d="M220 301l4.4 9 10 1.4-7.2 7 1.7 9.9-8.9-4.7-8.9 4.7 1.7-9.9-7.2-7 10-1.4Z" fill="#7a4d00" opacity=".85"/>`
        : `<text x="220" y="${years > 9 ? 326 : 328}" text-anchor="middle" font-family="Inter Variable, Inter, system-ui, sans-serif" font-weight="800" font-size="${years > 9 ? 23 : 28}" letter-spacing="-1" fill="#6b4300">${years}</text>`
    parts.push(`<g>
 <path d="M170 272L194 268L228 309L210 315Z" fill="${b}" stroke="${mix(b, deep, 0.4)}" stroke-width="1.5" stroke-linejoin="round"/>
 <path d="M270 272L246 268L212 309L230 315Z" fill="${mix(c, "#ffffff", 0.15)}" stroke="${mix(c, deep, 0.4)}" stroke-width="1.5" stroke-linejoin="round"/>
 <path d="M180 272L191 270L221 307" fill="none" stroke="#ffffff" stroke-width="2" opacity=".35"/>
 <ellipse cx="220" cy="348" rx="31" ry="5.5" fill="${deep}" opacity=".35" filter="url(#${p("soft")})"/>
 <circle cx="220" cy="318" r="29" fill="url(#${p("gold")})" stroke="#b07a10" stroke-width="2.5"/>
 <circle cx="220" cy="318" r="22.5" fill="none" stroke="#fff3c4" stroke-width="2" opacity=".75"/>
 <path d="M202 306Q208 296 219 294" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity=".7"/>
 ${label}
 </g>`)
  }
  return `<g id="${p("costume")}" data-costume="${costume.hat || ""}:${costume.outfit || ""}">${parts.join("")}</g>`
}
const PARTY_HAT = "M190 68L238-56L286 68Q238 86 190 68Z"
const TOP_HAT = "M164 62L170-20Q214-29 258-20L264 62Q214 74 164 62Z"
/** Yalnız tanınan değerler geçer — SVG dizesine çağıranın metni hiç girmez. */
function normaliseCostume(v) {
  if (!v || typeof v !== "object") return null
  const hat = ["party", "tophat"].includes(v.hat) ? v.hat : null
  const outfit = v.outfit === "medal" ? "medal" : null
  return hat || outfit ? { hat, outfit, years: v.years } : null
}
function costumeDefs(p, costume, { b, c, deep }) {
  if (!costume) return ""
  const defs = []
  if (costume.hat === "party") {
    defs.push(`<clipPath id="${p("hat-clip")}"><path d="${PARTY_HAT}"/></clipPath>`)
    defs.push(
      `<linearGradient id="${p("hat-fill")}" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#ffffff"/><stop offset="1" stop-color="${mix(c, "#ffffff", 0.62)}"/></linearGradient>`,
    )
    defs.push(
      `<linearGradient id="${p("hat-shade")}" x1="0" y1="0" x2="1" y2="0"><stop offset=".22" stop-color="#ffffff" stop-opacity=".38"/><stop offset=".46" stop-color="#ffffff" stop-opacity="0"/><stop offset=".62" stop-color="#000000" stop-opacity="0"/><stop offset="1" stop-color="${deep}" stop-opacity=".42"/></linearGradient>`,
    )
  } else if (costume.hat === "tophat") {
    defs.push(
      `<linearGradient id="${p("hat-fill")}" x1="0" y1="0" x2="1" y2="0"><stop stop-color="${mix(b, "#0b0f19", 0.9)}"/><stop offset=".22" stop-color="${mix(b, "#0b0f19", 0.62)}"/><stop offset=".5" stop-color="${mix(b, "#0b0f19", 0.8)}"/><stop offset="1" stop-color="${mix(b, "#0b0f19", 0.94)}"/></linearGradient>`,
    )
    defs.push(
      `<linearGradient id="${p("band")}" x1="0" y1="0" x2="1" y2="0"><stop stop-color="${mix(b, deep, 0.2)}"/><stop offset=".3" stop-color="${b}"/><stop offset="1" stop-color="${mix(c, deep, 0.25)}"/></linearGradient>`,
    )
  }
  if (costume.outfit === "medal") {
    defs.push(
      `<radialGradient id="${p("gold")}" cx="38%" cy="32%" r="75%"><stop stop-color="#fff1b8"/><stop offset=".45" stop-color="#f6c54a"/><stop offset="1" stop-color="#c98a14"/></radialGradient>`,
    )
  }
  return defs.join("")
}

function renderV2Mascot(options = {}) {
  const stateAliases = { processing: "thinking", listening: "listening", speaking: "speaking" }
  const state = agentStates.some((s) => s[0] === options.state)
    ? options.state
    : stateAliases[options.expression] || "idle"
  const stateInfo = agentStates.find((s) => s[0] === state)
  const expression = expressions.some((e) => e[0] === options.expression)
    ? options.expression
    : stateInfo[3]
  const id = String(options.id || "tyro").replace(/[^a-zA-Z0-9_-]/g, "") || "tyro"
  const palette = palettes.find((p) => p[0] === options.palette) || palettes[2]
  const custom =
    Array.isArray(options.colors) && options.colors.length === 3 && options.colors.every(validHex)
  const colors = custom ? options.colors : palette[2]
  const [a, b, c] = colors
  const accent = validHex(options.accent) ? options.accent : b
  const deep = mix(a, "#030913", 0.8),
    shade = mix(a, "#071020", 0.5),
    light = mix(c, "#ffffff", 0.74)
  const clamp = (v, d, lo, hi) => Math.max(lo, Math.min(hi, Number.isFinite(v) ? v : d))
  const motion = options.motion !== false,
    blink = options.blink !== false && !["sleeping", "sleepy", "happy", "wink"].includes(expression)
  const glow = clamp(options.glow, 0.55, 0, 1),
    gloss = clamp(options.gloss, 0.8, 0, 1),
    speed = clamp(options.speed, 1, 0.4, 2)
  const p = (name) => `${id}-${name}`
  const x = clamp(options.lookX, 0, -12, 12),
    y = clamp(options.lookY, 0, -9, 9)
  const anim = (name, duration, count = "infinite", delay = 0) =>
    motion
      ? `animation:${p(name)} ${duration / speed}s ${delay / speed}s ease-in-out ${count} both;`
      : ""
  const bodyAnim = {
    "thumbs-up": ["celebrate", 1.3, "1"],
    "thumbs-down": ["shake", 0.65, "1"],
    greeting: ["greet", 2.4, "1"],
    idle: ["float", 6],
    thinking: ["tilt", 5],
    speaking: ["body-talk", 1.1],
    orbiting: ["orbit", 6],
    listening: ["listen", 3.2],
    "logging-in": ["connect", 3],
    searching: ["scan-body", 5],
    planning: ["plan", 4.5],
    working: ["work", 2.2],
    syncing: ["float", 3],
    waiting: ["wait", 7],
    success: ["celebrate", 1.3, "1"],
    error: ["shake", 0.65, "1"],
    sleeping: ["breathe", 9],
  }[state]
  const faceAnim = {
    thinking: ["think", 4],
    speaking: ["talk", 0.8],
    orbiting: ["yaw", 6],
    listening: ["focus", 3.2],
    searching: ["scan", 5],
    planning: ["steps", 4.5],
    working: ["focus", 2.2],
    waiting: ["think", 7],
  }[state]
  const ringStates = ["orbiting", "logging-in", "syncing", "searching"]
  const ring = ringStates.includes(state)
  const label = expressions.find((e) => e[0] === expression)[1]
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 470" role="img" aria-labelledby="${p("title")}" style="display:block;width:100%;height:auto;overflow:visible"><title id="${p("title")}">TYRO — ${stateInfo[1]}, ${label}</title>
 <defs>
 <clipPath id="${p("clip")}"><circle cx="220" cy="221" r="170"/></clipPath>
 <radialGradient id="${p("halo")}"><stop stop-color="${accent}" stop-opacity=".32"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
 <radialGradient id="${p("body")}" cx="30%" cy="22%" r="82%"><stop stop-color="${mix(a, light, 0.22)}"/><stop offset=".33" stop-color="${shade}"/><stop offset=".7" stop-color="${deep}"/><stop offset=".9" stop-color="${mix(b, deep, 0.6)}"/><stop offset="1" stop-color="${mix(c, deep, 0.2)}"/></radialGradient>
 <radialGradient id="${p("bloom")}"><stop stop-color="${b}" stop-opacity=".95"/><stop offset=".44" stop-color="${b}" stop-opacity=".58"/><stop offset="1" stop-color="${b}" stop-opacity="0"/></radialGradient>
 <radialGradient id="${p("color")}"><stop stop-color="${c}" stop-opacity=".87"/><stop offset=".5" stop-color="${c}" stop-opacity=".38"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>
 <radialGradient id="${p("first")}"><stop stop-color="${a}"/><stop offset="1" stop-color="${a}" stop-opacity="0"/></radialGradient>
 <radialGradient id="${p("depth")}" cx="49%" cy="43%" r="57%"><stop offset=".35" stop-color="${deep}" stop-opacity="0"/><stop offset=".74" stop-color="${deep}" stop-opacity=".14"/><stop offset=".9" stop-color="${deep}" stop-opacity=".77"/><stop offset=".97" stop-color="${deep}" stop-opacity=".32"/><stop offset="1" stop-color="${light}" stop-opacity=".45"/></radialGradient>
 <radialGradient id="${p("fresnel")}"><stop offset=".82" stop-color="${light}" stop-opacity="0"/><stop offset=".965" stop-color="${light}" stop-opacity=".07"/><stop offset="1" stop-color="${light}" stop-opacity=".55"/></radialGradient>
 <linearGradient id="${p("rim")}" x1="10%" y1="0" x2="85%" y2="100%"><stop stop-color="${light}"/><stop offset=".32" stop-color="${c}" stop-opacity=".15"/><stop offset=".64" stop-color="${deep}" stop-opacity=".8"/><stop offset="1" stop-color="${light}" stop-opacity=".7"/></linearGradient>
 <linearGradient id="${p("shine")}" x1="0" y1="0" x2="65%" y2="100%"><stop stop-color="#ffffff" stop-opacity=".95"/><stop offset=".4" stop-color="${light}" stop-opacity=".42"/><stop offset="1" stop-color="${light}" stop-opacity="0"/></linearGradient>
 <linearGradient id="${p("eye")}" x1="0" y1="0" x2="0" y2="100%"><stop stop-color="#ffffff"/><stop offset="1" stop-color="${mix(c, "#ffffff", 0.85)}"/></linearGradient>
 <filter id="${p("soft")}" x="-60%" y="-100%" width="220%" height="300%"><feGaussianBlur stdDeviation="8"/></filter>
 <filter id="${p("blur")}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="13"/></filter>
 <filter id="${p("light")}" x="-80%" y="-100%" width="260%" height="300%"><feGaussianBlur stdDeviation="7"/></filter>
 ${costumeDefs(p, normaliseCostume(options.costume), { b, c, deep })}
 </defs>
 <style>
 @keyframes ${p("greet")}{0%{transform:translateY(0) rotate(0deg)}25%{transform:translateY(-14px) rotate(-9deg)}45%{transform:translateY(-10px) rotate(8deg)}65%{transform:translateY(-6px) rotate(-5deg)}82%{transform:translateY(2px) rotate(2deg)}100%{transform:translateY(0) rotate(0deg)}}
 @keyframes ${p("float")}{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
 @keyframes ${p("tilt")}{0%,100%{transform:rotate(-3deg) translateY(0)}50%{transform:rotate(4deg) translateY(-5px)}}
 @keyframes ${p("body-talk")}{0%,100%{transform:scale(1)}25%{transform:scale(1.012,.985)}60%{transform:scale(.99,1.015)}80%{transform:scale(1.008,.997)}}
 @keyframes ${p("orbit")}{0%,100%{transform:translate(0,-5px) rotate(0deg)}25%{transform:translate(10px,0) rotate(4deg)}50%{transform:translate(0,5px)}75%{transform:translate(-10px,0) rotate(-4deg)}}
 @keyframes ${p("listen")}{0%,100%{transform:scale(1.015) rotate(-3deg)}50%{transform:scale(1.04) rotate(-1deg)}}
 @keyframes ${p("connect")}{0%,100%{transform:scale(.96)}60%{transform:scale(1.015)}}
 @keyframes ${p("scan-body")}{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}
 @keyframes ${p("plan")}{0%,100%{transform:translateY(0)}30%{transform:translateY(-4px)}60%{transform:translateY(-8px)}}
 @keyframes ${p("work")}{0%,100%{transform:translateY(0) rotate(-1deg)}50%{transform:translateY(-4px) rotate(1deg)}}
 @keyframes ${p("wait")}{0%,80%,100%{transform:rotate(-6deg)}88%{transform:rotate(-2deg)}}
 @keyframes ${p("celebrate")}{0%{transform:translateY(0)}30%{transform:translateY(-23px) rotate(-7deg)}55%{transform:translateY(3px) scale(1.025,.98)}75%{transform:translateY(-6px)}100%{transform:translateY(0)}}
 @keyframes ${p("shake")}{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-7px) rotate(-3deg)}40%,80%{transform:translateX(7px) rotate(3deg)}}
 @keyframes ${p("breathe")}{0%,100%{transform:scale(.98)}50%{transform:scale(1)}}
 @keyframes ${p("blink")}{0%,42%,45%,89%,92%,100%{transform:scaleY(1)}43.5%,90.5%{transform:scaleY(.08)}}
 @keyframes ${p("talk")}{0%,100%{transform:scaleY(1)}22%{transform:scaleY(.7)}44%{transform:scaleY(1.12)}67%{transform:scaleY(.9)}82%{transform:scaleY(1.05)}}
 @keyframes ${p("think")}{0%,100%{transform:translate(-6px,-9px)}50%{transform:translate(5px,-6px)}}
 @keyframes ${p("yaw")}{0%,100%{transform:translateX(0) scaleX(1)}25%{transform:translateX(32px) scaleX(.8)}50%{transform:translateX(0) scaleX(1)}75%{transform:translateX(-32px) scaleX(.8)}}
 @keyframes ${p("focus")}{0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.12)}}
 @keyframes ${p("scan")}{0%,15%,100%{transform:translateX(-23px)}45%,65%{transform:translateX(23px)}}
 @keyframes ${p("steps")}{0%,100%{transform:translate(-10px,-6px)}33%{transform:translate(0,-10px)}66%{transform:translate(10px,-6px)}}
 @keyframes ${p("flow")}{0%,100%{transform:rotate(-15deg) scale(1)}50%{transform:rotate(22deg) scale(1.08)}}
 @keyframes ${p("spin")}{to{transform:rotate(360deg)}}
 @keyframes ${p("pulse")}{0%,100%{opacity:.35}50%{opacity:.85}}
 @keyframes ${p("ring")}{0%{stroke-dashoffset:0}100%{stroke-dashoffset:-1180}}
 #${p("orb")}{transform-origin:220px 221px;${anim(...bodyAnim)}}
 #${p("lids")}{transform-origin:220px 243px;${blink ? anim("blink", 7.6) : ""}}
 #${p("face")}{transform-origin:220px 243px;${faceAnim ? anim(...faceAnim) : ""}}
 ${options.glasses ? `#${p("specs")}{transform-origin:220px 243px;${faceAnim ? anim(...faceAnim) : ""}}` : ""}
 #${p("fluid")}{transform-origin:220px 221px;${anim(state === "thinking" || state === "syncing" ? "spin" : "flow", state === "thinking" ? 14 : state === "syncing" ? 8 : 18)}}
 #${p("reflection")}{transform-origin:220px 221px;${anim("flow", 23)}}
 #${p("ring")}{${motion ? `animation:${p("ring")} ${3 / speed}s linear infinite;` : ""}}
 #${p("pulse")}{${anim("pulse", state === "speaking" ? 1.1 : 3)}}
 @media(prefers-reduced-motion:reduce){#${p("orb")},#${p("lids")},#${p("face")},${options.glasses ? `#${p("specs")},` : ""}#${p("fluid")},#${p("reflection")},#${p("ring")},#${p("pulse")}{animation:none!important}}
 </style>
 <ellipse cx="220" cy="420" rx="79" ry="9" fill="${shade}" opacity=".2" filter="url(#${p("soft")})"/>
 <g id="${p("orb")}">
 <circle cx="220" cy="221" r="213" fill="url(#${p("halo")})" opacity="${glow}"/>
 ${ring ? `<ellipse cx="220" cy="221" rx="203" ry="74" transform="rotate(-24 220 221)" fill="none" stroke="${c}" stroke-opacity=".16" stroke-width="1.2"/>` : ""}
 <circle cx="220" cy="221" r="171" fill="url(#${p("body")})" stroke="url(#${p("rim")})" stroke-width="2"/>
 <g clip-path="url(#${p("clip")})">
 <g id="${p("fluid")}">
 <ellipse cx="141" cy="157" rx="133" ry="130" fill="url(#${p("first")})"/>
 <ellipse cx="227" cy="272" rx="154" ry="138" fill="url(#${p("bloom")})"/>
 <ellipse cx="324" cy="227" rx="111" ry="163" transform="rotate(32 324 227)" fill="url(#${p("color")})"/>
 <path d="M93 320C139 224 208 350 308 210C356 144 366 113 355 84" stroke="${c}" stroke-opacity=".3" stroke-width="24" fill="none" filter="url(#${p("blur")})"/>
 </g>
 <circle cx="220" cy="221" r="170" fill="url(#${p("depth")})"/>
 <circle cx="220" cy="221" r="170" fill="url(#${p("fresnel")})"/>
 <g id="${p("reflection")}" opacity="${gloss}">
 <ellipse cx="156" cy="108" rx="83" ry="26" transform="rotate(-29 156 108)" fill="url(#${p("shine")})"/>
 <ellipse cx="124" cy="105" rx="30" ry="9" transform="rotate(-35 124 105)" fill="#ffffff" opacity=".58" filter="url(#${p("soft")})"/>
 <path d="M72 173C92 102 152 61 213 56" fill="none" stroke="${light}" stroke-width="3" opacity=".8"/>
 <path d="M320 112C350 143 368 177 370 211" fill="none" stroke="${light}" stroke-width="9" opacity=".22" filter="url(#${p("soft")})"/>
 </g>
 <path d="M116 350Q226 418 331 334" fill="none" stroke="${c}" stroke-width="13" opacity="${0.2 + gloss * 0.25}" filter="url(#${p("soft")})"/>
 <path d="M137 368Q231 408 314 356" fill="none" stroke="${light}" stroke-width="1.7" opacity="${gloss * 0.62}"/>
 <ellipse cx="216" cy="242" rx="80" ry="50" fill="${deep}" opacity=".2" filter="url(#${p("blur")})"/>
 <g data-look="true" transform="translate(${x} ${y})"><g id="${p("lids")}"><g id="${p("face")}">
 <g opacity="${glow * 0.75}" filter="url(#${p("light")})">${eyesMarkup(expression, light)}</g>
 ${eyesMarkup(expression, `url(#${p("eye")})`)}
 </g></g>${options.glasses ? specsMarkup(p("specs"), deep) : ""}</g></g>
 ${costumeMarkup(p, normaliseCostume(options.costume), { b, c, deep, light })}
 ${ring ? `<g transform="rotate(-24 220 221)"><ellipse id="${p("ring")}" cx="220" cy="221" rx="203" ry="74" fill="none" stroke="${light}" stroke-opacity=".8" stroke-width="2" stroke-linecap="round" stroke-dasharray="${state === "syncing" ? "55 240 55 240" : "70 1110"}"/></g>` : ""}
 ${state === "listening" ? `<g id="${p("pulse")}" fill="none" stroke="${c}" stroke-width="2" opacity=".5"><path d="M31 189Q20 221 31 253 M409 189Q420 221 409 253"/></g>` : ""}
 </g></svg>`
}

export function renderMascot(options = {}) {
  let svg = renderV2Mascot(options)
  const gesture = ["thumbs-up", "thumbs-down"].includes(options.state)
  if (!options.mesh && !gesture) return svg
  const id = String(options.id || "tyro").replace(/[^a-zA-Z0-9_-]/g, "") || "tyro",
    p = (n) => `${id}-${n}`
  const palette = palettes.find((item) => item[0] === options.palette) || palettes[2]
  const colors =
    Array.isArray(options.colors) && options.colors.length === 3 && options.colors.every(validHex)
      ? options.colors
      : palette[2]
  const [a, b, c] = colors,
    light = mix(c, "#ffffff", 0.83),
    shade = mix(a, "#122533", 0.45)
  const down = options.state === "thumbs-down"
  const speed = Math.max(0.4, Math.min(2, Number.isFinite(options.speed) ? options.speed : 1))
  const meshDefs = options.mesh
    ? `
 <radialGradient id="${p("mesh-a")}"><stop stop-color="${a}" stop-opacity=".48"/><stop offset=".4" stop-color="${a}" stop-opacity=".25"/><stop offset=".76" stop-color="${a}" stop-opacity=".08"/><stop offset="1" stop-color="${a}" stop-opacity="0"/></radialGradient>
 <radialGradient id="${p("mesh-b")}"><stop stop-color="${b}" stop-opacity=".5"/><stop offset=".4" stop-color="${b}" stop-opacity=".3"/><stop offset=".76" stop-color="${b}" stop-opacity=".12"/><stop offset="1" stop-color="${b}" stop-opacity="0"/></radialGradient>
 <radialGradient id="${p("mesh-c")}"><stop stop-color="${c}" stop-opacity=".48"/><stop offset=".45" stop-color="${c}" stop-opacity=".3"/><stop offset=".8" stop-color="${c}" stop-opacity=".09"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`
    : ""
  const handDefs = gesture
    ? `
 <linearGradient id="${p("hand")}" x1="0" y1="${down ? "100%" : "0"}" x2="75%" y2="${down ? "0" : "100%"}"><stop stop-color="#ffffff"/><stop offset=".45" stop-color="${light}"/><stop offset="1" stop-color="${mix(b, light, 0.5)}"/></linearGradient>
 <linearGradient id="${p("cuff")}" x1="0" y1="0" x2="100%" y2="100%"><stop stop-color="${mix(b, light, 0.35)}"/><stop offset="1" stop-color="${shade}"/></linearGradient>
 <filter id="${p("hand-shadow")}" x="-60%" y="-60%" width="220%" height="240%"><feGaussianBlur stdDeviation="5"/></filter>`
    : ""
  svg = svg.replace("</defs>", meshDefs + handDefs + "</defs>")
  if (options.mesh) {
    // Broad overlapping radial fields provide a mesh-like wash, with transparent edges.
    const mesh = `<g id="${p("mesh")}" data-mesh="true" aria-hidden="true">
  <ellipse cx="207" cy="203" rx="207" ry="201" fill="url(#${p("mesh-a")})"/>
  <ellipse cx="229" cy="226" rx="208" ry="203" fill="url(#${p("mesh-b")})"/>
  <ellipse cx="221" cy="227" rx="216" ry="167" fill="url(#${p("mesh-c")})"/>
  </g>`
    svg = svg.replace("</style>", "</style>" + mesh)
  }
  if (gesture) {
    const path =
      "M23 47C34 44 42 34 46 23L50 8C52 2 57 1 62 5C68 11 68 23 63 37L84 37C96 37 101 44 98 54L90 85C88 94 81 99 71 99L43 96C35 96 30 91 24 90Z"
    const hand = `<g transform="translate(297 271)"><g id="${p("gesture")}" data-gesture="${options.state}">
   <g transform="translate(3 8)"><path d="${path}" transform="${down ? "translate(0 105) scale(1 -1)" : "translate(0 0)"}" fill="${shade}" opacity=".35" filter="url(#${p("hand-shadow")})"/></g>
   <g transform="${down ? "translate(0 105) scale(1 -1)" : "translate(0 0)"}">
    <path d="${path}" fill="url(#${p("hand")})" stroke="${mix(b, light, 0.28)}" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M71 55H94M69 69H91M65 82H86" fill="none" stroke="${shade}" stroke-opacity=".2" stroke-width="1.7" stroke-linecap="round"/>
    <path d="M52 14C54 9 59 10 60 16M70 42H84" fill="none" stroke="#ffffff" stroke-opacity=".8" stroke-width="2.8" stroke-linecap="round"/>
    <rect x="6" y="47" width="23" height="49" rx="8" fill="url(#${p("cuff")})" stroke="${mix(c, light, 0.55)}" stroke-width="1.3"/>
    <path d="M12 54V85" stroke="${light}" stroke-opacity=".55" stroke-width="2" stroke-linecap="round"/>
   </g>
  </g></g>`
    const css = `
 @keyframes ${p("gesture-enter")}{0%{opacity:0;transform:translate(12px,18px) rotate(${down ? "12" : "-15"}deg) scale(.7)}55%{opacity:1;transform:translate(0,-4px) rotate(${down ? "-3" : "4"}deg) scale(1.04)}100%{opacity:1;transform:translate(0,0) rotate(0) scale(1)}}
 #${p("gesture")}{transform-origin:50px 65px;${options.motion !== false ? `animation:${p("gesture-enter")} ${1.1 / speed}s ease-out 1 both;` : ""}}
 @media(prefers-reduced-motion:reduce){#${p("gesture")}{animation:none!important}}
 `
    svg = svg.replace("</style>", css + "</style>")
    svg = svg.replace(" </g></svg>", hand + " </g></svg>")
  }
  return svg
}
