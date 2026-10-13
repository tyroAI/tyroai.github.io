import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { HugeiconsIcon } from "@hugeicons/react"
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon"
import Megaphone01Icon from "@hugeicons/core-free-icons/Megaphone01Icon"
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon"
import { useLocale } from "@/hooks/useLocale"
import { useIsInGroup } from "@/hooks/useIsInGroup"
import { usePageAccess } from "@/hooks/usePageAccess"
import { ADMIN_GROUP_ID } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { KindBadge, KindTile } from "./KindBadge"
import {
  fold,
  formatEntryDate,
  KIND_ORDER,
  pick,
  visibleEntries,
  writeSeenId,
  latestEntryId,
} from "./entryText"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  YENİLİKLER (`/whats-new`) — tam liste
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Pencere bir ÖZET; burası arşiv. Sol menüden, aramadan ve komut
 * paletinden açılır.
 *
 * ⚠️ **SAYFAYI AÇMAK OKUNDU SAYILIR.** Kullanıcı listeye baktıysa
 * menüdeki sayaç sönmeli; bakmasına rağmen yanan bir sayaç, göstergeyi bir
 * süre sonra tamamen görünmez kılar.
 *
 * ── DÜZEN: ZAMAN ÇİZGİSİ ───────────────────────────────────────────────
 *
 * Tarih kartın ÜSTÜNDE bir başlık değil, SOLDA bir raydır: aynı güne düşen
 * kayıtlar tek bir tarihin altında dikey bir çizgiyle bağlanır. Sebep okuma
 * sırası — göz soldan sağa gidiyor ve "ne zaman" sorusu "ne oldu"dan önce
 * geliyor. Tarih satır satır tekrar etmediği için liste uzadıkça
 * sakinleşiyor.
 *
 * ⚠️ Ray yalnız GENİŞ alanda çizilir (`@[640px]`). Dar alanda (telefon)
 * 92 px'lik bir sol sütun kart metnine kalan yeri yer; orada tarih kartın
 * üstünde küçük bir kaş olarak durur.
 *
 * ⚠️ **SAYFALAMA DEĞİL, "DAHA FAZLA GÖSTER".** Numaralı sayfalama bir ZAMAN
 * AKIŞINA uymuyor (okuyan yukarıdan aşağı iniyor, sayfa sınırı da grubun
 * ortasından geçerdi); sonsuz kaydırma ise "arşiv nereye kadar gidiyor"
 * sorusunu cevapsız bırakır. Düğme KAÇ TANE KALDIĞINI yazar.
 *
 * ⚠️ **ARAMA VE SÜZGEÇ TÜM KAYITLARDA ÇALIŞIR, YÜKLENENLERDE DEĞİL.** Aksi
 * hâlde eşleşen kayıt sınırın altında kaldığında arama "sonuç yok" derdi.
 * Gruplama DİLİMDEN SONRA yapılır, yoksa her basışta aynı tarih iki kez
 * çizilirdi.
 */
/**
 * ⚠️ **"Düzeltme" ÇİPİ YALNIZ YÖNETİCİDE.** Düzeltme kayıtları yönetici
 * olmayana hiç gelmiyor (bkz. `visibleEntries`); çipi herkese çizmek,
 * basınca her zaman "eşleşen kayıt yok" diyen bir düğme demekti — kapalı
 * değil BOZUK görünürdü.
 */
const FILTERS = ["all", "feature", "improvement", "fix"]
const FILTERS_PUBLIC = FILTERS.filter((f) => f !== "fix")
const PAGE_SIZE = 20

