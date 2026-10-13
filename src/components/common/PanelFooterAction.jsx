import { HugeiconsIcon } from "@hugeicons/react"
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon"
import LinkSquare02Icon from "@hugeicons/core-free-icons/LinkSquare02Icon"
import { cn } from "@/lib/utils"

/**
 * HEADER PANELLERİNİN DİP EYLEMİ — posta · takvim · bildirimler ortak.
 *
 * 2026-09-14, istek üzerine: *"bildirimler, mail ve takvim butonlarında çıkan
 * ekranların altındaki buton (view all, open in outlook vb.) çok belli
 * olmuyor; minimalizmi bozmadan biraz daha kullanıcı dostu yap."*
 *
 * ⚠️ **ÜÇÜ DE AYNI TARİFİ KULLANIR VE AYRIŞMAMALIDIR.** Panellerin ölçü
 * reçetesi zaten tek (`MailPopover.jsx`teki `PopoverContent` notu); dip eylemi
 * de öyle olmak zorundaydı ama üçü ayrı ayrı yazılmıştı — ikisi 11px/muted,
 * biri 11,5px/`/[0.55]`. Aynı satırda açılan üç panelin dibinde üç farklı
 * sessizlik seviyesi vardı.
 *
 * ── NEDEN GÖRÜNMÜYORDU ────────────────────────────────────────────────
 *
 * Eski hâli: zeminsiz, kenarlıksız, 11px, `muted-foreground`, tek işareti
 * hover'da beliren bir zemin. Yani DURAĞAN hâlde bir düğmeye benzeyen hiçbir
 * şey taşımıyordu — dokunmatikte hover diye bir şey de yok.
 *
 * ── ŞİMDİKİ HÂLİ, DÖRT KÜÇÜK SİNYAL ───────────────────────────────────
 *
 * 1. **Kendi yüzeyi**: panelin gövdesinden bir kademe ayrışıyor, yani şerit
 *    "liste bitti, burası başka bir şey" diyor. Dolu bir düğme DEĞİL —
 *    minimalizmi bozmadan bir zemin.
 *
 *    ⚠️ **`--plane-1` KULLANILAMADI — ÖLÇÜLDÜ.** Düzlem değişkenleri
 *    `--background`tan türüyor; panelin yüzeyi ise `--popover` ve koyu temada
 *    ikisi BİREBİR aynı (ölçüldü: şerit/panel kontrastı **1,000**, yani şerit
 *    hiç görünmüyordu). Çare yüzeye değil MÜREKKEBE bağlanmak:
 *    `foreground/[0.04]` panelin zemini ne olursa olsun onun üstüne ince bir
 *    yıkama koyuyor ve iki temada da bir kademe üretiyor.
 * 2. **Mürekkep bir kademe yukarı** (`/[0.85]`, hover'da tam): 11px/muted bir
 *    metin bu panellerde dipnot ağırlığındaydı.
 * 3. **Punto 11 → 12px ve `font-medium`**: eylem, altındaki dipnotlardan ayrı
 *    okunmalı.
 * 4. **GLİF**: içeri giden eylemde sağ ok, dışarı açılanda köşeli bağlantı
 *    ikonu. Kullanıcı tıklamadan önce nereye gideceğini biliyor — "Outlook'ta
 *    aç" metni bunu söylüyor ama ikon onu bir bakışta söylüyor.
 *
 * ⚠️ **MARKA MÜREKKEBİ KULLANILMADI.** `text-brand-deep` bu depoda ölçülmüş
 * bir tuzak: marka zemininin üstünde Amber'de 3,05, Sunset'te 4,16 düşüyor
 * (bkz. `profile/primitives.jsx`). Şerit 17 palette birden yaşıyor.
 *
 * ⚠️ **YENİ HUE YOK**: düzlem + mevcut mürekkep alfaları. Ekrana giren renk 0.
 */
export function PanelFooterAction({
  as = "button",
  external = false,
  count,
  children,
  className,
  ...rest
}) {
  const Tag = as
  return (
    <Tag
      {...rest}
      {...(Tag === "button" ? { type: "button" } : {})}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={cn(
        "group/footer flex w-full shrink-0 items-center justify-center gap-2 px-4 py-3",
        "bg-foreground/[0.04] text-[0.75rem] font-medium text-foreground/[0.85]",
        "transition hover:bg-foreground/[0.08] hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40",
        // Dokunma hedefi: deponun kuralı 32px, kaba işaretçide bir kademe daha.
        "[min-height:max(2.25rem,36px)] [@media(pointer:coarse)]:min-h-11",
        className,
      )}
    >
      <span className="truncate">{children}</span>
      {count != null && count > 0 && (
        <span className="shrink-0 rounded-full bg-foreground/[0.08] px-1.5 py-0.5 text-[0.625rem] font-semibold tabular-nums text-foreground/[0.65]">
          {count}
        </span>
      )}
      <HugeiconsIcon
        icon={external ? LinkSquare02Icon : ArrowRight01Icon}
        aria-hidden="true"
        // Ok hover'da bir tık ilerler — jestin kendisi, süs değil.
        className={cn(
          "size-3.5 shrink-0 text-foreground/[0.45] transition-transform group-hover/footer:text-foreground/[0.7]",
          !external && "group-hover/footer:translate-x-0.5",
        )}
        strokeWidth={2}
      />
    </Tag>
  )
}
