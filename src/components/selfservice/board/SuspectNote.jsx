import { HugeiconsIcon } from "@hugeicons/react"
import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useLocale } from "@/hooks/useLocale"
import { leaveTypeName } from "@/lib/selfServiceNames"
import { number, range } from "../kinds"

/** Kaydın sorununu okunur cümleye çevirir ("1 günlük aralığa 50 gün girilmiş"). */
function issueText(item, t, locale) {
  return t(`selfService.suspect.${item.issue}`, {
    span: number(item.span ?? 0, locale),
    days: number(item.days ?? 0, locale),
    hours: number(item.hours ?? 0, locale),
  })
}

/**
 * Köşedeki uyarı: hesaba katılmayan tutarsız kayıtlar (`lib/selfServiceSanity`). Çipe basınca
 * kayıtlar nedenleriyle açılır; kayıtların kendisi listede yok.
 */
export function SuspectNote({ items }) {
  const { t, locale } = useLocale()
  if (!items?.length) return null
  return (
    <Popover>
      <PopoverTrigger className="relative ms-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[0.6875rem] font-semibold text-amber-800 transition hover:bg-amber-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 pointer-coarse:after:absolute pointer-coarse:after:-inset-x-1 pointer-coarse:after:-inset-y-2.5 dark:text-amber-300">
        <HugeiconsIcon icon={Alert02Icon} aria-hidden="true" className="size-3.5" />
        {t("selfService.suspect.chip", { n: items.length })}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(20rem,calc(100vw-2rem))] gap-0 p-3"
        // Sohbet rıhtımı pencerede Escape dinliyor: kutuyu kapatan Escape rıhtımı kapatmasın.
        onEscapeKeyDown={(e) => e.stopPropagation()}
      >
        <p className="text-[0.8125rem] font-semibold">{t("selfService.suspect.title")}</p>
        <ul className="mt-2 space-y-2">
          {items.map((it) => (
            <li key={it.id} className="rounded-xl bg-muted/50 px-3 py-2 text-[0.75rem]">
              <span className="block font-semibold text-foreground">
                {leaveTypeName(it.type, t) || it.type || t("selfService.leave.untitled")}
                {" · "}
                {range(it.start, it.end, locale)}
              </span>
              <span className="block text-amber-800 dark:text-amber-300">
                {issueText(it, t, locale)}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[0.6875rem] text-muted-foreground">
          {t("selfService.suspect.note")}
        </p>
      </PopoverContent>
    </Popover>
  )
}
