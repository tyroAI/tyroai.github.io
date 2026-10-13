// Microsoft To Do ve Planner — satış müdürünün işleri (kurgusal). Teslim
// tarihleri İLK OKUMA anına göre kurulur ve oturum boyunca bellekte yaşar
// (eklenen, düzenlenen, tamamlanan görevler sayfa yenilenene kadar kalır).
import { COLLEAGUES, CUSTOMERS, DEMO_DOMAIN, ME, TEAM, findPerson } from "../persona"
import { DAY, HOUR, MIN, addDays, dayKey, startOfDay } from "./calendar-time"

const who = (id, fallback) => (findPerson(id) ?? fallback)?.displayName ?? ""
const ECE = who("u-ece", TEAM[0])
const MERT = who("u-mert", TEAM[1])
const SELIN = who("u-selin", TEAM[2])
const BURAK = who("u-burak", TEAM[3])
const ZEYNEP = who("u-zeynep", TEAM[4])
const AYSE = who("u-ayse", COLLEAGUES[0])
const CAN = who("u-can", COLLEAGUES[1])
const ELIF = who("u-elif", COLLEAGUES[4])
const acc = (prefix, i) =>
  (CUSTOMERS.find((c) => c.account.toLowerCase().startsWith(prefix)) ?? CUSTOMERS[i]).account
const ALTAY = acc("altay", 0)
const NORDIS = acc("nordis", 1)
const EKINOKS = acc("ekinoks", 2)
const PERA = acc("pera", 3)
const TOROS = acc("toros", 4)
const ORION = acc("orion", 5)
const first = (n) => n.split(" ")[0]

/** To Do'nun gün biçimi: o günün UTC gece yarısı. */
export const dueOf = (key) => ({ dateTime: `${key}T00:00:00.0000000`, timeZone: "UTC" })
/** Gerçek bir an, UTC duvar saatiyle (To Do'nun `completedDateTime` biçimi). */
export const utcStamp = (ms) => ({
  dateTime: new Date(ms).toISOString().replace("Z", "0000"),
  timeZone: "UTC",
})

export const LISTS = [
  { id: "list-tasks", displayName: "Görevler", wellknownListName: "defaultList" },
  { id: "list-flagged", displayName: "İşaretli e-posta", wellknownListName: "flaggedEmails" },
  { id: "list-q4", displayName: "Q4 Satış Planı", wellknownListName: "none" },
  { id: "list-accounts", displayName: "Müşteri Takipleri", wellknownListName: "none" },
  { id: "list-team", displayName: "Ekip & Koçluk", wellknownListName: "none" },
  {
    id: "list-kickoff",
    displayName: "Satış Kick-off 2027",
    wellknownListName: "none",
    isShared: true,
  },
]

const mailLink = (subject) => ({
  webUrl: `https://outlook.${DEMO_DOMAIN}/mail/inbox/id/${encodeURIComponent(subject.slice(0, 24))}`,
  applicationName: "Outlook",
  displayName: subject,
})

/**
 * Görev tanımları. `due`/`done` bugüne göre gün farkı; `done` yoksa açık.
 * `doneAt` tamamlanma saati (gün içi dakika). `steps`: [başlık, bitti mi].
 */
