import { HugeiconsIcon } from "@hugeicons/react"
import UserStar01Icon from "@hugeicons/core-free-icons/UserStar01Icon"
import { useLocale } from "@/hooks/useLocale"
import { accentColor } from "@/lib/feedPolicy"
import { cn } from "@/lib/utils"

/**
 * Kanal etiketi — gönderinin hangi kutudan geldiğini söyleyen çip.
 *
 * ⚠️ **ZEMİN HEP `--brand-soft`, AYRIM NOKTADA.** İlk tasarımda her kanal
 * kendi palet durağıyla boyanacaktı (`--brand-from` dolgu vb.); ölçülmüş bir
 * engel var: `--brand-from`/`--brand-to` bazı paletlerde beyaza, bazılarında
 * siyaha düşüyor ("black" paletinde üçü de `#000000`) ve dolgu olarak
 * kullanıldığında üstündeki metin okunmaz oluyor. `bg-brand-soft` +
 * `text-brand-on-soft` ikilisi ise 14 palette ve iki temada 3:1 üstü ölçülmüş
 * (CLAUDE.md, `--brand-on-soft`). Kanalı ayıran şey bu yüzden zemin değil,
 * çipin solundaki küçük NOKTA — okunurluğu hiç riske atmadan dört kanalı
 * birbirinden ayırıyor.
 *
 * ⚠️ `lang` ŞART: etiket adları CSS ile büyütülmüyor ama "İnsan Kaynakları"
 * gibi Türkçe adlar başka dillerin kırpma/heceleme kurallarına düşmesin.
 */
export function FeedTag({ tag, accent, className }) {
  const { t, locale } = useLocale()
  return (
    <span
      lang={locale}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-soft px-2 py-0.5",
        "text-[0.625rem] font-semibold tracking-[0.01em] text-brand-on-soft",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="size-1.5 rounded-full"
        style={{ background: accentColor(accent) }}
      />
      {t(`feed.tag.${tag}`)}
    </span>
  )
}

/**
 * "Sana özel" — Akışım'da kurumsal bir kanaldan GELMEYEN işaretli postanın
 * işareti (kanal etiketinin yerinde). ⚠️ `bg-brand-soft` DEĞİL: o token koyu
 * temada kirli bir griye dönüyor (CLAUDE.md, özel günler turu); `--brand`in
 * saydam yıkaması iki temada da doğru.
 */
export function ForYouTag({ className }) {
  const { t, locale } = useLocale()
  return (
    <span
      lang={locale}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full bg-brand/[0.1] px-2 py-0.5",
        "text-[0.625rem] font-semibold tracking-[0.01em] text-brand-ink",
        className,
      )}
    >
      <HugeiconsIcon icon={UserStar01Icon} className="size-3" strokeWidth={2} aria-hidden="true" />
      {t("feed.section.important")}
    </span>
  )
}
