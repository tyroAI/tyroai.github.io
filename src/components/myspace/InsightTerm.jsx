import { InsightTip } from "@/components/myspace/InsightTip"
import { TONE } from "@/components/myspace/summaryTone"
import { cn } from "@/lib/utils"

/**
 * ⚠️ TERİM BİR `<button>` DEĞİL, SATIR İÇİNDE AKAN `span[role=button]`.
 * Düğme `display: inline` alsa bile satır içi BLOK gibi davranır
 * ve satırlara bölünemez: balon dar karta (sağ ızgaranın ilk satırı) geçince
 * "8 непрочитанных писем" kendi bloğuna sarıp ORTALANIYOR, ardındaki nokta
 * yeni satırın başına düşüyordu (ölçüldü, RU 1440 px). Span cümleyle birlikte
 * akar; düğmenin klavye sözleşmesi elle: Enter ve Boşluk tıklar. Tıklama bir
 * mikro görevde — Radix'in birleştirdiği `onKeyDown` (işaretçi türünü
 * sıfırlayan) önce koşsun, sıra düğmedeki gibi keydown → click olsun.
 */
export function InsightTerm({
  tone = "via",
  title,
  kicker,
  rows,
  limit,
  list,
  more,
  note,
  action,
  children,
}) {
  return (
    <InsightTip
      title={title}
      kicker={kicker}
      rows={rows}
      limit={limit}
      list={list}
      more={more}
      note={note}
      action={action}
    >
      <span
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return
          e.preventDefault()
          const el = e.currentTarget
          queueMicrotask(() => el.click())
        }}
        className={cn(
          "cursor-pointer rounded-[0.35em] px-[0.1em] font-semibold underline decoration-current/40 decoration-dotted decoration-2 underline-offset-[0.24em] outline-none transition-colors [box-decoration-break:clone]",
          "hover:bg-brand/[0.08] focus-visible:ring-2 focus-visible:ring-brand/30 data-[state=open]:bg-brand/[0.1]",
          TONE[tone],
        )}
      >
        {children}
      </span>
    </InsightTip>
  )
}
