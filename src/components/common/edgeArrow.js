/**
 * Kartın kenar oku (‹ ›) — yığın widget'ları (`widgets/StackNav`) ve sıradaki toplantı kartı
 * aynı dili konuşur. Ok kartın İÇİNDE, kenara yapışık ince dikey bir hap: dışarıda (ızgara
 * boşluğunda) iken yan yana iki kartın okları üst üste biniyordu; yuvarlak düğme içeride
 * kenardaki yazıyı örtüyordu. Hap kartın iç boşluğuna (~20 px) sığar, zemini yarı saydam ve buzlu.
 *
 * Görünürlük kartın grubuna bağlı (`group-hover/<ad>`), o yüzden çağıran ekler; burada yalnız
 * biçim ve yön. Gizliyken ok kenara doğru biraz kaymış durur, görünürken yerine oturur.
 * Dokunmatikte basılan alan görünmez payla 44 px'e çıkar (pay yazının üstüne taşabilir, görünmez).
 */
export const EDGE_ARROW =
  "absolute top-1/2 z-10 grid h-10 w-[1.125rem] -translate-y-1/2 place-items-center rounded-full bg-background/55 text-foreground/75 shadow-[0_2px_10px_-4px_rgb(0_0_0/0.22)] ring-1 ring-foreground/10 backdrop-blur-md outline-none transition-[opacity,translate,background-color,color] duration-200 ease-out after:absolute after:-inset-x-3 after:-inset-y-1 pointer-coarse:after:content-[''] hover:bg-background/85 hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/40 motion-reduce:transition-none"

/** Yön: sol ok sol kenarda, sağ ok sağ kenarda (3 px içeride); gizliyken kenara doğru 4 px. */
export const edgeSide = (dir) =>
  dir < 0 ? "left-[3px] -translate-x-1" : "right-[3px] translate-x-1"
