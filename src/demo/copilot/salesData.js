// Demo satış verisi — TÜMÜ KURGUSAL. Kişiler ve müşteri kontakları persona.js'ten;
// tutarlar ₺, çeyrek hep "içinde bulunulan" çeyrektir (quarterInfo).
//
// Bütün cevaplar AYNI sayıları söyler: ekip hedefi = temsilci hedeflerinin
// toplamı, kapanan = kazanılan fırsatların toplamı, huni = açık fırsatların
// aşamalara göre toplamı. Bir rakamı değiştiren ötekilerini de buradan değiştirir.
import { CUSTOMERS, MANAGER, ME, TEAM, COLLEAGUES } from "@/demo/persona"
import { dayFrom } from "./util"

export const MANAGER_NAME = MANAGER.displayName
export const ME_NAME = ME.displayName
const rep = (id) => TEAM.find((p) => p.id === id)
const contact = (account) => CUSTOMERS.find((c) => c.account === account)
export const FINANCE_BP = COLLEAGUES.find((p) => p.id === "u-can")
export const CS_MANAGER = COLLEAGUES.find((p) => p.id === "u-onur")
export const LEGAL = COLLEAGUES.find((p) => p.id === "u-baris")

/** Kota taşıyan temsilciler. Burak Demir satış operasyonu — kotası yok. */
export const REPS = [
  { person: rep("u-ece"), target: 11_000_000, won: 3_600_000, pipeline: 14_800_000, winRate: 34 },
  { person: rep("u-mert"), target: 10_000_000, won: 3_300_000, pipeline: 16_200_000, winRate: 31 },
  { person: rep("u-zeynep"), target: 8_000_000, won: 2_950_000, pipeline: 12_400_000, winRate: 28 },
  { person: rep("u-selin"), target: 7_000_000, won: 0, pipeline: 9_600_000, winRate: 22 },
]
export const OPS = rep("u-burak")

export const TEAM_TARGET = REPS.reduce((a, r) => a + r.target, 0) // 36 Mn
export const WON_QTD = REPS.reduce((a, r) => a + r.won, 0) // 9,85 Mn

/** Açık huni — aşama, adet, tutar, aşama olasılığı. */
export const STAGES = [
  { tr: "Keşif", en: "Discovery", count: 9, value: 14_200_000, prob: 10 },
  { tr: "Çözüm & Demo", en: "Solution & Demo", count: 7, value: 18_600_000, prob: 30 },
  { tr: "Teklif", en: "Proposal", count: 6, value: 15_300_000, prob: 50 },
  { tr: "Pazarlık", en: "Negotiation", count: 4, value: 12_900_000, prob: 75 },
]
export const PIPELINE_TOTAL = STAGES.reduce((a, s) => a + s.value, 0) // 61 Mn
export const PIPELINE_COUNT = STAGES.reduce((a, s) => a + s.count, 0) // 26
export const PIPELINE_WEIGHTED = STAGES.reduce((a, s) => a + (s.value * s.prob) / 100, 0)

/** Son altı ayın kapanan satışı (bu ay dahil değil, eskiden yeniye). */
export const MONTHLY_WON = [7_200_000, 8_100_000, 11_900_000, 6_400_000, 7_800_000, 13_600_000]

/** Bu çeyrek kazanılanlar. */
export const WON_DEALS = [
  { account: "Kuzey Gıda", name: "Midea Retail Suite yenileme", value: 3_600_000, owner: "u-ece" },
  { account: "Lima Eczane Zinciri", name: "Midea Track — 40 şube", value: 3_300_000, owner: "u-mert" },
  { account: "Atlas Yapı", name: "Midea Field Service", value: 2_950_000, owner: "u-zeynep" },
]

