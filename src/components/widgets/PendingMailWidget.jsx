import { HugeiconsIcon } from "@hugeicons/react"
import Flag02Icon from "@hugeicons/core-free-icons/Flag02Icon"
import InboxUnreadIcon from "@hugeicons/core-free-icons/InboxUnreadIcon"
import { PersonAvatar } from "@/components/common/PersonAvatar"
import { useLocale } from "@/hooks/useLocale"
import { useWidgetData } from "@/hooks/useWidgetData"
import { requestPanel } from "@/lib/panelBus"
import { fetchPendingMail } from "@/lib/widgetSources"
import { ago } from "./format"
import { WidgetBody } from "./WidgetBody"
import { WidgetEmpty } from "./WidgetEmpty"
import { FrameAction, WidgetFrame } from "./WidgetFrame"
import { PageBody, Pager } from "./paging/Pager"
import { usePager } from "./paging/usePager"

function Row({ m, locale }) {
  return (
    <li>
      <a
        href={m.webLink ?? undefined}
        target="_blank"
        rel="noopener noreferrer"
        className="-mx-2 flex min-h-11 items-center gap-2.5 rounded-xl px-2 transition hover:bg-accent/60"
      >
        <PersonAvatar name={m.from} className="size-7 text-[0.625rem]" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            {m.important && (
              <span aria-hidden="true" className="font-bold text-red-600 dark:text-red-400">
                !
              </span>
            )}
            <span className="truncate text-[0.8125rem] font-medium">{m.subject}</span>
          </span>
          <span className="block truncate text-[0.6875rem] text-muted-foreground">
            {m.from} · {ago(m.received, locale)}
          </span>
        </span>
        {m.flagged && (
          <HugeiconsIcon
            icon={Flag02Icon}
            className="size-3.5 shrink-0 fill-current text-red-500"
            strokeWidth={1.8}
          />
        )}
      </a>
    </li>
  )
}

/**
 * Bekleyen postalar — önce bayraklılar (takip sözü verilmiş), sonra gelen
 * kutusunun okunmamışları; satıra basınca posta Outlook'ta açılır, başlıktaki
 * eylem uygulamanın posta panelini açar.
 */
export function PendingMailWidget({ className }) {
  const { t, locale } = useLocale()
  const res = useWidgetData("pending-mail", fetchPendingMail)
  const flagged = res.data?.flagged ?? []
  const unread = (res.data?.unread ?? []).filter((m) => !flagged.some((f) => f.id === m.id))
  const total = res.data?.unreadTotal
  // Önce bayraklılar (bayrak simgesiyle), sonra okunmamışlar; sayfa başına 3.
  const pager = usePager([...flagged, ...unread], 3)
  return (
    <WidgetFrame
      id="pending-mail"
      title={t("widgets.mail.title")}
      icon={InboxUnreadIcon}
      busy={res.status === "loading"}
      className={className}
      pager={<Pager pager={pager} label={t("widgets.mail.title")} />}
    >
      <WidgetBody status={res.status} rows={4}>
        {/* Başlıkta sayfa çevirici var: panel kısayolu özet satırının sonunda. */}
        <div className="mt-0.5 flex min-h-6 items-center justify-between gap-2">
          <p className="min-w-0 truncate text-[0.75rem] text-muted-foreground">
            {total != null && t("widgets.mail.summary", { n: total, f: flagged.length })}
          </p>
          <FrameAction onClick={() => requestPanel("mail")} className="-me-2.5 h-6">
            {t("widgets.mail.open")}
          </FrameAction>
        </div>
        {pager.items.length ? (
          <PageBody pager={pager} className="mt-1">
            {pager.items.map((m) => (
              <Row key={m.id} m={m} locale={locale} />
            ))}
          </PageBody>
        ) : (
          <WidgetEmpty icon={InboxUnreadIcon}>{t("widgets.mail.empty")}</WidgetEmpty>
        )}
      </WidgetBody>
    </WidgetFrame>
  )
}
