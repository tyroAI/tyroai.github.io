/**
 * RENK KÖPRÜSÜ — uygulamanın 17 paleti → maskotun üç rengi.
 *
 * İstek (2026-09-13): *"Bizim renk paletlerine göre orbun rengi değişecek;
 * login hariç, loginde her zaman kurumsal uygulama rengi olacak."*
 *
 * Maskot kaynağı üç renk ister (`colors: [a, b, c]`) ve gövdeyi onlardan
 * türetir (`mascot.mjs`):
 *   a → `deep = mix(a,'#030913',.8)` ve `shade = mix(a,'#071020',.5)` — kürenin
 *       KOYU gövdesi ve HACMİ (iki ton arasındaki fark küreyi küre yapar).
 *   b → `bloom` gradyanı ve halenin varsayılan vurgusu — BASKIN renk.
 *   c → `light = mix(c,'#ffffff',.74)` — kenar, parıltı ve GÖZLER, en AÇIK renk.
 *
 * ⚠️ **ON İKİ PALET MASKOTUN KENDİ TABLOSUNDAN OKUNUR, KOPYALANMAZ.**
 * `mascot.mjs`in 12 paleti bizimkilerle aynı adları taşıyor (üçü farklı
 * yazımla) ve değerleri kaynağın yazarının elinden çıkma — ölçüldü: maskotun
 * üçlüleri bizim `swatch` dizimizin neredeyse kopyası (OKLab ΔE 0,017-0,057,
 * yani 1-3 JND: "bizim rengimiz, bir tık farklı"). Buraya hex kopyalamak,
 * kaynak güncellendiğinde sessizce ayrışacak ikinci bir doğruluk kaynağı
 * olurdu; bu tablo yalnız KİMLİK eşler.
 *
 * ⚠️ **ÜÇ KAYNAK PALETİ "KOYU→AÇIK" SIRASINDA DEĞİL VE YİNE DE DOKUNULMADI.**
 * Ölçüldü — `insta` tamamen TERS (a sarı %70 parlaklık, c mor %11), yani
 * gövde zeytin-kahve ve gözler soluk leylak; `ocean-breeze` monoton değil;
 * `peach-sorbet`in c'si (lavanta) b'sinden koyu. Üçü de kaynağın KENDİ
 * seçimi ve üçü de kontrast tabanının ÜSTÜNDE (`light:deep` en kötüsü
 * `insta`da 8,47:1, göz/gövde 4,89:1 — AA'nın üstü). Sırayı düzeltmek
 * yazarın paletini yeniden tasarlamak olurdu; bu depoda üç kez öğrenilen
 * kural: uyarlanan eksen SAYILIDIR (boyut ve renk), üçüncüsüne dokunulmaz.
 * İstenirse tek satır: o üç palet için aşağıdaki `SOLID_COLORS` tablosuna
 * ters çevrilmiş üçlüleri yazmak yeter.
 *
 * ⚠️ **BEŞ DÜZ PALETİN MASKOT KARŞILIĞI YOK VE OLAMAZ.** `black` · `amber` ·
 * `navy` · `sky` · `violet` üç marka tokenini de AYNI değere ayarlıyor
 * (`--brand-from/via/to`, ör. black üçünde de `#000000`, KOYU TEMADA üçünde de
 * `#ffffff`). Onları doğrudan beslemek maskotun üç duraklı gradyanını tek
 * renge düzleştirir — üstelik siyah palet tema değişiminde siyahtan beyaza
 * DÖNERDİ.
 *
 * Çare uygulamanın KENDİ orb rampası: `--voiceorb-c1..c5` her palet için elle
 * ayarlanmış ve bu beş blokta sıralama nettir — **c4 en derin · c2 paletin adını
 * taşıyan marka rengi · c5 en açık**. Kural: **a = c4 · b = c2 · c = c5**.
 *
 * ⚠️ Bu kural YALNIZ düz paletler için: gradyan bloklarında c3 en derin ve c4
 * bir açık sis tonu. On yedi palete tek kural yazılmaz.
 *
 * ⚠️ **SİYAHTA ÖLÇÜLMÜŞ TEK İSTİSNA: `a = c3`, c4 DEĞİL.** c4 orada düpedüz
 * `#000000` ve gövdenin iki tonunu birbirine eşitliyor — `shade`/`deep`
 * kontrastı **1,007**, yani küre değil düz bir disk. Kaynağın kendi en düşük
 * değeri 1,055 (`chocolate`). `c3` (`#262626`) ile **1,113** oluyor
 * (`midnight`in 1,115'iyle aynı bantta) ve küre hâlâ siyah okunuyor
 * (`deep` = `#0a0f17`).
 *
 * Ölçüldü (maskotun kendi `mix()`i, WCAG sRGB kontrastı — beş düz palet):
 *
 * | palet  | a       | b       | c       | gövde hacmi | göz/gövde | hale/gövde |
 * |--------|---------|---------|---------|------------:|----------:|-----------:|
 * | black  | #262626 | #737373 | #ededed |       1,113 |     18,40 |       4,05 |
 * | amber  | #78350f | #d97706 | #fde68a |       2,00+ |     17,43 |       5,79 |
 * | navy   | #1e3a8a | #3b82f6 | #bfdbfe |       2,00+ |     16,92 |       5,02 |
 * | sky    | #0c4a6e | #0ea5e9 | #e0f2fe |       2,00+ |     17,70 |       6,60 |
 * | violet | #4c1d95 | #8b5cf6 | #ede9fe |       2,00+ |     17,89 |       4,42 |
 *
 * Karşılaştırma — maskotun KENDİ 12 paleti aynı hesapta göz/gövde 8,47-17,02
 * ve hale/gövde 2,21-9,00 bandında. Beşi de o bandın içinde, yani ekrana
 * kaynağın tanımadığı bir renk ilişkisi girmiyor. On yedi paletin hiçbirinde
 * bembeyaz ya da simsiyah gövde yok.
 *
 * ⚠️ **KÖPRÜ TEMADAN BAĞIMSIZ VE BU YAPISAL.** `--voiceorb-*` ile maskotun
 * kendi tablosunun HİÇBİRİNİN `.dark` karşılığı yok (denetlendi: `src/index.css`
 * koyu blokunda 0 override). Maskot bir KARAKTER, bir yüzey değil — temayla
 * renk değiştirmesi onu kimliksiz yapardı. Tema duyarlı bir dokunuş bir gün
 * istenirse `accent` (hale) ya da `glow` oynatılır, `a/b/c` asla.
 *
 * ⚠️ **DEĞERLER DONDURULDU, `src/index.css`ten ÇALIŞMA ANINDA OKUNMUYOR.**
 * Okumak `getComputedStyle` + palet değişimini izleyen bir gözlemci isterdi ve
 * kazancı yok: bu beş palet düz renk, rampaları değişmiyor. Ama bağ GERÇEK —
 * `--voiceorb-*` değişirse buradaki üçlü de elle güncellenmeli.
 */
