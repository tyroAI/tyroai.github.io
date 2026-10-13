import { useId, useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import ArrowUp02Icon from "@hugeicons/core-free-icons/ArrowUp02Icon"
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon"
import RefreshIcon from "@hugeicons/core-free-icons/RefreshIcon"
import { useLocale } from "@/hooks/useLocale"
import { getDateTimeFormat } from "@/lib/intl-cache"
import { cn } from "@/lib/utils"
import { ChecklistOrb } from "./ChecklistOrb"

const PLURAL = new Set(["zero", "one", "two", "few", "many", "other"])
const OPTS_KICKER = { weekday: "long", day: "numeric", month: "long" }
/** Başlık boyu: iskelet de aynı sınıfı okur (içerik gelince kart zıplamasın). */
const TITLE = "text-[1.25rem] @[40rem]/todo:text-[1.625rem] shortest:text-[1.25rem]"
/**
 * Yerleşim kabın genişliğine göre (`@container/todo`: sayfa ya da widget hücresi):
 * - < 34rem: maskot | metin; telefonda hap yok, panonun dar hücresinde hap alt satırın yerinde.
 * - 34–64rem: maskot | metin | hap tek sırada — widget hücresinin 15rem'lik satırına sığar.
 * - ≥ 64rem: maskot | metin, altında hap (kartın sol yarısı; hap tepsinin alt kenarıyla hizalı).
 */
/**
 * Yazının altındaki örtü — karşılama bloğunun arkasında, her düzende yazıyı izler: beyaz
 * mürekkepte paletin derin tonu, koyu mürekkepte beyaz; bulanık. Örtüsüz Insta'da tarih ve
 * alt satır 3,4–4:1'de kalıyordu (piksel ölçümü); örtüyle 17 palette en kötü nokta ≥ 4,5:1.
 */
const SHADE =
  "relative before:pointer-events-none before:absolute before:-inset-4 before:-z-10 before:rounded-[2rem] before:blur-[28px] group-data-[ink=light]/herocard:before:bg-[color-mix(in_oklch,var(--brand-from),black_45%)] group-data-[ink=light]/herocard:before:opacity-50 group-data-[ink=dark]/herocard:before:bg-white group-data-[ink=dark]/herocard:before:opacity-30"
const GRID =
  "grid min-w-0 grid-cols-[calc(var(--orb)*0.8)_minmax(0,1fr)] gap-x-3 [--orb:6.25rem] @[34rem]/todo:grid-cols-[calc(var(--orb)*0.8)_minmax(0,1fr)_minmax(0,1.1fr)] @[34rem]/todo:gap-x-4 @[34rem]/todo:[--orb:6rem] @[64rem]/todo:grid-cols-[calc(var(--orb)*0.8)_minmax(0,1fr)] @[64rem]/todo:grid-rows-[minmax(0,1fr)_auto] @[64rem]/todo:[--orb:7.5rem] shortest:grid-cols-[calc(var(--orb)*0.8)_minmax(0,1fr)] shortest:[--orb:4.5rem] @[34rem]/myspace:@max-[34rem]/todo:[--orb:5rem]"
/**
 * Alt satır. Panonun DAR hücresinde (pano çok sütunlu, kart < 34rem — Anasayfa'nın geniş
 * hücresi 1440'ta ~24rem) yerini ekleme hapı alır: 15rem'lik satıra ikisi birden sığmıyor,
 * hap masaüstünde kalsın. Telefonda pano tek sütun: kural işlemez, hap yine yok.
 */
const SUB =
  "mt-1.5 line-clamp-2 text-pretty text-[0.8125rem] leading-snug @[34rem]/myspace:@max-[34rem]/todo:hidden"
const ACTION =
  "hidden min-w-0 self-center empty:hidden @[34rem]/todo:col-start-3 @[34rem]/todo:row-start-1 @[34rem]/todo:block @[64rem]/todo:col-[1/span_2] @[64rem]/todo:row-start-2 @[64rem]/todo:mt-3 @[34rem]/myspace:@max-[34rem]/todo:col-span-2 @[34rem]/myspace:@max-[34rem]/todo:mt-3 @[34rem]/myspace:@max-[34rem]/todo:block shortest:hidden"
/** Ekleme hapı, çare düğmesi ve iskeleti AYNI boyda: kart durum değiştirince boy değiştirmez. */
const PILL = "h-11 rounded-2xl ring-1 [@media(pointer:coarse)]:h-[3.25rem]"
/** Hapın beyaz düğmesi (gönder · bağlan · tekrar dene). */
const PILL_BUTTON =
  "grid size-9 shrink-0 place-items-center rounded-xl bg-white text-brand-fill-deep shadow-sm [@media(pointer:coarse)]:size-11"

/**
 * Kartın karşılama yarısı: panolu maskot, günün cümlesi ve bugüne tek satırlık ekleme.
 * Maskot solda; defteri ALTINDAKİ öğenin (hap, tepsi ya da çubuk) üst kenarına oturur (`-mb`:
 * aradaki 0,75rem + kutunun saydam alt %3'ü). Sütun kürenin %80'i: kutunun iki yanı saydam,
 * taşan pay karta ve boşluğa biner. Küre `pointer-events-none`: tıklamayı yutmaz.
 *
 * ⚠️ **TELEFONDA HAP YOK** (kap < 34rem ve yatay telefon): kart yalnız durumu söyler. Ekleme
 * listenin kendi alanında (`TodoAddBar`), izin/hata çaresi listenin durum kartında — ikisi de
 * hemen altta. Yuva bütünüyle gizli: yükleme, sonuç ve hata arasında kart boy değiştirmez.
 * Başlıkta gölge yok: axe gölgeli yazıyı gradyanı görmeden beyaz zemine karşı ölçüyordu
 * (1,1:1, sahte ret). Okunurluğu ölçülen mürekkep taşır (`lib/gradientInk.js`).
 *
 * ⚠️ **EKLEME BUGÜNE, ANASAYFA'NIN KARTIYLA AYNI KURAL**: varsayılan listeye bugünün
 * tarihiyle, yani eklenen iş Anasayfa'nın "Bugünün odağı"nda da görünür. Tarih, liste ve
 * yıldızlı ekleme aşağıdaki listenin kendi alanında.
 */
export function TodoGreeting({ board, summary, celebrate, busy, onQuickAdd }) {
  const { t, locale } = useLocale()
  const [draft, setDraft] = useState("")
  // Kimlik örneğe özel: kart hem sayfada hem widget'ta (katalog önizlemesi dahil) çizilir.
  const inputId = useId()
  const plural = useMemo(() => new Intl.PluralRules(locale), [locale])
  const kicker = getDateTimeFormat(locale, OPTS_KICKER).format(new Date())
  const status = board.status
  const ready = status === "ready"
  const open = summary.focusOpen.length
  const overdue = summary.overdue.length
  const pct = summary.focusTotal ? summary.focusDone / summary.focusTotal : 0
  // Panonun üç satırı bugünün ilerlemesi: süs değil, halkadaki oranın elle tutulur hâli.
  const checked = summary.focusTotal ? Math.round(pct * 3) : 0

  let headline = null
  let sub = null
  if (ready) {
    if (open) {
      const cat = plural.select(open)
      headline = t(`todo.hero.open.${PLURAL.has(cat) ? cat : "other"}`, { n: open })
      const parts = []
      if (overdue) parts.push(t("todo.hero.overdue", { n: overdue }))
      if (summary.focusDone) parts.push(t("todo.hero.doneSoFar", { n: summary.focusDone }))
      sub = parts.join(" · ") || t("todo.hero.goodLuck")
    } else if (summary.focusTotal) {
      headline = t("todo.hero.allDone")
      sub = t("todo.hero.allDoneSub", { n: summary.focusDone })
    } else {
      headline = t("todo.hero.empty")
      sub = t("todo.hero.emptySub")
    }
  }

  function submit(e) {
    e.preventDefault()
    if (onQuickAdd(draft)) setDraft("")
  }

  return (
    <div className={cn(GRID, SHADE)}>
      <div className="relative col-start-1 row-start-1 flex items-end justify-center">
        {/* Kürenin arkasındaki ışık: küre paletin renklerinden, ışıksız aynı tonda kaybolurdu. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[42%] -z-10 size-[calc(var(--orb)*1.1)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.42),transparent)]"
        />
        <div className="pointer-events-none relative z-10 -mb-[calc(0.75rem_+_var(--orb)_*_0.03)] w-[var(--orb)] shrink-0 @[40rem]/todo:shortest:mb-0">
          <ChecklistOrb checked={checked} celebrate={celebrate} busy={busy} />
        </div>
      </div>

      <div className="col-start-2 row-start-1 min-w-0 self-center">
        <p className="text-[0.75rem] font-medium [&::first-letter]:uppercase" lang={locale}>
          {kicker}
        </p>
        {ready ? (
          <>
            <p
              className={cn(
                TITLE,
                "mt-1 text-balance font-semibold leading-[1.12] tracking-[-0.025em]",
              )}
            >
              {headline}
            </p>
            <p className={SUB}>{sub}</p>
          </>
        ) : status === "loading" ? (
          <div className="mt-1" aria-hidden="true">
            <span className={cn(TITLE, "block h-[1.12em] w-4/5 rounded-xl bg-white/25")} />
            <span className={cn(SUB, "relative block w-1/2")}>
              <span className="invisible">&nbsp;</span>
              <span className="absolute inset-x-0 top-1/2 block h-3 -translate-y-1/2 rounded-full bg-white/20" />
            </span>
          </div>
        ) : (
          <>
            <p className="mt-1 text-[1.25rem] font-semibold leading-tight tracking-[-0.02em]">
              {status === "error"
                ? t("todo.error")
                : status === "denied"
                  ? t("todo.denied")
                  : t("todo.signedOut")}
            </p>
            {/* Sebep ve çare kartın içinde: düğme listede kalsa katlamanın altına düşerdi. */}
            <p className={SUB}>
              {status === "denied"
                ? t("todo.deniedBody")
                : status === "error"
                  ? board.detail
                    ? t("todo.detailLine", { detail: board.detail })
                    : null
                  : t("todo.signedOutBody")}
            </p>
          </>
        )}
      </div>

      <div className={ACTION}>
        {/* Yüklenirken hapın YERİ tutulur: yoksa kart içerik gelince büyüyüp listeyi iterdi. */}
        {status === "loading" && (
          <div
            aria-hidden="true"
            className={cn(
              PILL,
              "bg-white/[0.14] ring-white/25 group-data-[ink=dark]/herocard:bg-white/40",
            )}
          />
        )}

        {/* İzin yok · ulaşılamıyor: hapın YERİNDE tek çare. Oturum yoksa düğme de yok. */}
        {(status === "denied" || status === "error") && (
          <button
            type="button"
            onClick={status === "denied" ? board.connect : () => board.refresh()}
            aria-busy={board.refreshing || undefined}
            className={cn(
              PILL,
              "flex w-full items-center justify-between gap-2 bg-[color-mix(in_oklch,color-mix(in_oklch,var(--brand-from),black_40%),transparent_55%)] py-1 pl-4 pr-1 text-left ring-white/30 backdrop-blur-sm outline-none transition hover:bg-[color-mix(in_oklch,color-mix(in_oklch,var(--brand-from),black_40%),transparent_40%)] focus-visible:ring-2 focus-visible:ring-white/70 group-data-[ink=dark]/herocard:bg-white/45 group-data-[ink=dark]/herocard:hover:bg-white/55",
            )}
          >
            <span className="min-w-0 truncate text-[0.875rem] font-medium">
              {status === "denied" ? t("todo.connect") : t("todo.retry")}
            </span>
            <span className={PILL_BUTTON}>
              <HugeiconsIcon
                icon={status === "denied" ? ArrowRight01Icon : RefreshIcon}
                className={cn("size-[1.125rem]", board.refreshing && "animate-spin")}
                strokeWidth={2.2}
              />
            </span>
          </button>
        )}

        {ready && (
          <form onSubmit={submit}>
            <label htmlFor={inputId} className="sr-only">
              {t("todo.hero.addLabel")}
            </label>
            <div
              className={cn(
                PILL,
                "flex items-center gap-2 bg-[color-mix(in_oklch,color-mix(in_oklch,var(--brand-from),black_40%),transparent_55%)] py-1 pl-4 pr-1 ring-white/30 backdrop-blur-sm transition focus-within:bg-[color-mix(in_oklch,color-mix(in_oklch,var(--brand-from),black_40%),transparent_40%)] focus-within:ring-white/60 group-data-[ink=dark]/herocard:bg-white/45 group-data-[ink=dark]/herocard:ring-white/60 group-data-[ink=dark]/herocard:focus-within:bg-white/60",
              )}
            >
              <input
                id={inputId}
                value={draft}
                maxLength={255}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t("todo.hero.addPlaceholder")}
                aria-describedby={`${inputId}-hint`}
                className="no-ios-zoom min-w-0 flex-1 bg-transparent py-1.5 text-[0.875rem] outline-none placeholder:text-[color:color-mix(in_srgb,var(--hero-ink)_78%,transparent)]"
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                aria-label={t("todo.hero.addLabel")}
                className={cn(PILL_BUTTON, "transition hover:brightness-95 disabled:opacity-50")}
              >
                <HugeiconsIcon icon={ArrowUp02Icon} className="size-[1.125rem]" strokeWidth={2.2} />
              </button>
            </div>
            {/* İpucu kartta çizilmez (küçük satır gradyanın açık ucunda okunmuyordu): bilgi
                ekleme anında bildirimle gelir, ekran okuyucu onu alanın açıklaması olarak duyar. */}
            <span id={`${inputId}-hint`} className="sr-only">
              {t("todo.hero.addHint")}
            </span>
          </form>
        )}
      </div>
    </div>
  )
}
