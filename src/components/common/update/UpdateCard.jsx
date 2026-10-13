import { useEffect, useRef, useState } from "react"
import { motion } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import Loading03Icon from "@hugeicons/core-free-icons/Loading03Icon"
import RefreshIcon from "@hugeicons/core-free-icons/RefreshIcon"
import { BrandOrb } from "@/components/brand/BrandOrb"
import { KindTile } from "@/components/changelog/KindBadge"
import { pick } from "@/components/changelog/entryText"
import { useLocale } from "@/hooks/useLocale"
import { usePageAccess } from "@/hooks/usePageAccess"
import { placeToastStack, registerToastAvoid } from "@/lib/toastAvoid"
import { builtLabel, freshNotes } from "./releaseNotes"
import "./UpdateCard.css"

const MAX_NOTES = 3
/** Giriş yayının oturma süresi: yığın kartın SON yerine göre ölçülsün. */
const SETTLE_MS = 450
const BUTTON =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[0.8125rem] transition disabled:cursor-default pointer-coarse:min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"

/**
 * "Yeni sürüm hazır" kartı (`UpdatePrompt` açar). Yeni sürümde ne olduğunu söyler: çalışan
 * sürümün bilmediği Yenilikler kayıtlarından ilk üçü (`version.json` ↔
 * `import.meta.env.TYRO_BUILD.seen`); kayıt yoksa genel metin. "Yenile"ye basınca kart
 * kapanmaz, düğme "Yenileniyor…" der — sayfa gidene kadar ne olduğu görünür.
 */
export function UpdateCard({ release, onApply, onLater }) {
  const { t, locale } = useLocale()
  const { canOpen } = usePageAccess()
  const [applying, setApplying] = useState(false)
  const notes = freshNotes(release?.notes, import.meta.env.TYRO_BUILD?.seen, canOpen)
  const shown = notes.slice(0, MAX_NOTES)
  const more = notes.length - shown.length
  const when = release?.builtAt ? builtLabel(release.builtAt, release.fetchedAt, locale) : ""
  const cardRef = useRef(null)

  // Kart alt-ortada; açıkken sağ alttaki bildirim yığını ona binmesin (dar ekranda ve telefonda
  // ikisi aynı yere düşer). Kaçınma alanı olur, yığın kart oturunca ve kapanınca yeniden yerleşir.
  useEffect(() => {
    const el = cardRef.current
    if (!el) return undefined
    const off = registerToastAvoid(el, "bottom")
    const settle = window.setTimeout(placeToastStack, SETTLE_MS)
    return () => {
      window.clearTimeout(settle)
      off()
      placeToastStack()
    }
  }, [])

  function apply() {
    setApplying(true)
    onApply()
  }

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 56, scale: 0.88 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 360, damping: 22, mass: 0.9 }}
      className="pointer-events-auto relative w-[min(27rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl ring-1 ring-brand/15"
    >
      {/* Üst kenarda marka kılpayı: bildirimi bir duyuruya çeviren tek çizgi. */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-via to-transparent"
      />
      <div className="flex items-stretch">
        {/* Maskot küreden geniş bir tuval çizer (56 px küre ≈ 72 px kutu): sütun 5rem. Çok
            dar telefonda sütun düşer, metne yer kalsın. */}
        <div className="relative flex w-20 shrink-0 items-center justify-center bg-gradient-to-br from-brand-soft/70 via-brand-soft/25 to-transparent max-[22.5rem]:hidden">
          <BrandOrb
            surface="dashboard"
            state="thinking"
            mascotState={applying ? "thinking" : "syncing"}
            expressive
            size={56}
          />
        </div>

        <div className="min-w-0 flex-1 p-4 sm:p-5">
          <p
            lang={locale}
            className="update-card__eyebrow text-[0.625rem] font-semibold uppercase tracking-[0.13em]"
          >
            {when ? t("update.eyebrowAt", { when }) : t("update.eyebrow")}
          </p>
          <p className="mt-1 text-[0.9375rem] font-semibold leading-tight tracking-[-0.01em]">
            {t("update.title")}
          </p>
          {shown.length > 0 ? (
            <>
              <ul aria-label={t("update.notes")} className="mt-2.5 space-y-1.5">
                {shown.map((note) => (
                  <li key={note.id} className="flex min-w-0 items-center gap-2">
                    <KindTile kind={note.kind} className="size-6" />
                    <span className="min-w-0 truncate text-[0.8125rem] font-medium leading-snug">
                      {pick(note.title, locale)}
                    </span>
                  </li>
                ))}
              </ul>
              {more > 0 && (
                <p className="mt-1.5 ps-8 text-[0.75rem] font-medium text-muted-foreground">
                  {t("update.more", { n: more })}
                </p>
              )}
              <p className="mt-2.5 text-[0.75rem] leading-relaxed text-muted-foreground">
                {t("update.safe")}
              </p>
            </>
          ) : (
            <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-muted-foreground">
              {t("update.body")}
            </p>
          )}
          {/* Eylemler metnin altında ve sona hizalı (snackbar kuralı). */}
          <div className="mt-3.5 flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={onLater}
              disabled={applying}
              className={`${BUTTON} font-medium text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground disabled:opacity-50`}
            >
              {t("update.later")}
            </button>
            <button
              type="button"
              onClick={apply}
              disabled={applying}
              aria-live="polite"
              className={`${BUTTON} update-card__cta px-3.5 font-semibold shadow-sm hover:brightness-110 disabled:brightness-100`}
            >
              <HugeiconsIcon
                icon={applying ? Loading03Icon : RefreshIcon}
                strokeWidth={2}
                className={
                  applying ? "size-3.5 animate-spin motion-reduce:animate-none" : "size-3.5"
                }
                aria-hidden="true"
              />
              {t(applying ? "update.applying" : "update.action")}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
