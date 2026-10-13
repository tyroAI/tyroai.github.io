/**
 * Pano'nun yerleşimi — sıra, bölge ve genişlik BURADA, bileşenlerde değil;
 * kişinin düzeni (`useWidgetLayout`) bu listeden türer, widget'lar aynı kalır.
 *
 * ÜÇ BÖLGE (`zone`), tek düzenleme kipi:
 * - `left` — ana bölümün SOL SÜTUNU, Anasayfa'nın karşılama kolonu: genişliği
 *   onunki (0.74fr), satırları hava kartının (232px) ve soru kutusunun boyunda.
 * - `main` — ana bölümün sağ ızgarası (1 → 2 → 3 sütun): brifing² · sıradaki
 *   toplantı / ritim² · öneri. Yeni widget buraya da eklenebilir.
 * - `more` — "Diğer widget'lar" (1 → 2 → 4 sütun; 3 sütun yok — son satırda
 *   tek kart kalıyordu). Varsayılan 2 ve 4 sütunda boşluksuz (birim testi).
 * Her satır sabit boyda: yan yana kartlar kendiliğinden hizalı. Hiçbir widget
 * simetri için gizlenmez; denge genişlikle kurulur.
 */
const HALF = "@[34rem]/myspace:col-span-2"
export const ZONES = ["left", "main", "more"]

const DEFAULT_ORDER = [
  ["weather", "left"],
  ["ask", "left"],
  ["brief", "main", true],
  ["next-meeting", "main"],
  ["rhythm", "main", true],
  ["nudge", "main"],
  ["pending-mail", "more"],
  ["planner", "more"],
  ["recent-files", "more"],
  ["suggest", "more"],
  ["team-today", "more", true],
  ["holiday", "more"],
  ["travel", "more"],
  ["market", "more", true],
  ["week", "more"],
  ["focus", "more"],
  ["outcomes", "more", true],
  ["focus-window", "more"],
  ["feed-picks", "more"],
]

/**
 * Pano'nun bütün widget'ları: başlık (kısa açıklama `widgets.catalog.<id>`,
 * Widget ekle menüsü), eklenince alacağı genişlik ve — varsa — gideceği bölge.
 */
export const CATALOG = {
  // Hava kartları kendi göğünü taşır: görünüm seçeneği yok (`looks: false`).
  weather: { title: "widgets.weather.title", looks: false },
  // Hava kartının alternatifleri: eklenince sol sütunun başına (`zone`).
  intro: { title: "widgets.intro.title", zone: "left", looks: ["palette", "glass", "plain"] },
  "weather-plain": { title: "myspace.weather.title", zone: "left", looks: false },
  ask: { title: "widgets.ask.title", wide: true },
  // Anasayfa'nın kendi kartları: özet balonu ve yardım küresi.
  "day-summary": { title: "myspace.brief.title" },
  help: { title: "widgets.help.title" },
  brief: { title: "widgets.brief.title", wide: true },
  "next-meeting": { title: "myspace.meeting.title" },
  rhythm: { title: "myspace.rhythm.title", wide: true },
  nudge: { title: "widgets.nudge.title" },
  "pending-mail": { title: "widgets.mail.title" },
  planner: { title: "widgets.planner.title" },
  "recent-files": { title: "widgets.files.title" },
  suggest: { title: "widgets.suggest.title" },
  "team-today": { title: "widgets.team.title", wide: true },
  week: { title: "widgets.week.title" },
  market: { title: "widgets.market.title", wide: true },
  focus: { title: "myspace.tasks.title" },
  // To-Do sayfasının tek kartı: kendi gradyanını taşır, görünüm seçeneği yok (hava gibi).
  "todo-summary": { title: "widgets.todo.title", wide: true, looks: false },
  outcomes: { title: "widgets.outcomes.title", wide: true },
  holiday: { title: "widgets.holiday.title" },
  travel: { title: "widgets.travel.title" },
  "focus-window": { title: "widgets.focusWindow.title" },
  "feed-picks": { title: "widgets.feed.title" },
}

/**
 * Görünüm seçenekleri (Düzenle › Görünüm), ilki varsayılan: kartların çoğu standart
 * ya da cam; Karşılama renkli · cam · sade; hava kartlarında yok.
 */
const STANDARD_LOOKS = ["standard", "glass"]
export const looksOf = (id) =>
  CATALOG[id]?.looks === false ? [] : (CATALOG[id]?.looks ?? STANDARD_LOOKS)

/** Bölge ve genişlik → ızgara sınıfı: sol sütunda kart sütunun genişliğinde. */
export const spanOf = (zone, wide) => (zone !== "left" && wide ? HALF : "")

const toLayout = (order) => order.map(([id, zone, wide]) => ({ id, zone, wide: Boolean(wide) }))

/** Varsayılan düzen `[{ id, zone, wide }]` — bölge içinde sıra ızgaradaki sıradır. */
export const DEFAULT_LAYOUT = toLayout(DEFAULT_ORDER)

/**
 * Anasayfa'nın varsayılanı: solda gök kartı ve soru kutusu; sağda üstte Günün brifingi
 * (geniş) · sıradaki toplantı (köşe), altta ritim (geniş) · yardım küresi. Özet balonu ve
 * Bugünün odağı varsayılanda yok (katalogdan eklenir).
 */
export const HOME_LAYOUT = toLayout([
  ["weather", "left"],
  ["ask", "left"],
  ["brief", "main", true],
  ["next-meeting", "main"],
  ["rhythm", "main", true],
  ["help", "main"],
])

/**
 * Panolar — aynı düzenleme, farklı kayıt ve bölgeler. Pano: üç bölge, yeni widget
 * "Diğer"e. Anasayfa: "Diğer" YOK — her şey ana bölümde (asistan ayracının üstünde),
 * yeni widget ana bölümün sonuna. `tour`: Anasayfa turunun hedefleri yuvalarda.
 */
export const BOARDS = {
  pano: {
    id: "pano",
    key: "tyro-widgets-layout-v1",
    version: 7,
    zones: ZONES,
    defaults: DEFAULT_LAYOUT,
    addZone: "more",
    labels: { bar: "widgets.editBar" },
  },
  home: {
    id: "home",
    key: "tyro-home-layout-v1",
    version: 2,
    zones: ["left", "main"],
    defaults: HOME_LAYOUT,
    addZone: "main",
    labels: { bar: "widgets.editBarHome" },
    tour: { weather: "welcome", "weather-plain": "welcome", intro: "welcome", ask: "ask" },
  },
}
