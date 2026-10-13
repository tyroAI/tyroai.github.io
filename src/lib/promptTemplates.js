import {
  ADVANCE_PURPOSES,
  COMPANIES,
  COMPANY_CODES,
  CURRENCIES,
  EXPENSE_CATEGORIES,
} from "@/data/hrValues"
import { getDateTimeFormat } from "@/lib/intl-cache"

/**
 * DOLDURULAN HAZIR SORULAR — Akışım'ın soru kutusu (2026-09-29).
 *
 * İstek: *"İzin iste'ye tıklayınca parantez içinde başlangıç ve bitiş geliyor;
 * başlangıç yazısının üstüne gelince takvim çıksa, kişi seçse, seçtiği
 * parantezin içine gelse. 'Yıllık izin' de vurgulu görünsün, üstüne gelince
 * babalık izni, hastalık izni gibi seçeneklere değiştirebilsin."*
 *
 * Bir şablon, sözlükteki cümle (`myspace.prompt.<ad>`, `{alan}` belirteçleriyle)
 * + buradaki alan tanımlarıdır. Cümle DİLİN kararı — alanların sırası dört
 * dilde farklı ("{start} – {end} tarihleri arasında {kind}…" · "request {kind}
 * from {start} to {end}"); tanım dilden bağımsız.
 *
 * | tür | kutuda | seçici |
 * |---|---|---|
 * | `date` | boşken kesik çerçeveli "başlangıç", doluyken "6 Ekim 2026" | ay ızgarası (`CalendarMonthGrid`'in seçici kipi) |
 * | `choice` | vurgulu seçenek + ok, varsayılanı dolu | seçenek listesi (`search` ise tıklamayla açılan ARAMALI liste) |
 * | `amount` | satır içi yazı alanı, yalnız rakam | — |
 * | `text` | satır içi yazı alanı | — |
 *
 * ⚠️ `after`: bitiş başlangıçtan önce seçilemez (ızgarada kapalı) ve başlangıç
 * bitişin ötesine alınırsa bitiş TEMİZLENİR — tersine dönmüş bir aralık
 * asistana gönderilecek en kötü şey.
 *
 * ⚠️ **MASRAF GİR · AVANS GİR DE ŞABLON** (2026-09-30, istek: *"izin iste'deki
 * gibi masraf ve avansta da gelsin değerler, HR MCP'sinden oku"*). Değerler
 * `data/hrValues.js`te, HR MCP'nin kendi listelerinden üretilmiş bir kopya.
 * Alanlar HR MCP aracının ZORUNLU alanlarının hepsi (`create_employee_expense`:
 * kategori · tarih · tutar · para birimi; `create_cash_advance`: tarih · tutar ·
 * amaç · gidilecek yer · yansıtma şirketi) — eksik her alan asistanın soracağı
 * bir tur, ~20 sn (`promptCatalogue.js`in HIZ SÖZLEŞMESİ). Masrafta "kendim
 * için" cümlenin içinde: asistanın ilk sorusu "kimin adına?" (instructions.md).
 *
 * ⚠️ `optional` + `clause`: doldurulmayan isteğe bağlı alan GÖNDERİLEN metne
 * hiç girmez ("Açıklama: " diye yarım bir cümle gitmesin); doluysa sözlükteki
 * yan cümle (`myspace.clause.<ad>`) değeriyle yazılır.
 *
 * ⚠️ Avansta `document` (belgeli / belgesiz, istek üzerine): ERP alanı
 * `TRYUndocumented` ("Belgesiz", Evet/Hayır); avansların ~%3'ü belgesiz
 * (ölçüldü: 21 / 701). Varsayılan belgeli = ERP'de "Belgesiz: Hayır". Bir tur
 * "+ belgesiz" bas-kapat işareti olarak yapıldı ve geri alındı: seçim gibi
 * durmuyordu, kullanıcı iki seçeneği yan yana görmek istedi. Bir tur da
 * isteğe bağlı yapıldı; değil (istek): cümlenin sonunda "avans: belgeli ˅".
 *
 * ⚠️ `addable` (masrafta açıklama · fiş no · firma adı · lokasyon · kişi
 * sayısı · yansıtma şirketi, istek üzerine): isteğe bağlı alanlar; üçü HR
 * MCP'nin kullanıcıya SORMADAN varsayılanla doldurduğu alanlar. Başta cümlede
 * yoklar; cümlenin sonundaki "+ isteğe bağlı ˅" menüsünde dururlar, seçilince
 * `addDefault(values)` ile girer — varsayılanlı olan VARSAYILANI SEÇİLİ, yazılan
 * alan boş (`OptionalSlots.jsx`).
 * Eklenmeyen alan metne girmez; HR MCP'nin varsayılanı gider. Varsayılanlar
 * HR MCP'ninkiyle aynı olmak zorunda: lokasyon yurtiçi (kategori adında
 * yurtdışı geçiyorsa yurtdışı), kişi 1, şirket kişinin kendi bordro şirketi.
 *
 * Yeni bir şablon eklemek: buraya bir kayıt + sözlükte `{alan}`lı cümle +
 * alan etiketleri (`myspace.slot.<alan>`).
 */
