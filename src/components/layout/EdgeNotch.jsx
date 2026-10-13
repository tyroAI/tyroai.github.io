import { forwardRef, useEffect, useId, useState } from "react"
import { motion } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import Mail01Icon from "@hugeicons/core-free-icons/Mail01Icon"
import CalendarAdd01Icon from "@hugeicons/core-free-icons/CalendarAdd01Icon"
import Archive02Icon from "@hugeicons/core-free-icons/Archive02Icon"
import { MailPopover } from "@/components/common/MailPopover"
import { CalendarPopover } from "@/components/common/CalendarPopover"
import { FilesPopover } from "@/components/common/FilesPopover"
import { Mail01Icon as AnimatedMailIcon } from "@/components/ui/mail-01"
import { CalendarAdd01Icon as AnimatedCalendarIcon } from "@/components/ui/calendar-add-01"
import { Archive02Icon as AnimatedArchiveIcon } from "@/components/ui/archive-02"
import { useAnimatedIcon } from "@/hooks/useAnimatedIcon"
import { useWhatsNewCardStyle } from "@/hooks/useWhatsNewCardStyle"
import { useEdgeNotchDesign } from "@/hooks/useEdgeNotchDesign"
import { EDGE_NOTCH_DESIGN_ATTR } from "@/lib/edgeNotchDesign"
import { useLocale } from "@/hooks/useLocale"
import { useEdgeNotchOpen } from "@/hooks/useEdgeNotchOpen"
import {
  NOTCH_BLEED_REM,
  NOTCH_COLLAPSED_X,
  NOTCH_ENTER_X,
  NOTCH_SHELL_CLASS,
  NOTCH_TOP,
} from "@/lib/edgeNotchGeometry"
import { readEdgeNotchOpen, writeEdgeNotchOpen } from "@/lib/edgeNotchState"
import { onPanelRequest } from "@/lib/panelBus"
import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon"
import { cn } from "@/lib/utils"
import { useNotchCounts } from "./useNotchCounts"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  SAĞ KENAR ÇENTİĞİ — palet renkli ray, header'ın panelleri
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Referans: `nova-right-edge-panel-react` (Astra, 2026-09-20). Üç tur:
 *   1. ışıklı plaka + açık popover → "rezalet"
 *   2. referansın 108px siyah rayı + KENDİ koyu sekmeli flyout'u
 *   3. (bu) ray %22 küçüldü, siyah yerine PALETİN derin tonu, ve tıklama
 *      header'daki AYNI posta/takvim/dosya panellerini açıyor — kendi
 *      flyout gitti (istek: "detay ekranları yukarıdaki butonlarda açılan
 *      ekranlar olsun").
 *
 * ── NEDEN HEADER'IN PANELİ ────────────────────────────────────────────
 * Aynı verinin iki hikâyesi olmasın: paneller `trigger` prop'u aldı, ray
 * düğmesi o kapıdan giriyor ve panel `side="left"` ile rayın solunda
 * açılıyor. Kendi flyout'um satırları yeniden yazıyordu — kısa ömürlü oldu
 * ve iyi ki: header'daki panel bağlan/izin/hata/boş hâllerinin hepsini
 * zaten biliyor.
 *
 * ── HALKA SÜS DEĞİL, ÖLÇÜ ─────────────────────────────────────────────
 * Referansın halkası sabit bir çeyrek yay. Burada yay gerçek oran:
 * posta = bugün okunmamış / bugün gelen · takvim = biten / bugünkü toplam ·
 * dosya = bugün dokunulan / son 25. Rozet sayısı aynı kaynaktan (posta:
 * header rozetiyle AYNI `unread`). Veri yoksa yay da rozet de yok.
 *
 * ── RENK ─────────────────────────────────────────────────────────────
 * Yüzey Yenilikler kartının reçetesi (`--notch-*`, index.css ↔
 * `SpeakingCard.css`): gece mavisi taban + `--brand-via` %12. Bir tur
 * `--brand-deep`ten türetildi ve Insta'da mor kaçtı — o token bazı
 * paletlerde siyaha/beyaza düşüyor, kart bunu zaten ölçmüştü. Halka
 * renkleri gradyanın üç durağı.
 *
 * ── AÇ / KAPA ────────────────────────────────────────────────────────
 * Sol kenarın ortasında dikey bir tutamak çizgisi: tıklayınca ray sağa
 * kayıp yalnız o şerit kalıyor, tekrar tıklayınca geri geliyor. Tercih
 * `tyro-edge-notch-v1`de (bkz. lib/edgeNotchState.js) — daraltan kullanıcı
 * her açılışta yeniden daraltmasın. Kayma `translateX`, `display` DEĞİL:
 * kapalıyken de mount kalıyor, kancalar veriyi tutuyor, açılış anında
 * halkalar boş görünmüyor.
 *
 * ── ŞEKİL ────────────────────────────────────────────────────────────
 * Referansın silüeti BİREBİR (5. tur, 2026-09-20: *"kıvrımı Astra daha
 * güzel yaptı, aynısını yap; açılır-kapanır ve detay panelleri bizim"*).
 * `nova-right-edge-panel-react 2` rayı `::before` ile TEK bir SVG yol
 * çiziyor (90×420, `preserveAspectRatio="none"`): duvardan dikey teğetle
 * çıkan, iki kübikle sola akıp gövdeye yine dikey teğetle giren bir omuz —
 * bizim 84×52'lik iki parçalı kavisimizden daha uzun ve daha yumuşak
 * (omuz 116px yükseklikte, yolun 52px'i gövdenin üstüne taşıyor). Gövde
 * artık ŞEFFAF; renk ve gölge yolun kendisinde (`SILHOUETTE`).
 *
 * ⚠️ Referans rengi veri URI'sine gömüyor (`#08090a`) ve açık temada
 * `filter: invert(1)` ile çeviriyor. Bizde palet var: yol INLINE SVG olarak
 * çiziliyor ve `fill` `--notch-bg`yi okuyor. Gövdenin `box-shadow`u da gitti
 * — şeffaf bir kutuya gölge, kavislerin dışına DİKDÖRTGEN bir gölge çizer;
 * gölge SVG'nin `drop-shadow`unda, referansla aynı değerlerle.
 *
 * ⚠️ `preserveAspectRatio="none"` bilinçli: yol rayın gerçek yüksekliğine
 * gerilir (3 düğme ≈ 298 + 104 taşma ≈ 402 ↔ 420, yani ~0,96 — göze
 * görünmez), böylece düğme sayısı değişse de omuz oranı korunur.
 *
 * Dört önceki tur EdgeNotch'un git geçmişinde; kısaca: `rounded-l` + ayrı
 * kavis (iki kırılma) → büyük köşe (omuz düzlüğü) → simetrik S ("sivri") →
 * dolgun dış + kısa iç kavis → referansın yolu.
 *
 * ── İKONLAR VE "SICAK" HALKA ──────────────────────────────────────────
 * Üç ikon header'ın ÜÇ düğmesiyle aynı ve aynı şekilde hareketli
 * (`useAnimatedIcon`: posta zarfı, takvim, arşiv). Dosyalar `archive-02`
 * (istek üzerine, 2026-09-20; `cloud-server`ın hareketlisi kayıt defterinde
 * yoktu) — header'ın dosya düğmesi de aynı ikona geçti ki iki yüzey
 * ayrışmasın. Üstteki tutamak çizgisi KALDIRILDI (istek:
 * "posta ikonunun üstünde çizgi var"). Halka rengi artık paletin çıplak
 * durakları DEĞİL (`text-brand-*` Insta'da koyu zeminde okunmuyordu),
 * açıklığı sabitlenmiş `--notch-hot-N` — bkz. index.css.
 *
 * ⚠️ RAYIN DIŞ ÖLÇÜLERİ PX, REM DEĞİL. Kök `font-size` görüntü alanı
 * yüksekliğiyle ölçekleniyor (index.css `clamp`); referansın 90/72/76/25/9
 * ölçüleri px ve kapalı hâlin kayması (`RAIL_W - HANDLE_STRIP`) px — rem'e
 * çevrilirse 900px yükseklikte kutu %3 küçülür ve şerit hesabı kayar
 * (önceki turda ölçüldü).
 *
 * ⚠️ `position: fixed`, `absolute` DEĞİL (5. tur). Ray içerik kartının
 * (`SidebarInset`, `md:m-2 rounded-xl overflow-hidden`) İÇİNDE mount oluyor
 * ve kart görüntü alanından 8px içeride bitiyor: `absolute right-0` rayı
 * kartın kenarına dayıyordu, sağında 8px'lik açık bir şerit kalıyordu ve
 * "duvara akan" omuz bir kart kenarına akıyordu (ekran görüntüsünde
 * görüldü). Referans da `fixed`. Sabit konum `overflow-hidden` atalardan
 * etkilenmez — atalarda transform/filter olmadığı sürece; ölçüldü,
 * `getBoundingClientRect().right === innerWidth`.
 *
 * Yalnız `lg`+; rıhtım açıkken çizilmez (DashboardLayout). Geri almak:
 * DashboardLayout'taki tek satır. `data-slot="edge-notch"`.
 */

/**
 * HALKA ÇEMBERİN DIŞINDA (2026-10-02, istek: *"halka içeriden değil de
 * dışarıdan olsa daha güzel olmaz mı"*). Eskiden yay çemberin KENARININ
 * içinde çiziliyordu (yarıçap 14,5–17,5 px, çember 18 px): ikonun etrafını
 * daraltıyor, çemberin kendi kenarıyla üst üste biniyordu. Artık 52 px'lik
 * tuvalde, çemberden 2,5 px'lik bir boşlukla AYRI bir halka: soluk tam iz +
 * üstünde sayıyla dolan yay (Apple'ın etkinlik halkasının dili). İz,
 * sayı sıfırken de "boş halka"yı söylüyor; veri yoksa ikisi de çizilmez.
 */
const RING_BOX = 52
const RING_R = 21.75
const RING_STROKE = 2.5
const RING_C = 2 * Math.PI * RING_R
/**
 * Halkanın tam dolduğu sayı (istek, 2026-09-20: "5 ve üzeri tam dolsun, 2
 * varsa %40"). Üç düğmede de aynı kural: halka bir ORAN değil bir YOĞUNLUK
 * göstergesi — "kaç tane iş bekliyor" sorusuna bakışta cevap. Eski hâl
 * (okunmamış/gelen, biten/toplam, bugün/son 25) üç farklı paydaydı ve aynı
 * uzunluktaki iki yay iki farklı şey demekti.
 */
const RING_FULL_AT = 5

/**
 * Ray düğmesi. `forwardRef` ŞART: Radix `PopoverTrigger asChild` ref'i ve
 * `data-state`i bu elemana takıyor — seçili görünüm `data-[state=open]`
 * ile geliyor, ayrı bir state tutulmuyor.
 */
export const RailButton = forwardRef(function RailButton(
  {
    icon,
    animatedIcon,
    label,
    count,
    accent,
    delay,
    className,
    onMouseEnter,
    onMouseLeave,
    ...props
  },
  ref,
) {
  // Veri yoksa (null) halka hiç çizilmez; sıfırsa boş halka (yay yok).
  const clamped = typeof count === "number" ? Math.min(count / RING_FULL_AT, 1) : null
  // Sayı VARSA düğme "sıcak": halka, çemberin kenarı ve haleleri paletin
  // açıklığı sabitlenmiş tonunu alır (`--notch-hot-N`, index.css). Sayı yok
  // ya da sıfırsa halka yine çizilir (oran bilgisi) ama sessiz mürekkepte.
  const hot = typeof count === "number" && count > 0
  // Header'ın AYNI ikonu, aynı hareketi: hareketi düğmenin tamamı tetikler
  // (`useAnimatedIcon`in kuralı — 17px'lik glife gelmek zor, 64px'lik
  // düğmeye gelmek kolay). Radix'in kendi fare olayları varsa zincirlenir.
  const { icon: iconNode, hoverProps } = useAnimatedIcon({ icon, animatedIcon })
  const enter = (e) => {
    hoverProps.onMouseEnter?.(e)
    onMouseEnter?.(e)
  }
  const leave = (e) => {
    hoverProps.onMouseLeave?.(e)
    onMouseLeave?.(e)
  }
  return (
    <motion.button
      ref={ref}
      type="button"
      aria-label={label}
      data-hot={hot ? "" : undefined}
      whileHover={{ x: -2 }}
      whileTap={{ scale: 0.97 }}
      onMouseEnter={enter}
      onMouseLeave={leave}
      className={cn(
        // Çember ile ad arası 0,75rem: halka çemberin 5 px dışına taşıyor, eski 7 px'lik
        // aralıkta adın üstüne değiyordu. İçerik (36 + 12 + 15) `min-h` içinde — ray boyu değişmez.
        "relative flex min-h-[4.75rem] w-[4.5rem] flex-col items-center justify-center gap-3 rounded-[1.5rem] px-[0.1875rem] py-[0.4375rem] text-[var(--notch-muted)] transition-colors",
        "hover:bg-[var(--notch-raised)] hover:text-[var(--notch-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--notch-focus)]",
        "data-[state=open]:bg-[var(--notch-selected)] data-[state=open]:text-[var(--notch-ink)]",
        "data-[hot]:text-[var(--notch-ink)]",
        className,
      )}
      {...props}
    >
      <span
        className="relative grid size-9 place-items-center rounded-full border border-[var(--notch-line)] bg-[var(--notch-raised)] transition-[border-color,box-shadow] duration-300"
        style={
          hot
            ? {
                color: accent,
                borderColor: `color-mix(in oklab, ${accent} 45%, transparent)`,
                // 1 px'lik yayılma gölgesi KALKTI: halka ile çember arasındaki boşluğa düşüp onu kapatıyordu.
                boxShadow: `0 0 12px color-mix(in oklab, ${accent} 24%, transparent)`,
              }
            : undefined
        }
      >
        {clamped != null && (
          // Tuval çemberden her yönde 8 px büyük (52 px) ve onu ortalıyor; px literal — rem kutu ölçeklenirdi.
          <svg
            viewBox={`0 0 ${RING_BOX} ${RING_BOX}`}
            className="pointer-events-none absolute left-1/2 top-1/2 size-[52px] -translate-x-1/2 -translate-y-1/2 -rotate-90 overflow-visible"
            aria-hidden="true"
          >
            <circle
              cx={RING_BOX / 2}
              cy={RING_BOX / 2}
              r={RING_R}
              fill="none"
              strokeWidth={RING_STROKE}
              className="stroke-current opacity-[0.16]"
            />
            <motion.circle
              cx={RING_BOX / 2}
              cy={RING_BOX / 2}
              r={RING_R}
              fill="none"
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              className="stroke-current [filter:drop-shadow(0_0_4px_currentColor)]"
              strokeDasharray={RING_C}
              initial={{ strokeDashoffset: RING_C }}
              animate={{ strokeDashoffset: RING_C * (1 - clamped) }}
              transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
            />
          </svg>
        )}
        {/* Boyut sınıfı YALNIZ bu sarmalayıcıda: dışarıdaki `[&_svg]` halkanın
            svg'sini de yakalardı. */}
        <span className="relative flex text-[var(--notch-ink)] [&_svg]:!size-[1.125rem]">
          {iconNode}
        </span>
      </span>
      <span className="text-[0.625rem] font-semibold tracking-[0.01em]">{label}</span>
      {/* SAYI ROZETİ — halkaya TEĞET, üstüne değil. Halka 2026-10-02'den beri
          çemberin DIŞINDA (dış yarıçap 23 px); rozetin merkezi 45°'de ~28 px'te
          (top −0,1875 · right 0,5rem): halkanın dış kenarına yaslanır, yayı ve
          ikonu örtmez. Eski yerinde (top 0,1875 · right 0,875rem) yeni halkanın
          tam üstüne düşüyordu (ölçüldü: merkezden 19,7 px).

          ⚠️ **BEYAZ HALKA KALDIRILDI** (2026-09-21, sahada: *"bildirim
          sayısının dışındaki beyaz daireyi kaldır, UI olarak best practice
          olsun"*). Rozetin çevresinde 1,5px'lik bir `ring` (cam kabukta
          `rgb(255 255 255 / .95)`) ve içinde 1px'lik beyaz ışık vardı; ikisi
          birden rakamı pastadan kesilmiş bir çıkartma gibi gösteriyordu.
          Ayıran şey artık zeminin KENDİSİ: dolu accent + altında yumuşak
          gölge — iOS/macOS rozetinin yaptığı da bu, çünkü rozet zaten
          kabuğun mürekkebinden bambaşka bir renkte. Yeni hue 0.

          ⚠️ Halkanın tek tüketicisi buydu: `--notch-pill-ring` token'ı da
          `index.css`ten SİLİNDİ — hiçbir şey yapmayan bir token sonraki
          okuyucuya yalan söyler.

          Sayı değişince `key` ile yeniden doğar ve küçük bir pop yapar. */}
      {count != null && count > 0 && (
        <motion.span
          key={count}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 460, damping: 26, mass: 0.7 }}
          className="absolute -top-[0.1875rem] right-[0.5rem] grid h-4 min-w-4 place-items-center rounded-full px-[0.3125rem] text-[0.625rem] font-semibold leading-none tabular-nums tracking-[-0.01em] shadow-[0_2px_6px_rgb(0_0_0/0.22)]"
          style={{ background: accent, color: "var(--notch-on-hot)" }}
        >
          {count > 99 ? "99+" : count}
        </motion.span>
      )}
    </motion.button>
  )
})

/**
 * Referansın silüeti, BİREBİR (`nova-right-edge-panel-react 2`,
 * `.edge-rail::before`): 90×420'lik tek yol, `preserveAspectRatio="none"`
 * ile rayın kutusuna + `NOTCH_BLEED_REM` üst/alt taşmaya gerilir. Duvardan (90,0) dikey
 * teğetle çıkar, iki kübikle sola akıp (0,116)'da yine dikey teğetle
 * gövdeye girer; alt yarısı aynanın aynısı. Gövde 116→304 düz.
 */
const SILHOUETTE =
  "M90 0 C90 42 81 49 48 58 C15 67 0 80 0 116 L0 304 C0 340 15 353 48 362 C81 371 90 378 90 420 Z"
const SILHOUETTE_W = 90
const SILHOUETTE_H = 420

/**
 * Aynı yol 0..1 birimine indirgenmiş — `clipPathUnits="objectBoundingBox"`
 * için. Cam kabuk `backdrop-filter`li bir HTML katmanı istiyor ve o katman
 * silüete `clip-path: url(#…)` ile kırpılıyor; px'lik `path()` gerilmez,
 * bounding-box birimli SVG clipPath ise `preserveAspectRatio="none"` gibi
 * kutuyla birlikte gerilir. Her sayı sırayla x/90, y/420.
 */
const SILHOUETTE_UNIT = SILHOUETTE.replace(
  /-?\d+(\.\d+)?/g,
  (() => {
    let i = 0
    return (n) => {
      const v = Number(n) / (i++ % 2 === 0 ? SILHOUETTE_W : SILHOUETTE_H)
      return String(Math.round(v * 10000) / 10000)
    }
  })(),
)

/**
 * Çentiğin KABUĞU — silüet katmanları + token kapsamı; içeriği çocuklar.
 *
 * Ray (`EdgeNotch`) da Tercihler'deki önizleme (`EdgeNotchDesignPicker`) da
 * bunu çizer: seçilen şey tam olarak görülecek şey, ikinci bir "küçük
 * resim" zamanla kabuktan ayrışırdı (WhatsNewCardPicker'ın kararı).
 *
 *   palette      → silüet dolu SVG yol (`--notch-bg`), gölge yolda
 *   glass-light  → (1) gölge: silüetin bulanık, kaydırılmış kopyası
 *                  (2) cam: `backdrop-filter` + süt dolgu, silüete kırpık
 *                  (3) parıltı: ağır ağır kayan sheen, silüete kırpık
 *                  (4) kenar: silüetin 1px ışık çizgisi (`non-scaling-stroke`)
 *   glass-brand  → aynı + (2b) paletin gradyan tint'i
 *
 * ⚠️ GÖLGE NEDEN AYRI KATMAN: `filter: drop-shadow` kırpılmış bir elemanda
 * kırpmadan ÖNCE uygulanır, yani gölge de kırpılır ve dışarı hiç çıkmaz;
 * kenar çizgisinin (fill yok) gölgesi ise ipince olur. Klasik çare: silüetin
 * kendisini gölge renginde, bulanık ve kaydırılmış olarak bir kez daha
 * çizmek.
 *
 * `clipPath` kimliği `useId` — aynı sayfada üç önizleme + ray birden var.
 */
export function NotchShell({ design = "palette", cardVariant, className, children, ...props }) {
  const uid = useId()
  const clipId = `notch-clip-${uid.replace(/:/g, "")}`
  const glass = design !== "palette"
  const layer = { top: `-${NOTCH_BLEED_REM}rem`, height: `calc(100% + ${NOTCH_BLEED_REM * 2}rem)` }
  return (
    <div
      className={cn("notch-skin relative isolate", className)}
      data-design={EDGE_NOTCH_DESIGN_ATTR[design] ?? "palette"}
      data-card={glass ? undefined : cardVariant}
      {...props}
    >
      {glass ? (
        <>
          <svg aria-hidden="true" className="absolute size-0">
            <defs>
              <clipPath id={clipId} clipPathUnits="objectBoundingBox">
                <path d={SILHOUETTE_UNIT} />
              </clipPath>
            </defs>
          </svg>
          {/* (1) gölge — silüetin bulanık kopyası, sola-aşağı kaydırılmış */}
          <svg
            aria-hidden="true"
            viewBox={`0 0 ${SILHOUETTE_W} ${SILHOUETTE_H}`}
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-x-0 -z-10 w-full translate-x-[-0.4375rem] translate-y-[0.625rem] overflow-visible blur-[11px]"
            style={layer}
          >
            <path d={SILHOUETTE} className="fill-[var(--notch-glass-shadow)]" />
          </svg>
          {/* (2) cam */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -z-10 bg-[var(--notch-glass-fill)] backdrop-blur-[22px] backdrop-saturate-[1.55]"
            style={{ ...layer, clipPath: `url(#${clipId})` }}
          />
          {/* (2b) paletin tint'i — yalnız glass-brand */}
          {design === "glassBrand" && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 -z-10 bg-[linear-gradient(168deg,var(--notch-tint-1)_0%,var(--notch-tint-2)_52%,var(--notch-tint-3)_100%)]"
              style={{ ...layer, clipPath: `url(#${clipId})` }}
            />
          )}
          {/* (3) parıltı */}
          <div
            aria-hidden="true"
            className="notch-sheen pointer-events-none absolute inset-x-0 -z-10 mix-blend-screen"
            style={{ ...layer, clipPath: `url(#${clipId})` }}
          />
          {/* (4) kenar çizgisi — yolun kendisi, gerilmeden etkilenmeyen 1px */}
          <svg
            aria-hidden="true"
            viewBox={`0 0 ${SILHOUETTE_W} ${SILHOUETTE_H}`}
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-x-0 -z-10 w-full overflow-visible"
            style={layer}
          >
            <path
              d={SILHOUETTE}
              fill="none"
              stroke="var(--notch-glass-rim-soft)"
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
              className="blur-[1.5px]"
            />
            <path
              d={SILHOUETTE}
              fill="none"
              stroke="var(--notch-glass-rim)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </>
      ) : (
        /* palette — referansın yolu, dolu; gölge yolda (kutuya box-shadow
           yazılsa kavislerin dışına dikdörtgen gölge çizerdi) */
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${SILHOUETTE_W} ${SILHOUETTE_H}`}
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-x-0 -z-10 w-full [filter:drop-shadow(-9px_10px_16px_rgb(20_25_31/0.14))]"
          style={layer}
        >
          <path d={SILHOUETTE} className="fill-[var(--notch-bg)]" />
        </svg>
      )}
      {children}
    </div>
  )
}

/** Kapalı rayın açılma yayının oturma süresi (bkz. `animate`ın yayı). */
const NOTCH_EXPAND_MS = 450

/** `scope`: Anasayfa ayrı hatırlanır, öteki sayfalar ortak (bkz. `edgeNotchState`). */
export function EdgeNotch({ scope = "pages" }) {
  const { t } = useLocale()
  const open = useEdgeNotchOpen(scope)
  // Hangi panel açık — sayfadan gelen istek (`lib/panelBus`) için denetimli.
  const [panel, setPanel] = useState(null)
  useEffect(() => {
    let timer
    const claim = (name) => () => {
      // Ray yalnız `lg`+ genişlikte görünür (`hidden lg:block`); altında
      // panelleri header çiziyor ve isteği o üstlenir.
      if (!window.matchMedia("(min-width: 1024px)").matches) return false
      clearTimeout(timer)
      if (readEdgeNotchOpen(scope)) {
        setPanel(name)
      } else {
        // Kapalı ray kenarın dışında: önce açılır, panel kayma bitince —
        // panel tetiğe göre konumlanıyor ve hareket eden tetiği izlemiyor.
        writeEdgeNotchOpen(true, scope)
        timer = setTimeout(() => setPanel(name), NOTCH_EXPAND_MS)
      }
      return true
    }
    const offMail = onPanelRequest("mail", claim("mail"))
    const offCalendar = onPanelRequest("calendar", claim("calendar"))
    return () => {
      clearTimeout(timer)
      offMail()
      offCalendar()
    }
  }, [scope])
  // Kartın SEÇİLİ görünümü zemini belirliyor (bkz. index.css `--notch-*`):
  // Ses · Açık → açık kabuk, gerisi (varsayılan Ses · Çekim) → koyu kabuk.
  const cardStyle = useWhatsNewCardStyle()
  const cardVariant = cardStyle === "speakinglight" ? "light" : "gravity"
  // Kabuk: Tercihler'den seçilen tasarım (palet · açık cam · palet camı).
  const design = useEdgeNotchDesign()

  const counts = useNotchCounts()

  return (
    <motion.nav
      data-slot="edge-notch"
      data-open={open ? "" : undefined}
      aria-label={t("notch.aria")}
      initial={{ x: NOTCH_ENTER_X, opacity: 0 }}
      // Kapalıyken ray sağa kayıyor; yalnız `HANDLE_STRIP` kadar şerit
      // kalıyor.
      animate={{ x: open ? "0%" : NOTCH_COLLAPSED_X, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 28, mass: 0.9 }}
      /* Dikey konum ve ölçüler `lib/edgeNotchGeometry.js`te — gerekçeleri,
         Dell'de alt omzun kesilmesine yol açan px tavanı ve rem kararı
         orada yazılı. Ray da Tercihler önizlemesi de aynı dosyayı okur.
         ⚠️ `--notch-top-override`: bir sayfa rayı KENDİ öğesine hizalamak
         isterse kökte bu değişkeni yazar ve çıkarken siler (bugün yalnız
         Akışım — yardım kartının hizası). Yoksa geometrinin kuralı geçerli. */
      style={{ top: `var(--notch-top-override, ${NOTCH_TOP})` }}
      /* ⚠️ Genişlik LİTERAL yazılır: Tailwind kaynağı METİN olarak tarar,
         `w-[${…}rem]` gibi bir şablon ifadesi ona görünmez ve sınıf HİÇ
         üretilmez (deponun `pointer-coarse` turunda bir kez ölçüldü).
         `NOTCH_RAIL_REM` ile aynı sayı olmak zorunda. */
      className="fixed right-0 z-30 hidden w-[5.625rem] lg:block"
    >
      <NotchShell
        design={design}
        cardVariant={cardVariant}
        className={cn(NOTCH_SHELL_CLASS, "w-full")}
      >
        {/* AÇ/KAPA tutamağı — sol kenarın ortasında dikey çizgi. Üstüne
          gelince çizgi ok'a dönüyor (kapalıyken sola, açıkken sağa bakan).
          Dokunma hedefi 16×64 — çizgi 3px olsa da basılacak alan geniş. */}
        <button
          type="button"
          onClick={() => writeEdgeNotchOpen(!open, scope)}
          aria-label={open ? t("notch.collapse") : t("notch.expand")}
          aria-expanded={open}
          className="group/handle absolute left-0 top-1/2 z-10 flex h-16 w-4 -translate-y-1/2 items-center justify-center rounded-r-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--notch-focus)]"
        >
          {/* ⚠️ ÇİZGİ PALETİN RENGİNDE (istek, 2026-09-29: *"açma kapama
            çizgisinin rengi seçili renk paleti ile aynı olsun ki anlaşılsın,
            gözüksün"*). Eskiden mürekkebin %35'iydi ve varsayılan AÇIK camda
            neredeyse görünmüyordu — kapalı çentiği yeniden açmanın tek yolu bu
            çizgi. Tonlar halkaların `--notch-hot-1..3`ü: paletin durakları,
            okunurluk tabanı/tavanı kabuğa göre ayarlı, yani koyu temada ve açık
            camda da seçiliyor. Hafif hale aynı tondan. */}
          <span
            aria-hidden="true"
            className="h-7 w-[0.1875rem] rounded-full bg-[linear-gradient(to_bottom,var(--notch-hot-1),var(--notch-hot-2),var(--notch-hot-3))] shadow-[0_0_6px_color-mix(in_oklch,var(--notch-hot-2)_45%,transparent)] transition-all group-hover/handle:h-8 group-hover/handle:opacity-0"
          />
          <HugeiconsIcon
            icon={ArrowLeft01Icon}
            aria-hidden="true"
            className={cn(
              "absolute size-3.5 text-[var(--notch-hot-2)] opacity-0 transition-opacity group-hover/handle:opacity-90",
              open && "rotate-180",
            )}
            strokeWidth={2.2}
          />
        </button>
        <MailPopover
          side="left"
          align="center"
          open={panel === "mail"}
          onOpenChange={(o) => setPanel(o ? "mail" : null)}
          trigger={
            <RailButton
              icon={Mail01Icon}
              animatedIcon={AnimatedMailIcon}
              label={t("notch.mail")}
              count={counts.mail}
              accent="var(--notch-hot-1)"
              delay={0.35}
            />
          }
        />
        <CalendarPopover
          side="left"
          align="center"
          open={panel === "calendar"}
          onOpenChange={(o) => setPanel(o ? "calendar" : null)}
          trigger={
            <RailButton
              icon={CalendarAdd01Icon}
              animatedIcon={AnimatedCalendarIcon}
              label={t("notch.calendar")}
              count={counts.calendar}
              accent="var(--notch-hot-2)"
              delay={0.45}
            />
          }
        />
        <FilesPopover
          side="left"
          align="center"
          trigger={
            <RailButton
              icon={Archive02Icon}
              animatedIcon={AnimatedArchiveIcon}
              label={t("notch.files")}
              count={counts.files}
              accent="var(--notch-hot-3)"
              delay={0.55}
            />
          }
        />
      </NotchShell>
    </motion.nav>
  )
}
