import { AttendeeList } from "@/components/common/AttendeeList"
import { PersonAvatar } from "@/components/common/PersonAvatar"
import { PersonPopover } from "@/components/common/PersonPopover"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"

const SHOWN = 5
const RING =
  "relative rounded-full bg-popover ring-2 ring-popover transition hover:z-10 hover:-translate-y-0.5 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-brand/60"

/** Bir kişi: basınca kişi kartı (`PersonPopover`). `children(trigger)` görünümü çizer. */
function Person({ person, children }) {
  return (
    <PersonPopover person={{ name: person.name, address: person.address }} side="top">
      {children}
    </PersonPopover>
  )
}

/**
 * Katılımcı yığını: ilk beşi üst üste (beyaz kenarlık), basınca kişi kartı;
 * "+n" kalanların listesini açar (ad · yanıt), satıra basınca kişi kartı.
 */
export function AttendeeStack({ people, photoOf }) {
  const { t } = useLocale()
  const rest = people.slice(SHOWN)
  return (
    <div className="flex -space-x-2">
      {people.slice(0, SHOWN).map((a) => (
        <Person key={a.address || a.name} person={a}>
          {(trigger) => (
            <button
              {...trigger}
              type="button"
              aria-label={t("person.openCard", { name: a.name })}
              title={a.name}
              className={RING}
            >
              <PersonAvatar
                name={a.name}
                photo={photoOf(a.address)}
                className="size-9 text-[0.6875rem]"
              />
            </button>
          )}
        </Person>
      ))}
      {rest.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={t("calendar.moreAttendees", { count: rest.length })}
              className={cn(
                RING,
                "grid size-9 place-items-center bg-muted text-[0.6875rem] font-semibold text-foreground/70 hover:bg-accent",
              )}
            >
              +{rest.length}
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="center" className="w-64 gap-0 p-1.5">
            <AttendeeList people={rest} photoOf={photoOf} />
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
