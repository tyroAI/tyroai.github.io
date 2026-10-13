import { useMemo } from "react"
import { POLICY_ROOT_URL } from "@/lib/corporateFiles"
import { decodedUrl, under } from "@/lib/filesPaths"
import { metaFor, trailFor } from "@/lib/filesNav"

/** Konum başlığı: bulunulan yerin adı, kırıntılar ve "üst klasör" adresi. */
export function useFilesCrumbs({ loc, source, policy, cdnFolder, meta, hrefWith, t }) {
  const current = useMemo(() => {
    if (!loc) return null
    if (loc.kind === "onedrive") return { token: loc.token, name: t("myfiles.loc.onedrive") }
    if (loc.kind === "sites") return { token: loc.token, name: t("myfiles.source.sharepoint") }
    if (loc.kind === "corporate") return { token: loc.token, name: t("myfiles.source.corporate") }
    if (loc.kind === "policyRoot") return { token: loc.token, name: t("docs.policy.title") }
    if (loc.kind === "cdnRoot") return { token: loc.token, name: t("docs.corporate.title") }
    if (loc.kind === "policy") return { token: loc.token, name: policy?.name ?? "", lang: "tr" }
    if (loc.kind === "cdnFolder")
      return { token: loc.token, name: cdnFolder?.name ?? "", lang: "tr" }
    return { token: loc.token, name: meta?.name || metaFor(loc.token)?.name || "" }
  }, [loc, t, policy, cdnFolder, meta])

  const rootCrumb = useMemo(() => {
    if (!loc) return null
    if (source === "onedrive") return { label: t("myfiles.loc.onedrive"), token: "od" }
    if (source === "corporate") return { label: t("myfiles.source.corporate"), token: "c" }
    return { label: t("myfiles.source.sharepoint"), token: "sp" }
  }, [loc, source, t])

  const crumbs = useMemo(() => {
    if (!loc || !current) return []
    const out = []
    if (rootCrumb && rootCrumb.token !== current.token)
      out.push({ label: rootCrumb.label, href: hrefWith({ floc: rootCrumb.token, fsrc: null }) })
    // Kurumsal alt konumlarında ara halka sabit.
    if (loc.kind === "policy")
      out.push({ label: t("docs.policy.title"), href: hrefWith({ floc: "c~pol" }) })
    if (loc.kind === "cdnFolder")
      out.push({ label: t("docs.corporate.title"), href: hrefWith({ floc: "c~img" }) })
    for (const c of trailFor(loc.token)) {
      if (c.token === rootCrumb?.token || out.some((x) => x.token === c.token)) continue
      if (loc.kind === "policy" || loc.kind === "cdnFolder") continue
      out.push({
        label: c.name,
        token: c.token,
        href: hrefWith({ floc: c.token }),
        lang: under(decodedUrl(metaFor(c.token)?.webUrl), POLICY_ROOT_URL) ? "tr" : undefined,
      })
    }
    out.push({ label: current.name || "…", lang: current.lang })
    return out
  }, [loc, current, rootCrumb, hrefWith, t])

  const upHref = useMemo(() => {
    if (!loc) return null
    const trail = trailFor(loc.token)
    if (trail.length) return hrefWith({ floc: trail[trail.length - 1].token })
    if (loc.kind === "folder" && meta?.parentId && !meta?.isRoot)
      return hrefWith({ floc: `i~${loc.driveId}~${meta.parentId}` })
    if (loc.kind === "policy") return hrefWith({ floc: "c~pol" })
    if (loc.kind === "cdnFolder") return hrefWith({ floc: "c~img" })
    if (["policyRoot", "cdnRoot"].includes(loc.kind)) return hrefWith({ floc: "c" })
    return null
  }, [loc, meta, hrefWith])
  return { current, crumbs, upHref }
}
