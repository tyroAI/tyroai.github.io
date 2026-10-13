import { useRef, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { HugeiconsIcon } from "@hugeicons/react"
import ChartColumnIcon from "@hugeicons/core-free-icons/ChartColumnIcon"
import ChartLineData01Icon from "@hugeicons/core-free-icons/ChartLineData01Icon"
import Download01Icon from "@hugeicons/core-free-icons/Download01Icon"
import PieChartIcon from "@hugeicons/core-free-icons/PieChartIcon"
import { useLocale } from "@/hooks/useLocale"
import { chartFilename, downloadChartPng } from "@/lib/chartExport"
import { notify } from "@/lib/notify"
import { cn } from "@/lib/utils"
import { SERIES_TOKENS, useCompact } from "./chartTokens"

/**
 * The table the agent just sent, drawn.
 *
 * Nothing is generated to produce this: the figures arrive as a markdown table
 * and `markdownTable.js` reads them, so the chart is a local render of data
 * that is already on the client. That is why it is instant, why it follows the
 * palette and dark mode like everything else here, and why it needs no server,
 * no Python and nothing installed on the agent — which matters, because the
 * TYRO Trader agent is on the old Copilot Studio layout and can't take skills.
 *
 * Colours come from `--chart-*`, the same tokens the E.M Overview charts use,
 * so a reply and the dashboards it describes never disagree about what blue
 * means. Negative values get the loss colour instead: on a P&L breakdown the
 * sign IS the point.
 */

function ChartTooltip({ active, payload, label, format }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-popover px-2.5 py-1.5 shadow-lg">
      <p className="mb-1 text-[0.6875rem] font-semibold text-foreground">{label}</p>
      {payload.map((entry) => (
        <p
          key={entry.name}
          className="flex items-center gap-1.5 text-[0.6875rem] text-muted-foreground"
        >
          <span
            aria-hidden="true"
            className="size-2 shrink-0 rounded-[0.125rem]"
            style={{ background: entry.color }}
          />
          <span>{entry.name}</span>
          <span className="ml-auto font-medium tabular-nums text-foreground">
            {format(entry.value)}
          </span>
        </p>
      ))}
    </div>
  )
}

/**
 * The key, as a plain block under the chart.
 *
 * Recharts positions its own legend absolutely inside the plot box, so the
 * moment it needs more room than was budgeted it spills over whatever comes
 * next — on a six-category donut it landed on top of the footnote. In normal
 * flow it simply pushes the note down, wraps when it runs out of width, and
 * cannot overlap anything by construction.
 */
function ChartLegend({ items }) {
  if (!items || items.length < 2) return null
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
      {items.map((item) => (
        <span
          key={item.label}
          className="inline-flex min-w-0 items-center gap-1.5 text-[0.6875rem] text-muted-foreground"
        >
          <span
            aria-hidden="true"
            className="size-2.5 shrink-0 rounded-[0.1875rem]"
            style={{ background: item.color }}
          />
          <span className="max-w-[13rem] truncate" title={item.label}>
            {item.label}
          </span>
        </span>
      ))}
    </div>
  )
}

/**
 * A category tick that wraps instead of tilting.
 *
 * Rotated ticks were the first answer and they cost more than they bought: the
 * leftmost one hung off the edge of the card, they are slower to read, and
 * they still needed truncating. Two lines on word boundaries fit far more text
 * in the same strip, stay horizontal, and cannot overhang.
 *
 * Ellipsis is the last resort and it cuts the MIDDLE, keeping both ends —
 * with labels that share a beginning, cutting the tail is what turned three
 * different rows into three identical "Gerçekleşen…".
 */
function wrapLabel(text, perLine, maxLines = 2) {
  const words = String(text).split(/\s+/).filter(Boolean)
  const lines = []
  let current = ""
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length <= perLine || !current) {
      current = candidate
    } else {
      lines.push(current)
      current = word
      if (lines.length === maxLines) break
    }
  }
  if (lines.length < maxLines && current) lines.push(current)

  const budget = perLine + 2
  return lines.slice(0, maxLines).map((line) => {
    if (line.length <= budget) return line
    const head = Math.ceil((budget - 1) / 2)
    return `${line.slice(0, head)}…${line.slice(line.length - (budget - 1 - head))}`
  })
}

