import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon"
import File01Icon from "@hugeicons/core-free-icons/File01Icon"
import Folder01Icon from "@hugeicons/core-free-icons/Folder01Icon"
import Mail01Icon from "@hugeicons/core-free-icons/Mail01Icon"
import UserGroupIcon from "@hugeicons/core-free-icons/UserGroupIcon"
// Katlama ve sıralama tek kaynaktan: `toLocaleLowerCase("tr")` + ı→i, 1:1
// uzunluk korur (vurgu işaretleme buna güveniyor).
import { foldTr, trSort } from "@/lib/utils"

/**
 * "/" ile açılan referans seçicinin sekmeleri.
 *
 * Sekme kümesi ASİSTANA göredir ve kümeyi `promptKeyForAgent` belirler —
 * hazır önerilerdeki eşleşmenin aynısı, yani ADLA (katalog GUID'i ortamlar
 * arasında değişiyor). TYRO Office'e gemi listesi, TYRO Trader'a gelen kutusu
 * göstermek ikisini de yabancı bir yüzeye çevirirdi.
 *
 * `group` alanı sekmenin verisini kimin sağladığını söyler: `office` Graph
 * hook'ları (zaten sıcak önbellekler), `trader` freight aynası (ağ yok ama
 * modül ağır, o yüzden tembel yüklenir).
 */
export const REFERENCE_TABS = [
  {
    id: "meetings",
    group: "office",
    icon: Calendar03Icon,
    labelKey: "ref.tab.meetings",
    scopeKey: "ref.scope.meetings",
  },
  {
    id: "people",
    group: "office",
    icon: UserGroupIcon,
    labelKey: "ref.tab.people",
    scopeKey: "ref.scope.people",
  },
  {
    id: "mail",
    group: "office",
    icon: Mail01Icon,
    labelKey: "ref.tab.mail",
    scopeKey: "ref.scope.mail",
  },
  {
    id: "onedrive",
    group: "office",
    icon: File01Icon,
    labelKey: "ref.tab.onedrive",
    scopeKey: "ref.scope.onedrive",
  },
  {
    id: "sharepoint",
    group: "office",
    icon: Folder01Icon,
    labelKey: "ref.tab.sharepoint",
    scopeKey: "ref.scope.sharepoint",
  },
]

/**
 * Asistanın sekmeleri.
 *
 * Şu an HERKESE aynı küme dönüyor: sekmeler Graph'tan besleniyor (toplantı,
 * kişi, posta, OneDrive, SharePoint) ve bu veri asistandan bağımsız olarak
 * kullanıcının kendisine ait. tyroTrade'de bir de sefer/proje/liman kümesi
 * var ve orada küme asistana göre ayrılıyor; o sekmeler freight aynasından
 * besleniyor ve bu uygulamada öyle bir veri katmanı yok.
 *
 * İmza `agentName` alıyor — kümeyi asistana göre ayırma kararı geldiğinde
 * çağrı yerlerinin değil yalnızca bu fonksiyonun değişmesi için.
 */
export function tabsForAgent(agentName) {
  void agentName
  return REFERENCE_TABS
}

/** Render maliyeti sınırı: kullanıcı yazarak daraltır, 400 satır çizmeyiz. */
const MAX_ROWS = 50

/**
 * Sorguya göre süzme ve sıralama.
 *
 * Satırlar `search` alanını KATLANMIŞ olarak taşır (liste kurulurken bir kez),
 * çünkü katlamayı tuş başına yapmak 850 projelik listede yazmayı takılmalı
 * hâle getiriyordu. Sıralama: tam eşleşme → baştan eşleşme → içerik; eşitlikte
 * Türkçe harf sırası.
 */
export function filterRows(rows, query) {
  const q = foldTr(query.trim())
  if (!q) return { rows: rows.slice(0, MAX_ROWS), total: rows.length }
  const hits = []
  for (const row of rows) {
    const at = row.search.indexOf(q)
    if (at < 0) continue
    hits.push({ row, rank: row.search === q ? 0 : at === 0 ? 1 : 2, at })
  }
  hits.sort((a, b) => a.rank - b.rank || a.at - b.at || trSort(a.row.title, b.row.title))
  return { rows: hits.slice(0, MAX_ROWS).map((h) => h.row), total: hits.length }
}

export { foldTr }

/** Satırın aranabilir metni — parçalar katlanmış tek dizede birleşir. */
export function searchKey(...parts) {
  return foldTr(parts.filter(Boolean).join(" "))
}

/** Ad → baş harfler; kişi satırlarında fotoğraf yerine bu çizilir. */
export function initialsOf(name) {
  const words = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (words.length === 0) return "?"
  return (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : "")).toLocaleUpperCase(
    "tr",
  )
}
