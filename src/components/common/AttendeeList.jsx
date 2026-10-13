import { motion, useReducedMotion } from "motion/react"
import { PersonAvatar } from "@/components/common/PersonAvatar"
import { PersonPopover } from "@/components/common/PersonPopover"
import { goingCount, groupAttendees } from "@/components/common/event-detail/attendeeStatus"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"

// Yanıt hapının tonu; anahtarlar `ATTENDEE_GROUPS` ile aynı.
const PILL = {
  organizer: "bg-brand/10 text-brand",
  accepted: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
  tentativelyAccepted: "bg-amber-400/20 text-amber-800 dark:text-amber-300",
  declined: "bg-red-500/10 text-red-600 dark:text-red-400",
  none: "bg-muted text-muted-foreground",
}
const EASE = [0.22, 1, 0.36, 1]

/**
 * Katılımcı listesi — yanıta göre sıralı (düzenleyen · kabul · belki · ret ·
 * yanıtsız), satırda ad ve renkli yanıt hapı; satıra basınca kişi kartı.
 * `summary` açıkken üstte kişi sayısı ve yanıtların oranını gösteren şerit.
 * Satırlar sırayla belirir (azaltılmış harekette anında).
 */
export function AttendeeList({ people, photoOf, organizerAddress, summary = false }) {
  const { t } = useLocale()
  const reduce = useReducedMotion()
  const groups = groupAttendees(people, organizerAddress)
  const rows = groups.flatMap((g) => g.people.map((a) => ({ a, key: g.key, label: g.label })))
  return (
    <div className="flex min-h-0 flex-col">
      {summary && (
        <div className="px-2 pb-2.5 pt-1.5">
          <p className="flex items-baseline justify-between gap-3">
            <span className="text-[0.8125rem] font-semibold text-foreground">
              {t("calendar.attendees", { count: people.length })}
            </span>
            <span className="truncate text-[0.6875rem] text-muted-foreground">
              {t("myspace.meeting.going", { n: goingCount(people, organizerAddress) })}
            </span>
          </p>
          <motion.span
            aria-hidden="true"
            initial={reduce ? false : { scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.06 }}
            className="mt-2 flex h-1.5 origin-left gap-0.5 rtl:origin-right"
          >
            {groups.map((g) => (
              <span
                key={g.key}
                style={{ flexGrow: g.people.length }}
                className={cn("h-full rounded-full", g.dot)}
              />
            ))}
          </motion.span>
        </div>
      )}
      <ul
        className={cn(
          "max-h-64 overflow-y-auto overscroll-contain [scrollbar-width:thin]",
          summary && "border-t border-border/60 pt-1",
        )}
      >
        {rows.map(({ a, key, label }, i) => (
          <motion.li
            key={a.address || a.name}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: EASE, delay: 0.05 + Math.min(i, 10) * 0.03 }}
          >
            <PersonPopover person={{ name: a.name, address: a.address }} side="top">
              {(trigger) => (
                <button
                  {...trigger}
                  type="button"
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-start transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                >
                  <PersonAvatar
                    name={a.name}
                    photo={photoOf(a.address)}
                    className="size-7 text-[0.625rem]"
                  />
                  <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium">
                    {a.name}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[0.625rem] font-semibold",
                      PILL[key],
                    )}
                  >
                    {t(label)}
                  </span>
                </button>
              )}
            </PersonPopover>
          </motion.li>
        ))}
      </ul>
    </div>
  )
}
