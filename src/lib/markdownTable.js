/**
 * Turn a GFM table in an agent reply into something chartable.
 *
 * The agent already answers numeric questions with markdown tables — the P&L
 * breakdown, milestone dates, cargo quantities — and react-markdown already
 * renders them. So charting a reply is not a generation step that needs a
 * server, a Python runtime or a round trip: the numbers are in the browser the
 * moment the answer lands. This file is the parsing half of that.
 *
 * Everything here is deliberately conservative. A wrong chart is worse than no
 * chart, so each step refuses rather than guesses: a table with no numeric
 * column is not chartable, cells that don't parse are dropped, and rows in a
 * different unit from the rest are excluded and counted so the UI can say so.
 */

/**
 * Strip the markdown a cell or header is written in, keeping the words.
 *
 * The agent bolds its header row — `| **Tahmini** | **Gerçekleşen** |` — and
 * those headers become the series names, so the legend under the chart read
 * "**Tahmini**", asterisks and all. react-markdown renders the table so the
 * problem is invisible there; only the chart, which reads the raw source, sees
 * it. Link syntax collapses to its text for the same reason.
 */
function cleanText(value) {
  return (value || "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`~]/g, "")
    .trim()
}

/** Cells that mean "nothing here" in the agent's tables. */
const EMPTY_CELLS = new Set(["", "—", "-", "–", "n/a", "N/A", "null", "yok"])

/**
 * Pull every GFM table out of a markdown string.
 *
 * Matches the shape react-markdown accepts: a header row, a delimiter row of
 * dashes, then body rows — all pipe-separated. Leading/trailing pipes are
 * optional, which is how the agent sometimes writes them.
 */
export function extractTables(markdown) {
  if (typeof markdown !== "string" || !markdown.includes("|")) return []

  const lines = markdown.split("\n")
  const tables = []
  let i = 0
  // Tablodan hemen önceki dolu satır: kartın açıklama cümlesi. AJANIN kendi
  // cümlesi — kart neyi gösterdiğini onun sözüyle söylesin, bizim
  // uydurduğumuz bir başlıkla değil. Boru işareti taşıyan satır (tablonun
  // kendisi) alınmaz.
  let lastProse = ""

  while (i < lines.length) {
    const header = splitRow(lines[i])
    const delimiter = lines[i + 1]
    // A delimiter row is dashes and optional colons, nothing else.
    const isDelimiter =
      header.length >= 2 &&
      typeof delimiter === "string" &&
      /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(delimiter)

    if (!isDelimiter) {
      const trimmed = lines[i].trim()
      if (trimmed && !trimmed.includes("|")) lastProse = trimmed
      i += 1
      continue
    }
    const caption = lastProse
    lastProse = ""

    const rows = []
    let j = i + 2
    while (j < lines.length && lines[j].includes("|")) {
      const cells = splitRow(lines[j])
      if (cells.length === 0) break
      // Pad or trim to the header width so ragged rows can't shift columns.
      rows.push(Array.from({ length: header.length }, (_, k) => (cells[k] ?? "").trim()))
      j += 1
    }

    if (rows.length > 0) tables.push({ headers: header, rows, caption })
    i = j
  }

  return tables
}

function splitRow(line) {
  if (typeof line !== "string" || !line.includes("|")) return []
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim())
}

/**
 * Read one cell as a number, and say what unit it was written in.
 *
 * The agent's figures come out of ERP in Turkish format — `+688.029 USD`,
 * `%82,6`, `3.312,76 MT` — where `.` groups thousands and `,` is the decimal
 * point, the opposite of the English convention. Guessing wrong turns 688
 * thousand into 688, so the separator is decided per value rather than assumed:
 *
 *   both separators present  → whichever comes LAST is the decimal point
 *   one separator, 3 digits after it → thousands (688.029 → 688029)
 *   one separator, otherwise → decimal (82,6 → 82.6)
 *
 * The 3-digit rule is the one place this can be wrong: an English "1.500"
 * meaning one and a half reads as fifteen hundred. That trade is deliberate —
 * the tables being parsed are written by a Turkish-locale agent over ERP
 * data, where the thousands reading is right far more often.
 */
