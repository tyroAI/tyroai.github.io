/**
 * Pano (`/widgets`, widget sayfası) — Anasayfa'nın deneme kopyası: yeni kartlar burada
 * denenir, beğenilenler Anasayfa'ya taşınır. Yalnız uygulama yöneticilerine açık
 * (Güvenlik › Yetkiler'de "Yönetici").
 * Kapı `lib/pageAccess.js`te (rota, sidebar satırı).
 */
export const WIDGETS_PAGE = {
  enabled: true,
  /** `"*"` herkese · `"admins"` Entra yönetici grubu · `"appAdmins"` uygulama yöneticileri · `["upn", …]`. */
  audience: "*",
}

/**
 * Anasayfa'da widget düzenleme (header'da "Anasayfayı düzenle", katalog, düzen) ve
 * varsayılan düzen (`HOME_LAYOUT`) herkese açık. Kitle dışında kalan olursa Anasayfa
 * eski sabit düzeniyle çizilir; daraltmak için `audience` (ör. `"appAdmins"`).
 */
export const HOME_EDIT = {
  enabled: true,
  audience: "*",
}
