import { useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon"
import { BottomSheet } from "@/components/common/BottomSheet"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { useLocale } from "@/hooks/useLocale"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { cn } from "@/lib/utils"
import { pluralKey } from "@/lib/intl-cache"
import {
  countText,
  day,
  money,
  moneyShort,
  moneyShortOptions,
  number,
  TABS,
  totalsList,
} from "./kinds"
import { TileDetail } from "./summary/TileDetail"
import { BalanceRing, TileFace } from "./summary/TileFace"
import { tileFacts } from "./summary/tileFacts"

const DAYS = { maximumFractionDigits: 2 }
// Hover kartı: göz gezdirirken her kutuda açılmasın, aradan geçerken hemen kapanmasın.
const OPEN_DELAY = 150
const CLOSE_DELAY = 120
// Tek yüzey: üstte isteğe bağlı başlık şeridi (dönem çubuğu), altında üç kutu.
const SURFACE = "ms-surface min-w-0 rounded-[1.25rem] p-1.5 text-card-foreground"
const GRID =
  "grid min-w-0 grid-cols-3 gap-1 rounded-2xl @[44rem]/ss:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]"
// Telefonda üç küçük kutu tek satırda (başlık + değer); genişte ikon/halka + açıklama.
const TILE =
  "flex min-w-0 items-center gap-3 rounded-2xl px-2 py-2.5 text-start @[22rem]/ss:px-2.5 @[44rem]/ss:px-3 @[44rem]/ss:py-3"
const RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"

/**
 * ÖZET — üç stat kartı (tek yüzey; üstünde `header`: dönem çubuğu — dönem ve izlediği
 * değerler tek kartta): izin bakiyesi (yıllık, dönemden bağımsız) · seçili dönemin
 * masrafları · seçili dönemin iş avansları ("Masraflar · 2025" / "· Tüm yıllar"). Tutar ve
 * sayı yalnız toplama girenler; toplam dışılar alt satırda not. Bölüm okunamadıysa ya da masraf
 * durumları okunamadıysa (toplam kuralı uygulanamaz) tutar "—", alt satır ve ayrıntı nedeni.
 * Kutular sekme DEĞİŞTİRMEZ (altta sekmeler var) ve seçili sekmeye göre boyanmaz. Değer
 * dönem değişince sayaçla döner (`AnimatedCounter`; hareketi azalt tercihinde atlar). Ayrıntı
 * (`TileDetail`): ince işaretçili geniş kapta fareyle ya da klavye odağıyla hover kartı;
 * dokunmatikte ya da dar kapta tek satırlık özet düğmesi → alttan çekmecede üçünün ayrıntısı.
 * Escape kartı/çekmeceyi kapatır, sohbet rıhtımını kapatmaz.
 */
export function SummaryTiles({ data, summary, year, accrual = null, loading, header, className }) {
  const { t, locale } = useLocale()
  const fine = useMediaQuery("(hover: hover) and (pointer: fine)")
  const [sheet, setSheet] = useState(false)
  const facts = useMemo(() => tileFacts(data, summary, year), [data, summary, year])
  const period = year ?? t("selfService.tile.allYears")
  const [leave, expense, advance] = TABS
  const balance = data?.balance
  const ex = totalsList(summary?.expense.totals)
  const av = totalsList(summary?.advance.totals)
  // Okunamayan bölümde tutar değil "—": sıfır, "hiç masrafın yok" demek olurdu. Masraf
  // durumları okunamadıysa toplam taslak ve reddedilmiş raporları da içerebilir: yine "—".
  const statusFailed = Boolean(data?.failed?.includes("expenseStatus"))
  const off = {
    expense: !data?.expenses
      ? "selfService.tile.failed"
      : statusFailed && "selfService.tile.statusFailed",
    advance: !data?.advances && "selfService.tile.failed",
  }
  const firstMoney = (list, why) =>
    why
      ? "—"
      : list.length
        ? moneyShort(list[0][1], list[0][0], locale)
        : moneyShort(0, "TRY", locale)
  // Sayaç: yalnız sayı varken; birim kalıbı ("{n} gün") sayının önü ve ardı olarak bölünür.
  const moneyCounter = (list, why) => {
    if (why) return null
    const [currency, amount] = list[0] ?? ["TRY", 0]
    return { value: amount, options: moneyShortOptions(amount, currency) }
  }
  const remain = balance?.remain ?? null
  const [daysBefore, daysAfter] = t(pluralKey("selfService.days", locale, remain ?? 0), {
    n: "\u0000",
  }).split("\u0000")
  const restMoney = (list) =>
    list
      .slice(1)
      .map(([c, a]) => money(a, c, locale))
      .join(" · ")
  const caption = (part, list, why) => {
    if (why) return t(why)
    const head =
      restMoney(list) ||
      t("selfService.tile.countPending", { n: part?.count ?? 0, pending: part?.pending ?? 0 })
    const excluded = part?.excluded.count ?? 0
    return excluded ? `${head} · ${t("selfService.tile.excluded", { n: excluded })}` : head
  }
  const hint = (part, why) =>
    why === "selfService.tile.statusFailed"
      ? t("selfService.statusFailed")
      : !why && part?.excluded.count
        ? t("selfService.tile.excludedHint")
        : undefined

  const tiles = [
    {
      tab: leave,
      title: t("selfService.tile.balance"),
      short: t("selfService.tile.balanceShort"),
      value: remain != null ? countText(t, locale, "selfService.days", remain) : "—",
      counter:
        balance?.remain != null
          ? {
              value: balance.remain,
              options: DAYS,
              prefix: daysBefore,
              suffix: daysAfter ?? "",
            }
          : null,
      caption: balance
        ? t("selfService.tile.balanceCaption", {
            claim: number(balance.claim, locale),
            used: number(balance.used, locale),
          })
        : t("selfService.tile.noBalance"),
      note: accrual
        ? t("selfService.accrual.caption", {
            date: day(accrual.date, locale, false),
            n: number(accrual.days, locale),
          })
        : null,
      art: loading ? undefined : <BalanceRing balance={balance} />,
    },
    {
      tab: expense,
      title: t("selfService.tile.expenses", { year: period }),
      short: t("selfService.tabShort.expense"),
      value: firstMoney(ex, off.expense),
      counter: moneyCounter(ex, off.expense),
      caption: caption(summary?.expense, ex, off.expense),
      hint: hint(summary?.expense, off.expense),
    },
    {
      tab: advance,
      title: t("selfService.tile.advances", { year: period }),
      short: t("selfService.tabShort.advance"),
      value: firstMoney(av, off.advance),
      counter: moneyCounter(av, off.advance),
      caption: caption(summary?.advance, av, off.advance),
      hint: hint(summary?.advance, off.advance),
    },
  ]
  // Okunamayan bölümün ayrıntısı sıfırlar değil, nedeni.
  const detail = (tile) =>
    off[tile.tab.id] ? (
      <p className="text-[0.8125rem] text-muted-foreground">{t(off[tile.tab.id])}</p>
    ) : (
      <TileDetail
        kind={tile.tab.id}
        balance={balance}
        accrual={accrual}
        facts={facts}
        period={period}
      />
    )
  const stopEscape = (e) => e.stopPropagation()

  if (loading || !data) {
    return (
      <div className={cn(SURFACE, className)}>
        {header}
        <div className={GRID}>
          {tiles.map((tile) => (
            <div key={tile.tab.id} className={TILE}>
              <TileFace {...tile} loading={loading} />
            </div>
          ))}
        </div>
      </div>
    )
  }
  return (
    <div className={cn(SURFACE, className)}>
      {header}
      {fine && (
        <div className={cn(GRID, "hidden @[44rem]/ss:grid")}>
          {tiles.map((tile) => (
            <HoverCard key={tile.tab.id} openDelay={OPEN_DELAY} closeDelay={CLOSE_DELAY}>
              <HoverCardTrigger asChild>
                <div
                  // Tıklanmaz; odak yalnız ayrıntı kartını açmak için (klavyeyle de görünsün).
                  tabIndex={0}
                  role="group"
                  aria-label={`${tile.title}: ${tile.value}`}
                  // Üzerine gelince hafif zemin: ayrıntı kartının açılacağını sezdirir.
                  className={cn(
                    TILE,
                    RING,
                    "cursor-default transition-colors hover:bg-foreground/[0.03]",
                  )}
                >
                  <TileFace {...tile} />
                </div>
              </HoverCardTrigger>
              <HoverCardContent
                // İzin kartı uzun (hak ediş kartıyla): yanda açılır, ekrana sığmak için dikeyde kayar.
                side={tile.tab.id === "leave" ? "right" : "bottom"}
                className="w-80 max-w-[calc(100vw-2rem)]"
                onEscapeKeyDown={stopEscape}
              >
                <h3 className="mb-2.5 text-[0.8125rem] font-semibold text-foreground">
                  {tile.title}
                </h3>
                {detail(tile)}
              </HoverCardContent>
            </HoverCard>
          ))}
        </div>
      )}
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setSheet(true)}
        className={cn(GRID, "w-full", RING, fine && "@[44rem]/ss:hidden")}
      >
        {tiles.map((tile) => (
          <span key={tile.tab.id} className={TILE}>
            <TileFace {...tile} />
          </span>
        ))}
        {/* Dokunulabilir olduğunu söyleyen alt satır; varsa sonraki hak ediş (yalnız çekmecede
            kalmasın), yoksa "Ayrıntıları aç". */}
        <span className="col-span-3 flex min-w-0 items-center gap-2 border-t border-border/50 px-2.5 pb-0.5 pt-1.5 text-[0.6875rem] font-medium text-foreground/65">
          <span className="min-w-0 flex-1 truncate text-start">
            {tiles[0].note ?? t("selfService.tile.detail.open")}
          </span>
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            aria-hidden="true"
            className="size-3.5 shrink-0 rtl:rotate-180"
            strokeWidth={2}
          />
        </span>
        {tiles[0].note && <span className="sr-only">{t("selfService.tile.detail.open")}</span>}
      </button>
      <BottomSheet
        open={sheet}
        onOpenChange={setSheet}
        title={t("selfService.tile.detail.title", { period })}
        onEscapeKeyDown={stopEscape}
        scrollLabel={t("selfService.tile.detail.title", { period })}
        closeOnBack
      >
        <div className="flex flex-col gap-5 pb-2">
          {tiles.map((tile) => (
            <section key={tile.tab.id} className="min-w-0">
              <h3 className="mb-2 flex items-center gap-2 text-[0.875rem] font-semibold">
                <HugeiconsIcon
                  icon={tile.tab.icon}
                  aria-hidden="true"
                  className="size-4 text-brand-ink"
                  strokeWidth={1.9}
                />
                {tile.title}
              </h3>
              {detail(tile)}
            </section>
          ))}
        </div>
      </BottomSheet>
    </div>
  )
}