export function parseCell(raw) {
  if (typeof raw !== "string") return null
  const text = raw.trim()
  if (EMPTY_CELLS.has(text) || EMPTY_CELLS.has(text.toLowerCase())) return null

  // Strip markdown emphasis the agent puts around figures (**+568.529 USD**).
  const bare = text.replace(/[*_`]/g, "").trim()

  const isPercent = /%/.test(bare)
  // Currency written as a symbol or a code after the number.
  const currency = bare.match(/(USD|EUR|TRY|TL|₺|\$|€)/i)?.[0] ?? null

  // Keep only what can belong to a number.
  const numeric = bare
    .replace(/[%]/g, "")
    .replace(/(USD|EUR|TRY|TL|MT|KG|TON|₺|\$|€)/gi, "")
    .replace(/[\s\u00a0\u202f]/g, "")
    .trim()

  if (!/^[+-]?[\d.,]+$/.test(numeric) || !/\d/.test(numeric)) return null

  const sign = numeric.startsWith("-") ? -1 : 1
  const digits = numeric.replace(/^[+-]/, "")

  const lastDot = digits.lastIndexOf(".")
  const lastComma = digits.lastIndexOf(",")
  let normalised

  if (lastDot >= 0 && lastComma >= 0) {
    // Both present: the later one is the decimal point, the other groups.
    const decimalAt = Math.max(lastDot, lastComma)
    const groupChar = decimalAt === lastDot ? "," : "."
    normalised =
      digits.slice(0, decimalAt).split(groupChar).join("") + "." + digits.slice(decimalAt + 1)
  } else if (lastDot >= 0 || lastComma >= 0) {
    const at = Math.max(lastDot, lastComma)
    const sep = digits[at]
    const tail = digits.slice(at + 1)
    const head = digits.slice(0, at)
    // Appearing more than once settles it: only a grouping separator repeats
    // (1.234.567). Otherwise a 3-digit tail reads as a group, anything else
    // as a decimal fraction.
    const repeats = digits.split(sep).length - 1 > 1
    const isGrouping = repeats || (tail.length === 3 && head.length > 0)
    normalised = isGrouping ? digits.replace(/[.,]/g, "") : head + "." + tail
  } else {
    normalised = digits
  }

  const value = Number(normalised)
  if (!Number.isFinite(value)) return null

  return {
    value: sign * value,
    unit: isPercent ? "%" : currency ? currency.toUpperCase() : "",
  }
}

/** A column counts as numeric when most of its filled cells parse. */
function columnIsNumeric(rows, index) {
  let filled = 0
  let parsed = 0
  for (const row of rows) {
    const cell = row[index]
    if (!cell || EMPTY_CELLS.has(cell)) continue
    filled += 1
    if (parseCell(cell)) parsed += 1
  }
  return filled > 0 && parsed / filled >= 0.6
}

/**
 * Her etiketin ortak olan kelimelerini at.
 *
 * "Gerçekleşen Satış / Gerçekleşen Gider / Gerçekleşen Net Kâr" tek kelimelik
 * bilgi ve on bir karakterlik giriş taşıyor, o yüzden baştan kırpmak üçünü de
 * "Gerçekleşen…" olarak çiziyordu — birebir aynı, ve eksen hiçbir şey
 * söylemiyordu. Ortak kısım tek bir çubuğun değil grafiğin TAMAMININ
 * özelliği; başlığa taşınıyor, işaretler ise ayrışan kısmı tutuyor.
 *
 * Yalnızca kelime sınırından kesilir ve asla hiçliğe indirilmez: bir etiket
 * en az üç karakter korumalı, yoksa ortak kısma dokunulmaz.
 */
function stripCommonAffixes(labels) {
  if (labels.length < 2) return { labels, prefix: "", suffix: "" }

  const words = labels.map((l) => l.split(/\s+/))
  const lead = []
  for (let i = 0; ; i += 1) {
    const w = words[0][i]
    if (!w || !words.every((ws) => ws.length > i + 1 && ws[i] === w)) break
    lead.push(w)
  }
  const tail = []
  for (let i = 1; ; i += 1) {
    const w = words[0][words[0].length - i]
    if (!w || !words.every((ws) => ws.length > lead.length + i && ws[ws.length - i] === w)) break
    tail.unshift(w)
  }
  if (lead.length === 0 && tail.length === 0) return { labels, prefix: "", suffix: "" }

  const trimmed = words.map((ws) => ws.slice(lead.length, ws.length - tail.length).join(" "))
  if (trimmed.some((l) => l.trim().length < 3)) {
    return { labels, prefix: "", suffix: "" }
  }
  return { labels: trimmed, prefix: lead.join(" "), suffix: tail.join(" ") }
}
/** Category labels that read as a time axis get a line chart, not bars. */
const TIME_LIKE =
  // ⚠️ `\w` ASCII-only: "Mayıs", "Eylül", "Kasım" ve "Aralık" bu testten
  // GEÇMİYORDU (ı ve ü `\w` değil). Sonucu sessiz ve kötüydü — o ayları
  // taşıyan aylık bir tablo zaman ekseni SAYILMIYOR, yani ay sırası
  // bozulacak şekilde büyüklüğe göre sıralanıyor ve trend/zirve yerine
  // PAY kartı seçiliyordu (aylar bir bütünün dilimleri gibi). Unicode
  // sınıfı + `u` bayrağı ile düzeltildi; yıl eki de eklendi, çünkü bu
  // uygulamanın P&L araçları ayları "Tem-26" biçiminde yazıyor ve o da
  // eskiden zaman sayılmıyordu.
  /^(\d{4}([-/.]\d{1,2})?|\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|q[1-4]|[1-9]\d?\.\s*(ay|hafta)|(oca|şub|mar|nis|may|haz|tem|ağu|eyl|eki|kas|ara|jan|feb|apr|jun|jul|aug|sep|oct|nov|dec)[\p{L}\p{N}]*([\s.\-/]\d{2,4})?)$/iu

/**
 * Decide whether a table can be charted, and how.
 *
 * Returns null when it can't — no numeric column, or fewer than two rows left
 * once the unusable ones are dropped. Two counters come back so the UI can say
 * what it left out instead of quietly dropping it: `excludedRows` for totals
 * and rows in a foreign unit, `excludedSeries` for whole columns measuring
 * something else. Both exist because a margin in % or a receipt count charted
 * beside amounts in USD flattens the amounts into nothing.
 */
/**
 * ═══════════════════════════════════════════════════════════════════════
 *  İÇGÖRÜ TÜRÜ — tablonun ŞEKLİNDEN seçilir, yorumdan değil
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Kart türü tablonun KOLON ROLLERİNDEN çıkar ve ekranda görünen her rakam ya
 * tablonun kendi hücresidir ya da onların basit bir aritmetiğidir (pay =
 * satır ÷ toplam, ortalama, fark). Yorum YOK — hüküm, tablonun üstünde duran
 * ajanın kendi cümlesinde (`caption`).
 *
 *   compare  Bütçe/Plan/Tahmin + Gerçekleşen (+ Fark) kolonları
 *   share    tek seri, kategori ekseni, hepsi pozitif, toplamı BİLİNEN
 *   peak     zaman ekseni, tek nokta ortalamadan belirgin sapıyor
 *   trend    zaman ekseni, gerisi
 *   plain    hiçbiri — düz grafik
 *
 * ⚠️ FARK HESAPLANMAZ, tablodan OKUNUR. tyrotrade'de bir tur gerçekleşen −
 * bütçe hesaplandı ve tablo +21.187 derken kart −21.187 yazdı (işaret
 * sözleşmesi ters). Yalnız tablonun kendi Fark kolonu okunuyor — birimsiz
 * yazıldığı için grafikten düşse bile — ve işaretiyle boyanıyor.
 *
 * ⚠️ `peak` bir ANOMALİ HÜKMÜ DEĞİL, bir görünüm seçimi: hangi noktanın en
 * yüksek olduğu ve ortalamanın ne kadar üstünde durduğu aritmetiktir. Eşik
 * (ortalama + 1,5σ) yalnız bu görünümün trendden daha faydalı olduğu ana
 * karar verir; ekrana "anormal" yazılmaz.
 *
 * ⚠️ `share` için payda ya tablonun kendi TOPLAM satırıdır ya da HİÇBİR satır
 * dışlanmadığında satırların toplamı. Dışlanmış satır varken toplamak,
 * ajanın toplamıyla ayrışan bir payda üretir.
 *
 * ⚠️ Seriler tyro'da `{ key, name }` — anahtar sentetik (`v0`, `v1`), çünkü
 * başlık metnini dataKey yapmak grafiği ona rehin veriyordu (bkz. aşağıdaki
 * seri notu). Roller BAŞLIKLA eşleşir, veri ANAHTARLA okunur.
 */
const ROLE_BUDGET = /bütçe|butce|budget|plan|tahmin|forecast|hedef|target|öngör/i
const ROLE_ACTUAL = /gerçekleşen|gerceklesen|actual|realized|realised|fiili|gerçek\b/i
const ROLE_VARIANCE = /\bfark\b|variance|delta|sapma|difference|Δ/i

function classifyInsight({
  series,
  numericHeaders,
  data,
  totalRow,
  timeAxis,
  allPositive,
  excludedRows,
}) {
  // Bütçe ve gerçekleşen GRAFİKTEKİ serilerden (aynı birimde olmaları şart —
  // yan yana çizilecekler); fark ise TÜM sayısal başlıklardan, çünkü
  // birimsiz yazıldığında grafikten düşüyor ama manşette yeri var.
  const roles = {
    budget: series.find((s) => ROLE_BUDGET.test(s.name) && !ROLE_VARIANCE.test(s.name)) ?? null,
    actual: series.find((s) => ROLE_ACTUAL.test(s.name) && !ROLE_VARIANCE.test(s.name)) ?? null,
    variance: numericHeaders.find((n) => ROLE_VARIANCE.test(n)) ?? null,
  }

  if (roles.budget && roles.actual && roles.budget.key !== roles.actual.key) {
    return { kind: "compare", roles, share: null, peak: null }
  }

  if (timeAxis && series.length >= 1 && data.length >= 4) {
    const key = series[0].key
    const values = data.map((d) => d[key]).filter((v) => typeof v === "number")
    if (values.length === data.length) {
      const mean = values.reduce((a, b) => a + b, 0) / values.length
      const sd = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length)
      let peakIndex = 0
      values.forEach((v, i) => {
        if (v > values[peakIndex]) peakIndex = i
      })
      const peakValue = values[peakIndex]
      if (sd > 0 && peakValue - mean > 1.5 * sd) {
        return {
          kind: "peak",
          roles,
          share: null,
          // ADI da taşınır: kart bunu ekrana yazıyor ve anahtar sentetik
          // (`v0`) — ekranda "v0" yazmak olmaz.
          peak: {
            index: peakIndex,
            label: data[peakIndex].label,
            value: peakValue,
            mean,
            series: series[0].name,
            seriesKey: key,
          },
        }
      }
    }
    return { kind: "trend", roles, share: null, peak: null }
  }
  if (timeAxis) return { kind: "trend", roles, share: null, peak: null }

  if (series.length === 1 && allPositive && data.length >= 2) {
    const key = series[0].key
    const fromTable = totalRow?.values?.[key]
    const summed = data.reduce((a, d) => a + (d[key] ?? 0), 0)
    const total =
      typeof fromTable === "number" && fromTable > 0
        ? fromTable
        : excludedRows === 0
          ? summed
          : null
    if (total && total > 0) {
      return {
        kind: "share",
        roles,
        peak: null,
        share: {
          total,
          // Toplam TABLODAN geliyorsa payların toplamı %100'ü aşabilir ya da
          // altında kalabilir (yuvarlama, ajanın kendi hesabı) — çubuk
          // genişlikleri yine tablodaki toplama göre, bilerek.
          fromTable: typeof fromTable === "number",
          segments: data.map((d) => ({
            label: d.label,
            value: d[key] ?? 0,
            pct: ((d[key] ?? 0) / total) * 100,
          })),
        },
      }
    }
  }

  return { kind: "plain", roles, share: null, peak: null }
}

export function analyseTable(table) {
  if (!table || table.headers.length < 2 || table.rows.length < 2) return null

  const numericCols = table.headers
    .map((_, i) => i)
    .filter((i) => columnIsNumeric(table.rows, i) && !isIndexColumn(table, i))
  if (numericCols.length === 0) return null

  const labelCol = table.headers.findIndex(
    (_, i) => !numericCols.includes(i) && !isIndexColumn(table, i),
  )
  if (labelCol === -1) return null

  // Only columns measuring the same thing share an axis. A receipt count of 9
  // plotted beside an amount of 4,500 USD makes the count invisible and the
  // chart pointless, so the columns are grouped by unit and the group carrying
  // the most weight wins — that is the measure the table is actually about.
  const chosen = dominantUnitGroup(table, numericCols)
  const { unit, cols } = chosen
  const excludedSeries = numericCols.length - cols.length

  // Each series carries a synthetic `key` and the header as its display `name`.
  // The key is NOT the header text: a header is arbitrary agent prose, and using
  // it as the field name makes the chart hostage to it. Two columns headed the
  // same overwrite each other; a column headed "label" silently replaces the
  // category axis; and the chart library resolves a string dataKey as a PATH,
  // so a header with a dot or brackets in it reads as nested access and finds
  // nothing — a plot with correct axes and no bars at all.
  const series = cols.map((i, k) => ({
    key: `v${k}`,
    name: cleanText(table.headers[i]) || `#${i + 1}`,
  }))
  const numericColsChosen = cols.length
  const data = []
  let excludedRows = 0
  // Toplam satırı grafikten DÜŞER (kendi yüksekliği ekseni ezip yanındaki
  // çubukları düzleştirir) ama DEĞERİ saklanır: pay kartının paydası
  // ajanın kendi toplamı olsun, bizim topladığımız sayı değil.
  let totalRow = null

  for (const row of table.rows) {
    const label = cleanText(row[labelCol])
    if (!label || EMPTY_CELLS.has(label)) continue
    // A total is the sum of the bars beside it. Charting it sets the axis to
    // its own height and flattens everything the reader came to compare.
    if (TOTAL_ROW.test(label)) {
      excludedRows += 1
      if (!totalRow) {
        const values = {}
        cols.forEach((col, k) => {
          const parsed = parseCell(row[col])
          if (parsed) values[`v${k}`] = parsed.value
        })
        totalRow = { label, values }
      }
      continue
    }
    const first = parseCell(row[cols[0]])
    if (!first) continue
    // A row that declares a different unit from its own column: a margin in %
    // sitting in a column of USD amounts. Charted, it would be a bar of 82
    // next to bars of 688,000 — invisible, and wrong to compare anyway. The
    // check only fires when the CELL names a unit; a bare number in a column
    // whose unit came from its header is not a mismatch.
    if (first.unit && unit && first.unit !== unit) {
      excludedRows += 1
      continue
    }

    const point = { label }
    cols.forEach((col, k) => {
      point[series[k].key] = parseCell(row[col])?.value ?? null
    })
    data.push(point)
  }

  if (data.length < 2) return null

  // A column can qualify as numeric on the whole table and still be empty on
  // the rows that survived the total and unit filters. Plotting it draws
  // nothing, and a legend entry for a line that isn't there is worse than no
  // legend.
  const plottable = series.filter((s) => data.filter((d) => Number.isFinite(d[s.key])).length >= 2)
  if (plottable.length === 0) return null

  // A table of nothing but zeros is not a chart. The agent emits these whenever
  // a figure could not be computed — a forecast block reading "+0 USD" on every
  // line above the sentence explaining that the quantities are missing — and
  // charting it draws an empty plot with a correct-looking axis, which reads as
  // broken rather than as "there is nothing here". Refusing sends `firstChartable`
  // on to the next table, which is usually the one with the actual figures.
  const anyNonZero = data.some((d) =>
    plottable.some((s) => Number.isFinite(d[s.key]) && d[s.key] !== 0),
  )
  if (!anyNonZero) return null

  // Ortak sözcükler işaretlerden çıkıp başlığa gider.
  const affixes = stripCommonAffixes(data.map((d) => d.label))
  affixes.labels.forEach((label, i) => {
    data[i].label = label
  })

  const timeAxis = data.every((d) => TIME_LIKE.test(d.label))
  // Rank the categories when the axis has no order of its own. A spend
  // breakdown is read to find the big one, and a sorted bar chart answers that
  // in the first glance instead of the third. Never for a time axis, where the
  // order IS the meaning, and never for multiple series, where sorting by one
  // of them quietly misrepresents the others.
  const sortable = !timeAxis && numericColsChosen === 1
  if (sortable) {
    data.sort((a, b) => Math.abs(b[plottable[0].key] ?? 0) - Math.abs(a[plottable[0].key] ?? 0))
  }
  const singleSeries = plottable.length === 1
  const allPositive = data.every((d) => (d[plottable[0].key] ?? 0) >= 0)
  const longestLabel = Math.max(...data.map((d) => d.label.length))

  const numericHeaders = numericCols.map((i) => cleanText(table.headers[i]))
  const insight = classifyInsight({
    series: plottable,
    numericHeaders,
    data,
    totalRow,
    timeAxis,
    allPositive,
    excludedRows,
  })

  // FARK kolonunun değeri veriye ayrı bir anahtarla iliştirilir.
  //
  // ⚠️ Neden gerekli: fark birimsiz yazıldığında (tablo "-7.841.236" der,
  // "USD" demez) baskın birim grubuna girmiyor ve GRAFİKTEN düşüyor — yani
  // `series`te yok ve değeri hiçbir veri noktasında bulunmuyor. Kart onu
  // manşette gösteriyor, o yüzden `vDiff` anahtarıyla taşınır. Çizime
  // GİRMEZ: grafikler `series` üzerinden dönüyor, veri anahtarları üzerinden
  // değil.
  if (insight.roles?.variance) {
    const varCol = numericCols[numericHeaders.indexOf(insight.roles.variance)]
    if (varCol != null) {
      const byLabel = new Map()
      for (const row of table.rows) {
        const label = cleanText(row[labelCol])
        const parsed = parseCell(row[varCol])
        if (label && parsed) byLabel.set(label, parsed.value)
      }
      // Etiketler ortak ekleri atıldıktan SONRA kısaltıldığı için ham
      // etiketle eşleşmiyor olabilir; ham sırayla da deneriz.
      data.forEach((point, i) => {
        const raw = cleanText(table.rows[i]?.[labelCol] ?? "")
        const value = byLabel.get(point.label) ?? byLabel.get(raw)
        if (typeof value === "number") point.vDiff = value
      })
      if (totalRow) {
        const totalParsed = table.rows
          .map((row) => ({ label: cleanText(row[labelCol]), row }))
          .find((r) => r.label === totalRow.label)
        const parsed = totalParsed ? parseCell(totalParsed.row[varCol]) : null
        if (parsed) totalRow.values.vDiff = parsed.value
      }
      insight.roles = { ...insight.roles, varianceKey: "vDiff" }
    }
  }

  return {
    // Tablonun üstündeki cümle: kart neyi gösterdiğini AJANIN sözüyle
    // söylesin, bizim uydurduğumuz bir başlıkla değil.
    caption: table.caption ? cleanText(table.caption).replace(/[:：]\s*$/, "") : "",
    ...insight,
    totalRow,
    timeAxis,
    labelHeader: cleanText(table.headers[labelCol]),
    // Her etiketin ortak yanı, kart başlığı için — işaretlerden düşürüldü
    // ama grafikten atılmadı.
    labelAffix: [affixes.prefix, affixes.suffix].filter(Boolean).join(" … "),
    series: plottable,
    data,
    unit,
    excludedRows,
    excludedSeries,
    defaultType: timeAxis ? "line" : "bar",
    // Long names or a lot of them: lay the bars on their side so the labels
    // read horizontally instead of being rotated, truncated or overlapped.
    // This is why a spend-by-category chart belongs on its side and a
    // month-by-month one does not.
    horizontal: !timeAxis && (longestLabel > 12 || data.length > 6),
    // A pie only means anything for one non-negative series that adds to a
    // whole; anything else and the slices are a lie. Capped at five slices
    // with short names on top of that, because past there the key is longer
    // than the chart and nobody can match a colour to a wedge — six long
    // expense categories produced a legend that covered the plot.
    canPie:
      singleSeries && allPositive && data.length >= 3 && data.length <= 5 && longestLabel <= 18,
  }
}

