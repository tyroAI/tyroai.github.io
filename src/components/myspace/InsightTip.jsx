import { useState } from "react"
import { Link } from "react-router-dom"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-mobile"
import { useHoverPopover } from "@/hooks/useHoverPopover"
import { useLocale } from "@/hooks/useLocale"
import { alignFor } from "@/lib/placement"
import { cn } from "@/lib/utils"

/**
 * Akışım'ın ipucu kartı — koyu zemin: başlık · paletten renkli üst etiket ·
 * satırlar · "+n daha" · not (tyroforecast'in "Yönetici Özeti" deseni).
 *
 * İki tüketici ve bu yüzden ayrı dosyada: günün özetinin vurgulu sayıları
 * (`DaySummary`) ve toplantı ritminin çubukları (`MeetingRhythmCard`, istek:
 * *"çubukların üzerine gelince güzel tooltip yap, sayfanın diğer yerlerinde
 * yaptığımız gibi"*). İkinci bir kopya, aynı sayfada iki farklı ipucu dili
 * demekti.
 *
 * Açılış `useHoverPopover`: farede üstüne gelince, dokunuşta ve klavyede
 * basınca; sayfada aynı anda tek ipucu. `children` TEK bir odaklanabilir
 * eleman olmalı (Radix `asChild`) — kancanın olayları ve `data-state` ona
 * takılır.
 */
/**
 * `valueLang`: satır değerlerinin dili. Varsayılan `"tr"` (toplantı ve iş
 * adları); dosya adları gibi dilini bilmediğimiz değerlerde `null` — yanlış
 * bir `lang`, ekran okuyucuya kelimeyi yanlış dilde okutur.
 */
/**
 * `rows[].to` · `action`: ipucu bir YER gösterdiğinde oraya
 * götürür — satırın değeri o kaydı açar (Keşfet'te bir duyuru), `action`
 * kartın dibinde tek bağlantı ("Keşfet'te aç"). İkisi de isteğe bağlı;
 * ritim çubukları ve öteki satırlar eskisi gibi düz metin. Bağlantı uygulama
 * içi (`Link`): ipucu kapanmayı beklemez, rota değişince sayfayla birlikte
 * söner. Fareyle karta geçmek ipucunu açık tutuyor (`useHoverPopover`),
 * klavyede odak zaten içeride.
 */
// Yön seçimi için kartın yaklaşık ölçüsü (px): satırlı ipucu ve liste (davet, toplantı).
const TIP_SIZE = { width: 288, height: 300 }
const LIST_SIZE = { width: 352, height: 440 }
// İpucu metne dikey bağlı okunur: tercih yönü sığmazsa önce karşısı.
const OPPOSITE = { top: "bottom", bottom: "top", left: "right", right: "left" }

const ACTION_CLASS =
  "mt-3 inline-flex items-center gap-1 self-start rounded-full bg-white/10 px-3 py-1.5 text-[0.75rem] font-semibold text-white outline-none ring-1 ring-white/15 transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/60 [@media(pointer:coarse)]:min-h-10"

/**
 * Kartın dibindeki tek eylem: bir YER (`to`, uygulama içi bağlantı) ya da bir
 * İŞ (`onClick`, ör. header/çentik panelini açmak). İş, ipucu KAPANDIKTAN
 * sonra koşar: kapanış odağı tetiğe geri verir, açılan panel de odağı
 * istiyor — sıra tersine dönerse odak tetikte kalırdı.
 */
function TipAction({ action, onDone }) {
  const body = (
    <>
      {action.label}
      <HugeiconsIcon
        icon={ArrowRight01Icon}
        className="size-3.5 rtl:rotate-180"
        strokeWidth={2}
        aria-hidden="true"
      />
    </>
  )
  if (action.to) {
    return (
      <Link to={action.to} className={ACTION_CLASS}>
        {body}
      </Link>
    )
  }
  return (
    <button
      type="button"
      onClick={() => {
        onDone()
        requestAnimationFrame(() => action.onClick())
      }}
      className={ACTION_CLASS}
    >
      {body}
    </button>
  )
}

/**
 * İpucunun satırları. `limit` verilirse ilk N satır + "+n daha" DÜĞMESİ: basınca
 * hepsi ipucunun içinde açılır (uzunsa kayar). Durum bu bileşende — ipucu
 * kapanınca içerik söküldüğü için bir sonraki açılış yine kısa listeyle başlar.
 */
