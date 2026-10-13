import { HugeiconsIcon } from "@hugeicons/react"
import CloudIcon from "@hugeicons/core-free-icons/CloudIcon"
import File01Icon from "@hugeicons/core-free-icons/File01Icon"
import Folder01Icon from "@hugeicons/core-free-icons/Folder01Icon"
import Globe02Icon from "@hugeicons/core-free-icons/Globe02Icon"
import UserGroupIcon from "@hugeicons/core-free-icons/UserGroupIcon"
import { FILE_TONE, NEUTRAL_TONE } from "@/lib/fileMeta"
import { cn } from "@/lib/utils"

/** `size` yalnızca ÖLÇEK değiştirir; renk ve harf kuralı üç yerde de aynı. */
const SIZES = {
  sm: { box: "size-8 rounded-[0.5625rem]", text: "text-[0.53125rem]", glyph: "size-[1.0625rem]" },
  md: { box: "size-11 rounded-xl", text: "text-[0.6875rem]", glyph: "size-6" },
  lg: { box: "size-16 rounded-2xl", text: "text-[0.9375rem]", glyph: "size-8" },
}

/**
 * Liste rozeti. Dosyalarda UZANTI yazılır — kırk ayrı ikon taşımaktansa
 * uzantının kendisi hem daha kesin hem bakımsız çalışır; renk türü, harfler
 * dosyayı söyler. Klasör/site/kitaplık marka rengiyle ayrılır: gezilecek
 * şeyler ile açılacak şeyler bir bakışta ayrışsın.
 *
 * Panelde, hover önizlemesinde ve büyük önizlemede AYNI bileşen çiziliyor:
 * kullanıcı satırda gördüğü rozeti büyütülmüş halde yeniden görünce hangi
 * dosyaya baktığını sorgulamıyor.
 *
 * `glyph` (isteğe bağlı) dosya OLMAYAN satırın glifini ezer — organizasyon
 * şeması gibi tek başına duran bir bağlantı kendi şeklini taşısın. Ekip
 * (Microsoft 365 grubu) satırı kişi grubu glifiyle: klasör değil, bir ekibin
 * kitaplığına giden kapı.
 */
export function FileBadge({ item, size = "sm", glyph: glyphOverride }) {
  const s = SIZES[size] ?? SIZES.sm
  if (item.kind !== "file") {
    const glyph =
      glyphOverride ??
      (item.kind === "site"
        ? Globe02Icon
        : item.kind === "drive"
          ? CloudIcon
          : item.kind === "group"
            ? UserGroupIcon
            : Folder01Icon)
    return (
      // `text-brand-ink`, `text-brand-deep` DEĞİL: ikincisi koyu temada da açık
      // temanın mürekkebi ve 16 paletin 11'inde karta karşı 3:1'in altında.
      <span className={cn("grid shrink-0 place-items-center bg-brand/12 text-brand-ink", s.box)}>
        <HugeiconsIcon icon={glyph} className={s.glyph} strokeWidth={1.9} />
      </span>
    )
  }
  const tone = FILE_TONE[item.ext] ?? NEUTRAL_TONE
  return (
    <span
      className={cn("grid shrink-0 place-items-center text-white shadow-sm", s.box)}
      style={{ background: tone }}
    >
      {item.ext ? (
        <span className={cn("font-bold uppercase leading-none tracking-tight", s.text)}>
          {item.ext.slice(0, 4)}
        </span>
      ) : (
        <HugeiconsIcon icon={File01Icon} className={s.glyph} strokeWidth={1.9} />
      )}
    </span>
  )
}