const TASKS = [
  // ── Görevler (varsayılan liste)
  {
    list: "list-tasks",
    title: `${ALTAY}'a revize teklifi gönder`,
    due: 0,
    importance: "high",
    note: `QBR'da konuşulan 2027 hacim iskontosu ve konsolide faturalama seçeneği eklenecek. ${CAN} ile marj kontrolü yapıldı.`,
    steps: [
      [`İskonto oranını ${first(CAN)} ile teyit et`, true],
      ["Teslimat takvimini güncelle", false],
      ["Teklif PDF'ini hazırla ve gönder", false],
    ],
    reminder: { day: 0, minute: 14 * 60 },
  },
  {
    list: "list-tasks",
    title: `${TOROS} %12 iskonto talebini değerlendir`,
    due: 0,
    importance: "high",
    note: "Fiyat Komitesi öncesi karar notu: marj etkisi %3,4; alternatif olarak 3 yıllık sözleşmeye bağlı kademeli iskonto.",
  },
  {
    list: "list-tasks",
    title: `${EKINOKS} vadesi geçmiş faturası için tahsilat takibi`,
    due: -1,
    importance: "high",
    note: "Fatura VG-2026-08814 · 42 gün gecikme · 1,2 M TL. Satın alma müdürüyle görüşüldü, ödeme talimatı bekleniyor.",
    links: [mailLink(`RE: ${EKINOKS} — ödeme planı`)],
  },
  {
    list: "list-tasks",
    title: "Ekibin CRM hijyenini gözden geçir",
    due: -2,
    note: "Kapanış tarihi geçmiş fırsatlar, eksik karar verici bilgisi, 90 günden eski teklifler.",
    recurrence: "weekly",
    steps: [
      ["Kapanış tarihi geçmiş fırsat listesini çek", true],
      [`${first(BURAK)} ile rapor şablonunu kontrol et`, false],
      ["Her temsilciye kısa geri bildirim gönder", false],
    ],
  },
  {
    list: "list-tasks",
    title: "Q4 forecast'ını CRM'de güncelle",
    due: 1,
    importance: "high",
    note: "Cuma 12:00'ye kadar commit / best case ayrımıyla.",
    steps: [
      ["Commit listesini netleştir", false],
      ["Risk altındaki fırsatlara not ekle", false],
      ["Kur etkisini yansıt", false],
    ],
  },
  {
    list: "list-tasks",
    title: `${first(SELIN)} ile müzakere koçluğu notlarını hazırla`,
    due: 1,
  },
  {
    list: "list-tasks",
    title: "Haftalık satış raporunu Kerem'e gönder",
    due: "friday",
    recurrence: "weekly",
    note: "Sipariş girişi, hedefe göre durum, gelecek haftanın kritik fırsatları.",
  },
  {
    list: "list-tasks",
    title: `${NORDIS} ihale dokümanlarını incele`,
    due: 0,
    done: 0,
    doneAt: 8 * 60 + 20,
  },
  {
    list: "list-tasks",
    title: "Ekim kampanya brifingini ekiple paylaş",
    due: -1,
    done: -1,
    doneAt: 16 * 60 + 40,
  },
  {
    list: "list-tasks",
    title: `${PERA} sözleşme yenilemesi için hukuk onayı al`,
    due: -3,
    done: -3,
    doneAt: 11 * 60 + 5,
  },
  {
    list: "list-tasks",
    title: "Masraf raporunu onaya gönder",
    due: -6,
    done: -5,
    doneAt: 9 * 60 + 30,
  },
  {
    list: "list-tasks",
    title: "Satış ekibi yıllık izin planını onayla",
    done: -9,
    doneAt: 15 * 60,
  },
  // ── İşaretli e-posta
  {
    list: "list-flagged",
    title: `RE: ${ORION} — demo sonrası sorular`,
    due: 2,
    importance: "high",
    links: [mailLink(`RE: ${ORION} — demo sonrası sorular`)],
    note: "Entegrasyon süresi, veri saklama bölgesi ve lisans modeli soruldu.",
  },
  {
    list: "list-flagged",
    title: "Fiyat listesi 2027 — Finans onayı",
    links: [mailLink("Fiyat listesi 2027 — Finans onayı")],
  },
  {
    list: "list-flagged",
    title: `${PERA} — referans ziyareti talebi`,
    due: 4,
    links: [mailLink(`${PERA} — referans ziyareti talebi`)],
  },
  // ── Q4 Satış Planı
  {
    list: "list-q4",
    title: "İlk 10 fırsat için kapanış planı",
    due: 3,
    importance: "high",
    status: "inProgress",
    steps: [
      [`${ALTAY} — yönetim onayı`, true],
      [`${NORDIS} — ihale fiyat turu`, false],
      [`${ORION} — pilot teklifi`, false],
      [`${EKINOKS} — bütçe onayı`, false],
    ],
  },
  { list: "list-q4", title: "Bölgesel kota dağılımını finalize et", due: 5 },
  {
    list: "list-q4",
    title: "Satış kick-off 2027 ajandasını taslakla",
    due: 6,
    note: `${first(AYSE)} ile ortak; ödül kategorileri ve konuşmacı önerileri.`,
  },
  {
    list: "list-q4",
    title: "Q4 kampanya bütçesi için Pazarlama ile hizalan",
    due: -4,
    done: -4,
    doneAt: 14 * 60 + 15,
  },
  {
    list: "list-q4",
    title: "Kurumsal paket fiyatlarını CRM'e yükle",
    due: -8,
    done: -7,
    doneAt: 10 * 60,
  },
  // ── Müşteri Takipleri
  {
    list: "list-accounts",
    title: `${NORDIS} — ihale sorularını yanıtla`,
    due: 2,
    importance: "high",
  },
  {
    list: "list-accounts",
    title: `${ORION} — demo sonrası teşekkür e-postası`,
    due: 0,
    note: `Pilot önerisini ve ${first(ELIF)}'in entegrasyon dokümanını ekle.`,
  },
  { list: "list-accounts", title: `${PERA} — referans ziyareti ayarla`, due: 4 },
  {
    list: "list-accounts",
    title: `${ALTAY} — yeni lokasyon listesi iste`,
    due: 7,
  },
  {
    list: "list-accounts",
    title: `${TOROS} — yıllık iş değerlendirmesi toplantısı planla`,
    due: -2,
    done: -2,
    doneAt: 17 * 60 + 10,
  },
  // ── Ekip & Koçluk
  {
    list: "list-team",
    title: `${first(MERT)}'in yıllık performans hedeflerini gözden geçir`,
    due: 7,
  },
  {
    list: "list-team",
    title: `${first(ZEYNEP)} için yeni pazar araştırmasına geri bildirim ver`,
    due: 3,
  },
  {
    list: "list-team",
    title: `${first(ECE)} izne çıkmadan devir notlarını al`,
    due: 0,
    importance: "high",
  },
  {
    list: "list-team",
    title: `${first(BURAK)} ile CRM rapor şablonunu güncelle`,
    due: -2,
    done: -2,
    doneAt: 15 * 60 + 30,
  },
  // ── Satış Kick-off 2027 (paylaşılan)
  { list: "list-kickoff", title: "Konuşmacı listesini netleştir", due: 9 },
  { list: "list-kickoff", title: "Ödül kategorileri için aday öner", due: 12 },
  {
    list: "list-kickoff",
    title: "Mekân seçeneklerini değerlendir",
    done: -6,
    doneAt: 12 * 60,
  },
]