import { palettes } from "@/components/brand/mascot/mascot.mjs"

/**
 * Uygulamanın palet kimliği → maskotun palet kimliği. Üçü farklı yazılıyor
 * (`fiesta`/insta, `sunset-gradient`/sunset, `chocolate-delight`/chocolate);
 * gerisi birebir. Listede olmayan palet aşağıdaki düz renk tablosuna düşer.
 */
const MASCOT_PALETTE_ID = {
  fiesta: "insta",
  "ocean-breeze": "ocean-breeze",
  "ocean-breeze-v2": "ocean-breeze-v2",
  "arctic-mint": "arctic-mint",
  "rose-blush": "rose-blush",
  "peach-sorbet": "peach-sorbet",
  "sunset-gradient": "sunset",
  "pastel-lavender": "pastel-lavender",
  "green-garden": "green-garden",
  "fiery-red": "fiery-red",
  "chocolate-delight": "chocolate",
  midnight: "midnight",
}

/** Düz paletlerin üçlüsü — yukarıdaki kuralla `--voiceorb-*`ten türetildi. */
const SOLID_COLORS = {
  // ⚠️ `a` burada c3; c4 (`#000000`) gövdeyi düzleştiriyor — ölçüldü, 1,007.
  black: ["#262626", "#737373", "#ededed"],
  amber: ["#78350f", "#d97706", "#fde68a"],
  navy: ["#1e3a8a", "#3b82f6", "#bfdbfe"],
  sky: ["#0c4a6e", "#0ea5e9", "#e0f2fe"],
  violet: ["#4c1d95", "#8b5cf6", "#ede9fe"],
}

/** Maskot kaynağının kendi varsayılanı (`palettes[2]`) — bizim de varsayılanımız. */
const FALLBACK = "ocean-breeze-v2"

/**
 * Palet kimliğinin maskota geçecek üç rengi.
 *
 * ⚠️ Her zaman `colors` döndürür, `palette` kimliği DEĞİL: maskot iki girdiyi
 * de kabul ediyor ama tek bir şekil döndürmek çağıranı ikiye dallanmaktan
 * kurtarıyor ve stüdyodaki önizleme ile canlı küre aynı yoldan geçiyor.
 */
export function mascotColorsForPalette(paletteId) {
  const solid = SOLID_COLORS[paletteId]
  if (solid) return solid
  const mascotId = MASCOT_PALETTE_ID[paletteId] ?? FALLBACK
  const entry = palettes.find((p) => p[0] === mascotId) ?? palettes.find((p) => p[0] === FALLBACK)
  return entry[2]
}
