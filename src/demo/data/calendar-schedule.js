// Satış müdürünün (ve ekibinin) takvimi — tamamı kurgusal, tamamı İSTEK ANINA
// göre üretilir. Her gün deterministik bir plandan kurulur (aynı gün her
// okumada aynı toplantılar), "bugün" ise vitrin günüdür: stand-up, müşteri QBR'ı,
// birebir, forecast çağrısı, ürün demosu, odak bloğu ve yanıt bekleyen bir davet.
// Sayfa mesai içinde açıldıysa 15–30 dk sonrasına kısa bir "canlı" toplantı
// eklenir; akşam açıldıysa sıradaki toplantı yarın sabahın stand-up'ıdır.
import { COLLEAGUES, CUSTOMERS, DEMO_DOMAIN, MANAGER, ME, TEAM, findPerson } from "../persona"
import {
  SESSION_NOW,
  addDays,
  atMinute,
  compactKey,
  dayDiff,
  dayKey,
  isWeekend,
  pick,
  seeded,
  startOfDay,
} from "./calendar-time"

/* ─── Kişiler ─────────────────────────────────────────────────────────── */

const person = (id, fallback) => findPerson(id) ?? fallback
const KEREM = MANAGER
const ECE = person("u-ece", TEAM[0])
const MERT = person("u-mert", TEAM[1])
const SELIN = person("u-selin", TEAM[2])
const BURAK = person("u-burak", TEAM[3])
const ZEYNEP = person("u-zeynep", TEAM[4])
const AYSE = person("u-ayse", COLLEAGUES[0])
const CAN = person("u-can", COLLEAGUES[1])
const LEYLA = person("u-leyla", COLLEAGUES[2])
const ONUR = person("u-onur", COLLEAGUES[3])
const ELIF = person("u-elif", COLLEAGUES[4])
const BARIS = person("u-baris", COLLEAGUES[5])

/** Müşteri irtibatı, katılımcı biçiminde. */
const contactOf = (c) => ({
  id: `ext-${c.mail}`,
  displayName: c.contact,
  mail: c.mail,
  account: c.account,
  jobTitle: c.title,
  external: true,
})
const customer = (prefix, i) =>
  CUSTOMERS.find((c) => c.account.toLowerCase().startsWith(prefix)) ?? CUSTOMERS[i]
export const ALTAY = customer("altay", 0)
export const NORDIS = customer("nordis", 1)
export const EKINOKS = customer("ekinoks", 2)
export const PERA = customer("pera", 3)
export const TOROS = customer("toros", 4)
export const ORION = customer("orion", 5)

/* ─── Şablon ──────────────────────────────────────────────────────────── */

const hm = (s) => {
  const [h, m] = s.split(":").map(Number)
  return h * 60 + m
}

/**
 * Bir toplantı şablonu. `from`/`to` gün içi dakika. `response` benim yanıtım
 * (boşsa: düzenleyici bensem "organizer", değilsem "accepted"). `summary`
 * Copilot özetinin türü (`calendar-insights`); yoksa toplantının özeti yok.
 */
function tpl(slug, subject, from, to, o = {}) {
  return {
    slug,
    subject,
    from: typeof from === "number" ? from : hm(from),
    to: typeof to === "number" ? to : hm(to),
    organizer: ME,
    attendees: [],
    online: true,
    location: "",
    body: "",
    showAs: "busy",
    sensitivity: "normal",
    isReminderOn: true,
    ...o,
  }
}

function allDay(slug, subject, o = {}) {
  return tpl(slug, subject, 0, 0, { allDay: true, days: 1, online: false, showAs: "free", ...o })
}

const overlaps = (a, b) => !a.allDay && !b.allDay && a.from < b.to && b.from < a.to

/* ─── Resmî tatiller (sabit tarihli) ──────────────────────────────────── */

const HOLIDAYS = {
  "01-01": "Yılbaşı (resmî tatil)",
  "04-23": "Ulusal Egemenlik ve Çocuk Bayramı",
  "05-01": "Emek ve Dayanışma Günü",
  "05-19": "Atatürk'ü Anma, Gençlik ve Spor Bayramı",
  "07-15": "Demokrasi ve Millî Birlik Günü",
  "08-30": "Zafer Bayramı",
  "10-29": "Cumhuriyet Bayramı",
}
const mmdd = (d) => dayKey(d).slice(5)
export const holidayOf = (d) => HOLIDAYS[mmdd(d)] ?? null
const isArife = (d) => mmdd(d) === "10-28"
const workday = (d) => !isWeekend(d) && !holidayOf(d)

