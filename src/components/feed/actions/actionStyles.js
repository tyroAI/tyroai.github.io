/**
 * Eylem satırı düğmesinin görünüşü: 20 px ikon, üstüne gelince yuvarlak tonlu zemin (X/Instagram
 * gibi). `relative z-10`: kartta gerilmiş kaplamanın (`z-[1]`) üstünde durur. Dokunmatikte görünmez
 * pay (`after:-inset-1`) basılan alanı 44 px'e çıkarır; basılı (beğenildi / kaydedildi) düğme
 * paletin yazı rengini alır.
 */
export const ACTION =
  "relative z-10 inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[0.75rem] font-medium text-foreground/60 transition hover:bg-brand/10 hover:text-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 aria-pressed:text-brand aria-busy:cursor-progress pointer-coarse:after:absolute pointer-coarse:after:-inset-1 [&_svg]:size-5 [&_svg]:shrink-0"

/** Etiketsiz (yalnız ikon) düğme: kare. */
export const ICON_ONLY = "w-9 px-0"

/** Paylaş menüsünün ve alttan çekmecenin satır ikonu: nötr yüzey, sayfaya yabancı renk yok. */
export const OPTION_ICON =
  "grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-foreground/75 [&_svg]:size-4"
