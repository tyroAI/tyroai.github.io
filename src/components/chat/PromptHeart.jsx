import { useRef } from "react"
import { FavouriteIcon as AnimatedFavouriteIcon } from "@/components/ui/favourite"
import { togglePromptFavorite } from "@/lib/promptFavorites"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"

const RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"

/**
 * Bir öneri kartının favori düğmesi.
 *
 * İKİ yüzey kullanıyor: sohbetin öneri şeridi (`PromptStarters`) ve Öneri
 * Laboratuvarı (`PromptLab`). Bu yüzden kendi dosyasında — blok iki yerde
 * kopyalansaydı zamanla iki farklı kalp olurdu (`OverviewScrollHint`
 * kararının aynısı).
 *
 * ⚠️ **KART KÖKÜ `<button>` OLAMAZ.** Kalp onun içinde kalırsa İÇ İÇE düğme
 * doğar — geçersiz HTML ve bu depoda iki kez ödenmiş bir hata (MiniCard, orb
 * seçici). Çağıran kartı `div` olarak kurar, seçimi `absolute inset-0` bir
 * kaplamaya verir ve kalbi kaplamanın ÜSTÜNE (`z-10`) koyar; kaplama DOM'da
 * kalpten ÖNCE gelmek zorunda, sonra gelirse kalbi yutar.
 *
 * ⚠️ **`stopPropagation` ŞART**: durdurulmazsa kalbe basmak kartın seçimini de
 * tetikler ve istem besteciye yazılır.
 *
 * ⚠️ **DOKUNMATİKTE HOVER YOK**: kaba işaretçide kalp her zaman görünür.
 * Favori olan kalp de her boyutta görünür kalır — durumu gizlemek, kartın
 * favoride olduğunu görünmez yapardı (AppLauncher'ın aynı kararı).
 */
export function PromptHeart({ promptKey, favorite, className }) {
  const { t } = useLocale()
  const heartRef = useRef(null)
  if (!promptKey) return null
  const label = favorite ? t("favorites.remove") : t("favorites.add")
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        togglePromptFavorite(promptKey)
      }}
      onMouseEnter={() => heartRef.current?.startAnimation?.()}
      onMouseLeave={() => heartRef.current?.stopAnimation?.()}
      aria-pressed={favorite}
      aria-label={label}
      title={label}
      className={cn(
        "absolute right-1.5 top-1.5 z-10 grid size-6 place-items-center rounded-full transition hover:bg-accent",
        RING,
        favorite
          ? "text-brand"
          : "text-muted-foreground/45 opacity-0 hover:text-brand focus-visible:opacity-100 [@media(pointer:coarse)]:opacity-100",
        className,
      )}
    >
      {/* ⚠️ Animasyonlu bileşen `fill` PROP'U ALMIYOR (svg'si `fill="none"`
          sabit); favori DOLU kalple gösteriliyor ve o bilgi kaybolamaz, o
          yüzden dolgu sınıfla veriliyor. */}
      <AnimatedFavouriteIcon
        ref={heartRef}
        size={13}
        className={cn("shrink-0", favorite && "[&_path]:fill-current")}
      />
    </button>
  )
}
