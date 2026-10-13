import { useId, useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import AiChat02Icon from "@hugeicons/core-free-icons/AiChat02Icon"
import ArrowUp02Icon from "@hugeicons/core-free-icons/ArrowUp02Icon"
import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"
import { askQuestions } from "./askQuestions"

const ROW =
  "group/q flex w-full items-start gap-2 rounded-lg px-2 py-1 text-start text-[0.75rem] leading-snug text-foreground/80 transition hover:bg-brand/[0.07] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 pointer-coarse:min-h-11 pointer-coarse:items-center"

/**
 * "TYRO'YA SOR" — sekmenin kayıtları hakkında İK asistanına soru: kısa yazı alanı + sekmeye
 * göre üç hazır soru (yalnız sayfanın cevaplamadığı; `facts` kayda bağlı soruyu seçer:
 * `askFacts`). Soru burada cevaplanmaz, sohbet rıhtımına park edilir (`onAsk`; sayfa
 * İK asistanını seçer). Serbest soruya sekmenin bağlamı ön ek olur ("Masraflarım: …"): kısa
 * soru da doğru konuya gitsin; hazır soru zaten tam cümle.
 *
 * | `variant` | yer | hazır sorular |
 * |---|---|---|
 * | `card`  | geniş kap (≥ 52rem): raporun üstü (sağ kolon) | alt alta satırlar |
 * | `sheet` | dar kap: alttan çekmece (`AskSheet`), Ekibim'in açılır kutusu | alt alta, 44 px satırlar |
 *
 * @param {(question: string, context?: string) => void} p.onAsk
 */
export function AskTyro({ tab, facts = null, onAsk, variant = "card", className }) {
  const { t } = useLocale()
  const id = useId()
  const [text, setText] = useState("")
  const questions = useMemo(() => askQuestions(tab, t, facts), [tab, t, facts])
  const submit = (e) => {
    e.preventDefault()
    const question = text.trim()
    if (!question) return
    onAsk(question, t(`selfService.askBox.context.${tab}`))
    setText("")
  }

  return (
    <section
      aria-labelledby={`${id}-title`}
      className={cn(
        variant !== "sheet" && "ms-surface rounded-2xl",
        variant === "card" && "p-2",
        className,
      )}
    >
      <h3 id={`${id}-title`} className="sr-only">
        {t("selfService.askBox.title")}
      </h3>
      <form
        onSubmit={submit}
        className="flex items-center gap-2 rounded-xl border border-border bg-background ps-3 pe-1 transition focus-within:border-brand/50 focus-within:ring-2 focus-within:ring-brand/15"
      >
        <HugeiconsIcon
          icon={AiChat02Icon}
          aria-hidden="true"
          className="size-4 shrink-0 text-brand-ink"
          strokeWidth={1.9}
        />
        <label htmlFor={`${id}-q`} className="sr-only">
          {t("selfService.askBox.label")}
        </label>
        <input
          id={`${id}-q`}
          type="text"
          dir="auto"
          enterKeyHint="send"
          autoComplete="off"
          maxLength={500}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Dolu kutuda Escape yalnız temizler; açık rıhtıma ulaşıp onu kapatmaz.
            if (e.key === "Escape" && text) {
              e.stopPropagation()
              e.preventDefault()
              setText("")
            }
          }}
          placeholder={t(`selfService.askBox.placeholder.${tab}`)}
          title={t("selfService.askBox.hint")}
          className="h-9 min-w-0 flex-1 bg-transparent text-[0.8125rem] text-foreground outline-none placeholder:text-muted-foreground pointer-coarse:h-11"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          aria-label={t("selfService.askBox.send")}
          className="relative grid size-7 shrink-0 place-items-center rounded-lg bg-brand-fill-deep text-brand-on-brand transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-40 pointer-coarse:size-9 pointer-coarse:after:absolute pointer-coarse:after:-inset-1"
        >
          <HugeiconsIcon icon={ArrowUp02Icon} className="size-4" strokeWidth={2.2} />
        </button>
      </form>
      <ul
        aria-label={t("selfService.askBox.suggestions")}
        className={variant === "sheet" ? "mt-3 space-y-1" : "mt-1.5 space-y-0.5"}
      >
        {questions.map((q) => (
          <li key={q.id}>
            <button type="button" onClick={() => onAsk(q.text)} className={ROW}>
              <HugeiconsIcon
                icon={ArrowUpRight01Icon}
                aria-hidden="true"
                className="mt-px size-3.5 shrink-0 text-brand-ink/70 transition group-hover/q:text-brand-ink pointer-coarse:mt-0"
                strokeWidth={2}
              />
              <span>{q.text}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
