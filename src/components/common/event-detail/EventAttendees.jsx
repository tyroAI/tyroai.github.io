import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import UserGroupIcon from "@hugeicons/core-free-icons/UserGroupIcon"
import { Separator } from "@/components/ui/separator"
import { PersonAvatar } from "@/components/common/PersonAvatar"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"
import { groupAttendees } from "./attendeeStatus"

const PERSON_BUTTON =
  "rounded-full transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"

/**
 * Kartın katılımcı bölümü: kaç katılımcı, yanıtların özeti (Kabul etti ·
 * Belki · Reddetti · Yanıt vermedi — sayılarıyla), ilk altı yüz, "tümünü
 * göster". Tam liste yanıta göre gruplu ve KENDİ İÇİNDE kayar — yüzlerce
 * katılımcılı toplantıda kart yutulmasın, devamı olduğu da görünsün.
 */
export function EventAttendees({ people, organizerAddress, photoOf, presenceOf, onPerson }) {
  const { t } = useLocale()
  const [showAll, setShowAll] = useState(false)
  const groups = groupAttendees(people, organizerAddress)
  const dot = (g) => (
    <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", g.dot)} />
  )
  const avatar = (a, size) => {
    const presence = presenceOf(a.address)
    return (
      <PersonAvatar
        name={a.name}
        photo={photoOf(a.address)}
        response={a.response}
        presence={presence}
        presenceLabel={presence ? t(`calendar.presence.${presence}`) : undefined}
        className={size}
      />
    )
  }

  return (
    <>
      <Separator />
      <div className="p-3.5 py-3">
        <p className="flex items-center gap-1.5 font-medium text-foreground/85">
          <HugeiconsIcon
            icon={UserGroupIcon}
            className="size-3.5 text-muted-foreground"
            strokeWidth={1.8}
          />
          {t("calendar.attendees", { count: people.length })}
        </p>
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {/* Özet yalnız yanıtlar; düzenleyen listede kendi grubunda. */}
          {groups
            .filter((g) => g.key !== "organizer")
            .map((g) => (
              <li
                key={g.key}
                className="flex items-center gap-1.5 rounded-full bg-muted/70 px-2 py-0.5 text-[0.6875rem] text-foreground/80"
              >
                {dot(g)}
                {t(g.label)}
                <span className="font-semibold tabular-nums text-foreground">
                  {g.people.length}
                </span>
              </li>
            ))}
        </ul>
        <div className="mt-2 flex items-center gap-1.5">
          {people.slice(0, 6).map((a) => (
            <button
              key={a.address || a.name}
              type="button"
              onClick={() => onPerson({ name: a.name, address: a.address })}
              aria-label={t("person.openCard", { name: a.name })}
              title={a.name}
              className={PERSON_BUTTON}
            >
              {avatar(a, "size-7")}
            </button>
          ))}
          {people.length > 6 && (
            <span className="text-[0.6875rem] text-muted-foreground">
              {t("calendar.moreAttendees", { count: people.length - 6 })}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          aria-expanded={showAll}
          className="mt-2 text-[0.71875rem] font-semibold text-brand transition hover:underline"
        >
          {t(showAll ? "calendar.hideAll" : "calendar.showAll", { count: people.length })}
        </button>
        {showAll && (
          <div className="mt-1.5 max-h-64 space-y-2.5 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-foreground/15">
            {groups.map((g) => (
              <section key={g.key} aria-label={t(g.label)}>
                <p className="flex items-center gap-1.5 px-1 pb-1 text-[0.6875rem] font-semibold text-muted-foreground">
                  {dot(g)}
                  {t(g.label)}
                  <span className="tabular-nums">· {g.people.length}</span>
                </p>
                <ul className="space-y-1">
                  {g.people.map((a) => (
                    <li key={a.address || a.name}>
                      <button
                        type="button"
                        onClick={() => onPerson({ name: a.name, address: a.address })}
                        className="flex w-full items-center gap-2 rounded-lg px-1 py-0.5 text-left transition hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                      >
                        {avatar(a, "size-6")}
                        <span className="min-w-0 text-foreground/85 [overflow-wrap:anywhere]">
                          {a.name}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
