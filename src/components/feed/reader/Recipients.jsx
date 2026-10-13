import { useState } from "react"
import { PersonPopover } from "@/components/common/PersonPopover"
import { useLocale } from "@/hooks/useLocale"

const SHOW_RECIPIENTS = 3

/**
 * "Kime: Doğukan Arslan; Ayşe Demir; +12 kişi" — Outlook'un satırı. Kalabalık
 * listede (bütün şirkete giden duyuru) ilk üç ad, gerisi tek dokunuşla açılır.
 * Gizli alıcıyla (BCC) gelen postada liste boş: satır HİÇ çizilmez.
 */
export function Recipients({ label, list }) {
  const { t } = useLocale()
  const [all, setAll] = useState(false)
  if (!list?.length) return null
  const shown = all ? list : list.slice(0, SHOW_RECIPIENTS)
  const hidden = list.length - shown.length
  return (
    <p className="mt-0.5 text-[0.75rem] leading-relaxed text-muted-foreground">
      <span className="font-medium text-foreground/70">{label}:</span>{" "}
      {/* Her ad kendi kişi kartını açar (Outlook'un "Kime" satırı gibi). */}
      {shown.map((r, i) => (
        <span key={`${r.address}-${i}`}>
          <PersonPopover person={r}>
            {(trigger) => (
              <button
                {...trigger}
                title={r.address || undefined}
                className="rounded text-muted-foreground underline-offset-2 transition hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 aria-expanded:text-foreground"
              >
                {r.name}
              </button>
            )}
          </PersonPopover>
          {i < shown.length - 1 ? "; " : ""}
        </span>
      ))}
      {(hidden > 0 || all) && list.length > SHOW_RECIPIENTS && (
        <>
          {" "}
          <button
            type="button"
            onClick={() => setAll((v) => !v)}
            aria-expanded={all}
            className="rounded px-0.5 font-medium text-brand-ink underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            {all ? t("feed.mail.less") : t("feed.mail.more", { n: hidden })}
          </button>
        </>
      )}
    </p>
  )
}
