import { useId, useMemo } from "react"
import { PersonDetails } from "@/components/common/PersonDetails"
import { PersonPopover } from "@/components/common/PersonPopover"
import { useLocale } from "@/hooks/useLocale"
import { usePersonProfile } from "@/hooks/usePersonProfile"
import { PERSON } from "@/lib/personDirectory"

/**
 * Kişi bölmesinin "İletişim"i — kişi kartının iletişim satırları ve yöneticisi (`PersonDetails`,
 * aynı dizin profili ve önbelleği), ayrı bir karta tıklamadan. Profil bölme açılınca istenir; o
 * arada bilinen e-posta görünür, telefon ve şirket için iskelet. Yönetici ekipteyse satırı onun
 * kişi bölmesine geçer (`onSwitch`), değilse kişi kartını açar.
 */
export function MemberContact({ person, rows, onSwitch }) {
  const { t } = useLocale()
  const titleId = useId()
  const res = usePersonProfile({ name: person.name, address: person.address }, true)
  const ready = res.status === PERSON.ready
  const loading = res.status === PERSON.loading
  const p = ready ? res.profile : null
  // Ekipteki kişiler adresle (posta ya da UPN): yönetici satırı onların bölmesine geçer.
  const teamKey = useMemo(() => {
    const map = new Map()
    for (const r of rows ?? [])
      for (const a of [r.person.address, r.person.upn]) if (a) map.set(a.toLowerCase(), r.key)
    return map
  }, [rows])

  const note = ready
    ? p?.limited
      ? t("person.limited")
      : null
    : loading || res.status === PERSON.unauthenticated
      ? null
      : res.status === PERSON.notFound
        ? t("person.notFound")
        : res.status === PERSON.ambiguous
          ? t("person.ambiguous")
          : t("person.error")
  const canRetry = res.status === PERSON.error || res.status === PERSON.denied

  const renderManager = (m, row) => {
    const key = teamKey.get(m.address)
    if (key && onSwitch)
      return row({
        onClick: () => onSwitch(key),
        label: t("selfService.team.open", { name: m.name }),
      })
    return (
      <PersonPopover person={m} align="end">
        {(trigger) => row({ ...trigger, label: t("person.openCard", { name: m.name }) })}
      </PersonPopover>
    )
  }

  return (
    <section aria-labelledby={titleId} className="mt-5 min-w-0">
      <h3 id={titleId} className="px-1 text-[0.875rem] font-semibold">
        {t("selfService.team.pane.contact")}
      </h3>
      <div className="mt-2 rounded-2xl text-[0.8125rem] ring-1 ring-inset ring-border/70">
        <PersonDetails
          profile={p}
          address={p?.address || person.address}
          roomy
          hideCompany
          renderManager={renderManager}
          className="px-1.5 py-1.5 [&+&]:border-t [&+&]:border-border/60"
        />
        {loading && (
          <div aria-hidden="true" className="space-y-2 px-3.5 pb-3 pt-1">
            <span className="ms-skeleton block h-7 w-3/5 rounded-lg" />
            <span className="ms-skeleton block h-7 w-4/5 rounded-lg" />
          </div>
        )}
        {note && (
          <p className="flex flex-wrap items-center gap-x-1.5 border-t border-border/60 px-3.5 py-2 text-[0.6875rem] leading-snug text-muted-foreground">
            <span>{note}</span>
            {canRetry && (
              <button
                type="button"
                onClick={res.retry}
                className="rounded font-semibold text-brand-ink underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 pointer-coarse:min-h-11"
              >
                {t("person.retry")}
              </button>
            )}
          </p>
        )}
      </div>
    </section>
  )
}