function nextFriday(today) {
  const d = new Date(today)
  const diff = (5 - d.getDay() + 7) % 7
  return addDays(d, diff)
}

function weeklyRecurrence(key) {
  const [y, m, d] = key.split("-").map(Number)
  const wd = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][
    new Date(y, m - 1, d).getDay()
  ]
  return {
    pattern: { type: "weekly", interval: 1, daysOfWeek: [wd], firstDayOfWeek: "monday" },
    range: { type: "noEnd", startDate: key, endDate: "0001-01-01", recurrenceTimeZone: "UTC" },
  }
}

/** Belleğe yüklenecek tohum: `{ lists, tasks }` — `tasks` liste kimliği → görevler. */
export function seedTodo(now = new Date()) {
  const today = startOfDay(now)
  const tasks = Object.fromEntries(LISTS.map((l) => [l.id, []]))
  let n = 0
  for (const s of TASKS) {
    n += 1
    const id = `task-${String(n).padStart(3, "0")}`
    const dueDay =
      s.due === "friday" ? nextFriday(today) : s.due == null ? null : addDays(today, s.due)
    const dueKey = dueDay ? dayKey(dueDay) : null
    const doneMs =
      s.done != null ? addDays(today, s.done).getTime() + (s.doneAt ?? 9 * 60) * MIN : null
    // Bugün bitenin saati şimdiden ileride olamaz.
    const doneAt = doneMs != null ? Math.min(doneMs, now.getTime() - 5 * MIN) : null
    const createdAt = (dueDay ?? today).getTime() - (4 + (n % 9)) * DAY + (n % 7) * HOUR
    const modified = doneAt ?? Math.min(createdAt + 2 * DAY, now.getTime() - (n % 5) * HOUR)
    const task = {
      id,
      title: s.title,
      status: doneAt != null ? "completed" : (s.status ?? "notStarted"),
      importance: s.importance ?? "normal",
      isReminderOn: Boolean(s.reminder),
      createdDateTime: new Date(Math.min(createdAt, modified)).toISOString(),
      lastModifiedDateTime: new Date(modified).toISOString(),
      hasAttachments: false,
      categories: [],
      body: { content: s.note ?? "", contentType: "text" },
      ...(dueKey ? { dueDateTime: dueOf(dueKey) } : {}),
      ...(doneAt != null ? { completedDateTime: utcStamp(doneAt) } : {}),
      ...(s.reminder
        ? {
            reminderDateTime: utcStamp(
              addDays(today, s.reminder.day).getTime() + s.reminder.minute * MIN,
            ),
          }
        : {}),
      ...(s.recurrence && dueKey ? { recurrence: weeklyRecurrence(dueKey) } : {}),
      checklistItems: (s.steps ?? []).map(([title, checked], i) => ({
        id: `${id}-step-${i + 1}`,
        displayName: title,
        isChecked: checked,
        createdDateTime: new Date(createdAt + (i + 1) * MIN).toISOString(),
        ...(checked ? { checkedDateTime: new Date(createdAt + DAY).toISOString() } : {}),
      })),
      linkedResources: (s.links ?? []).map((l, i) => ({
        id: `${id}-link-${i + 1}`,
        externalId: `${id}-mail`,
        ...l,
      })),
    }
    tasks[s.list].push(task)
  }
  return {
    lists: LISTS.map((l) => ({
      id: l.id,
      displayName: l.displayName,
      isOwner: true,
      isShared: Boolean(l.isShared),
      wellknownListName: l.wellknownListName,
    })),
    tasks,
    owner: ME.mail,
  }
}