/** `today`den en az `min` gün sonraki ilk iş günü (koşullu). */
function firstWorkday(today, min, ok = () => true) {
  for (let i = min; i < min + 21; i += 1) {
    const d = addDays(today, i)
    if (workday(d) && ok(d)) return d
  }
  return null
}

/** Bugüne göre sabitlenen günler — bir kez hesaplanır, gün değişince yeniden. */
const anchorsCache = new Map()
function anchors(today) {
  const k = dayKey(today)
  if (!anchorsCache.has(k)) {
    const leave = firstWorkday(today, 1)
    const deadline = firstWorkday(today, 3, (d) => dayKey(d) !== dayKey(leave))
    const fair = firstWorkday(today, 8, (d) => d.getDay() === 3 && workday(addDays(d, 1)))
    const kickoff = firstWorkday(
      today,
      2,
      (d) => dayKey(d) !== dayKey(leave) && dayKey(d) !== dayKey(fair),
    )
    let training = null
    for (let i = -6; i > -20; i -= 1) {
      const d = addDays(today, i)
      if (workday(d)) {
        training = d
        break
      }
    }
    anchorsCache.set(k, {
      leave: dayKey(leave),
      deadline: dayKey(deadline),
      fair: fair ? [dayKey(fair), dayKey(addDays(fair, 1))] : [],
      kickoff: dayKey(kickoff),
      training: training ? dayKey(training) : null,
    })
  }
  return anchorsCache.get(k)
}

function lastWorkdayOfMonth(d) {
  let x = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  while (!workday(x)) x = addDays(x, -1)
  return x
}

/* ─── Metinler ────────────────────────────────────────────────────────── */

const ROOM_BOGAZ = "Levent Ofis — Boğaz Toplantı Odası"
const ROOM_GALATA = "Levent Ofis — Galata Toplantı Odası"

const BODY = {
  standup:
    "Her sabah 15 dakika: dünden bugüne pipeline hareketleri, takılan fırsatlar ve bugünün müşteri görüşmeleri. Kamera açık, kısa ve net.",
  oneOnOne:
    "Haftalık birebir: hedeflere göre ilerleme, açık fırsatlar, ihtiyaç duyulan destek ve gelişim alanları.",
  forecast:
    "Gündem: 1) Q4 commit / best case, 2) kayma riski olan fırsatlar, 3) bölge bazlı hedef revizyonu. Lütfen CRM'deki fırsatlarınızı toplantıdan önce güncelleyin.",
  pipeline:
    "Haftalık pipeline gözden geçirme: aşama değişiklikleri, 30 günden eski fırsatlar ve bu hafta kapanış beklenenler. CRM ekranı üzerinden ilerleyeceğiz.",
  focus: "",
}

/* ─── Vitrin ve hafta içi planları (benim takvimim) ───────────────────── */

const ONE_ON_ONE = { 1: MERT, 2: ECE, 3: BURAK, 4: ZEYNEP, 5: SELIN }

const standup = () =>
  tpl("standup", "Günlük Pipeline Stand-up", "09:30", "09:45", {
    series: "standup",
    attendees: TEAM,
    body: BODY.standup,
    summary: "standup",
    isReminderOn: false,
  })

function oneOnOne(weekday) {
  const p = ONE_ON_ONE[weekday]
  if (!p) return null
  const slug = `one-on-one-${p.id.replace(/^u-/, "")}`
  return tpl(slug, `1:1 — ${p.displayName}`, "11:30", "12:00", {
    series: slug,
    attendees: [p],
    body: BODY.oneOnOne,
  })
}

const forecast = () =>
  tpl("forecast", "Q4 Forecast Call", "14:00", "14:45", {
    series: "forecast",
    organizer: KEREM,
    attendees: [ME, BURAK, CAN],
    body: BODY.forecast,
    summary: "forecast",
  })

