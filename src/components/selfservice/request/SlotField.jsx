import { HugeiconsIcon } from "@hugeicons/react"
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import PlusSignIcon from "@hugeicons/core-free-icons/PlusSignIcon"
import { useLocale } from "@/hooks/useLocale"
import { PROMPT_TEMPLATES, optionLabel } from "@/lib/promptTemplates"
import { amountPlaceholder, asciiDigits } from "@/lib/requestForm"
import { cn } from "@/lib/utils"
import { ChoiceChips } from "./ChoiceChips"
import { CONTROL, ERROR, LABEL, capFirst, errorText } from "./formUi"
import { DateField, SearchField } from "./PickerFields"

/**
 * Şablon alanından form alanı — türüne göre: tarih (takvim), aramalı liste, seçenek çipleri,
 * tutar (+ para birimi), yazı. Etiket şablonun alan adı (`myspace.slot.<ad>`); eklenebilir
 * alanın etiketinde kaldırma düğmesi.
 */
export function SlotField({
  tkey,
  idBase,
  field,
  values,
  onChange,
  error,
  onRemove,
  dateOpen,
  onDateOpen,
  className,
}) {
  const { t, locale } = useLocale()
  const { name, slot, unit } = field
  const id = `${idBase}-${name}`
  const labelId = `${id}-label`
  const errorId = `${id}-error`
  const label = capFirst(t(`myspace.slot.${name}`), locale)
  const value = values[name]
  const set = (v) => onChange(name, v)
  const err = errorText(t, slot, error)
  const common = { id, labelId, error: err, errorId }

  let control
  if (slot.type === "date") {
    control = (
      <DateField
        {...common}
        value={value}
        min={values[slot.after]}
        onPick={set}
        open={dateOpen}
        onOpenChange={onDateOpen}
      />
    )
  } else if (slot.type === "choice" && slot.search) {
    control = <SearchField {...common} slot={slot} field={label} value={value} onPick={set} />
  } else if (slot.type === "choice") {
    control = (
      <ChoiceChips
        labelledBy={labelId}
        options={slot.options}
        value={value}
        onChange={set}
        labelOf={(o) => capFirst(optionLabel(t, slot, o), locale)}
        wrap={slot.options.length > 3}
      />
    )
  } else {
    control = (
      <InputControl
        {...common}
        slot={slot}
        value={value}
        onChange={set}
        unit={unit && { name: unit, value: values[unit], onChange: (v) => onChange(unit, v) }}
        tkey={tkey}
      />
    )
  }

  // Çiplerin adı grubun etiketinden; öteki alanlarda etikete basmak alanı açar ya da odaklar.
  const chips = slot.type === "choice" && !slot.search
  const LabelTag = chips ? "span" : "label"
  return (
    <div className={className}>
      <div className={cn(LABEL, onRemove && "justify-between")}>
        <LabelTag id={labelId} htmlFor={chips ? undefined : id}>
          {label}
          {slot.addable && !slot.required && (
            <span className="font-normal text-muted-foreground">
              {" · "}
              {t("myspace.template.optional")}
            </span>
          )}
        </LabelTag>
        {onRemove && (
          <button
            type="button"
            onClick={() => onRemove(name)}
            aria-label={t("myspace.template.remove", { label })}
            className="relative -my-1 grid size-6 place-items-center rounded-md text-muted-foreground transition hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 pointer-coarse:after:absolute pointer-coarse:after:-inset-2.5"
          >
            <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" className="size-3.5" />
          </button>
        )}
      </div>
      {control}
      {err && (
        <p id={errorId} className={ERROR}>
          {err}
        </p>
      )}
    </div>
  )
}

/** Tutar ya da yazı. Tutarın para birimi kutunun sonunda yerel seçici (telefonda sistem listesi). */
function InputControl({ id, labelId, slot, value, onChange, unit, error, errorId, tkey }) {
  const { t, locale } = useLocale()
  const amount = slot.type === "amount"
  const input = (
    <input
      id={id}
      type="text"
      value={value ?? ""}
      onChange={(e) => onChange(amount ? asciiDigits(e.target.value) : e.target.value)}
      inputMode={amount ? "decimal" : undefined}
      autoComplete="off"
      spellCheck={!amount}
      maxLength={amount ? 24 : 160}
      placeholder={amount ? amountPlaceholder(locale) : undefined}
      aria-labelledby={labelId}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? errorId : undefined}
      className={cn(
        unit
          ? "no-ios-zoom h-full min-w-0 flex-1 bg-transparent px-3 outline-none placeholder:text-muted-foreground/70"
          : cn(CONTROL, "no-ios-zoom placeholder:text-muted-foreground/70"),
        amount && "tabular-nums",
      )}
    />
  )
  if (!unit) return input
  const unitSlot = PROMPT_TEMPLATES[tkey].slots[unit.name]
  return (
    <div
      data-invalid={error ? "" : undefined}
      className={cn(
        CONTROL,
        "relative gap-0 p-0 focus-within:border-brand/60 focus-within:ring-2 focus-within:ring-brand/25 data-[invalid]:border-destructive/70 data-[invalid]:ring-2 data-[invalid]:ring-destructive/15",
      )}
    >
      {input}
      <span aria-hidden="true" className="h-5 w-px shrink-0 bg-border" />
      <select
        value={unit.value ?? ""}
        onChange={(e) => unit.onChange(e.target.value)}
        aria-label={capFirst(t(`myspace.slot.${unit.name}`), locale)}
        className="no-ios-zoom h-full shrink-0 cursor-pointer appearance-none rounded-e-xl bg-transparent pe-7 ps-3 text-[0.8125rem] font-semibold tabular-nums outline-none"
      >
        {unitSlot.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <HugeiconsIcon
        icon={ArrowDown01Icon}
        aria-hidden="true"
        className="pointer-events-none absolute end-2.5 size-3.5 text-muted-foreground"
        strokeWidth={2}
      />
    </div>
  )
}

/** Eklenmemiş isteğe bağlı alanlar: "+ Fiş no" gibi çipler; basınca alan varsayılanıyla açılır. */
export function AddableChips({ idBase, fields, values, onAdd }) {
  const { t, locale } = useLocale()
  const missing = fields.filter((f) => values[f.name] === undefined)
  if (!missing.length) return null
  return (
    <div
      role="group"
      aria-label={t("myspace.template.optionalTitle")}
      className="flex flex-wrap gap-1.5"
    >
      {missing.map((f) => (
        <button
          key={f.name}
          id={`${idBase}-add-${f.name}`}
          type="button"
          onClick={() => onAdd(f)}
          className="inline-flex h-8 items-center gap-1 rounded-full border border-dashed border-border px-2.5 text-[0.75rem] font-medium text-muted-foreground transition hover:border-brand/45 hover:bg-brand/[0.05] hover:text-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 pointer-coarse:h-11"
        >
          <HugeiconsIcon
            icon={PlusSignIcon}
            aria-hidden="true"
            className="size-3"
            strokeWidth={2.2}
          />
          {capFirst(t(`myspace.slot.${f.name}`), locale)}
        </button>
      ))}
    </div>
  )
}
