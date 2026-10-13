import { TrayStat } from "@/components/common/SummaryTray"
import { useLocale } from "@/hooks/useLocale"
import { formatAgo } from "@/lib/date"
import { LANES, isStale, oldestFlagged } from "@/lib/forYouBoard"
import { STATUS } from "@/lib/graph"
import { getNumberFormat, pluralKey } from "@/lib/intl-cache"
import { LANE_ICON } from "./look"

/**
 * ÜÇ İŞARET SAYISI — Sabitlenmiş · Bayraklı · Yüksek önem. 2026-10-02'den beri
 * ayrı kart DEĞİL, karşılama kartının tepsisinde (`SummaryTray`, istek:
 * *"resimdeki kısmı birleştir, ferah ve compact"*). Her sayı bir KAPI: basınca
 * aşağıdaki liste o işarete süzülür (`?mark=`, replace) ve görünen sayı
 * buradakine EŞİT olur — sayılar ÖRTÜŞEN (`markCounts`), Outlook'un kendi
 * süzgeci gibi.
 *
 * ⚠️ **"SORAMADIK ≠ SIFIR"**: bir işaret okunamadıysa ("missing") sayı "—"
 * (ya da elde olan sayı + kehribar "Tamamı okunamadı"); sunucu sayfayı dolu
 * döndürdüyse ("capped") "25+" ve "Daha fazlası olabilir" — o hâlde "en
 * eskisi …" DENMEZ, çünkü bilmiyoruz.
 * ⚠️ Kimlik `foryou-tile-<id>` DEĞİŞMEDİ: süzgeç çipinin ✕'i odağı oraya veriyor.
 */
export function ForYouStats({ state, items, counts, mark, now, listRendered, onToggle }) {
  const { t, locale } = useLocale()
  const num = getNumberFormat(locale)
  const ready = state.status === STATUS.ready
  const missing = state.missing ?? []
  const capped = state.capped ?? {}
  const oldest = oldestFlagged(items)
  const highUnread = items.filter((m) => m.importance === "high" && !m.isRead).length
  const newestPinned = items.find((m) => m.pinned)

  function captionFor(id, n) {
    if (missing.includes(id))
      return n
        ? { text: t("feed.important.tile.incomplete"), warn: true }
        : { text: t("feed.important.tile.unavailable") }
    if (id === "pinned" && state.pinnedPartial)
      return { text: t("feed.important.tile.partial"), warn: true }
    if (capped[id]) return { text: t("feed.important.tile.more") }
    if (!n) return { text: t(`feed.important.tile.hint.${id}`) }
    if (id === "pinned") return { text: newestPinned?.subject || t("feed.noSubject") }
    if (id === "flagged") {
      const ago = oldest ? formatAgo(oldest.received, locale) : ""
      return {
        text: n === 1 ? ago : t("feed.important.tile.oldest", { ago }),
        warn: Boolean(oldest && isStale(oldest, now)),
      }
    }
    return highUnread
      ? {
          text: t(pluralKey("feed.important.tile.highUnread", locale, highUnread), {
            n: num.format(highUnread),
          }),
        }
      : { text: t("feed.important.tile.highAllRead") }
  }

  return LANES.map((lane) => {
    const id = lane.id
    const n = counts[id] ?? 0
    const label = t(`feed.important.${id}`)
    if (!ready) {
      return (
        <TrayStat
          key={id}
          icon={LANE_ICON[id]}
          label={label}
          value="—"
          unknown
          caption={t("feed.important.tile.unavailable")}
        />
      )
    }
    const unknown = missing.includes(id) && !n
    const value = unknown
      ? "—"
      : capped[id]
        ? t("myfiles.count.atLeast", { n: num.format(n) })
        : num.format(n)
    const caption = captionFor(id, n)
    return (
      <TrayStat
        key={id}
        id={`foryou-tile-${id}`}
        onClick={() => onToggle(id)}
        pressed={mark === id}
        controls={listRendered ? "foryou-list" : undefined}
        ariaLabel={t("feed.important.tile.door", { label, value, caption: caption.text })}
        icon={LANE_ICON[id]}
        tone={n ? lane.tone : undefined}
        label={label}
        value={value}
        unknown={unknown}
        caption={caption.text}
        warn={caption.warn}
      />
    )
  })
}