function showcase() {
  return [
    tpl("qbr", `QBR — ${ALTAY.account} (Q3 değerlendirmesi)`, "10:00", "11:00", {
      attendees: [contactOf(ALTAY), ECE, ONUR],
      location: ROOM_GALATA,
      body: `Gündem: Q3 performans özeti, teslimat SLA'ları, ${ALTAY.account} 2027 mağaza açılış planı ve genişleme fırsatları. Sunum dosyası toplantıdan önce paylaşılacak.`,
      summary: "qbr",
      ctx: { customer: ALTAY },
    }),
    tpl("demo", `Ürün demosu — ${ORION.account}`, "15:30", "16:30", {
      attendees: [contactOf(ORION), ELIF, ZEYNEP],
      body: `${ORION.account} satın alma ve BT ekibine sipariş yönetimi, stok takibi ve tedarikçi portalı demosu. Demo ortamı: demo.midea.com (test verisi).`,
      summary: "demo",
      ctx: { customer: ORION },
    }),
    tpl("focus", "Odak zamanı — Q4 forecast hazırlığı", "16:45", "17:45", {
      online: false,
      sensitivity: "private",
      isReminderOn: false,
      body: "Bildirimler kapalı: commit listesi ve risk altındaki fırsatların notları.",
    }),
  ]
}

/** Hafta içi diğer günlerin planı — müşteriler güne göre döner. */
function weekdayItems(weekday, day) {
  const rnd = seeded(`week-${dayKey(day)}`)
  const others = [NORDIS, EKINOKS, PERA, TOROS, ORION, ALTAY]
  const c = pick(others, rnd)
  const c2 = pick(
    others.filter((x) => x !== c),
    rnd,
  )
  const member = pick([ECE, MERT, SELIN, ZEYNEP], rnd)
  switch (weekday) {
    case 1:
      return [
        tpl("pipeline-review", "Haftalık Pipeline Review", "10:30", "11:30", {
          series: "pipeline-review",
          attendees: TEAM,
          location: ROOM_BOGAZ,
          body: BODY.pipeline,
          summary: "pipeline",
        }),
        tpl("customer-offer", `Teklif görüşmesi — ${c.account}`, "15:00", "16:00", {
          attendees: [contactOf(c), member],
          body: `${c.account} için hazırlanan teklifin üzerinden geçilecek: kapsam, teslimat takvimi ve ödeme koşulları.`,
          summary: "customer",
          ctx: { customer: c, member },
        }),
        tpl("campaign-brief", "Q4 kampanya brifingi: kurumsal paketler", "16:30", "17:00", {
          organizer: AYSE,
          attendees: [ME, ECE, MERT, SELIN],
          body: "Q4 kurumsal paket kampanyasının mesajları, hedef segmentler ve satış ekibine verilecek materyaller.",
          summary: "campaign",
        }),
      ]
    case 2:
      return [
        tpl("site-visit", `Saha ziyareti — ${c.account}`, "13:30", "15:00", {
          online: false,
          attendees: [contactOf(c), member],
          location: `${c.account} Genel Müdürlük, İstanbul`,
          body: `${c.contact} ile yerinde görüşme ve tesis turu. Yanınızda güncel ürün kataloğu olsun.`,
        }),
        tpl("credit-review", `Kredi limiti değerlendirmesi — ${c2.account}`, "15:30", "16:15", {
          organizer: CAN,
          attendees: [ME, BURAK],
          body: `${c2.account} için talep edilen limit artışı: ödeme geçmişi, açık siparişler ve teminat seçenekleri.`,
        }),
      ]
    case 3:
      return [
        tpl("customer-presentation", `Çözüm sunumu — ${c.account}`, "10:00", "11:00", {
          attendees: [contactOf(c), ZEYNEP],
          body: `${c.account} ekibine çözüm mimarisi ve referans projeler. Sunum: Satış Ekibi › Sunumlar klasöründe.`,
          summary: "customer",
          ctx: { customer: c, member: ZEYNEP },
        }),
        tpl("roadmap", "Ürün yol haritası: satış ekibi bilgilendirmesi", "14:30", "15:30", {
          organizer: ELIF,
          attendees: [ME, ...TEAM],
          body: "Q1 2027 yol haritası, sahadan gelen talepler ve müşteriye anlatılabilecek tarihler.",
          summary: "roadmap",
        }),
        tpl("crm-hygiene", "CRM veri kalitesi kontrolü", "16:00", "16:30", {
          attendees: [BURAK],
          body: "Kapanış tarihi geçmiş fırsatlar, eksik karar verici bilgisi ve aşama tutarlılığı.",
        }),
      ]
    case 4:
      return [
        tpl("contract-review", `Sözleşme incelemesi — ${c.account}`, "10:00", "11:00", {
          attendees: [BARIS, ECE],
          body: `${c.account} çerçeve sözleşmesindeki sorumluluk, ceza ve fesih maddeleri. Müşterinin revizyon talepleri ekte.`,
          summary: "contract",
          ctx: { customer: c },
        }),
        tpl("cs-handover", `Müşteri devri: ${c2.account} → Customer Success`, "14:00", "15:00", {
          attendees: [ONUR, MERT],
          body: `${c2.account} kazanıldı: kapsam, beklentiler, kilit kişiler ve ilk 90 günün planı Customer Success ekibine aktarılıyor.`,
          summary: "handover",
          ctx: { customer: c2 },
        }),
        tpl("one-on-one-kerem", "1:1 — Kerem Öztürk", "16:00", "16:30", {
          series: "one-on-one-kerem",
          organizer: KEREM,
          attendees: [ME],
          body: BODY.oneOnOne,
        }),
      ]
    case 5:
      return [
        tpl("weekly-perf", "Haftalık satış performansı", "10:00", "11:00", {
          series: "weekly-perf",
          organizer: KEREM,
          attendees: [ME, BURAK, CAN],
          body: "Hafta kapanışı: sipariş girişleri, hedefe göre durum ve gelecek haftanın kritik fırsatları.",
          summary: "weekly",
        }),
        tpl("team-lunch", "Ekip öğle yemeği", "12:30", "13:30", {
          online: false,
          attendees: TEAM,
          location: "Levent — ofis kafeteryası",
          body: "Haftayı birlikte kapatıyoruz 🍽️",
          isReminderOn: false,
        }),
        tpl("week-close", "Haftalık kapanış: açık teklifler", "15:00", "15:30", {
          attendees: TEAM,
          body: "Açık tekliflerin durumu ve pazartesiye kalan aksiyonlar.",
        }),
      ]
    default:
      return []
  }
}