function TipRows({ rows, limit, valueLang }) {
  const { t } = useLocale()
  const [all, setAll] = useState(false)
  const hidden = limit ? rows.length - limit : 0
  const shown = hidden > 0 && !all ? rows.slice(0, limit) : rows
  return (
    <>
      <dl
        className={cn(
          "mt-3 grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3 gap-y-2 text-[0.8125rem] leading-snug",
          all && "max-h-[min(50vh,18rem)] overflow-y-auto pr-1 [scrollbar-width:thin]",
        )}
      >
        {shown.map((r, i) => (
          <div key={i} className="contents">
            <dt className="max-w-[8rem] tabular-nums text-white/55 [overflow-wrap:anywhere]">
              {r.label}
            </dt>
            <dd
              lang={valueLang ?? undefined}
              className="min-w-0 font-medium [overflow-wrap:anywhere]"
            >
              {r.to ? (
                <Link
                  to={r.to}
                  className="rounded-sm underline decoration-white/25 underline-offset-[0.2em] outline-none transition-colors hover:decoration-white/70 focus-visible:ring-2 focus-visible:ring-white/50"
                >
                  {r.value}
                </Link>
              ) : (
                r.value
              )}
            </dd>
          </div>
        ))}
      </dl>
      {hidden > 0 && !all && (
        <button
          type="button"
          onClick={() => setAll(true)}
          className="mt-1.5 self-start rounded-sm text-[0.75rem] font-medium text-white/70 underline decoration-white/25 underline-offset-[0.2em] outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white/50 [@media(pointer:coarse)]:min-h-10"
        >
          {t("myspace.tip.more", { n: hidden })}
        </button>
      )}
    </>
  )
}

/** İpucunun içeriği — açılır kutuda ve telefondaki alt panelde aynı. */
function TipBody({ title, kicker, rows, limit, list, more, note, action, valueLang, close }) {
  const { locale } = useLocale()
  return (
    <>
      {/* İlk harf büyük: `Intl` RU'da hafta gününü küçük yazıyor
          ("понедельник, 28 сентября") ve başlık küçük harfle başlıyordu. */}
      <p className="text-[0.9375rem] font-semibold leading-snug [overflow-wrap:anywhere] [&::first-letter]:uppercase">
        {title}
      </p>
      {kicker && (
        <p
          lang={locale}
          className="mt-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-[color-mix(in_oklch,var(--brand-to)_62%,white)]"
        >
          {kicker}
        </p>
      )}
      {/* Hiçbir satır kırpılmaz: ipucunun işi kısaltılmış bir şeyi TAM
          göstermek. Etiket de değer de sarar; etiket sütunu 8rem'le sınırlı. */}
      {rows?.length > 0 && <TipRows rows={rows} limit={limit} valueLang={valueLang} />}
      {/* Satır yerine kendi listesini çizen ipucu (davetler). İşlev verilirse
          ipucunu kapatan `close` alır — liste bir pencere açmadan önce. */}
      {typeof list === "function" ? list(close) : list}
      {/* `more` bir METİN ("+1 daha"), sayı değil. */}
      {more && !limit && <p className="mt-1.5 text-[0.75rem] text-white/55">{more}</p>}
      {note && <p className="mt-3 text-[0.75rem] leading-snug text-white/65">{note}</p>}
      {action && <TipAction action={action} onDone={close} />}
    </>
  )
}

export function InsightTip({
  title,
  kicker,
  rows,
  limit,
  list,
  more,
  note,
  action,
  side = "top",
  align = "center",
  valueLang = "tr",
  children,
}) {
  // Yön açılışta seçilir: tercih `side`, sığmazsa en geniş boşluk (`lib/placement`).
  const tip = useHoverPopover({
    side,
    prefer: [side, OPPOSITE[side]],
    size: list ? LIST_SIZE : TIP_SIZE,
  })
  const isMobile = useIsMobile()
  const [sheetOpen, setSheetOpen] = useState(false)
  const bodyProps = { title, kicker, rows, limit, list, more, note, action, valueLang }

  // Telefonda uzun liste (davetler) açılır kutuya sığmıyor, ekranın üstünde
  // kırpılıyordu: dokununca alttan panel açılır.
  if (isMobile && list) {
    return (
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>{children}</SheetTrigger>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          aria-describedby={undefined}
          className="max-h-[85dvh] gap-0 overflow-y-auto overscroll-contain rounded-t-3xl [scrollbar-gutter:auto]! border-0 bg-neutral-900 px-4 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-2.5 text-white dark:bg-neutral-800"
        >
          <span
            aria-hidden="true"
            className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-white/25"
          />
          <SheetTitle className="sr-only">{title}</SheetTitle>
          <TipBody {...bodyProps} close={() => setSheetOpen(false)} />
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Popover open={tip.open} onOpenChange={tip.onOpenChange}>
      <PopoverTrigger asChild {...tip.triggerProps}>
        {children}
      </PopoverTrigger>
      <PopoverContent
        side={tip.side}
        align={alignFor(tip.side, align)}
        sideOffset={8}
        collisionPadding={12}
        {...tip.contentProps}
        aria-label={title}
        className={cn(
          "max-h-[var(--radix-popover-content-available-height)] max-w-[calc(100vw-1.5rem)] gap-0 overflow-y-auto overscroll-contain rounded-2xl bg-neutral-900 [scrollbar-gutter:auto]! p-4 text-white shadow-2xl ring-1 ring-white/10 dark:bg-neutral-800",
          list ? "w-[22rem]" : "w-72",
        )}
      >
        <TipBody {...bodyProps} close={tip.close} />
      </PopoverContent>
    </Popover>
  )
}
