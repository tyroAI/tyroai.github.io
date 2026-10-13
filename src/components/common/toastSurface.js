import { cn } from "@/lib/utils"

/**
 * Toast yüzeyi — sonuç/yenileme bildirimi (`DataRefreshToast`) ile "asistan çalışıyor"
 * bildirimi (`FirstReplyToast`) ortak kullanır. Bildirimler aynı köşede üst üste
 * çıkabiliyor; her biri kendi yüzeyini yazsaydı iki farklı üründen gelmiş gibi dururdu.
 */
export const TOAST_SURFACE = cn(
  // 72px rozetle satır ortalanır: `items-start` metni tepede asılı bırakıyordu.
  "relative flex w-[min(470px,calc(100vw-2rem))] items-center gap-4 overflow-hidden",
  // Eşit iç boşluk: rozetin çevresinde her kenardan 16px; farklı değerler kutuyu yamuk gösteriyordu.
  "rounded-2xl p-4",
  // iOS ana ekran çubuğu: sonner'ın boşluğu onu ancak sıyırıyor. Çubuksuz cihazda `env()` sıfır.
  "mb-[env(safe-area-inset-bottom)]",
  // İki temada da koyu cam: arkadaki sayfa bulanık sızar, düz bir blok gibi durmaz.
  "bg-[oklch(0.19_0.02_250/0.92)] backdrop-blur-2xl backdrop-saturate-150",
  // Kabartma: üst kenarda ince ışık, çevrede ince halka, katmanlı gölge.
  "ring-1 ring-white/10",
  "shadow-[0_1px_0_0_rgb(255_255_255/0.10)_inset,0_24px_56px_-16px_rgb(0_0_0/0.55),0_8px_20px_-8px_rgb(0_0_0/0.4)]",
)

/**
 * Rozetin GEOMETRİSİ: 72px kutu, köşe, halka ve hale. Renk paylaşılmaz (duruma ait);
 * ölçü paylaşılır ki biri büyüdüğünde bildirimler yan yana farklı boyda çizilmesin.
 */
export const TOAST_GLYPH_WRAP = "relative size-[4.5rem] shrink-0"
export const TOAST_GLYPH_BOX = cn(
  "relative grid size-[4.5rem] place-items-center rounded-2xl",
  "bg-white/[0.06] ring-1 ring-white/10",
)
export const TOAST_GLYPH_GLOW = "absolute -inset-1 rounded-2xl blur-md"

/**
 * Bildirimdeki eylem düğmesi ("Tekrar dene", "Geri al"). Yüzey temadan bağımsız koyu;
 * uygulamanın `Button`ı tema token'larıyla çalıştığı için burada kullanılmaz.
 * `min-h`: yoğunluk ayarı kök yazıyı kısınca bile tıklanabilir boy; dokunmatikte 44px.
 */
export const TOAST_BUTTON_GHOST = cn(
  "inline-flex items-center justify-center rounded-full border border-white/20 px-3.5",
  "text-[0.75rem] font-semibold text-white transition",
  "hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
  "[min-height:max(1.75rem,28px)] pointer-coarse:min-h-11",
)