/** Yanıt bekleyen davetler — çakışabilir (gerçek takvimde de öyle). */
function invites(day, today) {
  const out = []
  const diff = dayDiff(today, day)
  const a = anchors(today)
  if (diff === 0) {
    out.push(
      tpl(
        "pricing-committee",
        `Fiyat Komitesi: ${TOROS.account} iskonto talebi`,
        "13:00",
        "13:30",
        {
          organizer: CAN,
          attendees: [ME, KEREM, BURAK],
          response: "notResponded",
          body: `${TOROS.account} yıllık sözleşme yenilemesi için %12 ek iskonto talep etti. Marj etkisi ve alternatif teklif yapısı değerlendirilecek.`,
        },
      ),
    )
  }
  if (dayKey(day) === a.kickoff) {
    out.push(
      tpl("kickoff", "Satış Kick-off 2027 — planlama atölyesi", "15:00", "16:30", {
        organizer: AYSE,
        attendees: [ME, KEREM, ECE, MERT, LEYLA],
        location: ROOM_BOGAZ,
        response: "notResponded",
        body: "Ocak'taki Satış Kick-off'unun ajandası, konuşmacılar ve ödül kategorileri. Fikirlerinizi getirin!",
      }),
    )
  }
  if (day.getDay() === 3 && diff >= 1) {
    out.push(
      tpl("mkt-sync", "Pazarlama × Satış haftalık senkron", "11:00", "11:30", {
        series: "mkt-sync",
        organizer: AYSE,
        attendees: [ME, ZEYNEP, ELIF],
        response: "notResponded",
        body: "Kampanyalardan gelen talepler, lead kalitesi ve ortak etkinlik takvimi.",
      }),
    )
  }
  return out
}

