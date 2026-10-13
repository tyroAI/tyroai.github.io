import { Link } from "react-router-dom"
import { HugeiconsIcon } from "@hugeicons/react"
import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"

/**
 * BENTO PARÇALARI — Akışım ve To-Do'nun kart dili, Keşfet'in iki panosu için
 * tek yerde (2026-10-01: Dosyalarım ve Sana özel). Kaynak To-Do'nun karşılama
 * panosu (`TodoHero.jsx`); kurallar orada yazılı:
 *
 * - `.ms-surface` kabuk, 28px köşe, 20px dolgu, sessiz 13px başlık.
 * - Renkli kart TEK (karşılama); gerisi beyaz — hiyerarşiyi o kuruyor.
 * - Her KPI kartı bir KAPI: basınca aşağıdaki liste o görünüme geçer.
 * - "Soramadık ≠ sıfır": okunamayan sayı "—" ve tek cümle (`KpiUnavailable`).
 *
 * ⚠️ To-Do ve Akışım BU MODÜLE TAŞINMADI: ikisi kendi kopyalarını taşıyor ve
 * taşımak piksel karşılaştırması isteyen ayrı bir iş.
 * ⚠️ Kart başlığı bir DÜĞMENİN içindeyse `as="span"`: `<button>` içinde `h3`
 * geçersiz HTML (ekran okuyucu başlık listesinde düğmenin yarısını okur).
 * ⚠️ Yalnız bileşen ihraç eder (React Refresh); mürekkep sabiti
 * `lib/gradientInk.js` › `HERO_INK`.
 */

export function BentoCard({ as: Tag = "section", children, className, ...rest }) {
  return (
    <Tag
      {...rest}
      className={cn("ms-surface relative flex min-w-0 flex-col rounded-[1.75rem] p-5", className)}
    >
      {children}
    </Tag>
  )
}

export function BentoTitle({ as: Tag = "h3", children, icon, action, className }) {
  return (
    <div className={cn("flex min-h-7 items-center justify-between gap-2", className)}>
      <Tag className="flex min-w-0 items-center text-[0.8125rem] font-medium text-muted-foreground">
        {children}
      </Tag>
      {action ??
        (icon && (
          <HugeiconsIcon
            icon={icon}
            className="size-4 shrink-0 text-muted-foreground/50"
            strokeWidth={1.8}
          />
        ))}
    </div>
  )
}

const KPI =
  "ms-surface group/kpi relative flex min-w-0 flex-col rounded-[1.75rem] p-5 text-left outline-none transition hover:shadow-md motion-safe:hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-brand/40"

/**
 * Kartın tamamı bir düğme (içinde başka etkileşimli öğe YOK). `aria-pressed`
 * verilirse seçili kart halkayla işaretlenir (süzgeç kapısı).
 */
export function KpiButton({ onClick, label, className, children, ...rest }) {
  return (
    <button
      type="button"
      {...rest}
      onClick={onClick}
      aria-label={label}
      className={cn(
        KPI,
        "aria-pressed:bg-[color-mix(in_oklab,var(--card),var(--brand-text)_5%)] aria-pressed:ring-2 aria-pressed:ring-brand/45",
        className,
      )}
    >
      {children}
    </button>
  )
}

/** Kartın tamamı bir bağlantı (uygulama içi gezinme — geçmişe YAZILIR). */
export function KpiLink({ to, onClick, label, className, children, ...rest }) {
  return (
    <Link {...rest} to={to} onClick={onClick} aria-label={label} className={cn(KPI, className)}>
      {children}
    </Link>
  )
}

/**
 * Kartın sağ üstündeki tek ok — Anasayfa'nın "Bugünün odağı" kartının oku
 * (`FocusCard` › `todoArrow`). Kartın gövdesi başka bir iş yapıyorsa
 * (satırlar, düğmeler) "hepsini aç" bu oktur.
 */
export function CardArrow({ to, label, onClick, className }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "-mr-1.5 grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/40 [@media(pointer:coarse)]:size-11",
        className,
      )}
    >
      <HugeiconsIcon icon={ArrowUpRight01Icon} className="size-4" strokeWidth={2} />
    </Link>
  )
}

export function Skel({ className }) {
  return <span aria-hidden="true" className={cn("ms-skeleton block rounded-full", className)} />
}

/**
 * Bir METİN SATIRININ iskeleti: kutusu gerçek satırla aynı yükseklikte, çünkü
 * içinde aynı yazı sınıfıyla görünmez bir boşluk duruyor (`text` gerçek
 * satırın sınıfı). Çıplak `h-3` çubuk satırdan 4-5px kısa kalıyor ve içerik
 * gelince kart o kadar uzuyordu (To-Do'nun ölçülmüş dersi).
 */
export function SkelLine({ text = "text-[0.75rem] leading-snug", width = "w-24", className }) {
  return (
    <span aria-hidden="true" className={cn("relative block", text, width, className)}>
      <span className="invisible">&nbsp;</span>
      <span className="ms-skeleton absolute inset-x-0 top-1/2 block h-3 -translate-y-1/2 rounded-full" />
    </span>
  )
}

/** Sayı SORULAMADI: sahte bir "0" değil "—" ve sebebin tek cümlesi. */
export function KpiUnavailable({ label, big = "text-[2.5rem]", className }) {
  return (
    <div className={cn("mt-auto pt-6", className)}>
      {/* Boy ÖNCE: tailwind-merge sonra gelen yazı boyu sınıfıyla `leading-none`ı siliyordu. */}
      <span
        className={cn(
          big,
          "block font-medium leading-none tracking-[-0.03em] text-muted-foreground/50",
        )}
      >
        —
      </span>
      <p className="mt-2 text-[0.75rem] leading-snug text-muted-foreground">{label}</p>
    </div>
  )
}

/**
 * Bölüm kaşı — büyük harfle çizildiği için `lang` taşır ("İ" Türkçede noktalı
 * kalsın). ⚠️ Marka adı taşıyan kaşta `lang="en"` verilir: Türkçe büyük harf
 * kuralı "OneDrive"ı "ONEDRİVE" yapıyordu (ekran görüntüsüyle görüldü).
 */
export function Eyebrow({ children, className, lang }) {
  const { locale } = useLocale()
  return (
    <span
      lang={lang ?? locale}
      className={cn(
        "inline-flex items-center gap-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground",
        className,
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-brand" />
      {children}
    </span>
  )
}

/** Listenin üstündeki not: kehribar (kısmi sonuç) ya da soluk (kapsam). */
export function BentoNotice({ tone = "muted", children, className }) {
  return (
    <p
      className={cn(
        "rounded-xl px-3.5 py-2.5 text-[0.75rem] leading-snug",
        tone === "warn"
          ? "bg-amber-500/10 text-amber-800 dark:text-amber-300"
          : "bg-muted/60 text-muted-foreground",
        className,
      )}
    >
      {children}
    </p>
  )
}
