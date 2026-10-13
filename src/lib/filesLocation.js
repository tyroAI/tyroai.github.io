import { CDN_FOLDERS, POLICY_ITEMS } from "@/lib/corporateFiles"

/**
 * DOSYALARIM — KONUM BELİRTECİ (adresteki tek konum bilgisi, saf).
 *
 * ⚠️ **ADRESTE YALNIZ SAYILABİLİR DEĞER VE OPAK KİMLİK.** Tarayıcı geçmişi
 * diske yazılıyor; klasör ADI, yolu ya da aranan metin adrese girmez. Adlar
 * çalışma anında Graph'tan (ya da tıklama izinden) çözülüyor.
 *
 * ⚠️ **HER KİMLİK YOLA GİRMEDEN ÖNCE DOĞRULANIR.** Belirteç elle
 * düzenlenebilir; `../`, `?`, `#` ya da boşluk taşıyan bir değer Graph yoluna
 * eklenirse başka bir uca istek atılırdı. Tanınmayan belirteç `null` →
 * varsayılan görünüm, hiç istek yok.
 *
 *   od                        OneDrive'ım (kök)
 *   sp                        SharePoint (kök site + takip edilenler)
 *   s~<siteId>                bir site (belge kitaplıkları)
 *   d~<driveId>               bir kitaplığın / sürücünün kökü
 *   i~<driveId>~<itemId>      bir klasör
 *   c                         Şirket (kurumsal içerik)
 *   c~img · c~img~<id>        Kurumsal Dokümanlar · bir görsel klasörü
 *   c~pol · c~pol~<id>        Politika ve Prosedürler · bir şirketin klasörü
 */

/** Kaynak şeridi (adreste `fsrc`; `all` varsayılan, yazılmaz). */
export const SOURCES = ["all", "onedrive", "sharepoint", "corporate"]

const ID = /^[A-Za-z0-9!_.-]{2,200}$/
const SITE = /^[a-z0-9.-]+,[0-9a-f-]{36},[0-9a-f-]{36}$/i

export function decodeLoc(token) {
  if (!token || typeof token !== "string" || token.length > 450) return null
  if (token === "od") return { kind: "onedrive", token }
  if (token === "sp") return { kind: "sites", token }
  if (token === "c") return { kind: "corporate", token }
  if (token === "c~img") return { kind: "cdnRoot", token }
  if (token === "c~pol") return { kind: "policyRoot", token }
  const [head, a, b, ...rest] = token.split("~")
  if (rest.length) return null
  if (head === "s" && SITE.test(a ?? "") && b === undefined)
    return { kind: "site", siteId: a, token }
  if (head === "d" && ID.test(a ?? "") && b === undefined)
    return { kind: "drive", driveId: a, token }
  if (head === "i" && ID.test(a ?? "") && ID.test(b ?? ""))
    return { kind: "folder", driveId: a, itemId: b, token }
  if (head === "c" && a === "img" && CDN_FOLDERS.some((f) => f.cdnFolderId === b))
    return { kind: "cdnFolder", cdnFolderId: b, token }
  if (head === "c" && a === "pol" && POLICY_ITEMS.some((p) => p.policyId === b))
    return { kind: "policy", policyId: b, token }
  return null
}

/** Satır → belirteç (gezilebilir değilse `null`). */
export function tokenFor(item) {
  if (!item) return null
  if (item.cdnFolderId) return `c~img~${item.cdnFolderId}`
  if (item.policyId) return `c~pol~${item.policyId}`
  if (item.kind === "site" && SITE.test(item.siteId ?? "")) return `s~${item.siteId}`
  if (item.kind === "drive" && ID.test(item.driveId ?? "")) return `d~${item.driveId}`
  if (item.kind === "folder" && ID.test(item.driveId ?? "") && ID.test(item.itemId ?? ""))
    return `i~${item.driveId}~${item.itemId}`
  return null
}

/** Konumun KAYNAĞI (üst şerit hangi bölümü yakar). */
export function sourceOfLoc(loc) {
  if (!loc) return "all"
  if (loc.kind === "onedrive") return "onedrive"
  if (loc.kind === "sites" || loc.kind === "site") return "sharepoint"
  if (["corporate", "cdnRoot", "cdnFolder", "policyRoot", "policy"].includes(loc.kind))
    return "corporate"
  return null // klasör/kitaplık: kaynağı adresinden çözülür
}

/** Graph'a giden gezinme konumu (`useFilesListing`in girdisi); kurumsal/sanal konumda `null`. */
export function listingFor(loc) {
  if (!loc) return null
  if (loc.kind === "onedrive") return { kind: "onedrive" }
  if (loc.kind === "sites") return { kind: "sites" }
  if (loc.kind === "site") return { kind: "site", siteId: loc.siteId }
  if (loc.kind === "drive") return { kind: "drive", driveId: loc.driveId }
  if (loc.kind === "folder") return { kind: "folder", driveId: loc.driveId, itemId: loc.itemId }
  return null
}
