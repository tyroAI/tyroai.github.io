import { useSyncExternalStore } from "react"
import { useMsal } from "@azure/msal-react"
import { useFilesSearch } from "@/hooks/useFilesSearch"
import { FILES_PAGE } from "@/lib/filesPolicy"
import { mineRungFor, subscribeMineRung } from "@/lib/filesIdentity"

/**
 * "SON ÇALIŞTIKLARIN" — kişinin oluşturduğu ya da son değiştirdiği dosyalar,
 * en yenisi üstte. Sürücünün "son kullanılanlar" ucu DEĞİL (Kasım 2026'da
 * susuyor; bkz. `lib/filesQuery.js`), arama ucu.
 *
 * ⚠️ **ÜÇ BASAMAK, HESAP BAŞINA, OTURUM BOYUNCA** (`lib/filesIdentity.js`):
 *   upn      `(EditorOWSUSER:"<upn>" OR AuthorOWSUSER:"<upn>")`
 *   mail     aynı kısıt posta adresiyle — YALNIZ UPN'den farklıysa
 *   onedrive `path:"<OneDrive kökü>"` — başlık bunu SÖYLÜYOR
 *            ("OneDrive'ında son değişenler", `oneDrive: true`)
 * İlk sayfa HAZIR ama BOŞ dönerse ya da sorgu yetenek basamağından sonra
 * REDDEDİLİRSE bir alt basamağa inilir. Kiracının arama şeması canlıda
 * ÖLÇÜLMEDİ (P1). Sunucu sıralayamadıysa liste istemcide en yeni üstte
 * sıralanır (`clientSorted`, §12.17) — gün bantları bölünmesin.
 *
 * Yoklama olarak da kullanılabilir (`firstPage: 1`), ama gerekmez:
 * `useFilesSearch({ person })` basamak bilinmiyorsa yoklamayı kendisi yapıyor.
 *
 * @param {object} o
 * @param {boolean} o.enabled
 * @param {string} [o.upn]     verilmezse MSAL `username`
 * @param {string} [o.mail]    posta basamağının adresi (`useMyProfileDetails().mail`);
 *   VERİLMEZSE upn basamağı düştüğünde `/me` bir kez sorulur — açılışa istek eklenmesin
 * @param {string} [o.myRoot]  OneDrive kökü; verilmezse `useMyDrive`
 * @param {number} [o.nonce] @param {number} [o.firstPage]
 * @returns {object} `useFilesSearch`in sonucu +
 *   `mineRung` ("upn" | "mail" | "onedrive" | null), `oneDrive` (OneDrive
 *   basamağında: başlık `recent.oneDriveTitle` + `recent.oneDriveHint`),
 *   `rung` (ESKİ alan: 2 = OneDrive basamağı, 1 = diğerleri)
 */
export function useRecentFiles({
  enabled,
  upn,
  mail,
  myRoot,
  nonce = 0,
  firstPage = FILES_PAGE.pageFirst,
} = {}) {
  const params = enabled ? { recent: true, sort: "modified", ...(upn ? { upn } : {}) } : null
  const res = useFilesSearch(params, { nonce, firstPage, identity: { mail, myRoot } })
  const rungNow = useMineRung()
  const mineRung = res.mineRung ?? rungNow
  return {
    ...res,
    mineRung,
    oneDrive: mineRung === "onedrive",
    rung: mineRung === "onedrive" ? 2 : 1,
  }
}

/**
 * Bu hesabın bulunmuş kimlik basamağı — `"upn" | "mail" | "onedrive" | null`.
 * Basamak bulununca (son liste ya da yoklama) yeniden çizer. OneDrive
 * basamağında "Başkaları" sorulamaz (`othersAvailable`, `lib/filesIdentity.js`):
 * çağıran seçeneği gizler ve adresteki `fp=others`ı düşürür.
 */
export function useMineRung() {
  const { accounts } = useMsal()
  const account = accounts[0] ?? null
  return useSyncExternalStore(
    subscribeMineRung,
    () => mineRungFor(account),
    () => null,
  )
}

export { mineRungFor, resetRecentFilesRung } from "@/lib/filesIdentity"