function EntryCard({ entry, onGo, targeted }) {
  const { t, locale } = useLocale()
  return (
    /* ⚠️ `id` ÇAPADIR VE AYLARDIR EKSİKTİ. Kartın kaşı, başlığı ve (hedefsiz
       kayıtta) "Yeniliği keşfet" düğmesi `/whats-new#<kayıt-id>`ye gidiyor;
       bu `id` olmadan hash hiçbir şeye denk gelmiyordu ve sayfa hep EN
       BAŞTAN açılıyordu (ölçüldü: `document.getElementById(hash)` → null).
       `scroll-mt`: kaydırma hedefi sayfanın üst dolgusunun altında kalmasın.
       Halka geçici DEĞİL, hash değişene kadar duruyor — "aradığın kayıt bu"
       demenin en ucuz yolu ve kaybolan bir vurgu geç bakan gözü ıskalar. */
    <article
      id={entry.id}
      className={cn(
        "group scroll-mt-24 rounded-xl border bg-card px-4 py-3.5 transition hover:shadow-sm",
        targeted ? "border-brand/50 ring-2 ring-brand/25" : "border-border hover:border-border/80",
      )}
    >
      <div className="flex items-start gap-3">
        <KindTile kind={entry.kind} className="mt-0.5 size-7" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-[0.875rem] font-semibold leading-snug tracking-[-0.01em] text-foreground">
              {pick(entry.title, locale)}
            </h3>
            <KindBadge kind={entry.kind} />
          </div>
          {/* ⚠️ BRIEF TEK BAŞINA ANLAMLI: pencerede yalnız bu çiziliyor,
              maddeler orada YOK. Pencere bir kesinti, burası bir referans —
              kullanıcıyı durdurduğun yerde madde listesi okutmak,
              durdurmanın bedelini iki katına çıkarır. */}
          <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-muted-foreground">
            {pick(entry.body, locale)}
          </p>
          {entry.points?.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1">
              {entry.points.map((pt, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-[0.78125rem] leading-relaxed text-muted-foreground"
                >
                  {/* Madde imi bir GLİF değil bir nokta: liste zaten kısa
                      ve ikon her satırda tekrar eden sıfır-bit bir işaret
                      olurdu. */}
                  <span
                    aria-hidden="true"
                    className="mt-[0.4375rem] size-1 shrink-0 rounded-full bg-foreground/[0.45]"
                  />
                  <span className="min-w-0">{pick(pt, locale)}</span>
                </li>
              ))}
            </ul>
          )}
          {entry.to && (
            <button
              type="button"
              onClick={() => onGo(entry.to)}
              className="mt-2 inline-flex items-center gap-1 text-[0.78125rem] font-medium text-brand transition hover:gap-1.5 [@media(pointer:coarse)]:min-h-9"
            >
              {t("whatsNew.goLook")}
              <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" strokeWidth={2.2} />
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

export function WhatsNewPage() {
  const { t, locale } = useLocale()
  const navigate = useNavigate()
  // ⚠️ ÜÇ DEĞERLİ: `undefined` = henüz çözülmedi. `=== true` ile ezip
  // geçmek, sayfanın ilk kareyi yönetici-değil listesiyle çizmesi ve o
  // listeden okundu işareti YAZMASI demekti — yöneticinin göremediği
  // kayıtlar sessizce okunmuş sayılırdı (keşifte "admin race" olarak
  // yakalandı).
  const adminVerdict = useIsInGroup(ADMIN_GROUP_ID)
  const isAdmin = adminVerdict === true
  const [query, setQuery] = useState("")
  const [kind, setKind] = useState("all")
  const [limit, setLimit] = useState(PAGE_SIZE)
  /* Adresteki `#<kayıt-id>`. `useLocation` şart: aynı sayfadayken yalnız
     hash değişince (kart kaşından başka bir kayda gitmek) yeniden çizim
     olmazdı ve kaydırma tetiklenmezdi. */
  const targetId = useLocation().hash.slice(1)

  // Rota kapısı: açamadığı sayfayı anlatan kayıt arşivde de yok — "Yeniliği
  // keşfet" onu dashboard'a düşürürdü (`visibleEntries` › `canOpen`).
  const { canOpen } = usePageAccess()
  const entries = useMemo(() => visibleEntries({ isAdmin, canOpen }), [isAdmin, canOpen])

  // Sayfayı açmak okundu saymak: sayaç sönsün. Render sırasında yazmak
  // güvenli — depolama, React durumu değil, yeniden render tetiklemiyor.
  //
  // ⚠️ Cevap gelmeden YAZILMAZ. Bekleyen kare listeyi dar gösteriyor ve
  // o listeden yazılan işaret, yöneticiye özel kayıtları hiç görmeden
  // okunmuş yapardı.
  const latest = latestEntryId(entries)
  if (latest && adminVerdict !== undefined) writeSeenId(latest)

  const shown = useMemo(() => {
    const needle = fold(query.trim())
    return entries.filter((e) => {
      if (kind !== "all" && e.kind !== kind) return false
      if (!needle) return true
      // ⚠️ MADDELER DE TARANIR: ekranda görünen her metin aranabilir
      // olmak zorunda. Kayıt bir konuyu yalnız maddesinde anıyorsa,
      // aranınca bulunamaması "yok" demekle aynı şey.
      const hay = fold(
        `${pick(e.title, locale)} ${pick(e.body, locale)} ${(e.points ?? [])
          .map((pt) => pick(pt, locale))
          .join(" ")}`,
      )
      return hay.includes(needle)
    })
  }, [entries, kind, query, locale])

  /**
   * Gün İÇİNDE tür sırası: Yeni → İyileştirme → Düzeltme.
   *
   * ⚠️ **GÜNLERİN SIRASINA DOKUNULMAZ.** Tarihe göre genel bir `sort`
   * yazmak cazip ama yanlış: dosyadaki sıra tek doğruluk kaynağı ve
   * `entriesSince` onun üzerinden hesaplıyor. Sıralama yalnız AYNI TARİHLİ
   * ardışık koşu içinde yapılıyor, yani hiçbir kayıt gününü değiştirmiyor
   * ve tarihler bitişik kalıyor (gruplama buna dayanıyor — dağılsaydı aynı
   * tarih birden çok grup olur ve `key={g.date}` çakışırdı).
   *
   * ⚠️ **KIRPMADAN ÖNCE.** `slice(limit)` sonrasında sıralasaydım, "daha
   * fazla göster"e her basışta gelen yeni yenilikler okunmuş kayıtların
   * ÜSTÜNE girer ve liste her seferinde zıplardı.
   *
   * ⚠️ Kaynak dizi (`shown` → `entries` → `CHANGELOG`) MUTASYONA UĞRAMAZ:
   * her koşu kendi kopyasında sıralanıyor. `sort` yerinde çalışır ve
   * `CHANGELOG` bir modül tekili — orada sıralamak üç yüzeyi birden
   * tek satırdan bozardı.
   */
  const ordered = useMemo(() => {
    const out = []
    let run = []
    const flush = () => {
      if (!run.length) return
      // Kararlı sıralama: aynı tür içinde dosyadaki sıra korunur.
      out.push(...run.sort((a, b) => (KIND_ORDER[a.kind] ?? 99) - (KIND_ORDER[b.kind] ?? 99)))
      run = []
    }
    for (const e of shown) {
      if (run.length && run[0].date !== e.date) flush()
      run.push(e)
    }
    flush()
    return out
  }, [shown])

  /* ⚠️ HEDEF KAYIT KIRPMANIN ALTINDA KALABİLİR. Sayfa 20'şer açılıyor;
     46. kayda giden bir hash, kart DOM'da hiç olmadığı için hiçbir yere
     kaydırmazdı. Kırpma bu yüzden TÜRETİLİYOR, `setLimit` ile DEĞİL: bu
     depoda efekt içinde `setState` lint ile yasak ve gereksiz bir render
     turu olurdu. Kullanıcı "daha fazla göster"e basarsa `limit` yine kendi
     sayacından büyür — ikisi çakışmıyor, büyük olan kazanıyor. */
  const effectiveLimit = useMemo(() => {
    if (!targetId) return limit
    const i = ordered.findIndex((e) => e.id === targetId)
    return i < 0 ? limit : Math.max(limit, i + 1)
  }, [targetId, ordered, limit])

  /* Kaydırma bir DOM yan etkisi, durum değil. Süzgeç/arama hedefi listeden
     eleyebilir — o hâlde sessizce hiçbir şey yapılmıyor, sayfa başında
     kalıyor. `smooth` DEĞİL: kullanıcı zaten bir bağlantıya bastı, uzun
     bir kayma "gitti mi?" sorusunu doğuruyor. */
  useEffect(() => {
    if (!targetId) return
    const el = document.getElementById(targetId)
    el?.scrollIntoView({ block: "center" })
  }, [targetId, effectiveLimit])

  const groups = useMemo(() => {
    const out = []
    for (const e of ordered.slice(0, effectiveLimit)) {
      const last = out[out.length - 1]
      if (last && last.date === e.date) last.items.push(e)
      else out.push({ date: e.date, items: [e] })
    }
    return out
  }, [ordered, effectiveLimit])

  const reset = (fn) => (value) => {
    fn(value)
    setLimit(PAGE_SIZE)
  }

  return (
    <div className="@container/whatsnew mx-auto flex h-full w-full max-w-3xl flex-col gap-5 overflow-y-auto overflow-x-hidden px-4 pb-12 pt-5 sm:px-6">
      <header className="flex flex-col gap-2">
        <span className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft/60 text-brand ring-1 ring-brand/15"
          >
            <HugeiconsIcon icon={Megaphone01Icon} className="size-4.5" strokeWidth={2} />
          </span>
          <span className="min-w-0">
            <h1 className="text-[1.25rem] font-semibold leading-tight tracking-[-0.015em]">
              {t("whatsNew.title")}
            </h1>
            <p className="text-[0.78125rem] leading-snug text-muted-foreground">
              {t("whatsNew.page.subtitle")}{" "}
              <span className="tabular-nums">
                {t("whatsNew.page.count").replace("{n}", String(entries.length))}
              </span>
            </p>
          </span>
        </span>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[11rem] flex-1">
          <HugeiconsIcon
            icon={Search01Icon}
            aria-hidden="true"
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.8}
          />
          {/* `no-ios-zoom`: 16px altı bir girişe odaklanınca Safari sayfayı
              yakınlaştırıyor. */}
          <input
            value={query}
            onChange={(ev) => reset(setQuery)(ev.target.value)}
            placeholder={t("whatsNew.searchPlaceholder")}
            aria-label={t("whatsNew.searchPlaceholder")}
            className="no-ios-zoom h-9 w-full rounded-lg border border-border bg-card pl-8 pr-3 text-[0.8125rem] outline-none transition focus-visible:ring-2 focus-visible:ring-brand/40"
          />
        </label>
        <div className="flex gap-0.5 rounded-lg bg-muted/60 p-0.5">
          {(isAdmin ? FILTERS : FILTERS_PUBLIC).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => reset(setKind)(f)}
              aria-pressed={kind === f}
              lang={locale}
              className={cn(
                "rounded-md px-2.5 py-1 text-[0.75rem] font-medium transition [@media(pointer:coarse)]:min-h-9",
                kind === f
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(`whatsNew.kind.${f}`)}
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 && (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-[0.8125rem] text-muted-foreground">
          {t("whatsNew.empty")}
        </p>
      )}

      <ol className="flex flex-col gap-4">
        {groups.map((g) => (
          <li key={g.date} className="@[640px]/whatsnew:flex @[640px]/whatsnew:gap-5">
            {/* Geniş alanda tarih SOLDA bir ray; dar alanda kartın üstünde
                bir kaş. İki düzen tek `<h2>` ile kurulur — ikinci bir başlık
                çizmek, ekran okuyucuya aynı tarihi iki kez söyletirdi. */}
            <h2
              lang={locale}
              className={cn(
                "shrink-0 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground",
                "mb-2 @[640px]/whatsnew:mb-0 @[640px]/whatsnew:w-[5.75rem] @[640px]/whatsnew:pt-4 @[640px]/whatsnew:text-right",
              )}
            >
              {formatEntryDate(g.date)}
            </h2>
            <div className="relative min-w-0 flex-1 @[640px]/whatsnew:border-l @[640px]/whatsnew:border-border @[640px]/whatsnew:pl-5">
              {/* Rayın üstündeki nokta: tarihin listedeki yerini işaretler. */}
              <span
                aria-hidden="true"
                className="absolute -left-[0.28125rem] top-[1.125rem] hidden size-2 rounded-full bg-border @[640px]/whatsnew:block"
              />
              <div className="flex flex-col gap-2.5">
                {g.items.map((e) => (
                  <EntryCard key={e.id} entry={e} onGo={navigate} targeted={e.id === targetId} />
                ))}
              </div>
            </div>
          </li>
        ))}
      </ol>

      {ordered.length > effectiveLimit && (
        <button
          type="button"
          onClick={() => setLimit(() => effectiveLimit + PAGE_SIZE)}
          className="mx-auto w-fit rounded-lg border border-border bg-card px-4 py-2 text-[0.78125rem] font-medium text-foreground transition hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [@media(pointer:coarse)]:min-h-9"
        >
          {t("whatsNew.more").replace("{n}", String(ordered.length - effectiveLimit))}
        </button>
      )}
    </div>
  )
}
