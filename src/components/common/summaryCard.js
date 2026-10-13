/**
 * Sana özel panosunun başlık kartı — pano ve iskeleti AYNI sabitleri okur, yani yüklenince
 * kart boy değiştirmez. Sade başlık: akışla aynı yüzey
 * (`ms-surface`), solda küçük küre, yanında başlık + tek satır özet; altında "Sıradaki" ve
 * üç sayı (`SummaryTray`, genişte yan yana). İçerik ilk ekranda görünsün diye kısa tutulur.
 *
 * Bileşen DEĞİL (React Refresh sınırı: bileşen dosyasından sabit ihraç edilmez).
 * Kapsayıcı kartın KENDİSİ (`@container/hero`) — yalnız çocukları sorgular.
 */
export const HERO_SHELL =
  "group/herocard @container/hero ms-surface relative isolate flex min-w-0 flex-col overflow-hidden rounded-[1.5rem] p-3 text-foreground sm:p-4"
/** Marka saç çizgisi: rayın kartlarıyla aynı, paleti panoya taşıyan tek işaret. */
export const HERO_GRADIENT =
  "absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-brand-from via-brand-via to-brand-to opacity-70"
export const HERO_GLOW = "hidden"
export const HERO_GRID =
  "grid grid-cols-[var(--orb)_minmax(0,1fr)] items-center gap-x-3 gap-y-3 [--orb:3.25rem]"
/** Yer tutar: başlık + alt satır (iskelet → veri arasında kart boy değiştirmesin). */
export const HERO_TEXT = "col-start-2 row-start-1 min-h-[2.75rem] min-w-0 self-center"
export const HERO_ORB_CELL = "col-start-1 row-start-1 flex items-center justify-center"
export const HERO_ORB_BOX = "pointer-events-none relative size-[var(--orb)] shrink-0"
export const HERO_TRAY_CELL = "col-span-2 row-start-2 min-w-0"
/** ⚠️ Yazı boyu ÖNCE, satır yüksekliği sonra (tailwind-merge `leading-*`i silmesin). */
export const HERO_TITLE = "text-[1.0625rem] text-balance font-bold leading-snug tracking-[-0.015em]"
/** Alt satır: özet ve sayaç terimleri. */
export const HERO_SUB = "mt-0.5 text-pretty text-[0.8125rem] leading-snug text-muted-foreground"
/**
 * Tepsinin "Sıradaki" (ya da çare) satırı. Element (düğme) her değişkende AYNI; yalnız
 * içi değişir — pencere kapanınca odak açanın üstüne döner.
 */
export const SLOT_ROW =
  "group/next flex min-h-12 w-full items-center gap-3 rounded-[1rem] py-1.5 pl-2 pr-1.5 text-left text-card-foreground outline-none transition hover:bg-foreground/[0.035] focus-visible:ring-2 focus-visible:ring-brand/40 [@media(pointer:coarse)]:min-h-14"
