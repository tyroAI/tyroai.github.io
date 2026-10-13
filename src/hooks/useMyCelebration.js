import { useMemo } from "react"
import { useMsal } from "@azure/msal-react"
import { useCelebrations } from "@/hooks/useCelebrations"
import { useMyProfileDetails } from "@/hooks/useMyProfileDetails"
import { identitySet, myCelebrationFrom } from "@/lib/myCelebration"

/**
 * Bu oturumun kendisini tanıyan adres kümesi: giriş adresi (UPN) + dizindeki
 * posta adresi. Gerekçe `lib/myCelebration.js`te (237/801 kişide ikisi farklı).
 * ⚠️ `/me` okuması `useMyProfileDetails`in önbelleğinden — oturum başına TEK
 * istek, `User.Read` (girişin kendi kapsamı).
 */
export function useMyIdentity() {
  const { accounts } = useMsal()
  const upn = accounts[0]?.username ?? ""
  const { details } = useMyProfileDetails()
  const mail = details?.mail ?? ""
  const dirUpn = details?.upn ?? ""
  return useMemo(() => identitySet(upn, mail, dirUpn), [upn, mail, dirUpn])
}

/** Bugün senin günün mü — `null` ya da `{ birthday, anniversary }`. */
export function useMyCelebration() {
  const cel = useCelebrations()
  const ids = useMyIdentity()
  const mine = myCelebrationFrom(cel, ids)
  // Kimlik yalnız SONUÇ değişince değişir: `useCelebrations` her render'da
  // yeni bir nesne döndürüyor (`narrowToToday` bugünü okuyor) ve tüketiciler
  // bunu `useMemo` bağımlılığına koyuyor.
  const birthday = !!mine?.birthday
  const years = mine?.anniversary?.years ?? 0
  const startYear = mine?.anniversary?.startYear ?? 0
  return useMemo(
    () =>
      birthday || years ? { birthday, anniversary: years ? { years, startYear } : null } : null,
    [birthday, years, startYear],
  )
}