function CategoryTick({ x, y, payload, perLine, anchor = "middle" }) {
  const lines = wrapLabel(payload?.value ?? "", perLine)
  return (
    <text x={x} y={y} textAnchor={anchor} fill="currentColor" fontSize={11} opacity={0.75}>
      {lines.map((line, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 12 : 13}>
          {line}
        </tspan>
      ))}
    </text>
  )
}

const TYPES = [
  { id: "bar", icon: ChartColumnIcon, labelKey: "chat.chart.bar" },
  { id: "line", icon: ChartLineData01Icon, labelKey: "chat.chart.line" },
  { id: "pie", icon: PieChartIcon, labelKey: "chat.chart.pie" },
]

/**
 * `hero`: kartın başlığıyla çizimi arasına giren blok (InsightCard'ın manşeti).
 * `referenceY`: yatay referans çizgisi (Zirve kartında dönem ortalaması).
 * `highlightIndex`: tek serili çubukta vurgulanan satır (zirve) — ikinci
 * grafik rengiyle; kırmızı DEĞİL, çünkü zirve bir yargı değil.
 */
/**
 * `snapshot`: içgörü kartının GÖRSEL DİLİ — ızgara yok, değer ekseni yok,
 * efsane ve dipnot yok, çizgiler kalın ve yalnız SON noktada işaretli,
 * başlangıç değerinde kesikli bir taban çizgisi. Referans tasarımın
 * "trend snapshot" paneli: rakamlar kartın manşetinde ve balonda, grafik
 * biçimi anlatır. Sohbetteki düz "Grafik" kartı eskisi gibi kalır.
 */
