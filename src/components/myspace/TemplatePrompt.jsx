import { useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon"
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon"
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useHoverPopover } from "@/hooks/useHoverPopover"
import { useLocale } from "@/hooks/useLocale"
import {
  PROMPT_TEMPLATES,
  isValidAmount,
  optionLabel,
  slotText,
  templateParts,
} from "@/lib/promptTemplates"
import { cn } from "@/lib/utils"
import { AddedClause, OptionalMenu } from "./OptionalSlots"
import { DatePickerBody, SearchList } from "./SlotPickers"
import { pillClass } from "./templatePill"

/**
 * Doldurulan hazır soru — soru kutusunun içinde, metin kutusunun YERİNE
 * (2026-09-29; istek ve alan türleri `lib/promptTemplates.js`te).
 *
 * Cümle düz metin + alan düğmeleri. Alan, üstüne gelince (fare), dokununca
 * ya da Enter'la açılıyor — `useHoverPopover`, sayfanın öteki ipuçlarıyla
 * aynı davranış (sayfada tek açık, kapanışta odak çalınmaz). Farede tıklamak
 * AÇIK TUTAR; seçim yapınca kapanır.
 *
 * ⚠️ **METİN KUTUSU KAYBOLMADI.** Düz metne tıklamak ya da kalem düğmesi cümleyi
 * serbest metne çeviriyor (`onEditText`): seçilen değerler yerinde kalıyor,
 * boş alanlar `[başlangıç]` olarak — cümleyi elle değiştirmek isteyen kişi
 * bir şablonun içine kilitlenmemeli.
 *
 * ⚠️ **AÇIK TUTULAN ALAN** (`forcedOpen`): başlangıç seçilince bitiş
 * kendiliğinden açılır, eksik bir alanla gönder'e basılınca o alan açılır.
 * Bu açılış ebeveynin durumunda tutuluyor (etki içinde `setState` yok); fare
 * ayrılınca kapanmaz — kendiliğinden açılan bir seçici kullanıcı ona
 * uzanırken kaçmamalı. Seçim, dışarı tıklama ya da Escape kapatır.
 *
 * ⚠️ **YAZI ALANLARI (tutar · açıklama · gidilecek yer) SATIRIN İÇİNDE**
 * (`InputSlot`, 2026-09-30 — Masraf gir · Avans gir). Açılır bir kutuda
 * olsalardı hover'la açılan seçicinin kuralı onları yazarken kapatırdı (fare
 * kutudan çıkınca 160 ms). Genişlik yazılanla birlikte büyüyor: görünmez bir
 * ikiz aynı ızgara hücresinde metni taşıyor (`field-sizing: content` Safari'de
 * yok). Eksik yazı alanıyla gönder'e basmak o alana ODAK verir (ebeveynin
 * `send`i, `data-slot-name` ile).
 *
 * ⚠️ **UZUN LİSTE ARAMALI VE TIKLAMAYLA AÇILIR** (`SearchChoiceSlot` — 54
 * kategori, 95 şirket). Hover'la açılsaydı arama kutusuna yazan kişinin faresi
 * listeden çıktığı anda liste kapanırdı; kısa listeler (izin türü · para
 * birimi · amaç · ödeme) eski davranışında, üstüne gelince açılıyor.
 */
export function TemplatePrompt({ tkey, values, onChange, forcedOpen, onForcedClose, onEditText }) {
  const { t } = useLocale()
  const parts = useMemo(() => templateParts(t(`myspace.prompt.${tkey}`)), [t, tkey])
  const slots = PROMPT_TEMPLATES[tkey]?.slots ?? {}

  return (
    <div
      role="group"
      aria-label={t("myspace.template.aria")}
      className="min-w-0 flex-1 py-1 text-[0.875rem] leading-7"
    >
      {parts.map((p, i) => {
        if (p.text != null) {
          return (
            <span key={`t${i}`} onClick={onEditText} className="cursor-text">
              {p.text}
            </span>
          )
        }
        const slot = slots[p.slot]
        if (!slot) return null
        const common = {
          tkey,
          name: p.slot,
          slot,
          values,
          onChange,
          forced: forcedOpen === p.slot,
          // Başka bir alan açık tutuluyorsa bu alana uzanmak onu KAPATIR —
          // yoksa iki seçici üst üste açık kalıyordu (ölçüldü).
          yieldForced: forcedOpen && forcedOpen !== p.slot ? () => onForcedClose() : null,
          onForcedClose: () => onForcedClose(p.slot),
        }
        if (!slot.addable) return <SlotView key={p.slot} {...common} />
        return values[p.slot] == null ? null : (
          <AddedClause key={p.slot} {...common}>
            <SlotView {...common} />
          </AddedClause>
        )
      })}
      <OptionalMenu tkey={tkey} values={values} onChange={onChange} />
    </div>
  )
}

