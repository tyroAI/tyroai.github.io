import TyroMascot from "./TyroMascot"
import { mascotColorsForPalette } from "./mascotPalette"

/**
 * MASKOTUN TEMBEL SINIRI — palet kimliğini alır, rengi burada çözer.
 *
 * ⚠️ **BU DOSYA VAR OLMASAYDI MASKOT GİRİŞ PAKETİNE BİNERDİ — ÖLÇÜLDÜ.**
 * `BrandOrb` bir dönem `mascotColorsForPalette`i DOĞRUDAN import ediyordu; o da
 * `mascot.mjs`in `palettes` dizisini okuyor, yani 21 KB'lık çizici modülü
 * `BrandOrb`un grafiğine giriyordu. `BrandOrb` ise `LoginPage`ten çağrılıyor ve
 * `LoginPage` TEMBEL DEĞİL (`App.jsx`te düz import) — sonuç: `dist/index.html`in
 * peşin indirdiği `index-*.js` içinde maskotun Türkçe durum etiketleri
 * ("Yörüngede") görünüyordu. Yani `lazy()` yazmak yetmiyordu; ASIL SINIR
 * import grafiğidir.
 *
 * Çare paletin ADINI geçirip rengi sınırın İÇİNDE çözmek: `BrandOrb` artık
 * `mascot/` altından hiçbir şeyi statik import etmiyor.
 *
 * ⚠️ Denetim: `grep -l "Yörüngede" dist/assets/*.js` — çıkan dosya
 * `dist/index.html`in `<script>`/`modulepreload` listesinde OLMAMALI.
 */
export default function MascotOrb({ paletteId, ...rest }) {
  return <TyroMascot {...rest} colors={mascotColorsForPalette(paletteId)} />
}