/** Tüm gün etkinlikleri (izin, son gün, fuar, ay sonu, tatil). */
function allDayItems(day, today) {
  const out = []
  const k = dayKey(day)
  const a = anchors(today)
  const hol = holidayOf(day)
  if (hol)
    out.push(allDay("holiday", hol, { showAs: "oof", categories: ["Tatil"], isReminderOn: false }))
  if (isArife(day))
    out.push(
      allDay("arife", "Cumhuriyet Bayramı arifesi — öğleden sonra tatil", { isReminderOn: false }),
    )
  if (k === a.leave)
    out.push(
      allDay("leave-ece", `${ECE.displayName} — Yıllık izin`, {
        organizer: ECE,
        attendees: [ME, ...TEAM.filter((p) => p !== ECE)],
        body: `İzindeyim; acil konular için ${MERT.displayName} ile iletişime geçebilirsiniz.`,
      }),
    )
  if (k === a.deadline)
    out.push(
      allDay("deadline-nordis", `Son gün: ${NORDIS.account} ihale teklifi`, {
        body: "Teklif ihale portalına 17:00'ye kadar yüklenmeli. Fiyat onayı Fiyat Komitesi'nde.",
        categories: ["Kırmızı kategori"],
      }),
    )
  if (a.fair[0] === k)
    out.push(
      allDay("fair", "Retail Tech Summit 2026 — Midea standı", {
        days: 2,
        organizer: AYSE,
        attendees: [ME, ECE, ZEYNEP],
        showAs: "oof",
        location: "Expo Park, Salon 4 — Stand B12",
        body: "Stand görev çizelgesi ve randevu listesi Pazarlama kanalında. Lütfen kartvizitlerinizi unutmayın.",
      }),
    )
  if (a.training === k)
    out.push(
      allDay("training-selin", `${SELIN.displayName} — Değer Bazlı Satış eğitimi`, {
        organizer: SELIN,
        attendees: [ME],
        body: "Tüm gün sınıf eğitimi; mesajlara akşam dönebilirim.",
      }),
    )
  if (!isWeekend(day) && !hol && k === dayKey(lastWorkdayOfMonth(day)))
    out.push(
      allDay("month-end", "Ay sonu kapanışı — sipariş ve fatura girişleri", {
        organizer: BURAK,
        attendees: [ME, ...TEAM.filter((p) => p !== BURAK)],
        body: "Ay içinde alınan siparişlerin CRM ve ERP girişleri bugün 18:00'e kadar tamamlanmalı.",
      }),
    )
  return out
}

/**
 * Sayfa mesai içinde açıldıysa: 15–30 dk sonrasına kısa bir senkron. Oturumun
 * açıldığı ana çapalı (`SESSION_NOW`) — zaman ilerledikçe kaymaz, geçmişte kalır.
 */
function liveSlot(timed) {
  const n = SESSION_NOW
  const mins = n.getHours() * 60 + n.getMinutes()
  if (mins < 7 * 60 + 30 || mins > 18 * 60) return null
  const from = Math.ceil((mins + 1) / 15) * 15 + 15
  const live = tpl(
    "live-sync",
    `Hızlı senkron — ${NORDIS.account} ihale stratejisi`,
    from,
    from + 30,
    {
      organizer: MERT,
      attendees: [ME, BURAK],
      body: `${NORDIS.account} ihalesi için fiyat senaryoları ve rakip analizini 30 dakikada netleştirelim.`,
    },
  )
  return timed.some((t) => overlaps(t, live)) ? null : live
}

/** Benim takvimim — bir günün planı. */
function planMe(day, now) {
  const today = startOfDay(now)
  const diff = dayDiff(today, day)
  const wd = day.getDay()
  const out = allDayItems(day, today)
  if (isWeekend(day) || holidayOf(day)) return out
  const a = anchors(today)
  if (a.fair.includes(dayKey(day))) {
    if (a.fair[0] === dayKey(day)) {
      out.push(
        tpl("fair-dinner", `Akşam yemeği — ${ALTAY.contact} (${ALTAY.account})`, "19:30", "21:30", {
          online: false,
          attendees: [contactOf(ALTAY), ECE],
          location: "Karaköy — rıhtım restoranı",
          body: "Fuar sonrası 2027 iş birliği üzerine sohbet.",
        }),
      )
    }
    return out
  }
  const timed = [standup(), oneOnOne(wd)].filter(Boolean)
  if (diff % 7 === 0) timed.push(forecast())
  const base = weekdayItems(wd, day)
  const extras = diff === 0 ? [...showcase(), ...base.filter((t) => t.series)] : base
  for (const t of extras) if (!timed.some((x) => overlaps(x, t))) timed.push(t)
  timed.push(...invites(day, today))
  if (diff === 0 && dayKey(day) === dayKey(SESSION_NOW)) {
    const live = liveSlot(timed)
    if (live) timed.push(live)
  }
  const kept = isArife(day) ? timed.filter((t) => t.from < 13 * 60) : timed
  return [...out, ...kept.sort((x, y) => x.from - y.from)]
}

