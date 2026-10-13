import { useMemo, useState } from "react"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"
import { MessageChart } from "./MessageChart"
import { SERIES_TOKENS, useCompact } from "./chartTokens"

/**
 * İÇGÖRÜ KARTI — tablonun ŞEKLİNE göre dört görünüm.
 *
 * Referans tasarımın dört kartının uyarlaması. Kart türünü `analyseTable`
 * seçiyor (bkz. markdownTable.js › classifyInsight) ve buradaki HER RAKAM ya
 * tablonun kendi hücresi ya da o hücrelerin basit aritmetiği (pay, ortalama,
 * fark). Yorum yok: "anormal", "kötü performans" gibi bir cümle bu
 * bileşenden çıkmaz — tablonun üstünde ajanın KENDİ cümlesi duruyor
 * (`caption`), yargı oradadır.
 *
 *   compare  iki büyük rakam (bütçe · gerçekleşen) + fark
 *   share    manşet toplam · bölmeli çubuk · çipler · seçili dilim kutusu
 *   peak     zirve noktası · ortalamaya göre fark · ortalama çizgili grafik
 *   trend    son nokta · Δ önceki · grafik
 *   plain    yalnız grafik
 *
 * ⚠️ RENK YALNIZ FARK KOLONUNDA. Tablo bir "Fark" kolonu taşıyorsa o kolonun
 * işareti tablonun kendi yargısıdır ve Sabit Giderler'in kuralıyla boyanır
 * (pozitif = yeşil). Fark kolonu yoksa `gerçekleşen − bütçe` NÖTR mürekkeple
 * yazılır: gider tablosunda artış kötü, ciro tablosunda iyi — hangisi
 * olduğunu tablo söylemiyor, biz de söylemiyoruz. Zirve de kırmızı değil.
 */
function heroSource(analysis) {
  // Manşet rakamlarının satırı: tablonun toplam satırı, yoksa zaman
  // ekseninde son nokta, yoksa YOK — kendi toplamımızı yazmıyoruz.
  if (analysis.totalRow) return { label: analysis.totalRow.label, values: analysis.totalRow.values }
  if (analysis.timeAxis && analysis.data.length) {
    const last = analysis.data[analysis.data.length - 1]
    return { label: last.label, values: last }
  }
  return null
}

function Big({ value, fmt, unit, tone }) {
  return (
    <span
      className={cn(
        "block truncate text-[1.0625rem] font-semibold tracking-[-0.01em] tabular-nums",
        tone ?? "text-foreground",
      )}
    >
      {value == null ? "—" : fmt.plain(value)}
      {unit && value != null && (
        <span className="ml-1 text-[0.6875rem] font-medium text-muted-foreground">{unit}</span>
      )}
    </span>
  )
}

function Dot({ color }) {
  return (
    <span
      aria-hidden="true"
      className="size-2 shrink-0 rounded-full"
      style={{ background: color }}
    />
  )
}

function KindPill({ kind }) {
  const { t } = useLocale()
  if (kind === "plain") return null
  return (
    <span className="shrink-0 rounded-full bg-muted/70 px-2 py-0.5 text-[0.65625rem] font-medium text-muted-foreground">
      {t(`chat.insights.kind.${kind}`)}
    </span>
  )
}