/* ─── Planner ─────────────────────────────────────────────────────────── */

export const PLANS = {
  "plan-salesops": "Satış Operasyonları",
  "plan-campaign": "Q4 Kampanya Lansmanı",
  "plan-crm": "CRM Geçiş Projesi",
}

const PLANNER = [
  ["plan-salesops", "Bayi portalına 2027 fiyat listesini yükle", 3, 0, 3],
  ["plan-salesops", "Teklif şablonlarını yeni marka kılavuzuna göre güncelle", 6, 50, 5],
  ["plan-salesops", "Ay sonu sipariş mutabakatı", "monthEnd", 0, 1],
  ["plan-campaign", "Kurumsal paket kampanyası için hedef hesap listesini onayla", -1, 50, 1],
  ["plan-campaign", "Satış ekibi için itiraz karşılama rehberini gözden geçir", 2, 0, 5],
  ["plan-campaign", "Kampanya lead'lerinin ilk temas SLA'sını raporla", 9, 0, 5],
  ["plan-crm", "Fırsat aşamaları için kabul testini tamamla", 1, 50, 3],
  ["plan-crm", "Satış ekibi CRM eğitim takvimini paylaş", 5, 0, 5],
  ["plan-crm", "Eski CRM'deki açık teklifleri arşivle", -4, 100, 5],
]

export function seedPlanner(now = new Date()) {
  const today = startOfDay(now)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  return PLANNER.map(([planId, title, due, percent, priority], i) => {
    const day = due === "monthEnd" ? monthEnd : addDays(today, due)
    // Yerel öğlen: her saat diliminde aynı güne düşer.
    const dueMs = day.getTime() + 12 * HOUR
    return {
      "@odata.etag": `W/"JzEtVGFzayAgQEBAQEBAQEBAQEBAQEBAWCc="`,
      id: `ptask-${String(i + 1).padStart(2, "0")}`,
      planId,
      bucketId: `${planId}-bucket`,
      title,
      orderHint: `8585${i}`,
      assigneePriority: "",
      percentComplete: percent,
      priority,
      startDateTime: null,
      createdDateTime: new Date(dueMs - 12 * DAY).toISOString(),
      dueDateTime: new Date(dueMs).toISOString(),
      hasDescription: false,
      previewType: "automatic",
      completedDateTime: percent === 100 ? new Date(dueMs - DAY).toISOString() : null,
      referenceCount: 0,
      checklistItemCount: 0,
      activeChecklistItemCount: 0,
      conversationThreadId: null,
      assignments: {
        [ME.id]: {
          "@odata.type": "#microsoft.graph.plannerAssignment",
          assignedDateTime: new Date(dueMs - 12 * DAY).toISOString(),
          orderHint: "8585!",
          assignedBy: { user: { id: ME.id, displayName: ME.displayName } },
        },
      },
    }
  })
}
