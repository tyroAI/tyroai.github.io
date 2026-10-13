/**
 * ═══════════════════════════════════════════════════════════════════════
 *  APP KİLİDİ — TEK KUMANDA NOKTASI
 * ═══════════════════════════════════════════════════════════════════════
 *
 * `tyro_authorizedapp.tyro_apps` listesinde OLMAYAN app'ler ekranda kilitli
 * görünür ve açılamaz. Özelliğin tamamı tek adla greplenir:
 * `grep -rin "appLock" src/`.
 *
 * | İşlem                  | Değişiklik            |
 * |------------------------|-----------------------|
 * | Yayına al              | `enabled: true`       |
 * | Geri al                | `enabled: false`      |
 * | Yönetici de kilitlensin| `adminBypass: false`  |
 *
 * ⚠️ **VARSAYILAN KAPALI, ve bu bilinçli.** Kural fail-closed: tabloda
 * SATIRI OLMAYAN kişi hiçbir app'i açamaz (2026-09-17, istek üzerine).
 * Bugün tabloda iki satır var; açık gelseydi yayına çıktığı an şirketin
 * geri kalanı uygulamadan düşerdi. Liste doldurulduktan sonra buradaki tek
 * satır çevrilir.
 *
 * ⚠️ **KİLİT HER APP İÇİN AYNI ŞEYİ YAPMIYOR — ölçüldü (2026-09-17):**
 * katalogdaki 13 kaydın 4'ü ASİSTAN (adresleri yok, tek kapı bu
 * uygulamanın `/chat` ekranı) ve 9'u DIŞ ADRES taşıyor
 * (harici bir uygulama adresi gibi).
 *
 *   - Asistanda kilit GERÇEK: başka kapı yok.
 *   - Adresli app'te kilit bir TABELA: adresi bilen tarayıcıya yazıp
 *     girebilir. Oradaki gerçek kapı hedef sistemin kendisidir (tyroTrade'in
 *     kendi kütük kapısı, Power BI ve D365'in kendi lisans/yetki kontrolü).
 *
 * Yani bu kilidin işi keşfi ve yanlışlıkla girmeyi engellemek ve talep
 * akışını başlatmak; bir güvenlik sınırı DEĞİL. Sınırı hedef sistem koyar.
 *
 * ⚠️ **KAPSAM: ASİSTANLAR + AI UYGULAMALARI. İŞ UYGULAMALARI HARİÇ**
 * (2026-09-17, istek üzerine). D365, Power BI ve Tibot kendi kimlik ve
 * lisans kapılarını taşıyor; orada bizim kilidimiz ne engelliyor ne
 * ekliyordu.
 *
 * Kapsam kararı önce `AppLauncher`ın içinde bir yorumdu. Kilit ikinci ve
 * üçüncü yüzeye yayılınca (sidebar listesi, favoriler) aynı kuralın üç
 * kopyası olacaktı; `appliesTo` o yüzden var — katalog büyüdükçe tek
 * yerden bakılır.
 */

/**
 * Kilit bu TÜR için geçerli mi. `kind` katalogdaki üç bölümün adı:
 * `"agent"` · `"aiApp"` · `"businessApp"`.
 */
export function appliesTo(kind) {
  return kind === "agent" || kind === "aiApp"
}
export const APP_LOCK = {
  /** Kilit uygulansın mı. Kapalıyken hiçbir kart kilitlenmez, hiçbir
   *  ek sorgu atılmaz ve ekran bugünkü hâliyle birebir aynı kalır. */
  enabled: true,

  /** Yönetici (`tyro_isadmin`) kilidi atlar. Kapatılırsa yetkileri yöneten
   *  kişi kendi listesi boşken uygulamaya giremez hâle gelir — yani
   *  düzeltmesi gereken şeyi düzeltemez. */
  adminBypass: true,
}
