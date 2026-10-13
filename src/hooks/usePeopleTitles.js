import { useEffect, useState } from "react"
import { useMsal } from "@azure/msal-react"
import { foldTr } from "@/lib/feed"
import { FEED } from "@/lib/feedPolicy"
import { graphGet, STATUS } from "@/lib/graph"
import { isMsalConfigured } from "@/lib/msal"
import { directorySearchTerm } from "@/lib/personDirectory"

/**
 * Akıştan okunan ADLARIN dizindeki ÜNVANLARI.
 *
 * İstek (2026-09-20): *"bu kişileri buraya yazarken altına ünvanlarını da
 * bulup yazabilirsen çok iyi olur"*. "Aramıza yeni katılanlar" listesi bir
 * ada bakıyor ve o adın ne iş yaptığını söylemiyordu — tam da yeni gelen
 * birinde en çok merak edilen şey.
 *
 * ⚠️ **KAPSAM SESSİZCE İSTENİR, `loginRequest`E KONMAZ.** `jobTitle` dizin
 * alanı ve `User.Read.All` istiyor; o kapsam YÖNETİCİ ONAYI gerektiriyor ve
 * bu depoda onaysız tek bir kapsam bütün girişi "Approval required"
 * duvarına çeviriyor (msal.js'te yazılı). Desen `usePresence`in aynısı:
 * belirteç yalnız sessizce alınır, alınamazsa ÜNVAN HİÇ ÇİZİLMEZ ve başka
 * hiçbir şey değişmez. Yani bu özellik "çalışmazsa bozar" değil,
 * "çalışmazsa yok" sınıfında.
 *
 * ⚠️ **ARAMA SOYADIYLA, TAM ADLA DEĞİL — ve sebebi Türkçe.** Duyuru konuları
 * BÜYÜK HARF yazılıyor ("AİDA BEKTAYEVA"), dizin ise normal yazımda ("Aida
 * Bektayeva"); aradaki `İ` (U+0130) ile `i` Graph'ın eşleştirmesinde aynı
 * harf değil ve tam adla yapılan arama boş dönüyor. Soyadı çoğu adda o
 * harfi taşımıyor, o yüzden sorgu SON kelimeyle atılıyor ve gelen aday
 * listesi istemcide TAM AD üzerinden doğrulanıyor (`foldTr`, aynı katlama
 * kuralı). Nokta içeren harfi olan bir soyadında eşleşme olmaz ve o satır
 * ünvansız kalır — yanlış ünvan yazmaktansa hiç yazmamak.
 *
 * ⚠️ **DOĞRULAMA İSTEMCİDE ve TAM AD ÜZERİNDEN.** Yalnız soyadla eşleşen
 * ilk kaydı almak, aynı soyadlı iki çalışanda yanlış kişinin ünvanını bir
 * başkasının adının altına yazardı — bu ekranın yapabileceği en kötü hata.
 * Birden çok aday tam ada uyuyorsa da ünvan yazılmaz.
 *
 * ⚠️ **ÖNBELLEK YALNIZ BELLEKTE ve çıkışta düşer** (`clearPeopleTitleCache`,
 * msal.js LOGOUT zinciri): başkalarının adı ve ünvanı, paylaşılan bir
 * tarayıcıda diske yazılmaz — panellerin geri kalanıyla aynı kural.
 */

/** ad (katlanmış) → ünvan metni | null (arandı, bulunamadı) */
const cache = new Map()
/** Aynı ad için uçuştaki sorgu paylaşılır. */
const inflight = new Map()

export function clearPeopleTitleCache() {
  cache.clear()
  inflight.clear()
}

/**
 * Aramaya gidecek kelime: `İ`/`I` TAŞIMAYAN, sondan ilk üç harfli kelime.
 *
 * Soyadı öncelikli, çünkü ayırt ediciliği yüksek. Soyadında o harf varsa
 * ("AHMET İNCE") ada düşülüyor: yaygın bir ad çok aday getirir ama karar
 * zaten istemcideki TAM AD doğrulamasında veriliyor, o yüzden geniş bir
 * aday listesi yanlış cevap üretmiyor — yalnız `$top` yetmezse cevapsız
 * bırakabiliyor (bu yüzden 25).
 */
const searchTerm = directorySearchTerm

async function lookup(instance, account, name) {
  const term = searchTerm(name)
  if (!term) return null
  const res = await graphGet(instance, account, {
    path: `/users?$search=${encodeURIComponent(`"displayName:${term}"`)}&$select=displayName,jobTitle&$top=25`,
    scopes: ["User.Read.All"],
    // $search dizinde "eventual consistency" istiyor; başlıksız 400 döner.
    headers: { ConsistencyLevel: "eventual" },
  })
  if (res.status !== STATUS.ready) return null
  const wanted = foldTr(name)
  const hits = (res.data?.value ?? []).filter((u) => foldTr(u.displayName ?? "") === wanted)
  if (hits.length !== 1) return null
  const title = String(hits[0].jobTitle ?? "").trim()
  return title || null
}

export function usePeopleTitles(names) {
  const { instance, accounts } = useMsal()
  const account = accounts[0]
  // Anahtar, istenen adların kendisi: liste değişmedikçe efekt yeniden
  // koşmuyor ve dizi kimliği her render'da değişse bile tur atılmıyor.
  const key = names.join("|")
  const [titles, setTitles] = useState(() => new Map())

  useEffect(() => {
    if (!FEED.people.titles || !isMsalConfigured || !account || !key) return
    let cancelled = false
    const wanted = key.split("|").filter(Boolean)
    ;(async () => {
      await Promise.all(
        wanted.map(async (name) => {
          const k = foldTr(name)
          if (cache.has(k)) return
          if (!inflight.has(k))
            inflight.set(
              k,
              lookup(instance, account, name).catch(() => null),
            )
          const value = await inflight.get(k)
          inflight.delete(k)
          cache.set(k, value)
        }),
      )
      if (cancelled) return
      const next = new Map()
      for (const name of wanted) {
        const value = cache.get(foldTr(name))
        if (value) next.set(name, value)
      }
      setTitles(next)
    })()
    return () => {
      cancelled = true
    }
  }, [key, account, instance])

  return titles
}
