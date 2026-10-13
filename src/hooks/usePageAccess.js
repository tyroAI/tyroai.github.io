import { useMemo } from "react"
import { useMsal } from "@azure/msal-react"
import { useIsAppAdmin } from "@/hooks/useAuthorizations"
import { useIsInGroup } from "@/hooks/useIsInGroup"
import { ADMIN_GROUP_ID } from "@/lib/constants"
import { pageAccessFor } from "@/lib/pageAccess"

/**
 * Kitlesi daraltılmış sayfaların bu oturum için kararı — kural
 * `lib/pageAccess.js`te, burada yalnız oturumun iki girdisi okunuyor.
 *
 * ⚠️ **UPN `accounts[0].username`TEN** — `WarmStart` ve `useIsInGroup` ile
 * aynı hesap. Hesap yoksa (oturumsuz, ya da DEV'in `?devauth=1` kestirmesi)
 * UPN boş ve liste kitleli sayfalar KAPALI: fail-closed, kısıtlı asistanın
 * o kestirmede kilitli görünmesiyle aynı taraf.
 *
 * ⚠️ `canOpen` KİMLİĞİ YALNIZ İKİ GİRDİ DEĞİŞİNCE DEĞİŞİR (`useMemo`).
 * Yenilikler kancaları onu efekt bağımlılığına koyuyor; her render'da yeni
 * bir fonksiyon, her render'da kataloğu yeniden süzmek olurdu.
 */
export function usePageAccess() {
  const { accounts } = useMsal()
  const upn = accounts[0]?.username ?? ""
  // Koşulsuz (kanca kuralı): `"admins"` kitlesi bu cevaba bakar.
  const inAdminGroup = useIsInGroup(ADMIN_GROUP_ID)
  // Pano ve Çözümler'in kitlesi: Güvenlik › Yetkiler'deki uygulama yöneticileri.
  const isAppAdmin = useIsAppAdmin()
  return useMemo(
    () => pageAccessFor({ upn, inAdminGroup, isAppAdmin }),
    [upn, inAdminGroup, isAppAdmin],
  )
}