/** Alanın türüne göre düğmesi. Eklenebilir alanın yan cümlesini `AddedClause` yazar. */
function SlotView(props) {
  const { slot } = props
  if (slot.type === "amount" || slot.type === "text") {
    return <InputSlot {...props} />
  }
  if (slot.type === "date") return <DateSlot {...props} />
  return slot.search ? <SearchChoiceSlot {...props} /> : <ChoiceSlot {...props} />
}

function useSlotPopover(forced, onForcedClose, yieldForced) {
  const tip = useHoverPopover({ openDelay: 120, closeDelay: 240 })
  const open = tip.open || forced
  const triggerProps = {
    ...tip.triggerProps,
    onPointerEnter: (e) => {
      if (e.pointerType === "mouse") yieldForced?.()
      tip.triggerProps.onPointerEnter(e)
    },
    onPointerDown: (e) => {
      yieldForced?.()
      tip.triggerProps.onPointerDown(e)
    },
    onKeyDown: (e) => {
      if (e.key === "Enter" || e.key === " ") yieldForced?.()
      tip.triggerProps.onKeyDown(e)
    },
  }
  const onOpenChange = (next) => {
    tip.onOpenChange(next)
    if (!next && forced) onForcedClose()
  }
  const close = () => {
    tip.close()
    if (forced) onForcedClose()
  }
  return { tip, triggerProps, open, onOpenChange, close }
}