export const LEAVE_KINDS = [
  "annual",
  "excuse",
  "sick",
  "paternity",
  "maternity",
  "marriage",
  "bereavement",
  "unpaid",
]

export const PROMPT_TEMPLATES = {
  leaveRequest: {
    slots: {
      start: { type: "date", required: true },
      end: { type: "date", required: true, after: "start" },
      kind: {
        type: "choice",
        options: LEAVE_KINDS,
        default: "annual",
        optionKey: "myspace.leave.",
      },
    },
  },
  expense: {
    slots: {
      date: { type: "date", required: true, default: "today" },
      amount: { type: "amount", required: true },
      currency: { type: "choice", options: CURRENCIES, default: "TRY" },
      category: { type: "choice", options: EXPENSE_CATEGORIES, required: true, search: true },
      note: { type: "text", addable: true, addDefault: () => "", clause: "myspace.clause.note" },
      receipt: {
        type: "text",
        addable: true,
        addDefault: () => "",
        clause: "myspace.clause.receipt",
      },
      firm: { type: "text", addable: true, addDefault: () => "", clause: "myspace.clause.firm" },
      location: {
        type: "choice",
        options: ["domestic", "abroad"],
        optionKey: "myspace.location.",
        addable: true,
        addDefault: (v) => (/yurtdışı/i.test(v.category ?? "") ? "abroad" : "domestic"),
        clause: "myspace.clause.location",
      },
      people: {
        type: "amount",
        addable: true,
        addDefault: () => "1",
        clause: "myspace.clause.people",
      },
      company: {
        type: "choice",
        options: ["own", ...COMPANY_CODES],
        labels: { own: "myspace.company.own" },
        search: true,
        describe: (c) => COMPANIES[c],
        addable: true,
        addDefault: () => "own",
        clause: "myspace.clause.company",
      },
    },
  },
  advance: {
    slots: {
      date: { type: "date", required: true, default: "today" },
      amount: { type: "amount", required: true },
      currency: { type: "choice", options: CURRENCIES, default: "TRY" },
      purpose: {
        type: "choice",
        options: Object.keys(ADVANCE_PURPOSES),
        default: "business",
        optionKey: "myspace.purpose.",
      },
      destination: { type: "text", required: true },
      // Liste kod + unvan gösterir, alana ve cümleye KOD yazılır (gerekçe hrValues.js).
      company: {
        type: "choice",
        options: COMPANY_CODES,
        required: true,
        search: true,
        describe: (c) => COMPANIES[c],
      },
      payment: {
        type: "choice",
        options: ["bank", "cash"],
        default: "bank",
        optionKey: "myspace.payment.",
      },
      document: {
        type: "choice",
        options: ["documented", "undocumented"],
        default: "documented",
        optionKey: "myspace.document.",
      },
    },
  },
}

/**
 * Tutar geçerli mi: yalnız rakam, boşluk ve binlik/ondalık ayracı; sıfırdan
 * büyük. Ayracın hangisi olduğuna BURADA karar verilmez — "1.250,50" de
 * "1,250.50" de olduğu gibi gider, asistan okuyor. "1500 TL" geçersiz:
 * para birimi kendi alanında.
 */
export function isValidAmount(value) {
  const v = String(value ?? "").trim()
  return /^[\d\s.,]+$/.test(v) && /[1-9]/.test(v)
}

/** Alan boş ya da geçersiz mi — tür başına tek tanım. */
export function isSlotEmpty(slot, value) {
  if (!slot) return true
  if (slot.type === "amount") return !isValidAmount(value)
  if (slot.type === "text") return !String(value ?? "").trim()
  return value == null
}

/** Seçeneğin etiketi: sözlükten (`optionKey`) ya da olduğu gibi (kod, ERP adı). */
export function optionLabel(t, slot, option) {
  if (slot?.labels?.[option]) return t(slot.labels[option])
  return slot?.optionKey ? t(`${slot.optionKey}${option}`) : String(option)
}

export const isTemplate = (key) => Object.hasOwn(PROMPT_TEMPLATES, key)

