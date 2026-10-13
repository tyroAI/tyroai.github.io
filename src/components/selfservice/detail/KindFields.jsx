import { useLocale } from "@/hooks/useLocale"
import { extraValue } from "@/lib/selfServiceFields"
import { day, range } from "../kinds"
import { CompanyValue, ExtraFields, Field } from "./DetailFields"

/**
 * İzin: tarih aralığı, ek alanlar (planlı, gün altı izinde saatler) ve açıklama. Tür başlıkta
 * (ad + kod), süre büyük değerde: burada tekrarlanmaz.
 */
export function LeaveFields({ record }) {
  const { t, locale } = useLocale()
  return (
    <>
      <Field label={t("selfService.field.dates")} wide>
        {range(record.start, record.end, locale)}
      </Field>
      <ExtraFields items={record.extra} />
      <Field label={t("selfService.field.description")} wide>
        {record.description}
      </Field>
    </>
  )
}

/**
 * Masraf raporu: şirket, rapor tarihi (yoksa son kalem) ve başlığın ek alanları (açıklama,
 * masraf merkezi, kaynak/yansıtma şirketi). Toplam büyük değerde: burada tekrarlanmaz.
 */
export function ExpenseFields({ record }) {
  const { t, locale } = useLocale()
  const reportDate = extraValue(record.extra, "reportDate")
  return (
    <>
      <Field label={t("selfService.field.company")}>
        {record.company ? <CompanyValue code={record.company} /> : null}
      </Field>
      <Field label={t(reportDate ? "selfService.field.reportDate" : "selfService.field.date")}>
        {day(reportDate ?? record.date, locale)}
      </Field>
      <ExtraFields items={record.extra} skip={["reportDate"]} />
    </>
  )
}

/**
 * İş avansı: talep tarihi, gidilecek yer, ek alanlar (ödeme yöntemi, belge, yansıtma şirketi,
 * kalan tutar) ve not. Amaç başlıkta, tutar büyük değerde: burada tekrarlanmaz.
 */
export function AdvanceFields({ record }) {
  const { t, locale } = useLocale()
  return (
    <>
      <Field label={t("selfService.field.requested")}>{day(record.date, locale)}</Field>
      <Field label={t("selfService.field.location")}>{record.location}</Field>
      <ExtraFields items={record.extra} />
      <Field label={t("selfService.field.note")} wide>
        {record.note}
      </Field>
    </>
  )
}
