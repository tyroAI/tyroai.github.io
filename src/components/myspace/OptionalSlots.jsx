import { useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon"
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useLocale } from "@/hooks/useLocale"
import { PROMPT_TEMPLATES, slotText } from "@/lib/promptTemplates"
import { cn } from "@/lib/utils"
import { pillClass } from "./templatePill"

const MARK = "\u0000"

/**
 * İSTEĞE BAĞLI ALANLAR — masrafta açıklama · fiş no · firma adı · lokasyon ·
 * kişi sayısı · yansıtma şirketi (`addable` alanlar, bkz. lib/promptTemplates.js).
 *
 * Cümlenin SONUNDA tek bir "+ isteğe bağlı ˅" düğmesi; basınca hepsi bir
 * listede açılır, varsayılanı olanın yanında "varsayılan: yurtiçi" yazar (asistanın
 * sormadan kullanacağı değer). Seçilen alan cümleye girer — varsayılanlı olan
 * VARSAYILANI SEÇİLİ, yazılan alan boş ve odaklı — × ya da listede yeniden
 * basmak çıkarır. Eklenmeyen alan gönderilen metne hiç girmez, HR MCP'nin
 * varsayılanı gider. Bir tur alt satırda ayrı bir "İsteğe bağlı: + …" dizisiydi;
 * istek üzerine cümlenin sonuna tek menü olarak alındı.
 */
export function OptionalMenu({ tkey, values, onChange }) {
  const { t, locale } = useLocale()
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)
  const slots = Object.entries(PROMPT_TEMPLATES[tkey]?.slots ?? {}).filter(([, s]) => s.addable)
  if (!slots.length) return null
  const title = t("myspace.template.optionalTitle")

  const pick = (name, slot) => {
    setOpen(false)
    if (values[name] != null) return onChange(name, undefined)
    onChange(name, slot.addDefault(values))
    const group = triggerRef.current?.closest('[role="group"]')
    requestAnimationFrame(() => group?.querySelector(`[data-slot-name="${name}"]`)?.focus())
  }

  return (
    <>
      {" "}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            ref={triggerRef}
            type="button"
            aria-label={title}
            className={cn(pillClass(false), "group/slot opacity-85 hover:opacity-100")}
          >
            <span aria-hidden="true">+</span>
            {t("myspace.template.optional")}
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              className="size-3 self-center opacity-70 transition-transform group-data-[state=open]/slot:rotate-180"
              strokeWidth={2.2}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="start"
          sideOffset={6}
          collisionPadding={12}
          aria-label={title}
          className="w-72 gap-0 p-1"
        >
          <p
            className="px-2 pb-1 pt-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
            lang={locale}
          >
            {title}
          </p>
          {slots.map(([name, slot]) => {
            const added = values[name] != null
            const hint = slotText(t, locale, tkey, name, slot.addDefault(values))
            return (
              <button
                key={name}
                type="button"
                aria-pressed={added}
                onClick={() => pick(name, slot)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[0.8125rem] outline-none transition hover:bg-accent focus-visible:bg-accent",
                  added && "font-semibold",
                )}
              >
                <span className="min-w-0 flex-1">
                  {t(`myspace.slot.${name}`)}
                  {hint && (
                    <span className="ml-1.5 font-normal text-muted-foreground">
                      {t("myspace.template.defaultHint", { value: hint })}
                    </span>
                  )}
                </span>
                {added && (
                  <HugeiconsIcon
                    icon={Tick02Icon}
                    className="size-3.5 text-brand"
                    strokeWidth={2.2}
                  />
                )}
              </button>
            )
          })}
        </PopoverContent>
      </Popover>
    </>
  )
}

/** Eklenmiş isteğe bağlı alan: yan cümle + alanın kendisi + kaldırma düğmesi. */
export function AddedClause({ name, slot, onChange, children }) {
  const { t } = useLocale()
  const [before, after] = t(slot.clause, { value: MARK }).split(MARK)
  return (
    <>
      <span>{before}</span>
      {children}
      <button
        type="button"
        onClick={() => onChange(name, undefined)}
        aria-label={t("myspace.template.remove", { label: t(`myspace.slot.${name}`) })}
        className="ml-0.5 rounded px-0.5 align-baseline text-muted-foreground/70 hover:text-foreground"
      >
        ×
      </button>
      {after ? <span>{after}</span> : null}
    </>
  )
}
