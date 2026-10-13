/**
 * Vurgunun tonları — paletin durakları, ama OKUNURLUĞU ÖLÇÜLMÜŞ biçimde
 * (`daySummary.css` › `--ds-*`).
 *
 * ⚠️ **İLK İKİ KURAL DA YETMEDİ — ÖLÇÜLDÜ** (17 palet × 2 tema, kart
 * zeminine karşı). Çıplak duraklar (`text-brand-text-*`) Insta'nın
 * sarısında beyazda okunmuyordu; mürekkeple karışım (`72% durak + 28%
 * --foreground`) açık temada ocean-breeze · peach · sunset'te 3,8:1'e, KOYU
 * temada chocolate · ocean-breeze-v2 · midnight · black'te 2,05–2,6:1'e
 * düşüyordu — koyu bir durağı açık mürekkeple %28 karıştırmak onu koyu zeminde
 * yine koyu bırakıyor. Şimdi açıklık TAVANLI/TABANLI (açıkta ≤ 0,5, koyuda
 * ≥ 0,8), ton ve doygunluk paletin; ayrıntı CSS dosyasında.
 *
 * ⚠️ Dört madde, paletin ÜÇ durağı: Keşfet `from`a döner (toplantıyla aynı
 * renk ama üç satır arayla). Eskiden postayla aynı `via`daydı; dar kartta
 * ikisi alt alta iki satıra kırılınca aynı maddenin devamı gibi okunuyordu.
 */
export const TONE = {
  from: "text-(--ds-from)",
  via: "text-(--ds-via)",
  to: "text-(--ds-to)",
}
