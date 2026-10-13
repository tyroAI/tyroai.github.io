// Dosyalarım'ın adres yardımcıları — saf, Graph'a gitmez (birim testli).

/** `https://x-my.sharepoint.com/personal/a/Documents` → `https://x.sharepoint.com` */
export function spRootFrom(myRoot) {
  try {
    const u = new URL(myRoot)
    return u.host.includes("-my.") ? `${u.protocol}//${u.host.replace("-my.", ".")}` : ""
  } catch {
    return ""
  }
}

export function under(url, root) {
  if (!url || !root) return false
  const a = String(url).toLowerCase()
  const b = String(root).replace(/\/+$/, "").toLowerCase()
  return a === b || a.startsWith(`${b}/`)
}

export function lastSegment(url) {
  const seg =
    String(url ?? "")
      .split("/")
      .pop() ?? ""
  try {
    return decodeURIComponent(seg)
  } catch {
    return seg
  }
}

export function decodedUrl(url) {
  try {
    return decodeURI(url ?? "")
  } catch {
    return url ?? ""
  }
}
