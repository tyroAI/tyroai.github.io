import { useCallback, useMemo } from "react"
import CloudIcon from "@hugeicons/core-free-icons/CloudIcon"
import Globe02Icon from "@hugeicons/core-free-icons/Globe02Icon"
import Image01Icon from "@hugeicons/core-free-icons/Image01Icon"
import JusticeScale01Icon from "@hugeicons/core-free-icons/JusticeScale01Icon"
import UserMultipleIcon from "@hugeicons/core-free-icons/UserMultipleIcon"
import { POLICY_ROOT_URL } from "@/lib/corporateFiles"
import { decodedUrl, under } from "@/lib/filesPaths"
import { joinSegments, locationParts } from "@/lib/filesQuery"

/** Satırın konum satırı ("OneDrive'ım › Finans"): ikon + okunur yol. */
export function useFilePlace({ sitesItems, myRoot, t }) {
  const siteNames = useMemo(() => {
    const m = new Map()
    for (const s of sitesItems ?? [])
      if (s.webUrl) m.set(s.webUrl.replace(/\/+$/, "").toLowerCase(), s.name)
    return m
  }, [sitesItems])
  const placeOf = useCallback(
    (item) => {
      if (item.cdn)
        return { icon: Image01Icon, label: `${t("docs.corporate.title")} › ${item.folderName}` }
      if (item.kind !== "file") return null
      const decoded = decodedUrl(item.webUrl)
      if (under(decoded, POLICY_ROOT_URL)) {
        const rel = decoded
          .slice(POLICY_ROOT_URL.length + 1)
          .split("/")
          .slice(0, -1)
        return { icon: JusticeScale01Icon, label: [t("docs.policy.title"), ...rel].join(" › ") }
      }
      const parts = locationParts(item, { myRoot })
      if (!parts) return null
      const segs = joinSegments(parts.segments)
      if (parts.root === "onedrive")
        return {
          icon: CloudIcon,
          label: [t("myfiles.loc.onedrive"), segs].filter(Boolean).join(" › "),
        }
      if (parts.root === "sharedOnedrive")
        return {
          icon: UserMultipleIcon,
          label: [t("myfiles.loc.sharedOnedrive"), segs].filter(Boolean).join(" › "),
        }
      let site = parts.siteName
      for (const [url, name] of siteNames) {
        if (decoded.toLowerCase().startsWith(`${decodedUrl(url)}/`)) {
          site = name
          break
        }
      }
      return {
        icon: Globe02Icon,
        label: [site || t("myfiles.loc.rootSite"), segs].filter(Boolean).join(" › "),
      }
    },
    [myRoot, siteNames, t],
  )
  return placeOf
}
