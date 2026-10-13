import { HugeiconsIcon } from "@hugeicons/react"
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon"
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon"
import UserGroupIcon from "@hugeicons/core-free-icons/UserGroupIcon"
import { AttendeeList } from "@/components/common/AttendeeList"
import { PersonAvatar } from "@/components/common/PersonAvatar"
import { goingCount } from "@/components/common/event-detail/attendeeStatus"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useLocale } from "@/hooks/useLocale"
import { usePeoplePhotos } from "@/hooks/usePeoplePhotos"
import { uniqueAttendees } from "@/lib/calendarPeople"
import { cn } from "@/lib/utils"

// Fotoğraflar panel açılınca istenir (bileşen ancak o zaman bağlanır).
function Panel({ people, organizerAddress }) {
  const photos = usePeoplePhotos(people.slice(0, 40).map((a) => a.address))
  return (
    <AttendeeList
      summary
      people={people}
      organizerAddress={organizerAddress}
      photoOf={(address) => photos.get((address || "").toLowerCase())}
    />
  )
}

const ROW = "mt-1.5 flex h-7 w-full items-center gap-2 rounded-xl bg-muted/60 text-[0.75rem]"

/**
 * Katılımcılar satırı: ilk üç kişinin yüzü (+n), "3 kişi katılıyor" ve ⌄ —
 * basınca özet şeridi ve yanıta göre sıralı liste. Dar kartta özet "✓ 3"e
 * kısalır (tam cümle `aria-label`da); yüzler yalnız görünen slaytta istenir.
 * Katılımcısız toplantıda da satır durur (slaytlar aynı düzende kalsın).
 */
export function AttendeesRow({ event, active = true }) {
  const { t } = useLocale()
  const people = uniqueAttendees(event)
  const faces = people.slice(0, 3)
  const photos = usePeoplePhotos(active ? faces.map((a) => a.address) : [])
  if (!people.length) {
    return (
      <span className={cn(ROW, "px-2.5 text-muted-foreground")}>
        <HugeiconsIcon icon={UserGroupIcon} className="size-3.5 shrink-0" strokeWidth={1.8} />
        <span className="truncate">{t("myspace.meeting.noAttendees")}</span>
      </span>
    )
  }
  const going = goingCount(people, event.organizerAddress)
  const more = people.length - faces.length
  const summary = going
    ? t("myspace.meeting.going", { n: going })
    : t("myspace.meeting.invited", { n: people.length })
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${t("myspace.meeting.attendees")}: ${summary}`}
          className={cn(
            ROW,
            "group/att @container ps-1 pe-2 transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 aria-expanded:bg-muted",
          )}
        >
          <span className="flex shrink-0 items-center">
            {faces.map((a, i) => (
              <PersonAvatar
                key={a.address || a.name}
                name={a.name}
                photo={photos.get((a.address || "").toLowerCase())}
                className={cn(
                  "size-[1.375rem] rounded-full ring-2 ring-background",
                  i > 0 && "-ms-1",
                )}
              />
            ))}
            {more > 0 && (
              <span className="-ms-1 grid h-[1.375rem] min-w-[1.375rem] place-items-center rounded-full bg-background px-1 text-[0.625rem] font-semibold tabular-nums text-foreground/75 ring-2 ring-background">
                +{more}
              </span>
            )}
          </span>
          <span className="hidden min-w-0 flex-1 truncate text-start text-muted-foreground @[12.5rem]:block">
            {summary}
          </span>
          <span className="flex flex-1 justify-end @[12.5rem]:hidden">
            {going > 0 && (
              <span className="inline-flex items-center gap-0.5 font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                <HugeiconsIcon icon={Tick02Icon} className="size-3" strokeWidth={3} />
                {going}
              </span>
            )}
          </span>
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-aria-expanded/att:rotate-180"
            strokeWidth={2}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={6}
        collisionPadding={12}
        className="w-[max(16rem,var(--radix-popover-trigger-width))] gap-0 rounded-2xl p-1.5 shadow-[0_18px_44px_-14px_rgb(0_0_0/0.3)] duration-200 ease-out"
      >
        <Panel people={people} organizerAddress={event.organizerAddress} />
      </PopoverContent>
    </Popover>
  )
}
