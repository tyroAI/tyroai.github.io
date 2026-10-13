import { requestOpenChat, setPendingAsk } from "@/lib/chatBus"

/**
 * DOSYA EYLEMLERİ — panel, sohbet seçicisi ve Keşfet › Dosyalarım'ın ortak
 * kuralları. Bileşen dosyalarının içinde yaşıyorlardı; bir bileşenden işlev
 * ihraç etmek React Refresh sınırını bozduğu için buraya taşındı.
 */

/**
 * Dosyayı asistana devreder: soru sohbete PARK EDİLİR, rıhtım açılır, sayfa
 * yerinde kalır (header panellerinin "TYRO'ya sor" yolu).
 *
 * Bağlam olarak ADRES gidiyor, dosyanın metni değil: TYRO Office kiracıda
 * yetkili, SharePoint yolunu kendisi çözüp belgeyi açabiliyor. Metni
 * tarayıcıda çıkarmak (docx/pdf ayrıştırıcıları, boyut kırpma) gereksiz — ve
 * kırpılmış bir metinden çıkan özet belgenin kendisinden çıkana göre hep
 * daha kötü olurdu.
 */
export function askTyroAboutFile(item, mode, t) {
  setPendingAsk({
    question: t(mode === "summarise" ? "files.summarisePrompt" : "files.workPrompt", {
      name: item.name,
      url: item.webUrl,
    }),
    agent: "tyro office",
  })
  requestOpenChat({ focusComposer: true })
}

const ONEDRIVE_TYPES = new Set(["personal", "business"])

/**
 * Bu satır kullanıcının kendi OneDrive'ında mı?
 *
 * Üç sinyal, güvenilirlik sırasıyla:
 *  1. Sürücü kimliği — kesin. `/me/drive` bir kez sorulup önbelleğe alınır.
 *  2. Adres — `/personal/` ve `-my.` kişisel sürücünün deseni, `/sites/` ve
 *     `/teams/` SharePoint'in.
 *  3. `parentReference.driveType` — `/me/drive/recent` satırlarında ÇOĞU
 *     ZAMAN gelmiyor, o yüzden en sonda.
 * Hiçbiri konuşmuyorsa dosya OneDrive sayılır: kullanıcının kendi
 * sürücüsü varsayılan, kayıp satır olmasın.
 *
 * ⚠️ Adres deseni "kişinin KENDİ" OneDrive'ını değil "BİR OneDrive"ı
 * tanıyor: başkasının paylaştığı OneDrive dosyası da `/personal/` taşır.
 * Kesin cevap yalnız 1. sinyalde; `driveId` artık `remoteItem`den
 * çözüldüğü için (`lib/driveItem.js`) paylaşılan satırlarda da dolu.
 */