/* ── compare ─────────────────────────────────────────────────────────── */
function CompareHero({ analysis, fmt }) {
  const { roles, series, unit } = analysis
  const src = heroSource(analysis)
  if (!src) return null
  // ⚠️ FARK HESAPLANMAZ, yalnız tablonun KENDİ fark kolonu okunur. Bir tur
  // `gerçekleşen − bütçe` hesaplandı ve tablo "+21.187" derken kart
  // "−21.187" yazdı: Sabit Giderler'in kuralı `bütçe − gerçekleşen`, ajanın
  // tablosu da öyle. İşaret sözleşmesini tablo söylemiyorsa fark yazılmaz —
  // iki büyük rakam yan yana zaten karşılaştırmanın kendisi.
  // Fark, veriye ayrı anahtarla iliştirilen kolondan okunur (bkz.
  // markdownTable › vDiff): birimsiz yazıldığında grafikten düşüyor ama
  // manşette yeri var.
  const variance = roles.varianceKey ? src.values[roles.varianceKey] : null
  // ⚠️ Renkler tyro'nun kendi tonları: bu uygulamada `--pl-pos/--pl-neg`
  // token'ları YOK (onlar tyrotrade'in P&L tabloları için). Emerald/rose,
  // profil kartlarının ve bütçe şeridinin kullandığı tonlar.
  const tone =
    variance == null
      ? null
      : variance > 0
        ? "text-emerald-700 dark:text-emerald-300"
        : variance < 0
          ? "text-rose-700 dark:text-rose-300"
          : null
  const colorOf = (s) =>
    SERIES_TOKENS[series.findIndex((x) => x.key === s.key) % SERIES_TOKENS.length]
  const unitInName = (n) => Boolean(unit) && n.toLowerCase().includes(unit.toLowerCase())

  return (
    <div className="mb-2 flex items-start gap-4">
      {[roles.budget, roles.actual].map((s) => (
        <div key={s.key} className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[0.6875rem] text-muted-foreground">
            <Dot color={colorOf(s)} />
            <span className="truncate">{s.name}</span>
          </span>
          <Big value={src.values[s.key]} fmt={fmt} unit={unitInName(s.name) ? null : unit} />
        </div>
      ))}
      {roles.variance && variance != null && (
        <div className="min-w-0 flex-1 border-l border-border pl-3">
          <span className="block truncate text-[0.6875rem] text-muted-foreground">
            {roles.variance} <span className="text-muted-foreground/60">· {src.label}</span>
          </span>
          <Big
            value={variance}
            fmt={fmt}
            unit={unitInName(roles.variance) ? null : unit}
            tone={tone}
          />
        </div>
      )}
    </div>
  )
}

