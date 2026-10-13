import { useEffect, useReducer, useState } from "react"
import { useMsal } from "@azure/msal-react"
import { isMsalConfigured } from "@/lib/msal"
import { graphGet, STATUS } from "@/lib/graph"

/**
 * Alıcı önerileri — iki katman: YEREL liste (posta + takvim, izni zaten
 * girişte) ve DİZİN araması (People API, şirketin tamamı).
 *
 * ⚠️ **YEREL LİSTE YENİ İZİN İSTEMEZ.** `Mail.Read` + `Calendars.Read` ile
 * geliyor ve ikisi de posta/takvim panelleri için zaten girişte.
 *
 * ⚠️ **KAYNAK ÜÇ, SIRA BİLİNÇLİ** (sahada: *"kime kısmında bazı kişiler
 * hemen çıkıyor, bazıları hiç çıkmıyor"*). Liste bir dönem yalnız gelen
 * kutusunun son 50 postasının GÖNDERENİYDİ: sana yazmamış, CC'de beraber
 * durduğun ya da toplantıda gördüğün meslektaş hiç görünmüyordu. Bugün:
 * gönderilmiş öğelerin to + cc'si → gelen kutusunun from + to + cc'si →
 * takvimin düzenleyen + katılımcıları. Liste hâlâ YAZIŞTIĞIN kişilerle
 * sınırlı; geri kalanını dizin araması (`usePeopleSearch`) bulur.
 *
 * ⚠️ **SEN DE LİSTEDESİN, EN SONDA.** Öneri kutusu yalnız yazılan metne göre
 * eşleşme gösteriyor (en az 2 harf); kendi adını yazan kendini bulmalı ama
 * aynı harfle başlayan bir meslektaşın önüne geçmemeli.
 *
 * ⚠️ **SORGULAR PARALEL VE HER BİRİ EN İYİ ÇABA.** Biri düşerse ötekiler yine
 * liste üretir; hepsi düşerse öneri yok ama kutu ÇALIŞMAYA DEVAM EDER — tam
 * adres yazmak her zaman kabul ediliyor (`RecipientField`, `EMAIL_RE`).
 *
 * Sekme başına bir kez çekilir ve BELLEKTE kalır: adresler PII ve bu tarayıcı
 * paylaşılıyor olabilir (takvim/posta önbellekleriyle aynı kural); çıkışta
 * `clearRecentPeopleCache` siler (msal.js LOGOUT_SUCCESS zinciri).
 */
const TOP = 100
let cache = null
let inflight = null

/**
 * ⚠️ **`People.Read` GİRİŞ İSTEĞİNDE DEĞİL — BİLİNÇLİ.** İzin Entra'da
 * verildi ama "KURUM adına onaylandı" teyidi olmadan `loginRequest`e
 * konmuyor: onaysız bir kapsam girişi herkes için "Approval required"
 * duvarına çevirirdi (`loginRequest`in yorumu). Arama YALNIZ SESSİZ
 * deneniyor — oturumun yenileme belirteci onaylı kapsamı kendiliğinden
 * alır. Alınamazsa `denied` döner, bu bayrak kalkar ve oturum boyunca bir
 * daha denenmez: kullanıcı hiçbir şey görmez, yerel liste çalışmaya devam
 * eder. Onay teyit edilince `loginRequest`e de eklenmeli (telefonda gizli
 * çerçeve yolu çerez kurallarıyla kesiliyor).
 */
const PEOPLE_SCOPES = ["People.Read"]
let peopleDenied = false
const searchCache = new Map()

export function clearRecentPeopleCache() {
  cache = null
  inflight = null
  peopleDenied = false
  searchCache.clear()
}

/** `{name,address}` ekler; adres KÜÇÜK HARFLE tekilleştirilir. */
function collect(seen, addr) {
  const a = addr?.emailAddress ?? addr
  const email = a?.address
  if (!email || !email.includes("@")) return
  const key = email.toLowerCase()
  if (seen.has(key)) return
  seen.set(key, { name: a.name || email, address: email })
}

function collectAll(seen, list) {
  for (const r of list ?? []) collect(seen, r)
}

