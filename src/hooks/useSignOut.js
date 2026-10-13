import { useMsal } from "@azure/msal-react"
import { useNavigate } from "react-router-dom"
import { isMsalConfigured, MOCK_LOGGED_IN_KEY } from "@/lib/msal"
import { markSignedOut } from "@/lib/silentSso"

/**
 * Oturumu kapatır. Kullanıcı menüsü ve katalog uyarı şeridi AYNI fonksiyonu
 * kullanır.
 *
 * Neden paylaşılıyor: buradaki iki incelik unutulmaya müsait ve unutulduğunda
 * arıza SESSİZ oluyor.
 *
 *  1. **`markSignedOut()` redirect'ten ÖNCE.** Entra oturumu bizim
 *     uygulamamızın oturumundan uzun yaşıyor; bu işaret olmadan /login'deki
 *     sessiz SSO kullanıcıyı anında geri içeri alır ve çıkış yapmak
 *     İMKÂNSIZ olur.
 *  2. **Elle `navigate` YOK.** `logoutRedirect` tüm sayfayı AAD'ye götürüp
 *     `postLogoutRedirectUri`'ye (/login) döndürüyor; redirect devreye
 *     girmeden yapılan bir gezinme yarış koşuludur.
 *
 * Yalnızca redirect KURULUMU başarısız olursa (nadir) yerel duruma düşer.
 */
export function useSignOut() {
  const { instance } = useMsal()
  const navigate = useNavigate()

  return async function signOut() {
    if (isMsalConfigured) {
      const account = instance.getActiveAccount() ?? undefined
      markSignedOut()
      await instance.logoutRedirect({ account }).catch(() => {
        instance.setActiveAccount(null)
        navigate("/login")
      })
      return
    }
    window.sessionStorage.removeItem(MOCK_LOGGED_IN_KEY)
    navigate("/login")
  }
}