/** Total / subtotal rows, in both languages the tables come in. */
const TOTAL_ROW = /^(genel\s+)?(toplam|ara\s*toplam|total|subtotal|sum|grand\s+total)\s*:?$/i

/** Headers that name a row counter rather than a measurement. */
const INDEX_HEADER = /^(#|no|nr|sıra|sira|s\.?\s*no|index|idx)$/i

/**
 * A row counter dressed as data.
 *
 * The agent numbers its table rows, and 1,2,3,4,5,6 parses as a perfectly good
 * numeric column — which is how the expense chart ended up with the row index
 * drawn as its own series. Caught either by the header or by the values being
 * a plain ascending run from 1.
 */
function isIndexColumn(table, i) {
  if (INDEX_HEADER.test(cleanText(table.headers[i]))) return true
  const values = table.rows.map((r) => parseCell(r[i])?.value).filter((v) => typeof v === "number")
  if (values.length < table.rows.length - 1 || values.length < 3) return false
  return values.every((v, k) => v === k + 1)
}

/**
 * The unit a column is measured in, when the cells don't carry it.
 *
 * `Tutar (USD)` holds bare numbers — the unit is in the header. Without
 * reading it, an amount column and a receipt count both come back unitless,
 * land on one axis, and the count disappears against thousands of dollars.
 */
function headerUnit(rawHeader) {
  const header = cleanText(rawHeader)
  const parenthesised = /\(([^)]{1,6})\)\s*$/.exec(header)
  if (parenthesised) return parenthesised[1].trim().toUpperCase()
  const bare = /\b(USD|EUR|TRY|TL|MT|KG|TON)\b/i.exec(header)
  return bare ? bare[1].toUpperCase() : ""
}