async function loadLocal(instance, account) {
  const [sent, inbox, events] = await Promise.all([
    graphGet(instance, account, {
      path: `/me/mailFolders/sentitems/messages?$select=toRecipients,ccRecipients&$top=${TOP}`,
      scopes: ["Mail.Read"],
    }),
    graphGet(instance, account, {
      path: `/me/mailFolders/inbox/messages?$select=from,toRecipients,ccRecipients&$top=${TOP}`,
      scopes: ["Mail.Read"],
    }),
    graphGet(instance, account, {
      path: `/me/events?$select=organizer,attendees&$top=${TOP}&$orderby=start/dateTime desc`,
      scopes: ["Calendars.Read"],
    }),
  ])
  const ready = (r) => r.status === STATUS.ready
  if (!ready(sent) && !ready(inbox) && !ready(events)) return null
  const seen = new Map()
  for (const m of ready(sent) ? (sent.data?.value ?? []) : []) {
    collectAll(seen, m?.toRecipients)
    collectAll(seen, m?.ccRecipients)
  }
  for (const m of ready(inbox) ? (inbox.data?.value ?? []) : []) {
    collect(seen, m?.from)
    collectAll(seen, m?.toRecipients)
    collectAll(seen, m?.ccRecipients)
  }
  for (const e of ready(events) ? (events.data?.value ?? []) : []) {
    collect(seen, e?.organizer)
    // Toplantı odaları ("resource") kişi değil.
    collectAll(
      seen,
      (e?.attendees ?? []).filter((a) => a?.type !== "resource"),
    )
  }
  const me = account.username || ""
  const meKey = me.toLowerCase()
  if (me.includes("@")) {
    const mine = seen.get(meKey)
    seen.delete(meKey)
    seen.set(meKey, mine ?? { name: account.name || me, address: me })
  }
  return [...seen.values()]
}

export function useRecentPeople(enabled = true) {
  const { instance, accounts } = useMsal()
  const account = accounts[0] ?? null
  const [people, setPeople] = useState(() => cache ?? [])

  useEffect(() => {
    if (!enabled || cache || !isMsalConfigured || !account) return
    let alive = true
    inflight ??= loadLocal(instance, account).then((list) => {
      if (!list) {
        inflight = null
        return []
      }
      cache = list
      return list
    })
    inflight.then((list) => {
      if (alive) setPeople(list)
    })
    return () => {
      alive = false
    }
  }, [enabled, account, instance])

  return people
}

/**
 * Dizin araması — yazılan metne göre şirketin TAMAMINDA (People API,
 * `X-PeopleQuery-QuerySources: Mailbox,Directory`; başlık olmadan yalnız
 * posta kutusundan tanıdıkların döner).
 *
 * ⚠️ **SONUÇ DURUMDA DEĞİL, MODÜL ÖNBELLEĞİNDE.** Efektin içinde senkron
 * `setState` `react-hooks/set-state-in-effect`e takılır; render sonucu
 * önbellekten okur, efekt yalnız istek dönünce bir sayacı artırır.
 *
 * ⚠️ 250 ms bekler: her harfte bir istek, "deniz" yazan kişi için beş istek
 * demekti. Aynı sorgu ikinci kez istenmez.
 */
export function usePeopleSearch(query, enabled = true) {
  const { instance, accounts } = useMsal()
  const account = accounts[0] ?? null
  const [, bump] = useReducer((n) => n + 1, 0)
  const q = String(query || "").trim()
  const key = q.toLocaleLowerCase("tr")
  const active = enabled && q.length >= 2 && isMsalConfigured && !!account

  useEffect(() => {
    if (!active || peopleDenied || searchCache.has(key)) return
    let alive = true
    const timer = setTimeout(async () => {
      const res = await graphGet(instance, account, {
        path:
          `/me/people?$search=${encodeURIComponent(`"${q}"`)}&$top=8` +
          `&$select=displayName,scoredEmailAddresses,userPrincipalName,personType`,
        scopes: PEOPLE_SCOPES,
        headers: { "X-PeopleQuery-QuerySources": "Mailbox,Directory" },
      })
      if (res.status === STATUS.denied) {
        peopleDenied = true
        return
      }
      const list = []
      for (const p of res.status === STATUS.ready ? (res.data?.value ?? []) : []) {
        if (p?.personType?.class && p.personType.class !== "Person") continue
        const address = p?.scoredEmailAddresses?.[0]?.address || p?.userPrincipalName
        if (!address || !address.includes("@")) continue
        list.push({ name: p.displayName || address, address })
      }
      // Hata da önbelleğe girer (boş liste): aynı sorguyu her render'da
      // yeniden denemek, bozuk bir bağlantıda istek fırtınası demekti.
      searchCache.set(key, list)
      if (alive) bump()
    }, 250)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [active, key, q, instance, account])

  return active ? (searchCache.get(key) ?? []) : []
}
