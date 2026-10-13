import { Link } from "react-router-dom"
import { HugeiconsIcon } from "@hugeicons/react"
import { InsightTerm } from "@/components/myspace/InsightTerm"
import { InsightTip } from "@/components/myspace/InsightTip"
import { useLocale } from "@/hooks/useLocale"
import { requestPanel } from "@/lib/panelBus"
import { cn } from "@/lib/utils"
import { BRIEF_ICON } from "./briefIcons"
import { useBriefTips } from "./useBriefTips"

const TONE = {
  invites: "bg-brand/10 text-brand",
  mail: "bg-sky-500/12 text-sky-600 dark:text-sky-400",
  overdue: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  tasks: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  feed: "bg-fuchsia-500/12 text-fuchsia-600 dark:text-fuchsia-400",
}
// Eşit genişlikli haplar (sütunu doldurur): sayılar ve düğmeler alt alta hizalı.
// Dokunmatikte hap satırın boyunca basılır (32px), görünüşü aynı.
const ACTION =
  "relative inline-flex h-6 w-full items-center justify-center rounded-full border border-border bg-background/60 px-2 text-[0.6875rem] font-medium text-foreground/80 transition after:absolute after:inset-x-0 after:-inset-y-1 pointer-coarse:after:content-[''] hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"

/**
 * Brifing satırları — Anasayfa özetinin kapı davranışı: satırın etiketi ve
 * sayısı tek bir tetik; üstüne gelince (farede) ya da basınca ilk kayıtları
 * gösteren ipucu açılır, kayda basınca önizleme, dipte ilgili yer (panel,
 * To-Do, Keşfet). Sağdaki hap o işin kısayolu. "Ayrıca" satırındaki her terim
 * de aynı ipucunu açar. Izgara alt ızgaralı: sayı ve hap sütunları her
 * satırda aynı yerde.
 */
export function BriefRows({ shown, rest, data, fresh }) {
  const { t } = useLocale()
  const { tips: TIP, dialog } = useBriefTips(data)
  const { todoOpen } = data
  const shortcut = (item) => {
    // Satırın kendi ipucunun aynısı: davet listesi koyu yüzey için tasarlandı (beyaz
    // açılır kutuda yazıları görünmüyordu); telefonda alttan panel.
    if (item.id === "invites")
      return (
        <InsightTip {...TIP.invites} side="bottom" align="end">
          <button type="button" className={ACTION}>
            {t("widgets.brief.act.invites")}
          </button>
        </InsightTip>
      )
    if (item.id === "mail")
      return (
        <button type="button" className={ACTION} onClick={() => requestPanel("mail")}>
          {t("widgets.brief.act.mail")}
        </button>
      )
    if ((item.id === "overdue" || item.id === "tasks") && todoOpen)
      return (
        <Link to="/todo" className={ACTION}>
          {t("nav.todo")}
        </Link>
      )
    if (item.id === "feed")
      return (
        <Link to="/feed" className={ACTION}>
          {t("widgets.brief.act.feed")}
        </Link>
      )
    return <span />
  }

  return (
    <>
      <ul className="mt-2.5 grid grid-cols-[auto_minmax(0,1fr)_auto_minmax(4.25rem,auto)] gap-y-1">
        {shown.map((item) => (
          <li
            key={item.id}
            className="col-span-4 grid h-8 grid-cols-subgrid items-center rounded-xl bg-muted/40 pe-1"
          >
            <InsightTip {...TIP[item.id]} side="bottom" align="start">
              <button
                type="button"
                className="col-span-3 grid h-full min-w-0 grid-cols-subgrid items-center gap-x-2.5 rounded-xl ps-1 pe-2.5 text-start outline-none transition-colors hover:bg-brand/[0.06] focus-visible:ring-2 focus-visible:ring-brand/40 data-[state=open]:bg-brand/[0.08]"
              >
                <span className={cn("grid size-6 place-items-center rounded-lg", TONE[item.id])}>
                  <HugeiconsIcon icon={BRIEF_ICON[item.id]} className="size-3.5" strokeWidth={2} />
                </span>
                <span className="min-w-0 truncate text-[0.8125rem] font-medium">
                  {t(`widgets.brief.item.${item.id}`)}
                  {item.id === "mail" && item.important > 0 && (
                    <span className="ms-1.5 text-[0.6875rem] font-semibold text-amber-700 dark:text-amber-400">
                      {t("widgets.brief.important", { n: item.important })}
                    </span>
                  )}
                  {item.id === "mail" && fresh > 0 && (
                    <span className="ms-1.5 text-[0.6875rem] font-semibold text-brand">
                      {t("widgets.brief.fresh", { n: fresh })}
                    </span>
                  )}
                </span>
                <span className="text-end text-[0.9375rem] font-semibold tabular-nums underline decoration-current/30 decoration-dotted decoration-2 underline-offset-[0.22em]">
                  {item.n}
                </span>
              </button>
            </InsightTip>
            <span className="ps-1">{shortcut(item)}</span>
          </li>
        ))}
        {/* Fazlası tek satırda; her terim kendi ipucunu açar. */}
        {rest.length > 0 && (
          <li className="col-span-4 flex h-8 min-w-0 items-center gap-1 truncate rounded-xl bg-muted/40 px-2.5 text-[0.75rem] text-muted-foreground">
            <span className="shrink-0">{t("widgets.brief.alsoLabel")}</span>
            {rest.map((x, i) => (
              <span key={x.id} className="shrink-0">
                <InsightTerm tone="via" {...TIP[x.id]}>
                  {`${t(`widgets.brief.item.${x.id}`)} ${x.n}`}
                </InsightTerm>
                {i < rest.length - 1 && " · "}
              </span>
            ))}
          </li>
        )}
      </ul>
      {dialog}
    </>
  )
}
