import { HugeiconsIcon } from "@hugeicons/react"
import SparklesIcon from "@hugeicons/core-free-icons/SparklesIcon"
import ChartUpIcon from "@hugeicons/core-free-icons/ChartUpIcon"
import Wrench01Icon from "@hugeicons/core-free-icons/Wrench01Icon"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  KAYIT TÜRÜ — ikon + renk + KELİME
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ⚠️ **KELİME HER ZAMAN YAZILIR.** Renk ve ikon tanımayı hızlandırır ama
 * tek başına anlam taşımaz: renk körü bir okuyucu için de, ikonu ilk kez
 * gören biri için de ayırt edilebilir kalmalı.
 *
 * ⚠️ **YENİ HUE YOK.** Üç ton da uygulamada zaten var:
 *   Yeni         `--brand`   (marka mürekkebi — bir yetenek eklendi)
 *   İyileştirme  emerald     (var olan bir şey iyileşti; profil kartlarının
 *                             "başarılı" tonu, bkz. profile/primitives.jsx)
 *   Düzeltme     amber       (bir kusur giderildi; yarım kalan yanıt
 *                             uyarısının tonu)
 *
 * Düzeltme KIRMIZI değil: bir hatanın DÜZELMİŞ olması kötü haber değil.
 *
 * ⚠️ İkonlar aynı ailenin çizgi ikonları ve üçü de tek kavram anlatıyor:
 * kıvılcım (yeni), yükselen grafik (iyileşme), anahtar (tamir).
 */
// ⚠️ İHRAÇ EDİLMEZ. Bir bileşen dosyasından sabit ihraç etmek fast
// refresh'i bozuyor — tüketiciler `KindBadge`/`KindTile` bileşenlerini
// kullanır, tabloyu değil.
const KIND_STYLE = {
  feature: {
    icon: SparklesIcon,
    badge: "bg-brand-soft/70 text-brand",
    tile: "bg-brand-soft/60 text-brand ring-brand/15",
  },
  improvement: {
    icon: ChartUpIcon,
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    tile: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/15 dark:text-emerald-300",
  },
  fix: {
    icon: Wrench01Icon,
    badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    tile: "bg-amber-500/12 text-amber-700 ring-amber-500/20 dark:text-amber-300",
  },
}

export function KindBadge({ kind }) {
  const { t, locale } = useLocale()
  const spec = KIND_STYLE[kind] ?? KIND_STYLE.improvement
  return (
    <span
      lang={locale}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full py-0.5 pl-1.5 pr-2 text-[0.65625rem] font-semibold",
        spec.badge,
      )}
    >
      <HugeiconsIcon icon={spec.icon} className="size-3" strokeWidth={2.2} />
      {t(`whatsNew.kind.${kind}`)}
    </span>
  )
}

/** Kartın solundaki renkli ikon kutusu — rozetle aynı tonu taşır. */
export function KindTile({ kind, className }) {
  const spec = KIND_STYLE[kind] ?? KIND_STYLE.improvement
  return (
    <span
      aria-hidden="true"
      className={cn("grid shrink-0 place-items-center rounded-lg ring-1", spec.tile, className)}
    >
      <HugeiconsIcon icon={spec.icon} className="size-3.5" strokeWidth={2} />
    </span>
  )
}