/** Group the value columns by unit and return the heaviest group. */
function dominantUnitGroup(table, numericCols) {
  const groups = new Map()
  for (const col of numericCols) {
    let weight = 0
    const seen = new Map()
    for (const row of table.rows) {
      const parsed = parseCell(row[col])
      if (!parsed) continue
      seen.set(parsed.unit, (seen.get(parsed.unit) ?? 0) + 1)
      weight += Math.abs(parsed.value)
    }
    const unit =
      [...seen.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ||
      "" ||
      headerUnit(table.headers[col])
    const group = groups.get(unit) ?? { unit, cols: [], weight: 0 }
    group.cols.push(col)
    group.weight += weight
    groups.set(unit, group)
  }
  // Heaviest total magnitude wins: an explicit unit (USD) beats a bare count
  // without needing a list of which units are "important".
  return [...groups.values()].sort((a, b) => b.weight - a.weight)[0]
}

/**
 * Cevaptaki BÜTÜN çizilebilir tablolar, belge sırasıyla.
 *
 * Bir dönem yalnız İLKİ çiziliyordu ("tek mesaj, tek grafik — düğme belirli
 * bir şeye işaret etsin"). Ajan sık sık iki-üç tablo döndürüyor (segment
 * kırılımı + aylık seyir gibi) ve ikinci tablonun grafiği hiçbir yerden
 * ulaşılamıyordu. Artık hepsi çıkarılır, kart bir karuselle sayfalar.
 */
export function allChartable(markdown) {
  const out = []
  for (const table of extractTables(markdown)) {
    const analysis = analyseTable(table)
    if (analysis) out.push(analysis)
  }
  return out
}

/** İlk çizilebilir tablo, ya da null. */
export function firstChartable(markdown) {
  for (const table of extractTables(markdown)) {
    const analysis = analyseTable(table)
    if (analysis) return analysis
  }
  return null
}
