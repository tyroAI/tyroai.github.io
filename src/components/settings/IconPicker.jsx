import { useEffect, useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon"
import Tick01Icon from "@hugeicons/core-free-icons/Tick01Icon"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  getIconByName,
  isFullIconSetLoaded,
  loadFullIconSet,
  searchIcons,
} from "@/lib/iconRegistry"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"

export function IconPicker({ value, onChange, disabled }) {
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  // ⚠️ TAM SET AÇILINCA İNER, ÖNCESİNDE DEĞİL. 12.920 ikonu giriş paketinden
  // çıkarmanın bedeli bu: seçici açıldığı an ayrı bir chunk indirilir
  // (bkz. `iconRegistry`). `ready` yalnız yeniden çizim içindir — set
  // geldiğinde `searchIcons` artık tamamını tarar.
  const [ready, setReady] = useState(isFullIconSetLoaded)
  useEffect(() => {
    if (!open || ready) return
    let alive = true
    loadFullIconSet()
      .then(() => alive && setReady(true))
      .catch(() => {
        // İnmezse seçici kayıttaki adlarla çalışmaya devam eder.
      })
    return () => {
      alive = false
    }
  }, [open, ready])

  const results = useMemo(() => searchIcons(query, 240), [query, ready])
  const currentIcon = getIconByName(value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="h-10 w-full justify-start gap-3 font-normal"
        >
          <div className="grid size-7 shrink-0 place-items-center rounded-md bg-muted text-foreground">
            {currentIcon ? (
              <HugeiconsIcon icon={currentIcon} className="size-4" strokeWidth={1.6} />
            ) : (
              <span className="text-[0.625rem] font-semibold opacity-60">?</span>
            )}
          </div>
          <span className="flex-1 truncate text-left text-sm">
            {value || t("settings.icon.placeholder")}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[21.25rem] p-0" side="bottom" sideOffset={6}>
        <div className="border-b border-border p-2">
          <div className="relative">
            <HugeiconsIcon
              icon={Search01Icon}
              className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("settings.icon.searchPlaceholder")}
              className="h-9 pl-8"
            />
          </div>
        </div>
        <ScrollArea className="h-[17.5rem]">
          <div className="grid grid-cols-6 gap-1 p-2">
            {results.map((name) => {
              const icon = getIconByName(name)
              const isSelected = name === value
              return (
                <button
                  key={name}
                  type="button"
                  title={name}
                  onClick={() => {
                    onChange?.(name)
                    setOpen(false)
                  }}
                  className={cn(
                    "relative grid h-12 w-full place-items-center rounded-md border border-transparent text-foreground/80 transition hover:border-border hover:bg-muted",
                    isSelected && "border-brand/60 bg-brand-soft/40 text-brand-deep",
                  )}
                >
                  <HugeiconsIcon icon={icon} className="size-5" strokeWidth={1.6} />
                  {isSelected && (
                    <HugeiconsIcon
                      icon={Tick01Icon}
                      className="absolute right-1 top-1 size-3 text-brand-via"
                    />
                  )}
                </button>
              )
            })}
            {results.length === 0 && (
              <div className="col-span-6 py-10 text-center text-xs text-muted-foreground">
                {t("settings.icon.empty")}
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="border-t border-border bg-muted/30 px-3 py-2 text-[0.6875rem] text-muted-foreground">
          {value ? value : t("settings.icon.hint")}
        </div>
      </PopoverContent>
    </Popover>
  )
}
