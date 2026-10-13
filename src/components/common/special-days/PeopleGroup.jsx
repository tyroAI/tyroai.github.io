import { HugeiconsIcon } from "@hugeicons/react"
import Award01Icon from "@hugeicons/core-free-icons/Award01Icon"
import BirthdayCakeIcon from "@hugeicons/core-free-icons/BirthdayCakeIcon"
import PartyIcon from "@hugeicons/core-free-icons/PartyIcon"
import UserAdd01Icon from "@hugeicons/core-free-icons/UserAdd01Icon"
import { PersonAvatar } from "@/components/common/PersonAvatar"
import { PersonPopover } from "@/components/common/PersonPopover"
import { cn } from "@/lib/utils"

const GROUPS = {
  birthday: { icon: BirthdayCakeIcon, label: "special.group.birthdays" },
  anniversary: { icon: Award01Icon, label: "special.group.anniversaries" },
  joiner: { icon: UserAdd01Icon, label: "special.group.joiners" },
}

/** Grubun başlığı: marka tonlu simge, ad, sayı. */
export function GroupHeader({ icon, label, count }) {
  return (
    <div className="flex items-center gap-2 px-4 pb-1 pt-2.5">
      <span
        aria-hidden="true"
        className="grid size-5 shrink-0 place-items-center rounded-md bg-brand/10 text-brand"
      >
        <HugeiconsIcon icon={icon} className="size-3" strokeWidth={2.2} />
      </span>
      <span className="text-[0.6875rem] font-semibold text-foreground/80">{label}</span>
      {count != null && (
        <span className="ms-auto text-[0.6875rem] font-semibold tabular-nums text-muted-foreground">
          {count}
        </span>
      )}
    </div>
  )
}

/**
 * Kutlanan kişinin satırı; basınca kişi kartı açılır (Keşfet'in rayıyla aynı
 * kart, günün bağlamıyla). Ekibinden ya da departmanından biri (`circle`)
 * tonlu satır, halkalı fotoğraf ve "Ekibin"/"Departmanın" etiketiyle öne çıkar. Tür grubun başlığında; sağda yalnız ayırt eden
 * bilgi kalır (kaçıncı yıl, "Senin günün"). Ad `lang="tr"`: Türkçe adlar.
 */
function PersonRow({ person, photo, dayText, isToday, t }) {
  const side = person.self
    ? { icon: PartyIcon, label: t("person.selfDay") }
    : person.kind === "anniversary"
      ? { icon: null, label: t("feed.cel.years", { count: person.years }) }
      : null
  const contextText =
    person.kind === "birthday"
      ? dayText
      : person.kind === "joiner"
        ? isToday
          ? t("feed.cel.joinedToday")
          : t("special.joinerDay")
        : t("feed.cel.years", { count: person.years })

  return (
    <li>
      <PersonPopover
        person={{ name: person.name, address: person.mail, title: person.title }}
        side="left"
        context={{ kind: person.kind, text: contextText, years: person.years }}
      >
        {(trigger) => (
          <button
            {...trigger}
            className={cn(
              "flex w-full items-center gap-2.5 px-4 py-1.5 text-start transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40 [@media(pointer:coarse)]:min-h-11",
              person.circle
                ? "bg-brand/[0.07] hover:bg-brand/[0.12] aria-expanded:bg-brand/[0.12]"
                : "hover:bg-accent/50 aria-expanded:bg-accent/50",
            )}
          >
            <span
              className={cn(
                "flex shrink-0 rounded-full",
                person.circle && "ring-2 ring-brand ring-offset-2 ring-offset-popover",
              )}
            >
              <PersonAvatar name={person.name} photo={photo} className="size-8 text-[0.6875rem]" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="flex min-w-0 items-center gap-1.5">
                <span
                  lang="tr"
                  className={cn(
                    "truncate text-[0.75rem] font-semibold leading-snug tracking-[-0.01em]",
                    person.circle ? "text-foreground" : "text-foreground/90",
                  )}
                >
                  {person.name}
                </span>
                {person.circle && (
                  <span className="shrink-0 rounded-full bg-brand px-1.5 py-px text-[0.5625rem] font-semibold uppercase leading-4 tracking-wide text-white">
                    {t(`special.circle.${person.circle}`)}
                  </span>
                )}
              </span>
              {person.title && (
                <span
                  lang="tr"
                  className="truncate text-[0.6875rem] leading-snug text-muted-foreground"
                >
                  {person.title}
                </span>
              )}
            </span>
            {side && (
              <span className="flex shrink-0 items-center gap-1 text-[0.6875rem] font-medium tabular-nums text-muted-foreground">
                {side.icon && (
                  <HugeiconsIcon
                    icon={side.icon}
                    className="size-3.5 shrink-0 text-brand"
                    strokeWidth={2}
                  />
                )}
                {side.label}
              </span>
            )}
          </button>
        )}
      </PersonPopover>
    </li>
  )
}

/** Bir tür (doğum günü · yıl dönümü · katılan) için başlık + kişiler. */
export function PeopleGroup({ kind, people, photoOf, dayText, isToday, t }) {
  if (!people.length) return null
  const group = GROUPS[kind]
  return (
    <section>
      <GroupHeader icon={group.icon} label={t(group.label)} count={people.length} />
      <ul className="pb-1">
        {people.map((person) => (
          <PersonRow
            key={`${person.kind}:${person.key}`}
            person={person}
            photo={photoOf(person.mail)}
            dayText={dayText}
            isToday={isToday}
            t={t}
          />
        ))}
      </ul>
    </section>
  )
}
