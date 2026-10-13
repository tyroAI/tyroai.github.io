/**
 * Oturumsuz tanıtım sayfaları — girişin sağ üstündeki bağlantılar: Hakkımızda ve
 * Ekibimiz. Üçü de buradan okur: `App` bunları kabuksuz ve oturumsuz çizer,
 * `PaletteProvider` girişin paletini çiviler, sessiz SSO açılışta denenmez
 * (paylaşılan bir bağlantı oturumu açık birini Entra turuyla Anasayfa'ya
 * fırlatmasın).
 */
export const ABOUT_PATH = "/about"

const PUBLIC_PATHS = new Set([ABOUT_PATH])

/**
 * Adres bir tanıtım sayfasıysa onun kanonik yolu, değilse `null`. Sondaki eğik
 * çizgi aynı sayfa: paylaşılan "/team/" bağlantısı da tanınsın.
 * ⚠️ `public/` altında bu adlarla KLASÖR açma: GitHub Pages "/team"i klasöre
 * 301'le yönlendirir ("/team/"); fotoğraflar bu yüzden `public/images/team/`da.
 */
export function publicPagePath(pathname) {
  const path = pathname.replace(/\/+$/, "") || "/"
  return PUBLIC_PATHS.has(path) ? path : null
}

export function isPublicPage(pathname) {
  return publicPagePath(pathname) !== null
}