export function isOwnDrive(item, myDriveId) {
  if (myDriveId && item.driveId) return item.driveId === myDriveId
  const url = item.webUrl || ""
  if (/\/personal\//i.test(url) || /-my\.[^/]*sharepoint\.com/i.test(url)) return true
  if (/\/sites\//i.test(url) || /\/teams\//i.test(url)) return false
  if (item.driveType) return ONEDRIVE_TYPES.has(item.driveType)
  return true
}

/**
 * Bir dosya bağlantısının tıklaması: DÜZ tık uygulama içi önizlemeyi açar,
 * Cmd/Ctrl/Shift/Alt + tık ve orta tuş tarayıcının işi (yeni sekme).
 * Önizlemesi işe yaramayan tür (`opensExternally`) her zaman yeni sekmede.
 *
 * Kural tek yerde: bugün Dosyalarım'ın satırı (`FileRow`) çağırıyor; dosya
 * bağlantısı açan yeni bir yer de bunu çağırsın — iki kopya zamanla iki
 * farklı tıklama olur.
 *
 * ⚠️ `external` ÇAĞIRANDAN (`opensExternally`, `lib/filesQuery.js`): bu dosya
 * header'ın dosya paneli üzerinden giriş paketinde; `filesQuery`i buradan
 * içe almak 800 satırlık sorgu katmanını herkese indirtirdi.
 *
 * @param {MouseEvent} e  bir `<a href target=_blank>`in tıklaması
 * @param {object} item
 * @param {(item) => void} onOpen  önizlemeyi açan
 * @param {boolean} external  önizleme yerine yeni sekme mi
 */
export function previewOnPlainClick(e, item, onOpen, external) {
  if (external) return
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  e.preventDefault()
  onOpen(item)
}

/**
 * "KAYNAKTA AÇ" ADRESİ — dosyayı İNDİRMEDEN kendi uygulamasında açar
 * (2026-10-02, sahada: *"dokümana tıkladığımızda direkt indiriyor"*).
 *
 * Graph'ın `webUrl`i çoğu zaman dosyanın ÇIPLAK yolu
 * (`…/Shared Documents/Bütçe.xlsx`) ve SharePoint o yolu Office belgelerinde
 * İNDİRME olarak sunuyor. `web=1` aynı yolu tarayıcıda — Word/Excel/
 * PowerPoint Online'da ya da SharePoint'in görüntüleyicisinde — açtırıyor.
 * Zaten bir sayfa olan adrese (`_layouts/…`, `Doc.aspx`, `.aspx`) ve
 * SharePoint dışındaki adrese dokunulmaz.
 */
export function sourceUrl(item) {
  const raw = item?.webUrl || ""
  if (!raw) return ""
  try {
    const u = new URL(raw)
    if (!/\.sharepoint\.com$/i.test(u.hostname)) return raw
    if (/\/_layouts\//i.test(u.pathname) || /\.aspx$/i.test(u.pathname)) return raw
    if (item.kind && item.kind !== "file") return raw
    if (u.searchParams.has("web")) return raw
    u.searchParams.set("web", "1")
    return u.toString()
  } catch {
    return raw
  }
}

/**
 * Graph'ın indirme adresi alınamadığında SharePoint'in kendi `download=1`i —
 * yalnız ÇIPLAK dosya yolunda anlamlı; sayfa adresinde ya da SharePoint
 * dışında `""` (düğme çizilmez).
 */
export function downloadFallbackUrl(item) {
  const raw = item?.webUrl || ""
  if (!raw || (item.kind && item.kind !== "file")) return ""
  try {
    const u = new URL(raw)
    if (!/\.sharepoint\.com$/i.test(u.hostname)) return ""
    if (/\/_layouts\//i.test(u.pathname) || /\.aspx$/i.test(u.pathname)) return ""
    u.searchParams.delete("web")
    u.searchParams.set("download", "1")
    return u.toString()
  } catch {
    return ""
  }
}

const WORD = new Set(["doc", "docx", "docm", "dot", "dotx", "rtf", "odt"])
const EXCEL = new Set(["xls", "xlsx", "xlsm", "xlsb", "ods"])
const POWERPOINT = new Set(["ppt", "pptx", "pptm", "pps", "ppsx", "odp"])

/**
 * Kaynak düğmesinin ADI: belgenin uygulaması ("Word'de aç"), değilse
 * bulunduğu yer ("OneDrive'da aç" · "SharePoint'te aç"). Genel bir
 * "Tarayıcıda aç" kişiye nereye gideceğini söylemiyordu.
 */
export function sourceKind(item) {
  const ext = (item?.ext || "").toLowerCase()
  if (WORD.has(ext)) return "word"
  if (EXCEL.has(ext)) return "excel"
  if (POWERPOINT.has(ext)) return "powerpoint"
  const url = item?.webUrl || ""
  if (/-my\.sharepoint\.com/i.test(url) || /\/personal\//i.test(url)) return "onedrive"
  if (/\.sharepoint\.com/i.test(url)) return "sharepoint"
  return "browser"
}
