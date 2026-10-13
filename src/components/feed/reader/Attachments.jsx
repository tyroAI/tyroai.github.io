import { useState } from "react"
import { useMsal } from "@azure/msal-react"
import { HugeiconsIcon } from "@hugeicons/react"
import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon"
import Download04Icon from "@hugeicons/core-free-icons/Download04Icon"
import LinkSquare02Icon from "@hugeicons/core-free-icons/LinkSquare02Icon"
import Loading03Icon from "@hugeicons/core-free-icons/Loading03Icon"
import { FileBadge } from "@/components/common/FileBadge"
import { downloadMailAttachment, useMailAttachments } from "@/hooks/useFeedPosts"
import { useLocale } from "@/hooks/useLocale"
import { formatSize } from "@/lib/fileMeta"
import { showResultToast } from "@/lib/refreshToast"
import { cn } from "@/lib/utils"

/**
 * EK KARTLARI — Outlook'un ek şeridi: tür rozeti · ad · boy. Dosya eki
 * tıklayınca İNER (`/$value` → `blob:`, uygulama yerinde kalır); bağlantı eki
 * (OneDrive paylaşımı) baytı taşımıyor, Outlook'ta açılır.
 */
export function Attachments({ post, enabled }) {
  const { t, locale } = useLocale()
  const { instance, accounts } = useMsal()
  const files = useMailAttachments(post.id, enabled)
  const [busy, setBusy] = useState(null)
  if (files === null) {
    return (
      <div aria-hidden="true" className="mt-3 flex gap-2 overflow-hidden">
        <span className="ms-skeleton block h-12 w-44 rounded-xl" />
        <span className="ms-skeleton block h-12 w-36 rounded-xl" />
      </div>
    )
  }
  if (!files.length) return null
  const chip =
    "group/att flex h-12 min-w-0 max-w-[17rem] max-sm:w-[14rem] items-center gap-2.5 rounded-xl border border-border bg-card py-1.5 pl-1.5 pr-3 text-left outline-none transition hover:border-foreground/20 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-brand/40 [@media(pointer:coarse)]:h-14"
  async function download(att) {
    if (busy) return
    setBusy(att.id)
    const ok = await downloadMailAttachment(instance, accounts[0], post.id, att)
    setBusy(null)
    if (!ok)
      showResultToast({ state: "error", title: t("feed.mail.downloadFailed"), detail: att.name })
  }
  return (
    // Darda TEK SATIR, yana kayar (alt alta üç ek gövdeyi ekranın yarısına itiyordu); sağ kenar solar.
    <ul
      aria-label={t("feed.mail.attachments")}
      className="mt-3 flex gap-2 max-sm:-my-1 max-sm:overflow-x-auto max-sm:py-1 max-sm:pr-6 max-sm:[mask-image:linear-gradient(to_right,#000_calc(100%-2rem),transparent)] max-sm:[scrollbar-width:none] sm:flex-wrap"
    >
      {files.map((att) => {
        const ext = (att.name.match(/\.([a-z0-9]{1,5})$/i)?.[1] ?? "").toLowerCase()
        const inner = (
          <>
            {att.kind === "reference" ? (
              <FileBadge item={{ kind: "link" }} glyph={LinkSquare02Icon} size="sm" />
            ) : (
              <FileBadge
                item={{ kind: "file", ext: att.kind === "item" ? "eml" : ext, name: att.name }}
                size="sm"
              />
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.78125rem] font-medium leading-tight">
                {att.name}
              </span>
              <span className="mt-0.5 block truncate text-[0.6875rem] leading-tight text-muted-foreground">
                {att.kind === "reference"
                  ? t("feed.mail.link")
                  : att.size
                    ? formatSize(att.size, locale)
                    : "\u00a0"}
              </span>
            </span>
            <HugeiconsIcon
              icon={
                busy === att.id
                  ? Loading03Icon
                  : att.kind === "reference"
                    ? ArrowUpRight01Icon
                    : Download04Icon
              }
              className={cn(
                "size-3.5 shrink-0 text-muted-foreground/70 transition group-hover/att:text-foreground",
                busy === att.id && "animate-spin motion-reduce:animate-none",
              )}
              strokeWidth={2}
              aria-hidden="true"
            />
          </>
        )
        return (
          <li key={att.id} className="min-w-0 max-sm:shrink-0">
            {att.kind === "reference" ? (
              <a
                href={post.webLink ?? "https://outlook.office.com/mail/"}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("feed.mail.openRef", { name: att.name })}
                className={chip}
              >
                {inner}
              </a>
            ) : (
              <button
                type="button"
                onClick={() => download(att)}
                aria-busy={busy === att.id || undefined}
                aria-label={t("feed.mail.download", { name: att.name })}
                className={chip}
              >
                {inner}
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
