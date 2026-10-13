import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon"
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon"
import { DatePickerBody, SearchList } from "@/components/myspace/SlotPickers"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useLocale } from "@/hooks/useLocale"
import { getDateTimeFormat } from "@/lib/intl-cache"
import { optionLabel } from "@/lib/promptTemplates"
import { cn } from "@/lib/utils"
import { CONTROL } from "./formUi"

const DATE = { weekday: "short", day: "numeric", month: "short", year: "numeric" }
// Sohbet rıhtımı Escape'i pencerede dinliyor: seçiciyi kapatan Escape rıhtımı kapatmasın.
const keepEscape = (e) => e.stopPropagation()

/**
 * Tarih alanı: düğme + açılır ay ızgarası (sohbet cümlesinin takvimi). `open`/`onOpenChange`
 * dışarıdan verilebilir: izin formunda başlangıç seçilince bitiş kendiliğinden açılır.
 * Ad, etiket + seçili gün (`aria-labelledby` kendini de anar).
 */
export function DateField({ id, labelId, value, min, onPick, open, onOpenChange, error, errorId }) {
  const { t, locale } = useLocale()
  const [own, setOwn] = useState(false)
  const shown = open ?? own
  const setShown = onOpenChange ?? setOwn
  return (
    <Popover open={shown} onOpenChange={setShown}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          aria-labelledby={`${labelId} ${id}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={CONTROL}
        >
          <HugeiconsIcon
            icon={Calendar03Icon}
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground"
            strokeWidth={1.8}
          />
          <span className={cn("min-w-0 flex-1 truncate", !value && "text-muted-foreground")}>
            {value ? getDateTimeFormat(locale, DATE).format(value) : t("selfService.form.pickDate")}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        collisionPadding={12}
        onEscapeKeyDown={keepEscape}
        // İlk odak takvimin günü (seçili, yoksa bugün): oklarla hemen gezilir.
        onOpenAutoFocus={(e) => {
          const day = e.currentTarget?.querySelector?.("[data-day][tabindex='0']")
          if (!day) return
          e.preventDefault()
          day.focus()
        }}
        className="w-[17rem] gap-0 p-0 pointer-coarse:w-[21rem]"
      >
        <DatePickerBody
          roomy
          value={value}
          min={min}
          rangeFrom={min}
          onPick={(d) => {
            setShown(false)
            onPick(d)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

/**
 * Aramalı uzun liste (masraf kategorisi 54, şirket 95): düğme + açılır arama kutusu ve liste.
 * `describe` varsa seçili değerin yanında açıklaması (şirket kodu · unvan).
 */
export function SearchField({ id, labelId, slot, field, value, onPick, error, errorId }) {
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const text = value != null ? optionLabel(t, slot, value) : null
  const sub = value != null ? slot.describe?.(value) : null
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          aria-haspopup="listbox"
          aria-labelledby={`${labelId} ${id}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(CONTROL, "group/pick")}
        >
          <span className={cn("min-w-0 flex-1 truncate", !text && "text-muted-foreground")}>
            {text ?? t("selfService.form.choose")}
            {sub && <span className="text-muted-foreground"> · {sub}</span>}
          </span>
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            aria-hidden="true"
            className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/pick:rotate-180"
            strokeWidth={2}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        collisionPadding={12}
        onEscapeKeyDown={keepEscape}
        className="w-[max(var(--radix-popover-trigger-width),17rem)] max-w-[calc(100vw-1.5rem)] gap-0 p-0"
        onOpenAutoFocus={(e) => {
          // İlk odak arama kutusunda: liste klavyeyle oradan gezilir. Dokunmatikte odak verilmez:
          // ekran klavyesi açılıp listeyi örtmesin (aramak isteyen kutuya dokunur).
          e.preventDefault()
          if (window.matchMedia?.("(pointer: coarse)").matches) return
          e.currentTarget?.querySelector?.("input")?.focus()
        }}
      >
        <SearchList
          slot={slot}
          field={field}
          value={value}
          onPick={(o) => {
            onPick(o)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
