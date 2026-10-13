import { fold } from "@/lib/fold"
import { DATE_PRESETS, matchesDate } from "@/lib/filesDates"
import { SORTS } from "@/lib/filesRequest"
import { folderOfUrl } from "@/lib/filesResults"
import { KNOWN_FAMILIES, typeFamily } from "@/lib/filesTypes"

/** İstemci süzgeci ve sıralama + adres sözleşmesi (`ft` · `fd` · `fp` · `fs`) — `lib/filesQuery.js`in parçası. */

/**
 * Kimlik (`{ id, email, name }`) "ben" mi? Sırayla: kimlik (Entra oid = MSAL
 * `localAccountId`, büyük/küçük harf duyarsız), adres (UPN YA DA posta —
 * `me.upn`, `me.email`, `me.mail`; 237/801 kişide ikisi farklı), en son
 * katlanmış görünen ad. Herhangi biri tutarsa `true`.
 */
function isMe(who, me) {
  if (!me) return false
  const id = String(who.id ?? "")
    .trim()
    .toLowerCase()
  if (id && me.id && id === String(me.id).trim().toLowerCase()) return true
  const mail = String(who.email ?? "")
    .trim()
    .toLowerCase()
  if (
    mail &&
    [me.upn, me.email, me.mail].filter(Boolean).some((x) => String(x).trim().toLowerCase() === mail)
  )
    return true
  return Boolean(who.name && me.name && fold(who.name) === fold(me.name))
}

/** Son değiştiren ben miyim? Satırın "Sen · 2 saat önce" etiketi BUNU sorar. */
export function isModifiedByMe(item, me) {
  return isMe({ id: item.modifiedById, email: item.modifiedByEmail, name: item.modifiedBy }, me)
}

/** Oluşturan ben miyim? */
export function isCreatedByMe(item, me) {
  return isMe({ id: item.createdById, email: item.createdByEmail, name: item.createdBy }, me)
}

/**
 * "Benim dosyam" = OLUŞTURAN YA DA SON DEĞİŞTİREN benim (§8) — "Kişi = Sen"
 * süzgecinin ve sunucu kısıtının (`EditorOWSUSER OR AuthorOWSUSER`) tanımı.
 * ⚠️ Satırın meta etiketi ("Sen · 2 saat önce") için `isModifiedByMe`:
 * oluşturduğum ama Ayşe'nin değiştirdiği dosyada "Sen" yazmak yanlış olurdu.
 */
export function isMine(item, me) {
  return isModifiedByMe(item, me) || isCreatedByMe(item, me)
}

/**
 * Süzgeç durumu: `{ types: string[], date: string, person: string,
 * folder: string (klasör adresi) }`. Klasörler (gezilecek yer) tür/tarih/kişi
 * süzgecinden ETKİLENMEZ — `keepFolders` açıkken; süzgeç dosyayı daraltır,
 * yolu kapatmaz.
 *
 * `personApplied`: sunucu kişi kısıtını UYGULADI (`useFilesSearch` sonucunun
 * aynı adlı alanı) → kişi yeniden SINANMAZ. Tür ve tarih her zaman yeniden
 * sınanır.
 */
export function matchesFilters(
  item,
  f,
  { me = null, now = Date.now(), keepFolders = true, personApplied = false } = {},
) {
  if (item.kind !== "file") return keepFolders
  if (f.types?.length && !f.types.includes(typeFamily(item))) return false
  if (f.date && !matchesDate(item.modified, f.date, now)) return false
  if (!personApplied && f.person === "me" && !isMine(item, me)) return false
  if (!personApplied && f.person === "others" && isMine(item, me)) return false
  if (f.folder) {
    const parent = folderOfUrl(item.webUrl)
    if (!parent || parent.url.toLowerCase() !== f.folder.toLowerCase()) return false
  }
  return true
}

/** Metin süzgeci (istemci): kelimeler AND, Türkçe duyarsız. */
export function matchesText(item, text) {
  const words = fold(text).split(/\s+/).filter(Boolean)
  if (!words.length) return true
  const hay = fold(`${item.name} ${item.modifiedBy ?? ""}`)
  return words.every((w) => hay.includes(w))
}

export function sortItems(items, sort, { foldersFirst = true } = {}) {
  const cmp = {
    name: (a, b) => a.name.localeCompare(b.name, "tr", { sensitivity: "base", numeric: true }),
    modified: (a, b) => (Date.parse(b.modified) || 0) - (Date.parse(a.modified) || 0),
    size: (a, b) => (b.size ?? -1) - (a.size ?? -1),
  }[sort]
  if (!cmp) return items
  return [...items].sort((a, b) => {
    if (foldersFirst) {
      const fa = a.kind !== "file" ? 0 : 1
      const fb = b.kind !== "file" ? 0 : 1
      if (fa !== fb) return fa - fb
    }
    return cmp(a, b) || a.name.localeCompare(b.name, "tr")
  })
}

/**
 * En yeni üstte (§12.17). Sunucu sıralayamadıysa (`clientSorted`) yüklenen
 * sayfa gün bantlarına bölünmeden ÖNCE bununla sıralanır — `groupByDay`
 * yalnız ARDIŞIK aynı bantları birleştiriyor, sırasız bir listede "Bugün"
 * iki kez çıkardı. Tarihsiz öğe sona.
 */
export function sortByModified(items) {
  return sortItems(items ?? [], "modified", { foldersFirst: false })
}

/* ─────────── Adres sözleşmesi ─────────── */

/** Süzgeç parametreleri — hepsi SAYILABİLİR değer, ad/yol yok. */
export function parseFilterParams(params) {
  const types = (params.get("ft") ?? "").split(",").filter((t) => KNOWN_FAMILIES.has(t))
  const date = DATE_PRESETS.includes(params.get("fd")) ? params.get("fd") : ""
  const person = ["me", "others"].includes(params.get("fp")) ? params.get("fp") : ""
  const sort = SORTS.includes(params.get("fs")) ? params.get("fs") : ""
  return { types: [...new Set(types)], date, person, sort }
}

export function writeFilterParams(params, f) {
  const next = new URLSearchParams(params)
  const set = (k, v) => (v ? next.set(k, v) : next.delete(k))
  set("ft", f.types?.length ? [...f.types].join(",") : "")
  set("fd", f.date)
  set("fp", f.person)
  set("fs", f.sort)
  return next
}

export function activeFilterCount(f) {
  return (f.types?.length ? 1 : 0) + (f.date ? 1 : 0) + (f.person ? 1 : 0) + (f.folder ? 1 : 0)
}