/** Öne çıkan açık fırsatlar. `closeIn`: bugünden kaç gün sonra kapanması bekleniyor. */
export const DEALS = [
  {
    id: "OPP-2418",
    account: "Altay Perakende",
    product: "Midea Retail Suite",
    tr: "120 mağazaya yaygınlaştırma",
    en: "rollout to 120 stores",
    value: 6_800_000,
    stage: 3,
    owner: "u-ece",
    closeIn: 24,
    lastTouch: 2,
    risk: "discount",
    commit: true,
  },
  {
    id: "OPP-2391",
    account: "Nordis Lojistik",
    product: "Midea WMS",
    tr: "3 depoda depo yönetimi",
    en: "warehouse management for 3 sites",
    value: 4_900_000,
    stage: 2,
    owner: "u-mert",
    closeIn: 38,
    lastTouch: 16,
    risk: "stale",
    commit: true,
  },
  {
    id: "OPP-2433",
    account: "Toros Tekstil",
    product: "Midea Planning",
    tr: "üretim planlama + 3 yıl destek",
    en: "production planning + 3-year support",
    value: 4_200_000,
    stage: 2,
    owner: "u-mert",
    closeIn: 45,
    lastTouch: 5,
    risk: "terms",
    commit: true,
  },
  {
    id: "OPP-2402",
    account: "Ekinoks Enerji",
    product: "Midea IoT Monitor",
    tr: "4 santralde uzaktan izleme",
    en: "remote monitoring for 4 plants",
    value: 3_750_000,
    stage: 1,
    owner: "u-zeynep",
    closeIn: 52,
    lastTouch: 3,
    risk: "poc",
    commit: false,
  },
  {
    id: "OPP-2377",
    account: "Pera Otelcilik",
    product: "Midea Guest",
    tr: "9 otelde misafir deneyimi platformu",
    en: "guest experience platform for 9 hotels",
    value: 2_950_000,
    stage: 3,
    owner: "u-selin",
    closeIn: 9,
    lastTouch: 4,
    risk: "budget",
    commit: true,
  },
  {
    id: "OPP-2450",
    account: "Orion Medikal",
    product: "Midea Track",
    tr: "tıbbi cihaz izlenebilirliği",
    en: "medical device traceability",
    value: 2_100_000,
    stage: 0,
    owner: "u-selin",
    closeIn: 70,
    lastTouch: 6,
    risk: null,
    commit: false,
  },
]

export const RISK_TEXT = {
  discount: {
    tr: "Satın alma %18 iskonto istiyor; %15 üstü Satış Direktörü onayı gerektiriyor.",
    en: "Procurement is asking for an 18% discount; anything above 15% needs the Sales Director's approval.",
  },
  stale: {
    tr: "16 gündür temas yok ve müşteri rakip bir teklifi değerlendiriyor.",
    en: "No contact for 16 days and the customer is evaluating a competing offer.",
  },
  terms: {
    tr: "CFO 120 gün vade istiyor; standart vademiz 60 gün.",
    en: "The CFO wants 120-day payment terms; our standard is 60 days.",
  },
  poc: {
    tr: "Pilot (PoC) sonuçları bekleniyor; IT onayı olmadan teklife geçilemiyor.",
    en: "Waiting on pilot (PoC) results; no proposal until IT signs off.",
  },
  budget: {
    tr: "Bütçe onayı gelecek çeyreğe kayabilir — kapanış tarihi bu ay.",
    en: "Budget approval may slip to next quarter — close date is this month.",
  },
}

export const NEXT_STEP = {
  discount: {
    tr: "İskontoyu %14'e çekip 3 yıllık sözleşmeyle dengele; gerekirse onaya gönder.",
    en: "Bring the discount to 14% and balance it with a 3-year term; send for approval if needed.",
  },
  stale: {
    tr: "Bu hafta Hande Polat ile yönetici seviyesinde bir görüşme ayarla.",
    en: "Book an executive-level call with Hande Polat this week.",
  },
  terms: {
    tr: "Finans (Can Şahin) ile 90 gün + %2 erken ödeme alternatifi hazırla.",
    en: "Prepare a 90-day + 2% early-payment alternative with Finance (Can Şahin).",
  },
  poc: {
    tr: "PoC kapanış toplantısını takvimle, başarı kriterlerini yazılı teyit et.",
    en: "Schedule the PoC wrap-up and confirm the success criteria in writing.",
  },
  budget: {
    tr: "Sevgi Karaca'ya bu çeyrek imzalanırsa ilk 3 ay ücretsiz destek öner.",
    en: "Offer Sevgi Karaca 3 months of free support if signed this quarter.",
  },
}

