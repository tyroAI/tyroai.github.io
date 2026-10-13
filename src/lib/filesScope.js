import { POLICY_ROOT_URL } from "@/lib/corporateFiles"
import { SOURCES, sourceOfLoc } from "@/lib/filesLocation"
import { decodedUrl, under } from "@/lib/filesPaths"
import { STATUS } from "@/lib/graph"

/**
 * Dosyalarım'ın kapsamı — saf: bulunulan konum ya da şeridin seçimi →
 * şeridin ışığı (`source`), aramanın sınırı (`scopeUrl`), hazır mı
 * (`scopeReady`) ve çözülemediyse sebebi (`scopeFailure`).
 */
export function resolveScope({
  loc,
  rawSource,
  meta,
  myDrive,
  myRoot,
  spRoot,
  policy,
  policyFolder,
}) {
  const locUrl =
    loc?.kind === "folder" || loc?.kind === "drive" || loc?.kind === "site"
      ? meta?.webUrl || ""
      : loc?.kind === "onedrive"
        ? myRoot
        : loc?.kind === "sites"
          ? spRoot
          : loc?.kind === "policy"
            ? (policyFolder.status === STATUS.ready
                ? policyFolder.webUrl
                : policy?.target?.folderUrl) || ""
            : loc?.kind === "policyRoot" || loc?.kind === "corporate"
              ? POLICY_ROOT_URL
              : ""
  // Kaynak şeridinin ışığı: konum varsa konumdan, yoksa adresteki `fsrc`ten.
  const source = loc
    ? (sourceOfLoc(loc) ??
      (loc.driveId && myDrive.id && loc.driveId === myDrive.id
        ? "onedrive"
        : under(decodedUrl(locUrl), POLICY_ROOT_URL)
          ? "corporate"
          : "sharepoint"))
    : SOURCES.includes(rawSource)
      ? rawSource
      : "all"
  const scopeUrl = loc
    ? locUrl
    : source === "onedrive"
      ? myRoot
      : source === "sharepoint"
        ? spRoot
        : source === "corporate"
          ? POLICY_ROOT_URL
          : ""
  const scopeNeeded = Boolean(loc) || source !== "all"
  const scopeReady = !scopeNeeded || Boolean(scopeUrl)
  // Kapsam ÇÖZÜLEMEDİ (D-3): sonsuz iskelet yerine sebebi. Klasör/kitaplık/sitede
  // konumun okuması, OneDrive/SharePoint kapsamında sürücünün okuması.
  const scopeFailure = scopeReady
    ? null
    : loc && ["folder", "drive", "site"].includes(loc.kind)
      ? meta && meta.status !== "loading" && meta.status !== STATUS.ready
        ? meta
        : null
      : (loc?.kind === "onedrive" ||
            loc?.kind === "sites" ||
            (!loc && (source === "onedrive" || source === "sharepoint"))) &&
          myDrive.status !== "loading" &&
          myDrive.status !== STATUS.ready
        ? myDrive
        : null

  return { source, scopeUrl, scopeReady, scopeFailure }
}