/* ── share ───────────────────────────────────────────────────────────── */
function ShareHero({ analysis, fmt }) {
  const { t, locale } = useLocale()
  const { share, unit, totalRow } = analysis
  const [selected, setSelected] = useState(null)
  const pctFmt = useMemo(
    () => new Intl.NumberFormat(locale || "tr", { maximumFractionDigits: 1 }),
    [locale],
  )
  const segments = share.segments
  const active = selected == null ? null : segments[selected]
  const totalLabel = totalRow?.label ?? t("chat.insights.total")
  const color = (i) => SERIES_TOKENS[i % SERIES_TOKENS.length]

  // En büyük dilim kartın "kahramanı": referansın harfli rozeti onun.
  let top = 0
  segments.forEach((seg, i) => {
    if (seg.value > segments[top].value) top = i
  })
  const topSeg = segments[top]

  return (
    <div className="mb-1">
      <span className="flex items-center gap-1.5 text-[0.75rem] font-medium text-foreground">
        <span
          aria-hidden="true"
          className="grid size-3.5 shrink-0 place-items-center rounded-full text-[0.5rem] font-bold text-white"
          style={{ background: color(top) }}
        >
          {topSeg.label.charAt(0).toUpperCase()}
        </span>
        <span className="truncate">{analysis.labelHeader}</span>
        <span className="text-muted-foreground">· {active ? active.label : totalLabel}</span>
      </span>
      <span className="mt-1 block truncate text-[1.25rem] font-semibold tracking-[-0.01em] tabular-nums text-foreground">
        {fmt.plain(active ? active.value : share.total)}
        {unit && (
          <span className="ml-1 text-[0.6875rem] font-medium text-muted-foreground">{unit}</span>
        )}
      </span>

      {/* Bölmeli çubuk: genişlik = pay. Çok küçük dilimler görünür kalsın
          diye en az 2px; bir dilime basmak manşeti o dilime çevirir. */}
      <div
        className="mt-3 flex h-9 gap-0.5 overflow-hidden rounded-full bg-muted/60 p-0.5"
        role="group"
      >
        {segments.map((seg, i) => (
          <button
            key={seg.label}
            type="button"
            aria-pressed={selected === i}
            aria-label={`${seg.label}: %${pctFmt.format(seg.pct)}`}
            onClick={() => setSelected(selected === i ? null : i)}
            className="h-full min-w-[0.125rem] rounded-full transition-[opacity,box-shadow] duration-300"
            style={{
              width: `${Math.max(seg.pct, 0.6)}%`,
              background: color(i),
              opacity: selected == null || selected === i ? 1 : 0.4,
              boxShadow: selected === i ? "inset 0 0 0 1.5px rgba(255,255,255,0.35)" : undefined,
            }}
          />
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1">
        {segments.map((seg, i) => (
          <button
            key={seg.label}
            type="button"
            aria-pressed={selected === i}
            onClick={() => setSelected(selected === i ? null : i)}
            className={cn(
              "flex max-w-full items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.6875rem] transition",
              selected === i
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            )}
          >
            <Dot color={color(i)} />
            <span className="truncate">{seg.label}</span>
            <span className="shrink-0 tabular-nums">%{pctFmt.format(seg.pct)}</span>
          </button>
        ))}
      </div>

      {active && (
        <div className="agent-row mt-2 rounded-lg bg-muted/50 px-2.5 py-2 ring-1 ring-border/60">
          <span className="block text-[0.71875rem] font-medium" style={{ color: color(selected) }}>
            {active.label}
          </span>
          <span className="mt-0.5 block text-[0.6875rem] leading-relaxed text-muted-foreground">
            {fmt.full(active.value)} · %{pctFmt.format(active.pct)} · {totalLabel}{" "}
            {fmt.plain(share.total)}
          </span>
        </div>
      )}
    </div>
  )
}

/* ── peak ────────────────────────────────────────────────────────────── */
function PeakHero({ analysis, fmt }) {
  const { t } = useLocale()
  const { peak, unit } = analysis
  const delta = peak.value - peak.mean
  const unitInName = Boolean(unit) && peak.series.toLowerCase().includes(unit.toLowerCase())
  return (
    <div className="mb-2 flex items-start gap-4">
      <div className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[0.6875rem] text-muted-foreground">
          <Dot color={SERIES_TOKENS[1]} />
          <span className="truncate">{peak.series}</span>
          <span className="shrink-0 text-muted-foreground/60">· {peak.label}</span>
        </span>
        <Big value={peak.value} fmt={fmt} unit={unitInName ? null : unit} />
      </div>
      <div className="min-w-0 flex-1 border-l border-border pl-3">
        <span className="block truncate text-[0.6875rem] text-muted-foreground">
          {t("chat.insights.mean")}
        </span>
        <Big value={Math.round(peak.mean)} fmt={fmt} unit={unitInName ? null : unit} />
        <span className="font-mono text-[0.6875rem] tabular-nums text-muted-foreground">
          Δ {delta > 0 ? "+" : ""}
          {fmt.tick(delta)}
        </span>
      </div>
    </div>
  )
}

/* ── trend ───────────────────────────────────────────────────────────── */
function TrendHero({ analysis, fmt }) {
  const { series, data, unit } = analysis
  if (series.length > 3 || data.length < 2) return null
  const last = data[data.length - 1]
  const prev = data[data.length - 2]
  const unitInName = (n) => Boolean(unit) && n.toLowerCase().includes(unit.toLowerCase())
  return (
    <div className="mb-2 flex items-start gap-4">
      {series.map((s, i) => {
        const delta = last[s.key] != null && prev[s.key] != null ? last[s.key] - prev[s.key] : null
        return (
          <div key={s.key} className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-[0.6875rem] text-muted-foreground">
              <Dot color={SERIES_TOKENS[i % SERIES_TOKENS.length]} />
              <span className="truncate">{s.name}</span>
              <span className="shrink-0 text-muted-foreground/60">· {last.label}</span>
            </span>
            <Big value={last[s.key]} fmt={fmt} unit={unitInName(s.name) ? null : unit} />
            {delta != null && (
              <span className="font-mono text-[0.6875rem] tabular-nums text-muted-foreground">
                Δ {delta > 0 ? "+" : delta < 0 ? "−" : ""}
                {fmt.tick(Math.abs(delta))}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

const HEROES = { compare: CompareHero, share: ShareHero, peak: PeakHero, trend: TrendHero }

/**
 * Cümlede geçen ilk satır etiketini renkli noktayla çipler — referansın
 * "@Vanilla" varlık işareti. Etiket kart renkleriyle aynı sırayı taşır ki
 * cümledeki nokta çubuktaki dilimle eşleşsin. Eşleşme yoksa cümle düz kalır.
 */
function Caption({ text, analysis }) {
  // Zaman ekseninde çip yok: ay etiketleri ("Eyl") cümlede başka kelimenin
  // içinde geçebiliyor ("Eylül") ve bir ayı varlık gibi işaretlemek zaten
  // anlamsız — varlık, kategori satırıdır.
  if (analysis.timeAxis) return <>{text}</>
  const labels =
    analysis.kind === "share"
      ? analysis.share.segments.map((x) => x.label)
      : analysis.data.map((d) => d.label)
  const lower = text.toLowerCase()
  const isWordChar = (ch) => /[\p{L}\p{N}]/u.test(ch ?? "")
  let hit = null
  labels.forEach((label, i) => {
    if (!label || label.length < 3) return
    const needle = label.toLowerCase()
    let at = lower.indexOf(needle)
    // TAM KELİME: önü ve arkası harf/rakam olmamalı; ilk tam eşleşme alınır.
    while (at >= 0 && (isWordChar(lower[at - 1]) || isWordChar(lower[at + needle.length]))) {
      at = lower.indexOf(needle, at + 1)
    }
    if (at >= 0 && (hit == null || at < hit.at)) hit = { at, label, i }
  })
  if (!hit) return <>{text}</>
  const end = hit.at + hit.label.length
  return (
    <>
      {text.slice(0, hit.at)}
      <span className="inline-flex items-center gap-1 align-baseline font-medium text-foreground">
        <Dot color={SERIES_TOKENS[hit.i % SERIES_TOKENS.length]} />
        {text.slice(hit.at, end)}
      </span>
      {text.slice(end)}
    </>
  )
}

export function InsightCard({ analysis }) {
  const fmt = useCompact(analysis.unit)
  const Hero = HEROES[analysis.kind]
  const isShare = analysis.kind === "share"

  return (
    <div className="w-full max-w-[min(34rem,92cqw)]">
      {/* Ajanın tablodan hemen önceki cümlesi — referanstaki "prose" satırı.
          Bizim başlığımız değil, onun cümlesi; kısaysa tam, uzunsa kırpılır. */}
      {(analysis.caption || analysis.kind !== "plain") && (
        <div className="mb-1.5 flex items-start justify-between gap-2 px-0.5">
          <p className="line-clamp-2 min-w-0 text-[0.78125rem] leading-relaxed text-muted-foreground">
            {analysis.caption && <Caption text={analysis.caption} analysis={analysis} />}
          </p>
          <KindPill kind={analysis.kind} />
        </div>
      )}
      {/* ⚠️ PAY KARTI DA `MessageChart` KURAR (2026-09-09, istek üzerine).
          Bir tur yalnız bölmeli çubuk çizildi — "ikinci bir çubuk grafiği
          aynı şeyi iki kez söyler" diye. Bedeli ölçülmedi ve sahada
          bildirildi: o kart karuseldeki TEK kart oluyordu ki İNDİRME
          düğmesi ve grafik tipi seçicisi yok, yani aynı ekranda iki farklı
          kart sözleşmesi vardı. Çubuk manşetin İÇİNDE (hero) kalır, altına
          seçilebilir grafik girer ve açılışta PASTA gelir: aynı payın
          ikinci bir okuması, çubuğun tekrarı değil. */}
      <MessageChart
        analysis={analysis}
        snapshot
        defaultType={isShare ? "pie" : null}
        referenceY={analysis.kind === "peak" ? analysis.peak.mean : null}
        highlightIndex={analysis.kind === "peak" ? analysis.peak.index : null}
        hero={Hero ? <Hero analysis={analysis} fmt={fmt} /> : null}
      />
    </div>
  )
}
