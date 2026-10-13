import { Fragment } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon"
import { useLocale } from "@/hooks/useLocale"
import { statusTone } from "@/lib/selfServiceModel"
import { cn } from "@/lib/utils"
import { tabOf } from "./kinds"
import { describe } from "./recordText"
import { StatusPill } from "./StatusPill"

/**
 * Listedeki tek kayıt — satırın tamamı ayrıntıyı açar. Rozet tonu durumdan. `isNew`: önceki
 * yüklemede olmayan kayıt (sohbette açılan talep ERP'ye yansıdı) — "Yeni" rozeti.
 */
export function RecordRow({ record, onOpen, highlighted, isNew = false }) {
  const { t, locale } = useLocale()
  const tab = tabOf(record.kind)
  const { title, sub, value } = describe(record, t, locale)
  const tone = statusTone(record.status)
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(record)}
        className={cn(
          "group/row flex w-full min-w-0 items-center gap-3 px-3 py-3 text-start transition-colors @[40rem]/ss:px-4",
          "hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40",
          highlighted && "bg-brand/[0.07]",
        )}
      >
        <span
          className={cn(
            "relative grid size-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand-ink",
            // Telefonda tutar ve durum hapı geniş: ikon (sekmede hep aynı) ada yer bıraksın.
            record.kind !== "leave" && "hidden @[30rem]/ss:grid",
          )}
        >
          <HugeiconsIcon icon={tab.icon} className="size-[1.125rem]" strokeWidth={1.8} />
          {record.status && tone === "warning" && (
            <span
              aria-hidden="true"
              className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-amber-500 ring-2 ring-card"
            />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-[0.875rem] font-semibold text-foreground">{title}</span>
            {isNew && (
              <span className="shrink-0 rounded-full bg-brand/[0.12] px-1.5 py-px text-[0.625rem] font-bold uppercase tracking-[0.04em] text-brand-ink">
                {t("selfService.newBadge")}
              </span>
            )}
          </span>
          {/* Dar satırda alt satır alta kırılır (kesilmez); parçalar bölünmez. */}
          <span
            className={cn(
              "line-clamp-3 text-[0.75rem]",
              highlighted ? "text-foreground/70" : "text-muted-foreground",
            )}
          >
            {sub.split(" · ").map((part, i) => (
              <Fragment key={i}>
                {i > 0 && " · "}
                <span className="whitespace-nowrap">{part}</span>
              </Fragment>
            ))}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          {value && (
            <span className="text-[0.875rem] font-semibold tabular-nums text-foreground">
              {value}
            </span>
          )}
          <StatusPill status={record.status} className="max-w-[9.5rem]" />
        </span>
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          aria-hidden="true"
          className="hidden size-4 shrink-0 text-muted-foreground/50 transition group-hover/row:translate-x-0.5 group-hover/row:text-muted-foreground rtl:rotate-180 @[30rem]/ss:block"
        />
      </button>
    </li>
  )
}