/* ─── Başkalarının takvimi (paylaşılan takvimler) ─────────────────────── */

const OWN = {
  sales: [
    ["Keşif görüşmesi — {a}", true],
    ["Teklif sunumu — {a}", true],
    ["Saha ziyareti — {a}", false],
    ["Teklif hazırlığı: {a}", false],
    ["Sözleşme takibi — {a}", true],
  ],
  [KEREM.id]: [
    ["Satış liderleri haftalık toplantısı", true],
    ["Yönetim kurulu sunumu hazırlığı", false],
    ["Bölge direktörleri senkronu", true],
    ["CFO ile bütçe görüşmesi", true],
    ["Stratejik müşteri ziyareti — {a}", false],
  ],
  [AYSE.id]: [
    ["Kampanya kreatif review", true],
    ["Ajans durum toplantısı", true],
    ["Fuar stand tasarımı onayı", true],
    ["İçerik takvimi planlama", false],
  ],
  [CAN.id]: [
    ["Ay sonu kapanış kontrolü", true],
    ["Bütçe revizyonu — Q4", true],
    ["Tahsilat riski toplantısı", true],
    ["Kur riski değerlendirmesi", true],
  ],
  [LEYLA.id]: [
    ["İşe alım mülakatı — Satış Uzmanı", true],
    ["Performans döngüsü planlaması", true],
    ["Eğitim takvimi değerlendirmesi", false],
  ],
  [ONUR.id]: [
    ["Müşteri sağlık skoru incelemesi — {a}", true],
    ["Onboarding toplantısı — {a}", true],
    ["Destek eskalasyon değerlendirmesi", true],
  ],
  [ELIF.id]: [
    ["Sprint review", true],
    ["Müşteri geri bildirim oturumu — {a}", true],
    ["Backlog önceliklendirme", true],
  ],
  [BARIS.id]: [
    ["Sözleşme revizyonu — {a}", true],
    ["KVKK uyum değerlendirmesi", true],
    ["Hukuk ekibi haftalık", true],
  ],
}
const SLOTS = [
  ["10:00", "11:00"],
  ["13:30", "14:30"],
  ["15:00", "16:00"],
  ["16:30", "17:15"],
]

export const involves = (t, p) =>
  t.organizer?.id === p.id || (t.attendees ?? []).some((a) => a.mail === p.mail)

function planOther(p, day, now) {
  const today = startOfDay(now)
  const hol = holidayOf(day)
  if (hol) return [allDay("holiday", hol, { organizer: p, showAs: "oof", categories: ["Tatil"] })]
  if (isWeekend(day)) return []
  const a = anchors(today)
  if (p.id === ECE.id && dayKey(day) === a.leave)
    return [allDay("leave", "İzinli", { organizer: ECE, showAs: "oof", isReminderOn: false })]
  const shared = planMe(day, now)
    .filter((t) => t.slug !== "holiday" && involves(t, p))
    .map((t) => ({ ...t, fromMe: true }))
  const catalog = OWN[p.id] ?? (TEAM.includes(p) ? OWN.sales : [])
  const rnd = seeded(`${p.id}-${dayKey(day)}`)
  const count = catalog.length ? 1 + Math.floor(rnd() * 2) : 0
  const timed = shared.filter((t) => !t.allDay)
  for (let i = 0; i < count; i += 1) {
    const [subjectTpl, online] = pick(catalog, rnd)
    const [from, to] = pick(SLOTS, rnd)
    const c = pick(CUSTOMERS, rnd)
    const subject = subjectTpl.replace("{a}", c.account)
    const own = tpl(`own-${i}`, subject, from, to, {
      organizer: p,
      online,
      attendees: subjectTpl.includes("{a}") && online ? [contactOf(c)] : [],
      location: online ? "" : subjectTpl.includes("{a}") ? `${c.account}, İstanbul` : ROOM_BOGAZ,
    })
    if (!timed.some((t) => overlaps(t, own))) timed.push(own)
  }
  return [...shared.filter((t) => t.allDay), ...timed.sort((x, y) => x.from - y.from)]
}

