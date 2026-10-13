import { HugeiconsIcon } from "@hugeicons/react"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"

/**
 * "Profilim" sayfasının kartlarının PAYLAŞTIĞI kabuk parçaları.
 * tyroTrade'in `components/profile/primitives.jsx` dosyasından port
 * (2026-09-08); iki uygulamanın profil sayfası aynı imzayı taşısın.
 *
 * Ayrı bir dosyada, çünkü kartlar ayrı dosyalarda: kart kenarı, ikon
 * karesi, kaş başlık ve rozet iki yerde de aynı olmak zorunda. Elle
 * tekrarlanan bir `rounded-2xl border` bir gün birinde kalırdı.
 *
 * ── RENK SÖZLÜĞÜ: TYRO'DA TOKEN YOK, UTILITY VAR ───────────────────────
 *
 * tyroTrade'in aynı dosyası `bg-success/10 text-success` yazıyor, çünkü
 * orada `--success` / `--warning` token çifti tanımlı. tyroAI'de o token
 * yok ve bu bilinçli: CLAUDE.md "anlamsal durum renkleri palet sisteminin
 * DIŞINDA" diyor ve uygulamanın geri kalanı (DataTable rozetleri,
 * GeneralTab'in bildirim noktası) doğrudan `emerald` / `amber` yazıyor.
 * Burada da öyle yazılıyor — iki temada da okunur varyantlarıyla. Marka
 * tonu ise token: `bg-brand-soft` üstündeki mürekkep `--brand-on-soft`,
 * çünkü `brand-deep` yalnızca AÇIK temanın mürekkebi (bkz. index.css).
 */

export function ProfileCard({ className, children }) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card", className)}>
      {children}
    </section>
  )
}

/** Kartın başlığı: ikon karesi + ad + altyazı, sağda isteğe bağlı eylem. */
export function CardHead({ icon, title, subtitle, action }) {
  return (
    <div className="flex flex-wrap items-start gap-3 border-b border-border/60 px-5 py-4 sm:gap-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft/60 text-brand-on-soft">
        <HugeiconsIcon icon={icon} className="size-[1.125rem]" strokeWidth={1.7} />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-[0.9375rem] font-semibold leading-tight tracking-tight">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

/**
 * Kaş başlık. `lang` ŞART: CSS `text-transform` Türkçe'de "Katalog
 * Yönetimi" → "KATALOG YÖNETIMI" yazar (noktasız İ), o yüzden uppercase
 * taşıyan her eleman dilini söylemek zorunda.
 */
export function Eyebrow({ children, className }) {
  const { locale } = useLocale()
  return (
    <p
      lang={locale}
      className={cn(
        "text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70",
        className,
      )}
    >
      {children}
    </p>
  )
}

/** Kart içinde bir bölüm: kaş başlık + içerik, üstünde ince ayırıcı. */
export function Block({ label, hint, children, className }) {
  return (
    <div className={cn("space-y-3 px-5 py-4", className)}>
      {label ? (
        <div className="space-y-1">
          <Eyebrow>{label}</Eyebrow>
          {hint ? (
            <p className="text-[0.6875rem] leading-relaxed text-muted-foreground/70">{hint}</p>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  )
}

const PILL_TONE = {
  success: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
  warn: "bg-amber-500/15 text-amber-800 dark:bg-amber-400/10 dark:text-amber-300",
  brand: "bg-brand-soft/60 text-brand-on-soft",
  muted: "border border-border bg-muted/40 text-muted-foreground",
}

/**
 * Seçilebilir kutu — tema, palet, dil ve ORB GÖRÜNÜMÜ aynı imzayı kullanıyor.
 *
 * PreferencesCard'ın içinde yerel bir kopyaydı; Orb oluşturucu da aynı kutuyu
 * isteyince buraya alındı. İki kopya bırakmak, birinin erişilebilirlik
 * düzeltmesini alıp ötekinin almaması demekti.
 *
 * ⚠️ Seçili mürekkep `text-brand-on-soft` — tyroTrade aynı yerde
 * `text-foreground` kullanıyor. İkisi AYNI ölçülmüş sorunun (marka zemininde
 * kontrast paletten palete düşüyor) iki çözümü; bu depoda o iş için ayrılmış
 * bir token var, o yüzden burada o kalıyor.
 */
export function Choice({ selected, onClick, children, className, ariaLabel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={ariaLabel}
      className={cn(
        "group flex min-h-11 items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-[0.8125rem] transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
        selected
          ? "border-brand/50 bg-brand-soft/40 font-medium text-brand-on-soft shadow-sm"
          : "border-border bg-card text-foreground/80 hover:border-brand/30 hover:bg-foreground/[0.03]",
        className,
      )}
    >
      {children}
    </button>
  )
}

/** Rozet: durum söyler, tıklanmaz. */
export function Pill({ tone = "muted", icon, children, className, title }) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-medium leading-none",
        PILL_TONE[tone] ?? PILL_TONE.muted,
        className,
      )}
    >
      {icon ? <HugeiconsIcon icon={icon} className="size-3.5 shrink-0" strokeWidth={2} /> : null}
      {children}
    </span>
  )
}

/** Ham değerler (UPN, agent schema name) için mono etiket. */
export function CodeChip({ children, className, title }) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex max-w-full items-center rounded-md border border-border/70 bg-muted/40 px-2 py-1 font-mono text-[0.71875rem] leading-none break-all",
        className,
      )}
    >
      {children}
    </span>
  )
}