/** Alanların başlangıç değerleri — yalnız varsayılanı olanlar dolu gelir. */
export function initialValues(key) {
  const out = {}
  for (const [name, slot] of Object.entries(PROMPT_TEMPLATES[key]?.slots ?? {})) {
    if (slot.default === "today") {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      out[name] = d
    } else if (slot.default != null) out[name] = slot.default
  }
  return out
}

/** "{start} – {end} …" → `[{ text }, { slot: "start" }, …]` */
export function templateParts(str) {
  const out = []
  const re = /\{(\w+)\}/g
  let last = 0
  let m
  while ((m = re.exec(str))) {
    if (m.index > last) out.push({ text: str.slice(last, m.index) })
    out.push({ slot: m[1] })
    last = re.lastIndex
  }
  if (last < str.length) out.push({ text: str.slice(last) })
  return out
}

/** Doldurulmamış ilk zorunlu alan (cümledeki sırayla), yoksa `null`. */
export function firstMissing(key, parts, values) {
  const slots = PROMPT_TEMPLATES[key]?.slots ?? {}
  for (const p of parts) {
    if (p.slot && slots[p.slot]?.required && isSlotEmpty(slots[p.slot], values[p.slot]))
      return p.slot
  }
  return null
}

/** Başlangıç değerleri + çağıranın ön ayarı (ör. "Mazeret izni" → `kind: "excuse"`). */
export function presetValues(key, preset) {
  const slots = PROMPT_TEMPLATES[key]?.slots ?? {}
  const out = initialValues(key)
  for (const [name, value] of Object.entries(preset ?? {})) {
    if (slots[name]?.options?.includes(value)) out[name] = value
  }
  return out
}

/**
 * Bir alan seçildi: aralık tutarlı kalır ve SIRADAKİ boş tarih açılır —
 * başlangıcı seçen kişinin bir sonraki işi bitiş. Başlangıç bitişin ötesine
 * alınırsa bitiş TEMİZLENİR (ters aralık). Dönen `open`: açık tutulacak alan.
 */
export function applySlot(key, values, name, value) {
  const slots = PROMPT_TEMPLATES[key]?.slots ?? {}
  const next = { ...values, [name]: value }
  for (const [other, def] of Object.entries(slots)) {
    if (def.after === name && next[other] && value && next[other] < value) delete next[other]
  }
  let open = null
  if (slots[name]?.type === "date") {
    const after = Object.entries(slots).find(
      ([n, d]) => d.type === "date" && d.after === name && next[n] == null,
    )
    if (after) open = after[0]
  }
  return { values: next, open }
}

/**
 * Gönderimde eksik ilk zorunlu alan. `focus`: yazı alanı (tutar · açıklama ·
 * gidilecek yer) odaklanır, seçicili alan açılır — açılacak seçicisi yok.
 */
export function missingSlot(t, key, values) {
  const name = firstMissing(key, templateParts(t(`myspace.prompt.${key}`)), values)
  if (!name) return null
  const type = PROMPT_TEMPLATES[key].slots[name]?.type
  return { name, focus: type === "amount" || type === "text" }
}

const OPTS_DAY = { day: "numeric", month: "long", year: "numeric" }

/**
 * Alanın metni: tarih YILIYLA ("6 Ekim 2026" — asistan hangi yıl olduğunu
 * tahmin etmesin), seçenek sözlükten. Boş alan `missing(ad)`'ın döndürdüğü
 * şey — kutuda etiket, metne çevirirken `[başlangıç]`.
 */
export function slotText(t, locale, key, name, value) {
  const slot = PROMPT_TEMPLATES[key]?.slots?.[name]
  if (!slot || isSlotEmpty(slot, value)) return null
  if (slot.type === "date") return getDateTimeFormat(locale, OPTS_DAY).format(value)
  if (slot.type === "choice") return optionLabel(t, slot, value)
  return String(value).trim()
}

/**
 * Cümlenin düz metni. Boş alanlar `[etiket]` olur — "metin olarak düzenle"
 * yolu ve gönderimin kendisi aynı fonksiyondan geçiyor, yani kutuda görünen
 * ile asistana giden ayrışamaz.
 */
export function composeTemplate(t, locale, key, values) {
  const vars = {}
  for (const [name, slot] of Object.entries(PROMPT_TEMPLATES[key]?.slots ?? {})) {
    const text = slotText(t, locale, key, name, values[name])
    if (slot.clause) vars[name] = text == null ? "" : t(slot.clause, { value: text })
    else vars[name] = text ?? `[${t(`myspace.slot.${name}`)}]`
  }
  return t(`myspace.prompt.${key}`, vars)
}
