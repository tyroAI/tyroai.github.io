/**
 * ═══════════════════════════════════════════════════════════════════════
 *  SES HÜZMESİNİN RENGİ — paletin kendisi, seçenek yok
 * ═══════════════════════════════════════════════════════════════════════
 *
 * `voice-glow` sekiz sabit varyantla geliyor (`colorful`, `ocean`, `sunset`…)
 * ve hiçbiri bu uygulamanın 14 paletinden haberdar değil. Bir tur o sekizi
 * Profil → Tercihler'e bir seçici olarak koyduk ve KALDIRILDI (istek
 * üzerine, 2026-09-20): hüzme paletin ne olduğuna göre çalışıyor.
 *
 * Karar deponun kendi kuralıyla aynı yöne bakıyor — "sabit hue yok, her şey
 * palet token'larından" — ve bir tercihi eksiltiyor: kullanıcının zaten
 * seçtiği palet, ikinci bir renk sorusunun cevabını da veriyor. Paketin
 * `colors` prop'u bunun kapısı.
 *
 * ── RENKLER NEDEN ÇALIŞMA ANINDA ÇÖZÜLÜYOR ─────────────────────────────
 *
 * ⚠️ Paketin ayrıştırıcısı KATI: `/^rgb\(\s*([\d.]+)…/` — yalnız
 * `rgb(r, g, b)`. Token'larımız karışık biçimde yazılı (bazı paletlerde
 * `oklch`, bazılarında hex) ve ayrıştırılamayan bir yuva SESSİZCE varyantın
 * rengine düşüyor: yedi lobun bir kısmı gökkuşağı olur ve kimse fark etmez.
 *
 * ⚠️ **`getComputedStyle` ÇEVİRMİYOR** — ölçüldü (Edge, 2026-09-20): CSS
 * Color 4'ten beri hesaplanmış değer `oklch(0.785 0.123 195)` olarak
 * serileştiriliyor, rgb'ye düşmüyor. Canvas'ın `fillStyle`ı da öyle. Tek
 * güvenilir yol rengi GERÇEKTEN BOYAYIP pikseli okumak: 1×1 canvas,
 * `fillRect`, `getImageData`. Ölçüldü — oklch, hex, rgb ve `color-mix`
 * dördü de paketin regex'ini geçen `rgb(r, g, b)` oluyor.
 *
 * ⚠️ Geçici DOM elemanı GEREKMİYOR: 98 marka token tanımının hiçbiri `var()`
 * zinciri kullanmıyor (ölçüldü), yani kök elemandan okunan ham değer
 * doğrudan boyanabiliyor. Bu, çözümü render sırasında güvenle çağrılabilir
 * saf bir okumaya indiriyor.
 *
 * ⚠️ Kısa ömürlü bir `tyro-voice-beam-v1` anahtarı yayına çıkıp aynı gün
 * kaldırıldı. Temizlik kodu YAZILMADI: onu okuyan hiçbir şey kalmadı ve
 * birkaç tarayıcıda duran ölü bir anahtar için göç kodu taşımak, kodun
 * kendisinden pahalı.
 */

/**
 * Aktif paletin marka renkleri, paketin istediği sırada: ÖNCE MERKEZ, sonra
 * dışa doğru çiftler.
 *
 * Gradyan üç durak taşıyor (`from · via · to`); merkeze `via` konuyor
 * (paletin orta tonu, en okunur olanı) ve dizi dışa doğru gradyanı
 * tekrarlıyor — hüzme paletin kendi geçişini dalga dalga yayıyor. Yedi
 * yuvanın hepsi DOLDURULUYOR: eksik bırakılan bir yuva paketin varsayılan
 * rengine düşer ve marka renkleriyle gökkuşağı yan yana gelirdi.
 */
export function resolveBrandBeamColors() {
  if (typeof document === "undefined") return null
  const tokens = [
    "--brand-via",
    "--brand-from",
    "--brand-to",
    "--brand-deep",
    "--brand-soft",
    "--brand-from",
    "--brand-to",
  ]
  try {
    const root = getComputedStyle(document.documentElement)
    const canvas = document.createElement("canvas")
    canvas.width = 1
    canvas.height = 1
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return null
    const out = []
    for (const token of tokens) {
      const raw = root.getPropertyValue(token).trim()
      if (!raw) continue
      ctx.clearRect(0, 0, 1, 1)
      ctx.fillStyle = "#000"
      ctx.fillStyle = raw
      ctx.fillRect(0, 0, 1, 1)
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
      out.push(`rgb(${r}, ${g}, ${b})`)
    }
    return out.length ? out : null
  } catch {
    return null
  }
}
