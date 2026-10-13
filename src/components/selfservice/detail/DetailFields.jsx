import { COMPANIES } from "@/data/hrValues"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"
import { extraText } from "./extraText"

/** Ayrıntının tek alanı; değer boşsa hiç çizilmez (boş "—" satırı bilmediğimizi değil, yok demek olurdu). */
export function Field({ label, children, wide = false, className }) {
  if (children == null || children === "" || children === false || children === "—") return null
  return (
    <div className={cn(wide ? "col-span-2" : "min-w-0", className)}>
      <dt className="text-[0.6875rem] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-[0.875rem] text-foreground">{children}</dd>
    </div>
  )
}

/** Şirket kodu + tam adı (`hrValues` COMPANIES); bilinmeyen kod yalnız kod. */
export function CompanyValue({ code }) {
  const name = COMPANIES[String(code ?? "").toUpperCase()]
  return (
    <>
      <span className="font-medium tabular-nums">{code}</span>
      {name && (
        <span lang="tr" className="block text-[0.6875rem] leading-snug text-muted-foreground">
          {name}
        </span>
      )}
    </>
  )
}

/**
 * Ek alanlar — satırda BULUNAN ve boş olmayanlar; etiket `selfService.field.<key>` (dört dil).
 * `skip`: başka yerde zaten gösterilen alanlar.
 */
export function ExtraFields({ items, skip = [] }) {
  const { t, locale } = useLocale()
  return (items ?? [])
    .filter((x) => !skip.includes(x.key))
    .map((x) => (
      <Field key={x.key} label={t(`selfService.field.${x.key}`)} wide={x.key === "explanation"}>
        {x.kind === "company" ? <CompanyValue code={x.value} /> : extraText(x, t, locale)}
      </Field>
    ))
}
