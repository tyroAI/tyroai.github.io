import { HugeiconsIcon } from "@hugeicons/react"
import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon"
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon"
import Flag02Icon from "@hugeicons/core-free-icons/Flag02Icon"
import { useMyCircle } from "@/hooks/useMyCircle"
import { usePeoplePhotos } from "@/hooks/usePeoplePhotos"
import { circleOf } from "@/lib/myCircle"
import { isoOf } from "@/data/specialDays"
import { daysBetween, peopleOn, relativeDay } from "./dayMath"
import { GroupHeader, PeopleGroup } from "./PeopleGroup"

const KINDS = ["birthday", "anniversary", "joiner"]
const RANK = { team: 0, department: 1, none: 2 }

/**
 * Takvimde seçili günün özeti (varsayılan bugün): o günün özel günü,
 * doğum günleri, iş yıl dönümleri, aramıza katılanlar — her biri kendi
 * başlığıyla. Kutlama kütüğü yalnız önümüzdeki `windowDays` günü taşıyor;
 * dışındaki gün için "bilinmiyor" notu düşülür, boş liste gibi okunmasın.
 *
 * Fotoğraflar burada istenir: bileşen yalnız panel AÇIKKEN çizilir.
 */
export function DayAgenda({
  day,
  todayIso,
  people,
  peopleKnown,
  windowDays,
  holidays,
  onToday,
  onStep,
  fmtDayMonth,
  fmtWeekday,
  t,
}) {
  const iso = isoOf(day)
  const offset = daysBetween(todayIso, iso)
  const isToday = offset === 0
  const circle = useMyCircle(peopleKnown)
  const raw = peopleKnown ? peopleOn(people, offset, windowDays) : null
  // Ekip ve departman her grubun başında ve vurgulu (`PeopleGroup`).
  const tag = (list) =>
    list
      .map((p) => ({ ...p, circle: circleOf(circle, p.mail) }))
      .sort((a, b) => RANK[a.circle ?? "none"] - RANK[b.circle ?? "none"])
  const groups = raw && Object.fromEntries(KINDS.map((k) => [k, tag(raw[k])]))
  const shown = groups ? KINDS.flatMap((k) => groups[k]) : []
  const photos = usePeoplePhotos(shown.map((p) => p.mail))
  const photoOf = (mail) => (mail ? photos.get(mail.trim().toLowerCase()) : undefined)
  const holidaysOn = holidays.filter((h) => h.dates.includes(iso))
  const dayText = isToday ? t("feed.cel.today") : fmtDayMonth.format(day)
  const outOfRange = peopleKnown && !groups

  return (
    <section aria-live="polite" className="border-b border-border pb-2">
      <div className="flex items-baseline gap-2 px-4 pb-0.5 pt-3">
        <span className="text-[0.625rem] font-semibold uppercase tracking-[0.11em] text-muted-foreground">
          {isToday ? t("special.today") : relativeDay(offset, t)}
        </span>
        <span className="min-w-0 truncate text-[0.6875rem] text-muted-foreground/80">
          {fmtDayMonth.format(day)} · {fmtWeekday.format(day)}
        </span>
        <div className="ms-auto flex shrink-0 items-center gap-1 self-center">
          {!isToday && (
            <button
              type="button"
              onClick={onToday}
              className="me-1 rounded-sm text-[0.6875rem] font-semibold text-brand transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              {t("special.backToToday")}
            </button>
          )}
          {[
            [-1, ArrowLeft01Icon, "special.prevDay"],
            [1, ArrowRight01Icon, "special.nextDay"],
          ].map(([delta, icon, label]) => (
            <button
              key={delta}
              type="button"
              onClick={() => onStep(delta)}
              aria-label={t(label)}
              title={t(label)}
              className="grid size-6 place-items-center rounded-md text-muted-foreground transition hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [@media(pointer:coarse)]:size-9"
            >
              <HugeiconsIcon icon={icon} className="size-3.5 rtl:rotate-180" strokeWidth={2} />
            </button>
          ))}
        </div>
      </div>

      {holidaysOn.length > 0 && (
        <section>
          <GroupHeader icon={Flag02Icon} label={t("special.group.holidays")} />
          {holidaysOn.map((h) => (
            <p
              key={h.id + h.from}
              className="mx-4 mb-1 rounded-lg bg-brand/[0.08] px-3 py-2 text-[0.8125rem] font-medium text-foreground"
            >
              {t(`special.day.${h.id}`)}
            </p>
          ))}
        </section>
      )}

      {KINDS.map((kind) => (
        <PeopleGroup
          key={kind}
          kind={kind}
          people={groups?.[kind] ?? []}
          photoOf={photoOf}
          dayText={dayText}
          isToday={isToday}
          t={t}
        />
      ))}

      {groups && !shown.length && !holidaysOn.length && (
        <p className="px-4 pt-2 text-[0.75rem] text-muted-foreground">{t("special.dayEmpty")}</p>
      )}
      {outOfRange && (
        <p className="px-4 pt-2 text-[0.6875rem] leading-snug text-muted-foreground/80">
          {t("special.outOfRange", { n: windowDays })}
        </p>
      )}
    </section>
  )
}