export function MessageChart({
  analysis,
  hero = null,
  referenceY = null,
  highlightIndex = null,
  snapshot = false,
  defaultType = null,
}) {
  const { t } = useLocale()
  // `defaultType`: yalnız Pay kartı geçer. Orada manşetin altındaki bölmeli
  // çubuk zaten payı gösteriyor; açılışta ikinci bir ÇUBUK grafiği aynı şeyi
  // iki kez söylerdi, pasta ise aynı payı başka bir okumayla verir.
  const [type, setType] = useState(
    defaultType && (defaultType !== "pie" || analysis.canPie) ? defaultType : analysis.defaultType,
  )
  const holderRef = useRef(null)
  const [saving, setSaving] = useState(false)
  const fmt = useCompact(analysis.unit)
  const { data, series, unit, horizontal, excludedRows, excludedSeries } = analysis
  const longestLabel = Math.max(...data.map((d) => d.label.length))

  const available = TYPES.filter((x) => x.id !== "pie" || analysis.canPie)
  const hasNegative = data.some((d) => series.some((s) => (d[s.key] ?? 0) < 0))

  async function handleDownload() {
    // The biggest <svg> in the subtree is the plot. Neither "first svg" nor
    // ".recharts-surface" works: recharts draws every legend key as its own
    // inline svg, gives those the same surface class, and puts them first in
    // document order — both earlier attempts exported a giant legend dot.
    // Area is the one property the plot is guaranteed to win on.
    const svg = [...(holderRef.current?.querySelectorAll("svg") ?? [])].reduce((best, node) => {
      const box = node.getBoundingClientRect()
      return !best || box.width * box.height > best.area
        ? { node, area: box.width * box.height }
        : best
    }, null)?.node
    if (!svg || saving) return
    setSaving(true)
    try {
      await downloadChartPng(svg, {
        filename: chartFilename(analysis.labelHeader, unit),
        title: [analysis.labelHeader, unit].filter(Boolean).join(" · "),
        series,
        colors: SERIES_TOKENS,
      })
    } catch {
      // A button that silently does nothing reads as broken, so say so.
      notify.error(t("chat.chart.downloadFailed"))
    } finally {
      setSaving(false)
    }
  }

  // 11px, not 10: these labels are read once, at a glance, often on a laptop
  // beside a table of the same numbers. A tick nobody can read is decoration.
  const axisProps = {
    stroke: "currentColor",
    strokeOpacity: 0.25,
    tick: { fontSize: 11, fill: "currentColor", opacity: 0.75 },
    tickLine: false,
    axisLine: false,
  }

  // The ticks wrap and ellipsise themselves (see CategoryTick); `data` keeps
  // the full name either way, so the tooltip and the export still say it in
  // full.
  // Card is w-[min(30rem,88cqw)]; inside it, 24px of padding and the value
  // axis come off before the categories get their share.
  const PLOT_WIDTH_PX = 480 - 24 - 46

  // Room for the longest name we will actually print, capped so the bars keep
  // most of the width on a narrow surface.
  const categoryWidth = Math.min(
    150,
    // Two lines of wrapped text, so half the longest name decides the width.
    Math.max(78, Math.ceil(longestLabel / 2) * 6.6 + 14),
  )

  // `interval={0}` is the important one: recharts' default drops whichever
  // ticks would collide, so long names weren't shortened, they silently
  // VANISHED — the line chart showed three of its six categories and looked
  // perfectly healthy doing it.
  //
  // How many characters fit under one category: the plot is the card's width
  // (capped at 30rem) less its padding and the value axis, split between the
  // categories, at roughly 6.2px per character at 11px.
  const perTickChars = Math.max(5, Math.floor(PLOT_WIDTH_PX / data.length / 6.2))

  // The first and last tick labels are CENTRED on their band, so half of each
  // hangs past the band's centre — and at the plot's edges that half fell
  // outside the SVG, which clips: "Gider" rendered as "Gide". The axis is
  // inset by exactly the half-width of the label that actually sits at each
  // edge, so the frame ends where the text ends instead of through it.
  const edgeInset = (index) => {
    const lines = wrapLabel(data[index]?.label ?? "", perTickChars)
    const widest = Math.max(1, ...lines.map((line) => line.length))
    return Math.ceil((widest * 6.2) / 2) + 2
  }
  const bottomAxis = {
    dataKey: "label",
    interval: 0,
    height: 42,
    tick: <CategoryTick perLine={perTickChars} />,
    padding: { left: edgeInset(0), right: edgeInset(data.length - 1) },
    ...axisProps,
  }

  // A sideways bar chart needs height per row, not a fixed box: six categories
  // in 224px gives each bar 30px including its gap, which is where the
  // overlapping rotated labels came from.
  //
  // Ölçüler 2026-09-09'da bir kademe açıldı (istek üzerine: "çok sıkışık
  // grafikler, yapma yerimiz var"). Kart zaten balonun genişliğini almıyordu
  // ve snapshot kipinin 176px'i, değer ekseni gizli olduğu için TÜM yüksekliği
  // veriye ayırdığı hâlde en dar görünümdü.
  const plotHeight = horizontal ? Math.max(224, data.length * 44 + 40) : snapshot ? 220 : 264

  return (
    /* Sized in container units, not against the parent: the bubble column is
       content-width, so a chart left to hug its content comes out as a narrow
       sliver with the whole message row empty beside it. `cqw` is the chat
       surface's own width, which is what makes this work unchanged in the page
       and in the dock.

       `w-full max-w-…`, çıplak `w-…` DEĞİL: sabit genişlik elemanın
       min-content katkısıdır, yani sığmadığında küçülmez, TAŞAR — mesaj
       listesi de yatayda kaydırılabilir hâle gelir. `overflow-hidden` de
       şart: aşağıdaki `!overflow-visible` recharts etiketleri kesilmesin
       diye bilinçli, ama SVG ile mesaj kaydırıcısı arasında kırpan başka
       kutu yok ve taşan boyama doğrudan kaydırılabilir alana giriyordu. */
    <div
      className={cn(
        "w-full max-w-[min(34rem,92cqw)] overflow-hidden rounded-2xl bg-card p-3",
        snapshot ? "border border-border/60 shadow-sm" : "border border-border",
      )}
    >
      {/* Snapshot kipinde manşet ÖNCE, başlık şeridi gömme panelin içinde:
          kartın ilk okunan şeyi rakam olsun, grafiğin künyesi değil. */}
      {snapshot && hero}
      <div
        className={cn(snapshot && "overflow-hidden rounded-xl bg-muted/40 ring-1 ring-border/60")}
      >
        <div
          className={cn(
            "flex items-center justify-between gap-2",
            snapshot ? "border-b border-border/60 px-2.5 py-1.5" : "mb-2",
          )}
        >
          {/* The wording every category shared lives here now — taken off the
            ticks so they stay legible, but not thrown away. */}
          <p className="truncate text-[0.6875rem] font-medium text-muted-foreground">
            {[analysis.labelHeader, analysis.labelAffix, unit].filter(Boolean).join(" · ")}
          </p>
          <div className="flex shrink-0 items-center gap-1">
            {available.length > 1 && (
              <div className="flex shrink-0 gap-0.5 rounded-lg bg-muted/60 p-0.5">
                {available.map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    onClick={() => setType(x.id)}
                    aria-label={t(x.labelKey)}
                    aria-pressed={type === x.id}
                    className={cn(
                      "grid size-6 place-items-center rounded-md transition",
                      type === x.id
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <HugeiconsIcon icon={x.icon} className="size-3.5" strokeWidth={2} />
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={handleDownload}
              disabled={saving}
              aria-label={t("chat.chart.download")}
              title={t("chat.chart.download")}
              className="grid size-6 place-items-center rounded-md text-muted-foreground transition hover:bg-accent/60 hover:text-foreground disabled:opacity-50"
            >
              <HugeiconsIcon icon={Download01Icon} className="size-3.5" strokeWidth={2} />
            </button>
          </div>
        </div>

        {!snapshot && hero}

        <div
          ref={holderRef}
          className={cn(
            "w-full text-muted-foreground [&_svg.recharts-surface]:!overflow-visible",
            snapshot && "px-1.5 pt-2",
          )}
          style={{ height: plotHeight }}
        >
          <ResponsiveContainer width="100%" height="100%">
            {type === "pie" ? (
              <PieChart>
                <Tooltip content={<ChartTooltip format={fmt.full} />} />
                <Pie
                  data={data}
                  dataKey={series[0].key}
                  nameKey="label"
                  innerRadius="45%"
                  outerRadius="78%"
                  paddingAngle={2}
                  stroke="var(--card)"
                  strokeWidth={2}
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={SERIES_TOKENS[i % SERIES_TOKENS.length]} />
                  ))}
                </Pie>
              </PieChart>
            ) : type === "line" ? (
              <LineChart
                data={data}
                margin={
                  snapshot
                    ? { top: 10, right: 10, bottom: 0, left: 10 }
                    : { top: 8, right: 12, bottom: 0, left: 2 }
                }
              >
                {!snapshot && (
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="currentColor"
                    strokeOpacity={0.12}
                    vertical={false}
                  />
                )}
                <XAxis {...bottomAxis} />
                {/* Snapshot: değer ekseni yok — rakamlar manşette ve balonda. */}
                <YAxis tickFormatter={fmt.tick} width={44} hide={snapshot} {...axisProps} />
                <Tooltip content={<ChartTooltip format={fmt.full} />} />
                {referenceY != null && (
                  <ReferenceLine
                    y={referenceY}
                    stroke="currentColor"
                    strokeOpacity={0.45}
                    strokeDasharray="4 4"
                  />
                )}
                {/* Başlangıç değerinde kesikli taban: çizginin nereden geldiğini
                  eksensiz de okutur (referansın taban çizgisi). Zirve kartında
                  YOK — orada kesikli çizgi ortalamayı anlatıyor, ikincisi
                  hangisinin ne olduğunu belirsizleştirirdi. */}
                {snapshot &&
                  referenceY == null &&
                  series.map((s, i) =>
                    data[0]?.[s.key] != null ? (
                      <ReferenceLine
                        key={`base-${s.key}`}
                        y={data[0][s.key]}
                        stroke={SERIES_TOKENS[i % SERIES_TOKENS.length]}
                        strokeOpacity={0.3}
                        strokeDasharray="3 4"
                      />
                    ) : null,
                  )}
                {series.map((s, i) => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    stroke={SERIES_TOKENS[i % SERIES_TOKENS.length]}
                    strokeWidth={snapshot ? 2.25 : 2}
                    dot={snapshot ? false : { r: 2.5 }}
                    activeDot={{ r: 4 }}
                  />
                ))}
                {/* Snapshot: yalnız SON noktada işaret. */}
                {snapshot &&
                  series.map((s, i) => {
                    const last = data[data.length - 1]
                    return last?.[s.key] != null ? (
                      <ReferenceDot
                        key={`end-${s.key}`}
                        x={last.label}
                        y={last[s.key]}
                        r={3.5}
                        fill={SERIES_TOKENS[i % SERIES_TOKENS.length]}
                        stroke="var(--card)"
                        strokeWidth={1.5}
                      />
                    ) : null
                  })}
              </LineChart>
            ) : (
              <BarChart
                data={data}
                layout={horizontal ? "vertical" : "horizontal"}
                margin={
                  horizontal
                    ? { top: 4, right: 44, bottom: 4, left: 0 }
                    : // Hepsi negatifse sıfır çizgisi TEPEDEDİR ve negatif barın
                      // rakamı onun üstüne yazılır; 6px'lik pay kartın başlığına
                      // taşırdı.
                      { top: hasNegative ? 20 : 6, right: 8, bottom: 0, left: -12 }
                }
                barCategoryGap={horizontal ? "22%" : "18%"}
              >
                {!snapshot && (
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="currentColor"
                    strokeOpacity={0.12}
                    horizontal={!horizontal}
                    vertical={horizontal}
                  />
                )}
                {horizontal ? (
                  <>
                    <XAxis type="number" tickFormatter={fmt.tick} {...axisProps} />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={categoryWidth}
                      interval={0}
                      tick={<CategoryTick perLine={Math.floor(categoryWidth / 6.2)} anchor="end" />}
                      {...axisProps}
                    />
                  </>
                ) : (
                  <>
                    <XAxis {...bottomAxis} />
                    <YAxis tickFormatter={fmt.tick} width={46} hide={snapshot} {...axisProps} />
                  </>
                )}
                <Tooltip
                  cursor={{ fill: "currentColor", fillOpacity: 0.06 }}
                  content={<ChartTooltip format={fmt.full} />}
                />
                {/* A zero line only earns its place when something crosses it. */}
                {hasNegative &&
                  (horizontal ? (
                    <ReferenceLine x={0} stroke="currentColor" strokeOpacity={0.35} />
                  ) : (
                    <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.35} />
                  ))}
                {referenceY != null &&
                  (horizontal ? (
                    <ReferenceLine
                      x={referenceY}
                      stroke="currentColor"
                      strokeOpacity={0.45}
                      strokeDasharray="4 4"
                    />
                  ) : (
                    <ReferenceLine
                      y={referenceY}
                      stroke="currentColor"
                      strokeOpacity={0.45}
                      strokeDasharray="4 4"
                    />
                  ))}
                {series.map((s, i) => (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    // `fill` on the Bar as well as on each Cell: the legend key
                    // reads the series fill, and with only Cells set it drew
                    // every swatch black.
                    fill={SERIES_TOKENS[i % SERIES_TOKENS.length]}
                    radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                    maxBarSize={horizontal ? 30 : 48}
                  >
                    {/* The number at the end of the bar. With one series this
                      removes the back-and-forth to the axis entirely — the
                      chart answers "how much" without being measured.

                      ⚠️ KONUMU İŞARET SEÇER, TEK BİR `position` YETMEZ.
                      recharts negatif barı ters yönde çiziyor (`width`/
                      `height` EKSİ) ve `getCartesianPosition` etiketi buna
                      göre barın uzak ucunun DIŞINA koyuyor — yatay grafikte
                      o uç çizim alanının sol kenarı, yani kategori adının
                      üstü. Bildirilen hata buydu: "-276 B" ile "Bütçe"
                      çakışıyordu.

                      Çare pay eklemek değil, YÖNÜ ÇEVİRMEK: negatifte
                      "left"/"bottom" verildiğinde aynı işaret mantığı
                      etiketi sıfır çizgisinin BOŞ tarafına koyuyor (o
                      satırda/bandda tek seri var, orası boş). Böylece ne
                      eksen etiketiyle ne barla çakışır ve hiçbir grafikten
                      sabit piksel çalınmaz.

                      İki liste, çünkü `position` liste başınadır; her biri
                      kendi işaretinin dışındakini BOŞ dizeye çevirir. */}
                    {series.length === 1 && (
                      <LabelList
                        dataKey={s.key}
                        position={horizontal ? "right" : "top"}
                        formatter={(v) => (typeof v === "number" && v < 0 ? "" : fmt.label(v))}
                        style={{ fontSize: 11, fill: "currentColor", opacity: 0.85 }}
                      />
                    )}
                    {series.length === 1 && hasNegative && (
                      <LabelList
                        dataKey={s.key}
                        position={horizontal ? "left" : "bottom"}
                        formatter={(v) => (typeof v === "number" && v < 0 ? fmt.label(v) : "")}
                        style={{ fontSize: 11, fill: "currentColor", opacity: 0.85 }}
                      />
                    )}
                    {data.map((d, k) => (
                      <Cell
                        key={k}
                        // Sign over series colour on a single-series chart: a
                        // loss reading as "just another blue bar" is the one
                        // thing a P&L chart must not do.
                        fill={
                          series.length === 1 && (d[s.key] ?? 0) < 0
                            ? // tyro'da `--pl-neg` yok (tyrotrade'in P&L
                              // token'ı); rose, farkın negatif tonuyla aynı.
                              "var(--color-rose-500)"
                            : series.length === 1 && highlightIndex === k
                              ? SERIES_TOKENS[1]
                              : SERIES_TOKENS[i % SERIES_TOKENS.length]
                        }
                      />
                    ))}
                  </Bar>
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Said out loud rather than dropped quietly: a margin in % charted next
          to amounts in USD would flatten the amounts into nothing.
          Snapshot kipinde İKİSİ DE yok: seriler manşette, dışlanan toplam
          satırı zaten manşet rakamı. */}
      {/* Snapshot kipinde efsane yok — ama PASTA'nın efsanesi süs değil,
          dilimi okumanın tek yolu. */}
      {(!snapshot || type === "pie") && (
        <ChartLegend
          items={
            type === "pie"
              ? data.map((d, i) => ({
                  label: d.label,
                  color: SERIES_TOKENS[i % SERIES_TOKENS.length],
                }))
              : series.map((s, i) => ({
                  label: s.name,
                  color: SERIES_TOKENS[i % SERIES_TOKENS.length],
                }))
          }
        />
      )}

      {!snapshot && (excludedRows > 0 || excludedSeries > 0) && (
        <p className="mt-3 border-t border-border/60 pt-2 text-[0.6875rem] leading-snug text-muted-foreground/70">
          {[
            excludedRows > 0 &&
              t("chat.chart.excludedRows").replace("{count}", String(excludedRows)),
            excludedSeries > 0 &&
              t("chat.chart.excludedSeries").replace("{count}", String(excludedSeries)),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
    </div>
  )
}