/** Temsilcilerin "kesin" dediği açık fırsatlar (commit) ve ona ek olası tutar. */
export const COMMIT = DEALS.filter((d) => d.commit).reduce((a, d) => a + d.value, 0) // 18,85 Mn
export const BEST_CASE = 5_600_000 // Ekinoks + listede olmayan küçük ek satışlar
export const FORECAST_COMMIT = WON_QTD + COMMIT // 28,7 Mn
export const FORECAST_BEST = FORECAST_COMMIT + BEST_CASE // 34,3 Mn

export const STAGE_OF = (deal) => STAGES[deal.stage]
export const OWNER_OF = (deal) => rep(deal.owner)
export const CONTACT_OF = (deal) => contact(deal.account)
export const closeDate = (deal) => dayFrom(deal.closeIn)

/** Müşteri kartları — hesap bazında ilişki özeti. */
export const ACCOUNTS = {
  "Altay Perakende": {
    sector: { tr: "Perakende (gıda dışı), 140 mağaza", en: "Non-food retail, 140 stores" },
    since: 2021,
    arr: 4_200_000,
    health: { tr: "İyi", en: "Good" },
    nps: 52,
    note: {
      tr: "Mevcut POS lisansları 2026 sonunda yenileniyor; yaygınlaştırma ile birleştirmek istiyorlar.",
      en: "Current POS licences renew at year end; they want to bundle the renewal with the rollout.",
    },
  },
  "Nordis Lojistik": {
    sector: { tr: "3PL lojistik, 6 depo", en: "3PL logistics, 6 warehouses" },
    since: 2023,
    arr: 1_100_000,
    health: { tr: "Dikkat", en: "Watch" },
    nps: 31,
    note: {
      tr: "Son destek talebinde çözüm süresi SLA'yı aştı; Onur Tekin takipte.",
      en: "The last support ticket breached SLA; Onur Tekin is following up.",
    },
  },
  "Ekinoks Enerji": {
    sector: { tr: "Yenilenebilir enerji, 4 santral", en: "Renewable energy, 4 plants" },
    since: 2024,
    arr: 650_000,
    health: { tr: "İyi", en: "Good" },
    nps: 48,
    note: {
      tr: "Pilot iki santralde çalışıyor; arıza tespiti %23 hızlandı.",
      en: "The pilot runs at two plants; fault detection is 23% faster.",
    },
  },
  "Pera Otelcilik": {
    sector: { tr: "Otelcilik, 9 otel", en: "Hospitality, 9 hotels" },
    since: 2022,
    arr: 900_000,
    health: { tr: "İyi", en: "Good" },
    nps: 57,
    note: {
      tr: "Sezon sonu bütçe revizyonu yapıyorlar; karar vericiler Genel Müdür ve Sevgi Karaca.",
      en: "They are revising budgets after the season; decision makers are the GM and Sevgi Karaca.",
    },
  },
  "Toros Tekstil": {
    sector: { tr: "Tekstil üretimi, 2 fabrika", en: "Textile manufacturing, 2 plants" },
    since: 2020,
    arr: 1_750_000,
    health: { tr: "Dikkat", en: "Watch" },
    nps: 38,
    note: {
      tr: "Nakit akışı baskısı var; ödeme koşulları ana gündem.",
      en: "Cash-flow pressure; payment terms are the main topic.",
    },
  },
  "Orion Medikal": {
    sector: { tr: "Medikal dağıtım", en: "Medical distribution" },
    since: null,
    arr: 0,
    health: { tr: "Yeni", en: "New" },
    nps: null,
    note: {
      tr: "Yeni potansiyel müşteri; ilk görüşme fuarda yapıldı, mevzuat (UTS) uyumu öncelik.",
      en: "New prospect; first met at a trade fair, regulatory traceability is the priority.",
    },
  },
}

/** İskonto yetki matrisi. */
export const DISCOUNT_POLICY = [
  { upTo: 10, tr: "Satış temsilcisi", en: "Sales rep" },
  { upTo: 15, tr: `Satış Müdürü (${ME_NAME})`, en: `Sales Manager (${ME_NAME})` },
  { upTo: 20, tr: `Satış Direktörü (${MANAGER_NAME})`, en: `Sales Director (${MANAGER_NAME})` },
  { upTo: 100, tr: "CFO + Finans onayı", en: "CFO + Finance" },
]
export const MARGIN_FLOOR = 28

export { CUSTOMERS, TEAM }
