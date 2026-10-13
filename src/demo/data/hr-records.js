// Demo — İK ortamının hareket kayıtları: izinler, izin bakiyeleri, masraf raporları,
// iş avansları ve istihdam satırları. TÜMÜ KURGUSAL; tarihler İSTEK ANINDAKİ güne
// göre kurulur (bugün + gün farkı), yani demo her gün "güncel" görünür.
//
// Alan adları uygulamanın sorgularıyla birebir (src/lib/selfServiceApi.js,
// selfServiceTeamQuery.js, selfServiceFields.js). Seçenek kümesi alanları,
// gerçek Dataverse gibi görünen etiketi `…@OData.Community.Display.V1.FormattedValue`
// annotation'ında taşır.
import { CUSTOMERS } from "@/demo/persona"
import { FV, stableGuid } from "./dataverse-odata"
import { allRecords, dayFrom, LEGAL_ENTITY, mePersonnel, recordForPersonnel } from "./hr-people"

const DAY = 86400000
const pad = (n) => String(n).padStart(2, "0")
const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T00:00:00Z`
const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6

/** Bir günü (hafta sonuysa) bir sonraki iş gününe taşır. */
function toWeekday(d) {
  const out = new Date(d)
  while (isWeekend(out)) out.setDate(out.getDate() + 1)
  return out
}

/** `start`tan itibaren `n` iş günü sonraki son gün (n ≥ 1). */
function endAfterBusinessDays(start, n) {
  const out = new Date(start)
  let left = Math.max(1, Math.ceil(n)) - 1
  while (left > 0) {
    out.setDate(out.getDate() + 1)
    if (!isWeekend(out)) left -= 1
  }
  return out
}

/** Bugünden geriye `n` iş günü (n = 0 → bugün). */
function businessDaysBack(now, n) {
  const out = dayFrom(now, 0)
  let left = n
  while (left > 0) {
    out.setDate(out.getDate() - 1)
    if (!isWeekend(out)) left -= 1
  }
  return out
}

// ── İZİNLER ────────────────────────────────────────────────────────────
// Kişi kimliğiyle (dizin `id`) anahtarlı.
// [başlangıç (bugüne göre gün; "bN" = N iş günü önce), gün, tür, açıklama, { saat, planlı }]
const LEAVE_PLAN = {
  "u-dogukan": [
    [-560, 8, "TR01", "Yıllık izin — aile ziyareti"],
    [-470, 2, "TR06", "Müzakere teknikleri eğitimi"],
    [-400, 5, "TR01", "Yıllık izin"],
    [-236, 5, "TR01", "Tatil — Uludağ"],
    [-151, 2, "TR06", "Satış liderliği programı"],
    [-123, 1, "TR17", "Evden çalışma — teklif hazırlığı"],
    [-96, 7, "TR01", "Tatil — Ege"],
    [-41, 2, "TR02", "Ankara müşteri ziyaretleri"],
    [-19, 0.5, "TR01", "Okul veli toplantısı", { from: 13, to: 17 }],
    [-7, 1, "TR17", "Evden çalışma"],
    [22, 3, "TR01", "Uzun hafta sonu", { planned: true }],
    [70, 4, "TR01", "Yıllık izin", { planned: true }],
  ],
  // Ekibim — biri bugün izinde, biri bu hafta dış görevde, biri evden çalışıyor.
  "u-ece": [
    [-210, 5, "TR01", "Yıllık izin"],
    [-130, 1, "TR09", "Rapor"],
    [-60, 5, "TR01", "Tatil"],
    ["b2", 4, "TR01", "Aile ziyareti"],
    [38, 2, "TR06", "Kilit müşteri yönetimi eğitimi"],
  ],
  "u-mert": [
    [-180, 3, "TR01", "Aile ziyareti"],
    [-80, 10, "TR01", "Tatil — yurt dışı"],
    [3, 2, "TR02", "İzmir bayi ziyaretleri"],
    [15, 5, "TR01", "Tatil"],
  ],
  "u-selin": [
    [-170, 2, "TR01", "Taşınma"],
    [-45, 3, "TR01", "Kısa tatil"],
    [1, 1, "TR06", "Ürün eğitimi"],
    [52, 5, "TR01", "Yıllık izin", { planned: true }],
  ],
  "u-burak": [
    [-100, 7, "TR01", "Tatil"],
    [-33, 1, "TR14", "Vizite"],
    ["b0", 1, "TR17", "Evden çalışma"],
    [30, 3, "TR01", "Kısa tatil"],
  ],
  "u-zeynep": [
    [-210, 5, "TR01", "Yıllık izin"],
    [-20, 2, "TR01", "Düğün"],
    [9, 0.5, "TR01", "Resmî işlem", { from: 9, to: 13 }],
    [44, 5, "TR01", "Tatil", { planned: true }],
  ],
  "u-kerem": [
    [-70, 7, "TR01", "Tatil"],
    [5, 2, "TR01", "Kısa tatil"],
  ],
  "u-ayse": [[-12, 3, "TR01", "Tatil"], [18, 2, "TR06", "Eğitim"]],
  "u-can": [[-30, 5, "TR01", "Tatil"]],
  "u-leyla": [[12, 3, "TR01", "Tatil"]],
  "u-onur": [["b1", 2, "TR01", "Kısa tatil"]],
  "u-elif": [[-55, 5, "TR01", "Tatil"]],
  "u-baris": [[26, 4, "TR01", "Tatil"]],
}

function hash(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i += 1) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0
  return h
}

/** Persona dışı (türetilmiş) çalışan için kararlı iki izin. */
function syntheticPlan(personnel) {
  const h = hash(personnel)
  return [
    [-40 - (h % 60), 3 + (h % 4), "TR01", "Tatil"],
    [4 + ((h >> 5) % 40), 1 + ((h >> 9) % 3), "TR01", "Kısa tatil"],
  ]
}

function leaveRows(personnel, now) {
  const rec = recordForPersonnel(personnel, now)
  if (!rec) return []
  const plan = LEAVE_PLAN[rec.id] ?? syntheticPlan(personnel)
  return plan.map(([at, days, type, description, opt = {}]) => {
    const raw =
      typeof at === "string" ? businessDaysBack(now, Number(at.slice(1))) : dayFrom(now, at)
    // "Bugünü kapsayan" izin hafta sonuna düşse bile başlangıcı kaymasın.
    const start = typeof at === "string" ? raw : toWeekday(raw)
    const end = endAfterBusinessDays(start, days)
    const hours = opt.from != null ? opt.to - opt.from : days * 8
    return {
      mserp_boraxallowancetransselfserviceentityid: stableGuid(`leave:${personnel}:${at}:${type}`),
      mserp_boraxoldemplid: personnel,
      mserp_emplname: rec.name.toLocaleUpperCase("tr"),
      mserp_allowancetypeid: type,
      mserp_startdate: isoDay(start),
      mserp_enddate: isoDay(end),
      mserp_noofdays: days,
      mserp_noofhours: hours,
      mserp_description: description,
      mserp_isplanned: opt.planned ? 200000001 : 200000000,
      [`mserp_isplanned${FV}`]: opt.planned ? "Yes" : "No",
      mserp_starttime: opt.from != null ? opt.from * 3600 : 0,
      mserp_endtime: opt.to != null ? opt.to * 3600 : 0,
    }
  })
}

/** Bilinen herkesin izin satırları. */
export function allLeaveRows(now = new Date()) {
  return allRecords(now).flatMap((r) => leaveRows(r.personnel, now))
}

// ── İZİN BAKİYESİ ──────────────────────────────────────────────────────
function legalMinimum(years) {
  if (years >= 15) return 26
  if (years >= 6) return 20
  if (years >= 1) return 14
  return 0
}

/** Kıdem yılına göre hak; kullanılan = bu yıl başlamış yıllık izinlerin günü. */
function balanceRow(rec, now) {
  const since = rec.since ? new Date(`${rec.since}T00:00:00`) : null
  const years = since ? Math.max(1, Math.floor((now - since) / (365.2425 * DAY)) + 1) : 1
  const claim = legalMinimum(years)
  const today = dayFrom(now, 0)
  const used = leaveRows(rec.personnel, now)
    .filter((l) => l.mserp_allowancetypeid === "TR01")
    .filter((l) => {
      const start = new Date(`${l.mserp_startdate.slice(0, 10)}T00:00:00`)
      return start.getFullYear() === now.getFullYear() && start <= today
    })
    .reduce((sum, l) => sum + l.mserp_noofdays, 0)
  return {
    mserp_tryaiallowancesummaryentityid: stableGuid(`balance:${rec.alias}`),
    mserp_networkalias: rec.alias,
    mserp_personnelnumber: rec.personnel,
    mserp_allowanceyearlyclaimday: claim,
    mserp_allowanceyearlyusedday: used,
    mserp_allowanceyearlyremainday: Math.max(0, claim - used),
  }
}

export function allBalanceRows(now = new Date()) {
  return allRecords(now).map((r) => balanceRow(r, now))
}

// ── MASRAF RAPORLARI (yalnız oturumdaki kişi) ──────────────────────────
// Durum: F&O iş akışı etiketi (görünen) + seçenek değeri.
const WF = {
  draft: [200000000, "Draft"],
  review: [200000001, "In review"],
  returned: [200000002, "Returned"],
  approved: [200000003, "Approved"],
  processed: [200000004, "Processed for payment"],
  paid: [200000005, "Paid"],
  rejected: [200000006, "Rejected"],
}

const C = Object.fromEntries(CUSTOMERS.map((c) => [c.account, c]))
const EUR_RATE = 38.4

/**
 * [no, gün (bugüne göre), durum, rapor açıklaması, kalemler[]]
 * kalem: [gün farkı, ERP kategori değeri, tutar, açıklama, { cur, vendor, receipt, people, abroad }]
 */
const EXPENSE_PLAN = [
  [
    "VGEX-004871",
    -2,
    "draft",
    "Altay Perakende yönetim sunumu",
    [
      [-3, "Temsil Ağırlama Yemek Giderler", 6850, `${C["Altay Perakende"].account} — yönetim sunumu sonrası akşam yemeği`, { vendor: "Kordon Balık Restoran", receipt: "FTR-2026-88412", people: 4 }],
      [-3, "y.içi ulaşım", 420, "Sunum için taksi (Levent — Maslak)", { vendor: "İstanbul Taksi", receipt: "TX-552310" }],
    ],
  ],
  [
    "VGEX-004855",
    -9,
    "review",
    "Ankara müşteri ziyaretleri",
    [
      [-12, "y.içi ulaşım", 3240, "İstanbul — Ankara gidiş-dönüş uçak bileti", { vendor: "Gökyüzü Havayolları", receipt: "PNR-K7QX2M" }],
      [-12, "y.içi konaklama", 7600, `${C["Ekinoks Enerji"].account} ziyareti — 2 gece otel`, { vendor: "Kızılay Park Otel", receipt: "OTL-4471" }],
      [-11, "y.içi seyahat yemek", 980, "Seyahat yemekleri", { vendor: "Çeşitli", receipt: "" }],
      [-11, "Temsil Ağırlama Yemek Giderler", 4250, `${C["Ekinoks Enerji"].account} IT ekibiyle iş yemeği`, { vendor: "Ankara Mutfak", receipt: "FTR-2026-71920", people: 5 }],
    ],
  ],
  [
    "VGEX-004830",
    -24,
    "returned",
    "Müşteri ziyaretleri — yakıt ve otopark",
    [
      [-30, "Taşıt Akaryakıt Gid.", 2150, "Bursa ve Kocaeli müşteri turu — yakıt", { vendor: "Yol Akaryakıt", receipt: "AKR-90311" }],
      [-29, "Taşıt Otopark Gid.", 360, `${C["Toros Tekstil"].account} ziyareti — otopark`, { vendor: "Merkez Otopark", receipt: "OTP-1188" }],
      [-29, "Taşıt HGS/OGS Gid.", 185, "Köprü ve otoyol geçişleri", { vendor: "Otoyol İşletmesi", receipt: "HGS-0925" }],
    ],
  ],
  [
    "VGEX-004802",
    -39,
    "approved",
    "Pera Otelcilik yenileme görüşmesi",
    [
      [-40, "Temsil Ağırlama Yemek Giderler", 3900, `${C["Pera Otelcilik"].account} — sözleşme yenileme öğle yemeği`, { vendor: "Galata Brasserie", receipt: "FTR-2026-61007", people: 3 }],
    ],
  ],
  [
    "VGEX-004777",
    -55,
    "processed",
    "Frankfurt perakende teknolojileri fuarı",
    [
      [-62, "y.dışı ulaşım", 420, "İstanbul — Frankfurt uçak bileti", { cur: "EUR", vendor: "Gökyüzü Havayolları", receipt: "PNR-F2LM8Q", abroad: true }],
      [-61, "y.dışı konaklama", 540, "Fuar oteli — 3 gece", { cur: "EUR", vendor: "Hotel Mainblick", receipt: "INV-77310", abroad: true }],
      [-60, "y.dışı yemek", 96, "Fuar günleri yemek", { cur: "EUR", vendor: "Çeşitli", receipt: "", abroad: true }],
      [-59, "Toplantı, Fuar ve Organizasyon", 150, "Fuar giriş kartı", { cur: "EUR", vendor: "Fair Services GmbH", receipt: "TKT-5521", abroad: true }],
    ],
  ],
  [
    "VGEX-004741",
    -78,
    "approved",
    "Aylık yakıt giderleri",
    [
      [-85, "Taşıt Akaryakıt Gid.", 1860, "Müşteri ziyaretleri — yakıt", { vendor: "Yol Akaryakıt", receipt: "AKR-87720" }],
      [-82, "Taşıt Akaryakıt Gid.", 1420, "Müşteri ziyaretleri — yakıt", { vendor: "Yol Akaryakıt", receipt: "AKR-87952" }],
    ],
  ],
  [
    "VGEX-004702",
    -108,
    "rejected",
    "Toros Tekstil akşam yemeği",
    [
      [-112, "Temsil Ağırlama Yemek Giderler", 5300, `${C["Toros Tekstil"].account} — fiyat görüşmesi yemeği (fiş eksik)`, { vendor: "Adana Ocakbaşı", receipt: "", people: 4 }],
    ],
  ],
  [
    "VGEX-004650",
    -146,
    "paid",
    "İzmir bölge toplantısı",
    [
      [-152, "y.içi ulaşım", 2780, "İstanbul — İzmir uçak bileti", { vendor: "Gökyüzü Havayolları", receipt: "PNR-Z3HD5R" }],
      [-152, "y.içi konaklama", 3450, "1 gece otel", { vendor: "Alsancak Otel", receipt: "OTL-2207" }],
      [-151, "Departman yemek ekip", 2600, "Bölge ekibiyle akşam yemeği", { vendor: "Kordon Lokantası", receipt: "FTR-2026-30115", people: 6 }],
    ],
  ],
  [
    "VGEX-004588",
    -205,
    "paid",
    "Orion Medikal teklif sunumu",
    [
      [-208, "Temsil Ağırlama Yemek Giderler", 2950, `${C["Orion Medikal"].account} — satın alma ekibiyle öğle yemeği`, { vendor: "Nişantaşı Bistro", receipt: "FTR-2026-12044", people: 3 }],
      [-208, "y.içi ulaşım", 310, "Taksi", { vendor: "İstanbul Taksi", receipt: "TX-301772" }],
    ],
  ],
  [
    "VGEX-004402",
    -330,
    "paid",
    "Nordis Lojistik çeyrek değerlendirmesi",
    [
      [-334, "y.içi konaklama", 2900, `${C["Nordis Lojistik"].account} — Kocaeli tesis ziyareti, 1 gece`, { vendor: "Gebze Business Hotel", receipt: "OTL-1902" }],
      [-334, "Taşıt Akaryakıt Gid.", 1240, "Yakıt", { vendor: "Yol Akaryakıt", receipt: "AKR-71203" }],
    ],
  ],
]

export function expenseLineRows(personnel, now = new Date()) {
  if (personnel !== mePersonnel(now)) return []
  let recid = 5637144576
  const rows = []
  for (const [number, , , , lines] of EXPENSE_PLAN) {
    lines.forEach(([at, cost, amount, explanation, opt = {}], i) => {
      const cur = opt.cur ?? "TRY"
      const mst = cur === "TRY" ? amount : Math.round(amount * EUR_RATE * 100) / 100
      recid += 7
      rows.push({
        mserp_tryaiemployeexpensetransentityid: stableGuid(`exp:${number}:${i}`),
        mserp_expnumber: number,
        mserp_employenumber: personnel,
        mserp_transdate: isoDay(toWeekday(dayFrom(now, at))),
        mserp_costtype: cost,
        mserp_amount: amount,
        mserp_currency: cur,
        mserp_explanation: explanation,
        mserp_referencedataareaid: LEGAL_ENTITY.toLowerCase(),
        mserp_employeexpensetrans_recid: recid,
        mserp_companyname: opt.vendor ?? "",
        mserp_trydocumentnumber: opt.receipt ?? "",
        mserp_trycostlocation: opt.abroad ? 200000001 : 200000000,
        [`mserp_trycostlocation${FV}`]: opt.abroad ? "Yurtdışı" : "Yurtiçi",
        mserp_numberofpeople: opt.people ?? 1,
        mserp_trycostcenter: "SATIS-KURUMSAL",
        mserp_amountmst: mst,
        mserp_exchangerate: cur === "TRY" ? 1 : EUR_RATE,
      })
    })
  }
  return rows
}

export function expenseHeaderRows(now = new Date()) {
  return EXPENSE_PLAN.map(([number, at, status, explanation]) => {
    const [code, label] = WF[status]
    return {
      mserp_tryaiemployeexpenseentityid: stableGuid(`exph:${number}`),
      mserp_expnumber: number,
      mserp_workflowstatus: code,
      [`mserp_workflowstatus${FV}`]: label,
      mserp_transdate: isoDay(toWeekday(dayFrom(now, at))),
      mserp_explanation: explanation,
      mserp_defaultdimensiondisplayvalue: "IST|SATIS-KURUMSAL|||",
      mserp_sourcecompanyid: LEGAL_ENTITY.toLowerCase(),
    }
  })
}

// ── İŞ AVANSLARI (yalnız oturumdaki kişi) ──────────────────────────────
const CA = {
  pending: [200000001, "Pending approval"],
  approved: [200000003, "Approved"],
  settled: [200000005, "Settled"],
  rejected: [200000006, "Rejected"],
}

// [no, gün, durum, amaç, yer, tutar, para birimi, not, kalan bakiye]
const ADVANCE_PLAN = [
  ["VGCA-000318", -2, "pending", "Müşteri Ziyareti", "İzmir", 5000, "TRY", "Ege bölgesi bayi ziyaretleri (3 gün)", 0],
  ["VGCA-000305", -15, "approved", "İş", "Ankara", 6000, "TRY", "Ankara müşteri ziyaretleri — konaklama ve ulaşım", 2350],
  ["VGCA-000291", -66, "settled", "Fuar", "Frankfurt", 800, "EUR", "Perakende teknolojileri fuarı", 0],
  ["VGCA-000270", -121, "rejected", "Müşteri Ziyareti", "Bursa", 3000, "TRY", "Plan iptal edildi — ziyaret çevrim içi yapıldı", 0],
  ["VGCA-000244", -212, "settled", "Kongre", "Antalya", 4500, "TRY", "Perakende yöneticileri kongresi", 0],
]

export function advanceRows(personnel, now = new Date()) {
  if (personnel !== mePersonnel(now)) return []
  return ADVANCE_PLAN.map(([number, at, status, purpose, location, amount, cur, note, balance]) => {
    const [code, label] = CA[status]
    return {
      mserp_trvcashadvanceentityid: stableGuid(`adv:${number}`),
      mserp_cashadvancenumber: number,
      mserp_requestingworkerpersonnelnumber: personnel,
      mserp_requesteddate: isoDay(toWeekday(dayFrom(now, at))),
      mserp_purpose: purpose,
      mserp_location: location,
      mserp_requestedamount: amount,
      mserp_currency: cur,
      mserp_note: note,
      mserp_cashadvancestatus: code,
      [`mserp_cashadvancestatus${FV}`]: label,
      mserp_trypaymentmode: "Bank",
      mserp_tryundocumented: 200000000,
      [`mserp_tryundocumented${FV}`]: "No",
      mserp_balance: balance,
    }
  })
}

// ── İSTİHDAM ───────────────────────────────────────────────────────────
export function employmentRows(now = new Date()) {
  return allRecords(now)
    .filter((r) => r.since)
    .map((r) => ({
      mserp_hcmemploymententityid: stableGuid(`emp:${r.personnel}`),
      mserp_personnelnumber: r.personnel,
      mserp_legalentityid: LEGAL_ENTITY,
      mserp_employmentstartdate: `${r.since}T00:00:00Z`,
    }))
}
