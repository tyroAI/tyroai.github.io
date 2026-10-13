import { useCallback, useState } from "react"
import { resolveGroupDrive } from "@/hooks/useFilesListing"
import { CDN_FOLDERS } from "@/lib/corporateFiles"
import { askTyroAboutFile } from "@/lib/fileActions"
import { rememberMeta, rememberStep } from "@/lib/filesNav"
import { lastSegment } from "@/lib/filesPaths"
import { STATUS, graphGet, requestGraphScopes } from "@/lib/graph"
import { showResultToast } from "@/lib/refreshToast"
import { FILES } from "./filesShared"

/**
 * Satırların eylemleri: önizleme · posta · ışık kutusu, TYRO'ya sor, bağlantı
 * kopyala, klasörüne git, burada ara, ekibi aç; izin iste ve tekrar dene.
 */
export function useFileActions({
  t,
  instance,
  account,
  navigate,
  hrefWith,
  hrefFor,
  onNavigate,
  setText,
  setQ,
  setNonce,
  inputRef,
}) {
  const [preview, setPreview] = useState(null)
  const [mailItem, setMailItem] = useState(null)
  const [lightbox, setLightbox] = useState({ items: [], id: null })
  const [pendingFolder, setPendingFolder] = useState(null)

  const openItem = useCallback((item, visible = []) => {
    if (item.cdn) {
      const pool = (
        visible.length
          ? visible
          : (CDN_FOLDERS.find((f) => f.cdnFolderId === item.folderId)?.items ?? [item])
      ).filter((x) => x.cdn)
      setLightbox({
        items: pool.map((x) => ({ id: x.lightboxId, name: x.name, url: x.webUrl })),
        id: item.lightboxId,
      })
      return
    }
    setPreview(item)
  }, [])
  const ask = useCallback((item, mode) => askTyroAboutFile(item, mode, t), [t])
  const copyLink = useCallback(
    async (item) => {
      try {
        await navigator.clipboard.writeText(item.webUrl)
        showResultToast({
          state: "success",
          title: t("myfiles.row.linkCopied"),
          detail: t("myfiles.row.linkCopiedDetail"),
        })
      } catch {
        showResultToast({ state: "error", title: t("myfiles.row.copyFailed") })
      }
    },
    [t],
  )
  /** Dosyanın klasörüne git — üst kimlik yoksa tek GET ile çözülür. */
  const goToFolderOf = useCallback(
    async (item, { keepText = false, key } = {}) => {
      if (!item?.driveId) return
      setPendingFolder(key ?? item.id)
      let parentId = item.parentId
      if (!parentId && item.itemId && account) {
        const res = await graphGet(instance, account, {
          path: `/drives/${item.driveId}/items/${item.itemId}?$select=id,parentReference`,
          scopes: FILES,
          retry: 1,
        })
        parentId = res.status === STATUS.ready ? res.data?.parentReference?.id : null
      }
      setPendingFolder(null)
      if (!parentId) {
        showResultToast({ state: "error", title: t("myfiles.row.revealFailed") })
        return
      }
      const tk = `i~${item.driveId}~${parentId}`
      const parent = item.webUrl ? item.webUrl.replace(/\/[^/]*$/, "") : ""
      rememberMeta(tk, { name: lastSegment(parent), webUrl: parent })
      if (!keepText) {
        setText("")
        setQ("")
      }
      navigate(hrefWith({ floc: tk, fsrc: null }))
    },
    [account, instance, navigate, hrefWith, t, setPendingFolder, setText, setQ],
  )
  const searchIn = useCallback(
    (item) => {
      const href = hrefFor(item)
      if (!href) return
      onNavigate(item)
      navigate(href)
      setTimeout(() => inputRef.current?.focus(), 0)
    },
    [hrefFor, onNavigate, navigate, inputRef],
  )

  /** Ekip satırı: kitaplığı tek GET ile çöz, sonra oraya git (iz ekibin adıyla). */
  const openGroup = useCallback(
    async (item) => {
      if (!account) return
      setPendingFolder(item.id)
      const res = await resolveGroupDrive(instance, account, item)
      setPendingFolder(null)
      if (res.status !== STATUS.ready || !res.token) {
        showResultToast({
          state: "error",
          title: t("myfiles.row.teamFailed"),
          detail: res.httpStatus
            ? t("myfiles.state.detail", { detail: `HTTP ${res.httpStatus}` })
            : undefined,
        })
        return
      }
      rememberMeta(res.token, { name: item.name, webUrl: res.webUrl })
      rememberStep(
        { token: "sp", name: t("myfiles.source.sharepoint") },
        { token: res.token, name: item.name },
      )
      setText("")
      setQ("")
      navigate(hrefWith({ floc: res.token, fsrc: null }))
    },
    [account, instance, navigate, hrefWith, t, setPendingFolder, setText, setQ],
  )

  /** İzin iste (yalnız `denied` hâlinin "Bağlan"ı) — sonra yeniden sor. */
  const connect = useCallback(
    async (scopes) => {
      if (!account) return
      await requestGraphScopes(instance, account, scopes)
      setNonce((n) => n + 1)
    },
    [instance, account, setNonce],
  )
  /** Tekrar dene (D-1): izin penceresi AÇMAZ, yalnız yeniden sorar. */
  const retry = useCallback(() => setNonce((n) => n + 1), [setNonce])

  return {
    preview,
    setPreview,
    mailItem,
    setMailItem,
    lightbox,
    setLightbox,
    pendingFolder,
    openItem,
    ask,
    copyLink,
    goToFolderOf,
    searchIn,
    openGroup,
    connect,
    retry,
  }
}
