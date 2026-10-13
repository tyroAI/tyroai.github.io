/**
 * ═══════════════════════════════════════════════════════════════════════
 *  Akışım (`/myspace`) — kişinin çalışma alanı (POLİTİKA)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * İstek (2026-09-28): *"myspace sayfası yaptırdım, kişinin çalışma alanı
 * gibi… keşfetin altına mySpace diye sayfa açıp yap. eğer bu güzel olursa
 * belki bu anasayfa olur, dashboard Uygulamalar sayfası olur. ama ilk önce
 * bi yap görelim."* Aynı gün ikinci tur: *"sidebarda sayfanın adı Akışım
 * olsun, ingilizcesi My Space olsun"* — ad `nav.myspace`te, rota ve kimlik
 * (`myspace`) değişmedi.
 *
 * Grep kolu: `grep -rin "myspace" src/`
 *
 * **Geri almak tek satır:** `enabled: false` — sidebar satırı, arama
 * girdisi ve rota birlikte kapanır (rota `/dashboard`a yönlendirir).
 *
 * ⚠️ **TYRO'DA HERKESE AÇIK — VE AÇILIŞ SAYFASI** (2026-10-04, istek:
 * *"herkese aç çünkü o sayfalar kişisel maile göre çalışıyor zaten. tyro da
 * kapamıştık ama tyro da açacağız"*). Tyro canlı site; Tyro UAT/dev olarak
 * kalıyor ve orada kitle önizleme ekibiydi (`MYSPACE_UPNS`, `lib/audience.js`
 * — liste yerinde duruyor). Ad da değişti: sidebar'da **Anasayfa**
 * (`nav.myspace`), rota ve kimlik (`myspace`) aynı. Karar tek yerden okunuyor
 * (`lib/pageAccess.js`); sidebar, arama, rota ve sayfanın Yenilikler kaydı
 * birlikte açılıp kapanıyor. Daraltmak tek satır: `audience: MYSPACE_UPNS`.
 */
export const MYSPACE = {
  enabled: true,
  /** `"*"` herkese · `"admins"` yalnız yönetici grubuna · `["upn", …]` bu kişilere. */
  audience: "*",
}
