import { useEffect, useRef } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import LayerAddIcon from "@hugeicons/core-free-icons/LayerAddIcon"
import Move01Icon from "@hugeicons/core-free-icons/Move01Icon"
import { useLocale } from "@/hooks/useLocale"

const BTN =
  "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[0.8125rem] font-semibold transition pointer-coarse:h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"

/**
 * Ana bölümde bir kart başka bir kartın üstüne bırakılınca sorulur: üst üste
 * koy (yığın) mı, yerine taşı mı? Yanlışlıkla yığın olmasın diye bırakmak tek
 * başına karar vermez. Açılınca odak ilk seçenekte; Esc ya da Vazgeç bırakmayı
 * iptal eder.
 */
export function DropChoice({ name, onChoose }) {
  const { t } = useLocale()
  const first = useRef(null)
  // Seçim işlevi her çizimde yeni; odak ve Esc dinleyicisi yalnız açılışta kurulur.
  const latest = useRef(onChoose)
  useEffect(() => {
    latest.current = onChoose
  })
  useEffect(() => {
    first.current?.focus({ preventScroll: true })
    const onKey = (e) => {
      if (e.key !== "Escape") return
      e.preventDefault()
      latest.current(null)
    }
    document.addEventListener("keydown", onKey, true)
    return () => document.removeEventListener("keydown", onKey, true)
  }, [])
  return (
    <div
      role="dialog"
      aria-label={t("widgets.drop.aria", { name })}
      className="absolute inset-0 z-30 grid place-items-center rounded-[1.75rem] bg-background/85 p-4 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-[0.8125rem] font-medium text-foreground/80">
          {t("widgets.drop.title", { name })}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            ref={first}
            type="button"
            onClick={() => onChoose("stack")}
            className={`${BTN} bg-brand-fill-deep text-brand-on-brand hover:brightness-110`}
          >
            <HugeiconsIcon icon={LayerAddIcon} className="size-4" strokeWidth={1.9} />
            {t("widgets.drop.stack")}
          </button>
          <button
            type="button"
            onClick={() => onChoose("move")}
            className={`${BTN} border border-border bg-background text-foreground/80 hover:bg-accent`}
          >
            <HugeiconsIcon icon={Move01Icon} className="size-4" strokeWidth={1.9} />
            {t("widgets.drop.move")}
          </button>
        </div>
        <button
          type="button"
          onClick={() => onChoose(null)}
          className="text-[0.75rem] text-muted-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
        >
          {t("widgets.drop.cancel")}
        </button>
      </div>
    </div>
  )
}