function DateSlot({ tkey, name, slot, values, onChange, forced, onForcedClose, yieldForced }) {
  const { t, locale } = useLocale()
  const { tip, triggerProps, open, onOpenChange, close } = useSlotPopover(
    forced,
    onForcedClose,
    yieldForced,
  )
  const value = values[name]
  const text = slotText(t, locale, tkey, name, value)
  const field = t(`myspace.slot.${name}`)
  const min = slot.after ? values[slot.after] : undefined

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild {...triggerProps}>
        <button
          type="button"
          data-slot-name={name}
          aria-label={t("myspace.template.field", {
            field,
            value: text ?? t("myspace.template.empty"),
          })}
          className={pillClass(value != null)}
        >
          <HugeiconsIcon
            icon={Calendar03Icon}
            className="size-3.5 self-center opacity-80"
            strokeWidth={1.8}
          />
          {text ?? field}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={6}
        collisionPadding={12}
        {...tip.contentProps}
        aria-label={field}
        className="w-[17rem] gap-0 p-0"
      >
        <DatePickerBody
          value={value}
          min={min}
          rangeFrom={min}
          onPick={(d) => {
            onChange(name, d)
            close()
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

function ChoiceSlot({ tkey, name, slot, values, onChange, forced, onForcedClose, yieldForced }) {
  const { t, locale } = useLocale()
  const { tip, triggerProps, open, onOpenChange, close } = useSlotPopover(
    forced,
    onForcedClose,
    yieldForced,
  )
  const value = values[name]
  const text = slotText(t, locale, tkey, name, value)
  const field = t(`myspace.slot.${name}`)

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild {...triggerProps}>
        <button
          type="button"
          data-slot-name={name}
          aria-label={t("myspace.template.field", {
            field,
            value: text ?? t("myspace.template.empty"),
          })}
          className={cn(pillClass(value != null), "group/slot")}
        >
          {text ?? field}
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
        {...tip.contentProps}
        aria-label={field}
        className="w-56 gap-0 p-1"
      >
        <p
          className="px-2 pb-1 pt-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
          lang={locale}
        >
          {field}
        </p>
        {slot.options.map((o) => {
          const active = o === value
          return (
            <button
              key={o}
              type="button"
              aria-pressed={active}
              onClick={() => {
                onChange(name, o)
                close()
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[0.8125rem] outline-none transition hover:bg-accent focus-visible:bg-accent",
                active && "font-semibold",
              )}
            >
              <span className="min-w-0 flex-1">{optionLabel(t, slot, o)}</span>
              {active && (
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
  )
}

/**
 * Satır içi yazı alanı — tutar ya da serbest metin. Görünmez ikiz (`aria-hidden`
 * `span`) aynı ızgara hücresinde yazılanı ya da yer tutucuyu taşıyor, alan onun
 * genişliğine uzuyor. Enter formu gönderir (formun doğal davranışı): eksik alan
 * varsa ebeveyn o alanı açar ya da odaklar.
 *
 * ⚠️ Tutar yalnız rakam + ayraç kabul eder (`isValidAmount`); geçersizse alan
 * kırmızı kesikli çerçeveye döner ve `aria-invalid` taşır — "1500 TL" yazan kişi
 * para biriminin kendi alanında olduğunu görür.
 */
function InputSlot({ name, slot, values, onChange, yieldForced }) {
  const { t } = useLocale()
  const value = values[name] ?? ""
  const field = t(`myspace.slot.${name}`)
  const placeholder = slot.optional ? t("myspace.template.optional") : field
  const filled = String(value).trim() !== ""
  const bad = slot.type === "amount" && filled && !isValidAmount(value)

  return (
    <span className="inline-grid align-baseline">
      <span
        aria-hidden="true"
        className={cn(
          "invisible col-start-1 row-start-1 whitespace-pre rounded-lg border border-transparent px-1.5 font-medium leading-6",
          // İkiz alanla AYNI rakam genişliğini taşımak zorunda: `tabular-nums`
          // yalnız alanda olunca son hane kırpılıyordu (ölçüldü: "1.250,5|0").
          slot.type === "amount" && "tabular-nums",
        )}
      >
        {value || placeholder}
      </span>
      {/* ⚠️ `size={1}` ŞART: bir `<input>`un doğal genişliği ~20 karakter ve
          ızgara izi ona göre açılıyordu (ölçüldü: "1.250,50" için 177 px).
          Doğal genişlik küçülünce izi ikiz belirliyor, alan onu dolduruyor. */}
      <input
        type="text"
        size={1}
        data-slot-name={name}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        onFocus={() => yieldForced?.()}
        placeholder={placeholder}
        aria-label={field}
        aria-invalid={bad || undefined}
        inputMode={slot.type === "amount" ? "decimal" : undefined}
        enterKeyHint="send"
        autoComplete="off"
        spellCheck={slot.type === "text"}
        maxLength={slot.type === "amount" ? 24 : 160}
        className={cn(
          pillClass(filled && !bad),
          "no-ios-zoom col-start-1 row-start-1 m-0 w-full min-w-[2.5rem] placeholder:font-medium placeholder:text-[color-mix(in_oklch,var(--brand-via)_45%,var(--muted-foreground))]",
          slot.type === "amount" && "tabular-nums",
          bad &&
            "border border-dashed border-destructive/60 bg-destructive/[0.05] text-destructive",
        )}
      />
    </span>
  )
}

/**
 * Aramalı uzun liste. Açılış TIKLAMA (fare · dokunuş) ya da Enter/Boşluk;
 * açılınca odak arama kutusunda, ↑ ↓ gezer, Enter seçer, Escape kapatır.
 * `describe` varsa satır iki katlı (kod + unvan), alana yine seçeneğin kendisi
 * (kod) yazılır — gerekçe `data/hrValues.js`.
 */
function SearchChoiceSlot({
  tkey,
  name,
  slot,
  values,
  onChange,
  forced,
  onForcedClose,
  yieldForced,
}) {
  const { t, locale } = useLocale()
  const [openState, setOpenState] = useState(false)
  const open = openState || forced
  const value = values[name]
  const text = slotText(t, locale, tkey, name, value)
  const field = t(`myspace.slot.${name}`)
  const sub = value != null && slot.describe?.(value)
  const described = sub ? `${text} – ${sub}` : text

  const onOpenChange = (next) => {
    setOpenState(next)
    if (!next && forced) onForcedClose()
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-slot-name={name}
          onPointerDown={() => yieldForced?.()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") yieldForced?.()
          }}
          aria-label={t("myspace.template.field", {
            field,
            value: described ?? t("myspace.template.empty"),
          })}
          className={cn(pillClass(value != null), "group/slot max-w-full")}
        >
          <span className="min-w-0 truncate">{text ?? field}</span>
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            className="size-3 shrink-0 self-center opacity-70 transition-transform group-data-[state=open]/slot:rotate-180"
            strokeWidth={2.2}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={6}
        collisionPadding={12}
        aria-label={field}
        className="w-[min(20rem,calc(100vw-1.5rem))] gap-0 p-0"
        onOpenAutoFocus={(e) => {
          // Radix ilk odaklanabilir öğeye giderdi; bu listenin girişi arama kutusu.
          e.preventDefault()
          e.currentTarget?.querySelector?.("input")?.focus()
        }}
      >
        <SearchList
          slot={slot}
          field={field}
          value={value}
          onPick={(o) => {
            onChange(name, o)
            onOpenChange(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
