/**
 * Çözümler (`/dashboard`, uygulama ve asistan kataloğu; profil menüsünden açılır) — yalnız
 * uygulama yöneticilerine açık (Güvenlik › Yetkiler'de "Yönetici"). Kapı `lib/pageAccess.js`te:
 * rota, menü satırı, arama, komut paleti ve Yardım kılavuzları aynı karardan okur. Kitle dışı
 * kişi bu adrese gelirse Anasayfa'ya düşer. Herkese açmak: `audience: "*"`.
 */
export const SOLUTIONS_PAGE = {
  enabled: true,
  audience: "*",
}
