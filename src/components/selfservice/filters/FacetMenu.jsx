import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useLocale } from "@/hooks/useLocale"
import { foldText } from "@/lib/selfServiceStatus"
import { cn } from "@/lib/utils"

/** Uzun listede arama kutusu çıkar (kısa listede gürültü). */
const SEARCH_FROM = 8

// Aksan ve büyük/küçük harf duyarsız ("yillik" → "Yıllık İzin"); cmdk'nin bulanık puanı
// Türkçe "ı/i"yi ayırıyordu.
const filter = (value, search) => (foldText(value).includes(foldText(search)) ? 1 : 0)

/**
 * Süzgeç seçicisi (izin türü · masraf kategorisi · avans türü · ay): hap tetik — boşken etiket,
 * seçiliyken değer ve yanında kaldıran ×. Açılan liste başlığıyla ve sayılarıyla; uzun listede
 * aramalı (klavyeyle ok tuşları, Enter). Seçim `onSelect(key)`; "Tümü" `onSelect(null)`.
 * `compact`: dar kapta (< 30rem) boşken yalnız ikon (aramanın yanına sığsın; ad ekran
 * okuyucuda ve açılan listenin başlığında), seçiliyken değer görünür.
 *
 * @param {{ key: string, label: string, count: number }[]} p.options
 */
export function FacetMenu({
  icon,
  label,
  allLabel,
  value,
  options,
  onSelect,
  compact = false,
  className,
}) {
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const current = options.find((o) => o.key === value) ?? null
  const searchable = options.length >= SEARCH_FROM
  const pick = (key) => {
    setOpen(false)
    onSelect(key)
  }
  // Boş ve dar: kare ikon düğmesi; genişte etiket ve ok.
  const bare = compact && !current
  return (
    <span
      className={cn(
        // Çerçeve halka (içe): düğmeler kabın tam boyunu alır, dokunmatikte hedef 44 px.
        "inline-flex h-9 min-w-0 max-w-full shrink-0 items-stretch overflow-hidden rounded-full text-[0.8125rem] ring-1 ring-inset transition pointer-coarse:h-11",
        current
          ? "bg-brand/[0.1] font-semibold text-foreground ring-brand/40"
          : "bg-card text-foreground/85 ring-border hover:bg-accent/60",
        className,
      )}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={
              current ? t("selfService.filter.value", { label, value: current.label }) : label
            }
            className={cn(
              "inline-flex min-w-0 items-center gap-1.5 ps-3 pe-2.5 font-medium outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40",
              bare &&
                "min-w-9 justify-center px-0 pointer-coarse:min-w-11 @[30rem]/ss:justify-start @[30rem]/ss:ps-3 @[30rem]/ss:pe-2.5",
            )}
          >
            <HugeiconsIcon
              icon={icon}
              aria-hidden="true"
              className={cn("size-3.5 shrink-0", current ? "text-brand-ink" : "text-foreground/60")}
              strokeWidth={1.9}
            />
            <span className={cn("truncate", bare && "hidden @[30rem]/ss:inline")}>
              {current?.label ?? label}
            </span>
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              aria-hidden="true"
              className={cn("size-3 shrink-0 opacity-70", bare && "hidden @[30rem]/ss:block")}
              strokeWidth={2}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[min(18rem,calc(100vw-2rem))] gap-0 p-0"
          // Sohbet rıhtımı pencerede Escape dinliyor: menüyü kapatan Escape rıhtımı kapatmasın.
          onEscapeKeyDown={(e) => e.stopPropagation()}
        >
          <Command filter={filter} label={label}>
            <p
              aria-hidden="true"
              className="px-3 pb-1 pt-2.5 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground"
            >
              {label}
            </p>
            {searchable && <CommandInput placeholder={t("selfService.filter.search")} />}
            <CommandList className="max-h-[min(20rem,50dvh)]">
              <CommandEmpty>{t("selfService.filter.none")}</CommandEmpty>
              <CommandItem
                value={`\u0000${allLabel}`}
                data-checked={!current}
                onSelect={() => pick(null)}
                className="text-[0.8125rem] pointer-coarse:min-h-11"
              >
                <span className="min-w-0 flex-1 truncate">{allLabel}</span>
              </CommandItem>
              {options.map((o) => (
                <CommandItem
                  key={o.key}
                  value={`${o.label} ${o.key}`}
                  data-checked={o.key === value}
                  onSelect={() => pick(o.key)}
                  className="text-[0.8125rem] pointer-coarse:min-h-11"
                >
                  <span lang="tr" className="min-w-0 flex-1 truncate">
                    {o.label}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">{o.count}</span>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {current && (
        <button
          type="button"
          onClick={() => onSelect(null)}
          aria-label={t("selfService.filter.remove", { label: current.label })}
          className="grid w-8 shrink-0 place-items-center border-s border-brand/25 text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40 pointer-coarse:w-11"
        >
          <HugeiconsIcon icon={Cancel01Icon} className="size-3" strokeWidth={2.2} />
        </button>
      )}
    </span>
  )
}
