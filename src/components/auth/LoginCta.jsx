import { DiscoverButton } from "@/components/ui/discover-button"
import { cn } from "@/lib/utils"
import { LOGIN_FILL } from "./loginGradient"

/**
 * BAĞLAN — Discover düğmesi (`ui/discover-button`): sayfanın zeminine uyan cam hapta
 * paletten bir daire ve etiket; üstüne gelince ya da klavye odağında daire etiketin altına
 * yayılır, ok sağa kayar. Daire logonun ve "AI"ın pembe → morundan (`LOGIN_FILL`).
 * Giriş, sayfanın açılış sırasına bağlı (`--discover-delay`: slogandan sonra belirir).
 * Çok kısa ekranda (`compact`) daire küçülür: düğme altbilgiye binmesin.
 */
export function CtaButton({ onClick, disabled, label, describedBy, compact }) {
  return (
    <DiscoverButton
      label={label}
      onClick={onClick}
      disabled={disabled}
      aria-describedby={describedBy}
      // Etiketin yazısı eski Bağlan düğmesininki (kullanıcı isteği): 13 px, yarı kalın,
      // büyük harf, 0,18em aralık; efekt Discover'ın. Etiket düğmenin son çocuğu (seçicide
      // `_` yok: Tailwind köşeli parantezde onu boşluğa çevirir).
      className={cn(
        "[&>:last-child]:text-[0.8125rem] [&>:last-child]:uppercase [&>:last-child]:tracking-[0.18em]",
        compact && "[--discover-h:3.25rem]",
      )}
      style={{
        "--discover-delay": "1.25s",
        "--discover-fill": LOGIN_FILL,
        "--discover-active-text": "#fff",
      }}
    />
  )
}