/* ─── Dışa açık ───────────────────────────────────────────────────────── */

const planCache = new Map()

/** Bir kişinin bir günlük planı (şablon listesi). */
export function planFor(ownerId, day, now = new Date()) {
  const key = `${ownerId}|${dayKey(day)}|${dayKey(now)}`
  if (!planCache.has(key)) {
    if (planCache.size > 2000) planCache.clear()
    const owner = ownerId === ME.id ? ME : findPerson(ownerId)
    planCache.set(key, owner === ME ? planMe(day, now) : owner ? planOther(owner, day, now) : [])
  }
  return planCache.get(key)
}

/** Şablonun bir gündeki gerçek aralığı (ms). Tüm gün etkinliği yerel gece yarısından. */
export function spanOf(t, day) {
  if (t.allDay) {
    const start = startOfDay(day).getTime()
    return { start, end: addDays(startOfDay(day), t.days ?? 1).getTime() }
  }
  return { start: atMinute(day, t.from).getTime(), end: atMinute(day, t.to).getTime() }
}

export const eventId = (ownerId, day, slug) => `ev.${ownerId}.${compactKey(day)}.${slug}`
export const seriesMasterId = (ownerId, series) => `sm.${ownerId}.${series}`

/** Etkinlik kimliğini çözer: `{ ownerId, day, slug }` ya da null. */
export function parseEventId(id) {
  const m = /^ev\.(u-[a-z0-9-]+)\.(\d{8})\.([a-z0-9-]+)$/.exec(String(id ?? ""))
  if (!m) return null
  const [y, mo, d] = [m[2].slice(0, 4), m[2].slice(4, 6), m[2].slice(6, 8)].map(Number)
  return { ownerId: m[1], day: new Date(y, mo - 1, d), slug: m[3] }
}

/** Toplantının katılma adresi — Teams değil, çözümlenmeyen bir `.example` adresi. */
export function joinUrlOf(t, day, ownerId) {
  if (!t.online || t.allDay) return null
  const key = t.series
    ? `s-${t.series}`
    : ownerId === ME.id || t.fromMe
      ? `m-${compactKey(day)}-${t.slug}`
      : `m-${compactKey(day)}-${ownerId}-${t.slug}`
  return `https://meet.${DEMO_DOMAIN}/j/${key}`
}

/** Katılma adresinden toplantı anahtarı: `{ series }` ya da `{ day, slug }` (yalnız benim). */
export function parseJoinKey(url) {
  const m = /\/j\/(s-[a-z0-9-]+|m-\d{8}-[a-z0-9-]+)/.exec(String(url ?? ""))
  if (!m) return null
  const key = m[1]
  if (key.startsWith("s-")) return { key, series: key.slice(2) }
  const mm = /^m-(\d{8})-(.+)$/.exec(key)
  const day = new Date(
    Number(mm[1].slice(0, 4)),
    Number(mm[1].slice(4, 6)) - 1,
    Number(mm[1].slice(6, 8)),
  )
  // Başkasının kendi toplantısı (`m-tarih-u-…-slug`) benim özetim değil.
  if (mm[2].startsWith("u-")) return { key, foreign: true }
  return { key, day, slug: mm[2] }
}

/** Serinin geçmiş oturumları (en yeni önce), `days` gün geriye. */
export function seriesOccurrences(series, now = new Date(), days = 21) {
  const out = []
  const today = startOfDay(now)
  for (let i = 0; i <= days; i += 1) {
    const day = addDays(today, -i)
    const t = planFor(ME.id, day, now).find((x) => x.series === series)
    if (t) out.push({ t, day, ...spanOf(t, day) })
  }
  return out
}
