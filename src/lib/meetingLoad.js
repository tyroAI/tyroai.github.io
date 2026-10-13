/**
 * ═══════════════════════════════════════════════════════════════════════
 *  TOPLANTI RİTMİ — haftanın günlerine düşen toplantı süresi
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ⚠️ **REFERANSTAKİ "ODAK RİTMİN" KARTININ YERİNE.** Referans haftalık
 * "odaklı çalışma dakikası" çiziyordu ve o sayının bizde KAYNAĞI YOK: Graph
 * odak süresi vermiyor (Viva Insights ayrı bir ürün). Uydurmak yerine aynı
 * görsel dil, elimizdeki GERÇEK veriyle kuruldu — `calendarView`dan gelen
 * etkinliklerin gün başına toplantı süresi.
 *
 * Kurallar, üçü de "süs değil ölçü" ilkesinden:
 *
 * 1. **ÇAKIŞAN TOPLANTI İKİ KEZ SAYILMAZ.** 10:00-11:00 ile 10:30-11:30
 *    aynı gün 90 dakikadır, 120 değil — kişinin takviminde geçirdiği süre
 *    aralıkların BİRLEŞİMİ. Toplamak, çift rezervasyonu olan birinin gününü
 *    olduğundan dolu gösterirdi.
 * 2. **REDDEDİLEN ve TÜM GÜN SÜREN SAYILMAZ.** Reddedilmiş bir davet takvimde
 *    duruyor ama kişi orada değil; tüm gün etkinlikleri (izin, tatil, bayram)
 *    bir toplantı değil bir DURUM.
 * 3. **YALNIZ KENDİ TAKVİMİN.** Paylaşılmış takvimler (`owner !== null`)
 *    başkasının günü.
 *
 * Gece yarısını geçen bir toplantı iki güne BÖLÜNÜR: her gün yalnız kendi
 * içine düşen dakikayı alır.
 */

/**
 * Haftanın başı — ilk gün ÇAĞIRANDAN gelir (`firstDayOfWeek(locale)`,
 * `lib/weekStart.js`). Takvim ızgarası ve özel günler paneli aynı tabloyu
 * okuyor; burada ikinci bir "pazartesi" yazmak, çubukların ızgaranın
 * haftasından bir gün kaymasına yol açardı (EN'de hafta pazar başlıyor).
 */
export function startOfWeek(d, firstDay = 1) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = (x.getDay() - firstDay + 7) % 7
  x.setDate(x.getDate() - diff)
  return x
}

function addDays(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

/** Aralıkların birleşiminin toplam dakikası. */
function unionMinutes(intervals) {
  if (!intervals.length) return 0
  const sorted = [...intervals].sort((a, b) => a[0] - b[0])
  let total = 0
  let [curStart, curEnd] = sorted[0]
  for (let i = 1; i < sorted.length; i += 1) {
    const [s, e] = sorted[i]
    if (s <= curEnd) {
      if (e > curEnd) curEnd = e
    } else {
      total += curEnd - curStart
      curStart = s
      curEnd = e
    }
  }
  total += curEnd - curStart
  return Math.round(total / 60000)
}

/**
 * `weekStart`tan başlayan 7 günün her birine düşen toplantı dakikası.
 * Dönen: `[{ date, minutes, items, overlap }]` — uzunluğu her zaman 7.
 *
 * `items` o güne düşen toplantılar (`{ event, from, to }`, gün sınırına
 * KIRPILMIŞ ve başlangıca göre sıralı) — çubuğun ipucu onları yazıyor
 * (istek: *"çubukların üzerine gelince güzel tooltip"*). `overlap`: sürelerin
 * TOPLAMI birleşimden büyük, yani çakışma var — ipucu o zaman "bir kez
 * sayıldı" der, çünkü listedeki sürelerin toplamı çubuğun sayısından büyük
 * çıkıyor ve açıklamasız bir fark hesabın yanlış olduğunu düşündürürdü.
 */
export function meetingMinutesByDay(events, weekStart) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const from = addDays(weekStart, i)
    return {
      date: from,
      from: from.getTime(),
      to: addDays(from, 1).getTime(),
      spans: [],
      items: [],
    }
  })
  for (const e of events ?? []) {
    if (!e?.start || !e?.end) continue
    if (e.isAllDay) continue
    if (e.owner) continue
    if (e.myResponse === "declined") continue
    const s = e.start.getTime()
    const en = e.end.getTime()
    if (!(en > s)) continue
    for (const day of days) {
      const a = Math.max(s, day.from)
      const b = Math.min(en, day.to)
      if (b > a) {
        day.spans.push([a, b])
        day.items.push({ event: e, from: a, to: b })
      }
    }
  }
  return days.map((d) => {
    const minutes = unionMinutes(d.spans)
    const summed = Math.round(d.spans.reduce((sum, [a, b]) => sum + (b - a), 0) / 60000)
    return {
      date: d.date,
      minutes,
      items: d.items.sort((x, y) => x.from - y.from),
      overlap: summed > minutes,
    }
  })
}

/**
 * Geçen haftanın, bu haftanın ve gelecek haftanın dizileri.
 *
 * ⚠️ **GEÇEN HAFTA ARALIĞIN DIŞINA TAŞARSA `null`.** Takvim çentikle AYNI
 * aralıktan okunuyor (`defaultCalendarRange` — önbellek anahtarı ortak, yani
 * ek istek yok) ve o aralık ayın ilk gününün bir hafta öncesinden başlıyor.
 * Ayın ilk günlerinde geçen haftanın başı bunun da dışına düşebiliyor; o
 * hâlde toplamı hesaplamak EKSİK bir sayı basmak olurdu — sessizce düşük bir
 * sayı. Seçenek o hâlde hiç sunulmuyor. (2026-10-02'den beri aralık bugünden en
 * az 14 gün geri gidiyor — `calendarRange` —, yani bu dal artık bir koruma.)
 *
 * Aynı kural ileriye de: gelecek haftanın SONU aralığın dışındaysa `null`
 * (aralık bugünden en az 14 gün ileri gidiyor, yani pratikte hep dolu —
 * `calendarRange`; koruma, aralık bir gün kısalırsa sessizce eksik sayı
 * basılmasın diye).
 */
export function meetingLoad(events, now, rangeStart, firstDay = 1, rangeEnd = null) {
  const thisWeek = startOfWeek(now, firstDay)
  const lastWeek = addDays(thisWeek, -7)
  const nextWeek = addDays(thisWeek, 7)
  return {
    current: meetingMinutesByDay(events, thisWeek),
    previous: rangeStart && lastWeek < rangeStart ? null : meetingMinutesByDay(events, lastWeek),
    next:
      rangeEnd && addDays(nextWeek, 7) > rangeEnd ? null : meetingMinutesByDay(events, nextWeek),
  }
}
