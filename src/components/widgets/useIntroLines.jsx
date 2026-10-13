import { useMemo } from "react"
import { InsightTerm } from "@/components/myspace/InsightTerm"
import { useLocale } from "@/hooks/useLocale"
import { getDateTimeFormat } from "@/lib/intl-cache"
import { plural } from "./useBrief"

const OPTS_TIME = { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }
const CATS = new Set(["zero", "one", "two", "few", "many", "other"])

/** Şablondaki `{q}` yerine vurgulu terimi koyar (Anasayfa özetinin `fill`i). */
function fill(template, node) {
  const [before, after = ""] = String(template).split("{q}")
  return (
    <>
      {before}
      {node}
      {after}
    </>
  )
}

/**
 * Karşılama'nın iki cümlesi. Toplantı ifadeleri Anasayfa özetindeki gibi VURGULU
 * (noktalı alt çizgi; üstüne gelince ya da basınca toplantılar, listeden önizleme,
 * dipte takvim): hafta sonu "Pazartesi 1 toplantın var" ve ilk toplantının saati,
 * iş gününde bugün kalan toplantılar. `meetingsTip`: `useBriefTips`ten.
 */
export function useIntroLines(brief, meetingsTip) {
  const { t, locale } = useLocale()
  const rules = useMemo(() => new Intl.PluralRules(locale), [locale])
  const time = getDateTimeFormat(locale, OPTS_TIME)
  // Sayı ardındaki sözcüğe bölünmez boşlukla bağlı (özetin kuralı).
  const phrase = (n) => {
    const cat = rules.select(n)
    return t(`myspace.q.meetings.${CATS.has(cat) ? cat : "other"}`, { n }).replace(
      /(\p{Nd}+) /u,
      "$1 ",
    )
  }
  const term = (list, title, children, tone = "from") => (
    <InsightTerm tone={tone} {...meetingsTip(list, title)}>
      {children}
    </InsightTerm>
  )
  const day = brief.dayName
  const next = brief.nextMeetings

  let headline
  if (brief.weekend)
    headline = next.length
      ? fill(
          t("widgets.intro.s.next", { day }),
          term(next, t("widgets.intro.tip.next", { day }), phrase(next.length)),
        )
      : t("widgets.intro.calm", { day })
  else if (brief.part === "evening") headline = plural(t, "widgets.brief.evening", brief.doneToday)
  else if (brief.items.length) headline = plural(t, "widgets.intro.waiting", brief.items.length)
  else headline = t("widgets.brief.clear")

  let meetingLine = null
  if (brief.weekend) {
    if (next[0])
      meetingLine = fill(
        t("widgets.intro.s.first", { day }),
        term([next[0]], t("widgets.intro.tip.first"), time.format(next[0].start), "via"),
      )
  } else if (brief.left.length)
    meetingLine = fill(
      t("widgets.intro.s.left", { time: time.format(brief.left[0].start) }),
      term(brief.left, t("myspace.tip.meetings.title"), phrase(brief.left.length)),
    )
  else meetingLine = t("widgets.brief.noneLeft")

  return { headline, meetingLine }
}
