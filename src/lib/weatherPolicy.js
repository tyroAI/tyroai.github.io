/**
 * Hava durumu (Akışım'ın selamlama göğü) — tek kumanda noktası (`lib/weather.js`
 * gerekçeleri). Geri almak tek satır: `enabled: false` (gök hiç çizilmez,
 * selamlama düz hâlinde; hiç istek yok).
 */
export const WEATHER = Object.freeze({
  enabled: true,
  /** Veri sağlayıcısı: MET Norway (ticari kullanıma açık, CC BY 4.0 atfı). */
  provider: "metno",
  /** Bellek önbelleğinin ömrü — MET de sık sormamayı istiyor. */
  ttlMs: 30 * 60 * 1000,
})
