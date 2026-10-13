import { InteractionRequiredAuthError } from "@azure/msal-browser"
import { msalInstance, hrRequest, HR_DATAVERSE_URL } from "./msal"
import { STATUS } from "./graph"
// Takvim günü metinden (UTC kayması yok); Ekibim de aynı ayrıştırıcıyı kullanır.
import { parseIsoDate } from "./isoDate"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  TEBRİKLER — doğum günleri ve aramıza yeni katılanlar
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Özelliğin tamamı tek kelimeyle greplenir:
 *     grep -rin "celebration" src/
 *
 * Parçalar: bu dosya (sorgu + türetme) · `hooks/useCelebrations.js` (çekme,
 * önbellek) · `components/feed/FeedRail` (çizim).
 *
 * ── KAYNAK ─────────────────────────────────────────────────────────────
 * İKnın kendi F&O görünümü, İK ortamının Dataverseinde sanal entity
 * olarak: `mserp_tryhcmemploymentdetaildomesticactiveviewentities`.
 * Filtre İKnın verdiği hâliyle: yurt içi (`mserp_boraxrank`) + aktif
 * (`mserp_workerstatus`) + kurumsal maili olanlar.
 *
 * ⚠️ **BU ORTAM UYGULAMANIN KENDİ ORTAMI DEĞİL.** Launcher kataloğu
 * uygulamanın kendi ortamında; bu entity başka bir ortamda, yani AYRI bir
 * token gerekiyor (`hrRequest`). Kapsam `loginRequest`e konmadı — gerekçe
 * orada yazılı.
 *
 * ⚠️ **HERKESİN YETKİSİ OLMAYABİLİR — ÖLÇÜLDÜ** (2026-09-22). Yetki
 * verilmeden önce rastgele 6 çalışanın kimliğiyle denendi, 6sı da
 * reddedildi (403, ya da F&O tarafından "You do not have permission to
 * execute TRYHcmEmploymentDetailDomesticActiveView"); 523 çalışanın 75inin
 * o ortamda hiç kullanıcı kaydı yok. Yetki sonradan açıldı ama KİME açıldığı
 * uygulama tarafından bilinemez. Bu yüzden reddedilen kullanıcıda kart
 * ÇÖKMEZ: `denied` döner ve çağıran postadan türetilen eski listeye düşer.
 *
 * ── GİZLİLİK ───────────────────────────────────────────────────────────
 * ⚠️ **DOĞUM YILI EKRANA ÇIKMAZ.** Sorgu tarihi tam getiriyor (OData bir
 * tarihin parçasını projekte edemiyor) ama türetme yalnız GÜN ve AY taşıyor.
 * Yaş, bu kartın sormadığı bir soru.
 *
 * ⚠️ **DİSKE YAZILMAZ.** Başkalarının doğum tarihi, maili ve ünvanı PIIdır;
 * önbellek yalnız bellekte ve çıkışta düşüyor (posta/takvim panellerinin
 * kuralının aynısı).
 */

const API_BASE = `${HR_DATAVERSE_URL}/api/data/v9.2`
// Ekibim'in doğum günleri de bu görünümden okunur (`hooks/useTeamDates.js`).
export const ENTITY_SET = "mserp_tryhcmemploymentdetaildomesticactiveviewentities"

/** Doğum günü penceresi: bugün + bu kadar gün. Ölçüldü: 14 günde 25 kişi. */
export const BIRTHDAY_DAYS = 14
/**
 * ⚠️ **"ARAMIZA YENİ KATILANLAR" BU DOSYADAN OKUNMUYOR — BİLİNÇLİ.**
 * Sahada bildirildi (2026-09-22): *"aramıza yeni katılanları mailden
 * okuyorduk, daha hızlıydı, onu neden bozdun"*. Haklı: o liste İK'nın
 * KARŞILAMA DUYURUSUNDAN türüyor ve o gönderiler akış için ZATEN yüklü —
 * yani bedava ve anında, üstelik satıra basınca duyurunun kendisi açılıyor.
 * İK kütüğünden okumak aynı listeyi ~2 saniyeye çıkarıyordu.
 *
 * Doğum günü ve yıl dönümünde durum TERS: onların duyurusu yok, tek kaynak
 * kütük. Yani her kart kendi EN HIZLI ve EN DOĞRU kaynağına bağlı
 * (`FeedPeople` ↔ `CelebrationPeople`).
 */
/**
 * İş yıl dönümü penceresi. Ölçüldü (2026-09-22): 14 günde 14 kişi, 7 günde
 * yalnız 1 — doğum günüyle aynı pencere, çünkü ikisi de aynı soruyu soruyor
 * ("bu iki hafta kimi tebrik edeceğiz").
 */
export const ANNIVERSARY_DAYS = 14
/**
 * Türetme penceresine eklenen PAY.
 *
 * ⚠️ **ÖNBELLEK OLMADAN GEREKSİZ, ONUNLA ŞART.** Kayıt 12 saate kadar bayat
 * olabiliyor ve pencere her gün bir gün İLERİ kayıyor: dün 15 gün uzakta
 * olan bir doğum günü bugün 14 gün uzakta, yani GÖSTERİLMESİ gerekiyor ama
 * dünkü kayıtta YOK. Pay olmadan pencerenin son günü güvenilmez olurdu.
 * Kayda 14+2 gün girer, ekrana 14 gün çıkar (`narrowToToday`).
 */
export const WINDOW_SLACK_DAYS = 2

async function getToken() {
  const account = msalInstance.getActiveAccount()
  if (!account) return null
  // ⚠️ SESSİZ YA DA HİÇ. Etkileşimli bir tur AÇILMAZ: bu çağrı kullanıcı bir
  // sekmeye bastığı için koşuyor, tam sayfa bir AAD yönlendirmesi onu işinin
  // ortasında uygulamadan atardı (Graph panellerinin kuralı).
  const result = await msalInstance.acquireTokenSilent({ ...hrRequest, account })
  return result.accessToken
}

/**
 * ERP adları TÜMÜ BÜYÜK geliyor ("HALİL İBRAHİM ÜLKEBAŞ"). Bir tebrik
 * satırında bağırmak istemiyoruz.
 *
 * ⚠️ **KÜÇÜLTME TÜRKÇE KURALIYLA** ve ekranın diliyle DEĞİL: bunlar Türkçe
 * adlar, İngilizce arayüzde de öyle yazılır.
 */
export function titleCaseName(raw) {
  return String(raw ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      const lower = w.toLocaleLowerCase("tr")
      return lower.charAt(0).toLocaleUpperCase("tr") + lower.slice(1)
    })
    .join(" ")
}

/** Yerel takvim günü — gece yarısına normalize edilmiş. */
function startOfDay(ts) {
  const d = new Date(ts)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function daysBetween(from, to) {
  return Math.round((to - from) / 86400000)
}

/**
 * Bir doğum tarihinin BUGÜNDEN SONRAKİ ilk yıldönümü.
 *
 * ⚠️ **29 ŞUBAT 1 MARTA DÜŞER.** Artık olmayan bir yılda `new Date(y, 1, 29)`
 * sessizce 1 Marta taşıyor; burada AÇIKÇA yazılıyor ki okuyan kararı görsün.
 */
function nextAnniversary(today, part) {
  for (const year of [today.getFullYear(), today.getFullYear() + 1]) {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
    const feb29 = part.m === 2 && part.d === 29 && !leap
    const when = new Date(year, (feb29 ? 3 : part.m) - 1, feb29 ? 1 : part.d)
    if (when >= today) return when
  }
  return null
}

/**
 * Ham satırlardan ÜÇ liste.
 *
 * ⚠️ **KIDEM TARİHİ 530 SATIRIN 369UNDA DOLU** (ölçüldü 2026-09-22). Yani
 * "aramıza yeni katılanlar" listesi eksik olabilir ve bu bir HATA DEĞİL,
 * verinin hâli; boş tarihli satır sessizce atlanır.
 *
 * ⚠️ **AYNI KIDEM TARİHİ İKİ LİSTEYİ BESLİYOR VE AYIRAN ŞEY DOLAN YIL.**
 * `years >= 1` → yıl dönümü, `years === 0` → İŞE YENİ BAŞLAYAN. İkisi
 * ayrı liste, çünkü cümleleri ayrı ("15. yıl" ile "bugün başladı") ve
 * ikisini tek listede taşımak, çağıranın her satırda yılı sorgulaması
 * demekti.
 */
export function deriveCelebrations(rows, now = Date.now()) {
  const today = startOfDay(now)
  const birthdays = []
  const anniversaries = []
  const joiners = []
  for (const row of rows) {
    const name = titleCaseName(row.mserp_name)
    if (!name) continue
    const person = {
      key: String(row.mserp_mail || name).toLowerCase(),
      name,
      mail: row.mserp_mail || null,
      title: row.mserp_positiondescription || null,
    }
    const birth = parseIsoDate(row.mserp_birthdate)
    if (birth) {
      const when = nextAnniversary(today, birth)
      const inDays = when ? daysBetween(today, when) : null
      // ⚠️ YIL TAŞINMAZ — yalnız gün ve ay.
      if (inDays !== null && inDays <= BIRTHDAY_DAYS + WINDOW_SLACK_DAYS) {
        birthdays.push({ ...person, inDays, month: birth.m, day: birth.d })
      }
    }
    const since = parseIsoDate(row.mserp_senioritydate)
    if (since) {
      // ⚠️ `since.y < bugünün yılı` YETMEZ: 12 Ocak 2026'da başlayan biri
      // 2026'nın aralığında "1. yılını doldurdu" sayılırdı. Ölçüt DOLAN
      // yıl sayısı, yani yıl dönümünün kendisi geçmişte kalan bir tarihten
      // hesaplanır ve en az 1 olmalı.
      const when = nextAnniversary(today, since)
      const inDays = when ? daysBetween(today, when) : null
      const years = when ? when.getFullYear() - since.y : 0
      // ⚠️ `years` DEĞİL `startYear` saklanır: kayıt yıl dönümecini aşarsa
      // (31 Aralık'ta yazılıp 1 Ocak'ta okunursa) donmuş bir "15. yıl"
      // yanlış olurdu. Kaçıncı yıl olduğu okurken hesaplanır — ve YENİ
      // BAŞLAYANI yıl dönümünden ayıran şey de o hesap.
      const entry = { ...person, inDays, years, startYear: since.y, month: since.m, day: since.d }
      if (inDays !== null && inDays <= ANNIVERSARY_DAYS + WINDOW_SLACK_DAYS) {
        if (years >= 1) anniversaries.push(entry)
        else if (years === 0) joiners.push(entry)
      }
    }
  }
  birthdays.sort((a, b) => a.inDays - b.inDays || a.name.localeCompare(b.name, "tr"))
  // ⚠️ Eşit günde KIDEMLİ ÖNCE: aynı gün 2. ve 15. yılını dolduran iki kişi
  // varsa, listenin başındaki haber 15. yıldır.
  anniversaries.sort(
    (a, b) => a.inDays - b.inDays || b.years - a.years || a.name.localeCompare(b.name, "tr"),
  )
  joiners.sort((a, b) => a.inDays - b.inDays || a.name.localeCompare(b.name, "tr"))
  return { birthdays, anniversaries, joiners }
}

/**
 * Kayıttan ya da ağdan gelen listeyi BUGÜNE göre yeniden hesaplar.
 *
 * ⚠️ **TEK KAPI.** Taze veri de kayıtlı veri de buradan geçer; iki ayrı yol
 * yazmak, 12 saat önce yazılmış bir kaydın "3 gün sonra" demeye devam etmesi
 * demekti. `inDays` ve `years` HER OKUMADA yeniden hesaplanır, pencereyi
 * geçenler düşer, sıra yeniden kurulur.
 */
export function narrowToToday(data, now = Date.now()) {
  const today = startOfDay(now)
  const fix = (list, days) =>
    (list ?? [])
      .map((p) => {
        const when = nextAnniversary(today, { m: p.month, d: p.day })
        const inDays = when ? daysBetween(today, when) : null
        const years = p.startYear && when ? when.getFullYear() - p.startYear : p.years
        return { ...p, inDays, years }
      })
      .filter((p) => p.inDays !== null && p.inDays <= days)
      .sort(
        (a, b) =>
          a.inDays - b.inDays ||
          (b.years ?? 0) - (a.years ?? 0) ||
          a.name.localeCompare(b.name, "tr"),
      )
  return {
    ...data,
    birthdays: fix(data.birthdays, BIRTHDAY_DAYS),
    anniversaries: fix(data.anniversaries, ANNIVERSARY_DAYS),
    /* Sorgunun penceresiyle AYNI (iki hafta) — ekrana çıkan yalnız
       `inDays === 0`, yani BUGÜN başlayan; seçim ÇAĞIRANIN.

       ⚠️ **BURADA YILI YENİDEN SINAMAYA GEREK YOK, VE BU ÖLÇÜLDÜ.** Akla
       ilk gelen koruma "kayıt bayatladıysa kişi artık yıl dönümü olmuştur,
       `years === 0` diye süz" — ama o dal ASLA koşmuyor: kayıt en fazla 12
       saat yaşıyor, yani arada en çok BİR gece yarısı geçiyor ve o gece
       yarısında kişinin `inDays`i 0'dan 364'e atlıyor, yani zaten bir üst
       satırdaki pencere süzgecine takılıyor. Yazılsaydı hiç koşmayan bir
       koruma olurdu (mutasyonla denendi: süzgeci kaldırmak tek bir sınama
       bile düşürmüyor). İki liste AYRIK, ve ayrımı `deriveCelebrations`
       yapıyor. */
    joiners: fix(data.joiners, ANNIVERSARY_DAYS),
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  SORGU — pencereyi SUNUCUYA taşır
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ⚠️ **ÖNCE TAM TARAMA YAPILIYORDU VE 12 SANİYE SÜRÜYORDU** (2026-09-22,
 * canlı ölçüm; pac'in ~2,5 sn açılışı düşülmedi, karşılaştırma kendi içinde):
 *
 *     530 satır, 5 kolon, ilk/soğuk ....... 173.803 ms
 *     530 satır, 5 kolon .................. 14.388 ms
 *     530 satır, 4 kolon .................. 14.841 ms
 *     530 satır, 2 kolon .................. 15.843 ms
 *     1.248 satır, 2 kolon (mail süzgeci YOK) 10.556 ms
 *     top 5, aynı süzgeç ................... 4.334 ms
 *
 * Üç şey okundu: (1) maliyet KOLON SAYISINA bağlı DEĞİL; (2) SATIR
 * TARAMASINA bağlı; (3) `contains(mail)` süzgeci DAHA AZ satır döndürdüğü
 * hâlde DAHA PAHALI (1.248 satır 10,5 sn, 530 satır 14,4 sn) — baştan
 * joker'li bir LIKE F&O'da tam tarama demek. `endswith` de kurtarmadı
 * (13,7 sn), o yüzden mail süzgeci İSTEMCİYE alındı.
 *
 * ── PENCEREYİ SUNUCUYA TAŞIMAK ─────────────────────────────────────────
 * "Doğum günü önümüzdeki 14 günde" bir AY-GÜN sorusu ve OData'da `month()`
 * yok. Ama aynı şey TARİH ARALIKLARININ BİRLEŞİMİ olarak yazılabilir: her
 * olası doğum yılı için o yılın 22 Eylül – 6 Ekim aralığı. Ölçüldü:
 *
 *     doğum günü, yıl aralıklarıyla ........ 5.556 ms →  47 satır
 *     yıl dönümü, yıl aralıklarıyla ........ 5.809 ms →  42 satır
 *     yeni katılan, tek tarih süzgeci ...... 4.551 ms →   8 satır
 *
 * Üçü PARALEL koştuğu için duvar saati ≈ en yavaşı, yani ~12 sn yerine
 * ~3,5 sn (net).
 *
 * ⚠️ **YIL ARALIĞI CÖMERT OLMAK ZORUNDA.** Dar bir aralık bir doğum gününü
 * SESSİZCE kaybeder — ekranda hiçbir iz bırakmaz. Bu yüzden 1945'ten
 * bugünün 14 yıl öncesine kadar: kimsenin kaçmayacağı bir aralık.
 *
 * ⚠️ **URL BÜTÇESİ ŞART.** 68 yıl × iki koşul tek adreste ~5 KB eder;
 * Dataverse uzun adreslerde 414 döndürüyor. Süzgeç 2.500 karakterlik
 * parçalara bölünür (tyroTrade'in `FILTER_BUDGET` ölçüsünün aynısı) ve
 * parçalar PARALEL gider — bölmek duvar saatini uzatmıyor.
 */

/**
 * ⚠️ **BÜTÇE HAM SÜZGECE AİT, ADRESE DEĞİL.** `encodeURIComponent` boşlukları
 * `%20` yaptığı için adres ham metnin ~1,4 katına çıkıyor; 1.800 karakterlik
 * ham süzgeç ~2,5 KB'lık bir adres demek — tyroTrade'in ölçtüğü "çağrı başına
 * ~2,5 KB" sınırının aynısı. Parçalar PARALEL gittiği için bölmek duvar
 * saatini uzatmıyor.
 */
const FILTER_BUDGET = 1800
const BASE_FILTER = "mserp_boraxrank eq 200000001 and mserp_workerstatus eq 200000001"
/** Kimsenin kaçmayacağı doğum yılı tabanı. */
const OLDEST_BIRTH_YEAR = 1945
/** Kıdem tabanı — ölçülen en kıdemli çalışan 21 yıl (2005). */
const OLDEST_SENIORITY_YEAR = 1970

function iso(d) {
  const p = (n) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/**
 * Bir alan için "her yılın şu 14 günü" aralıkları.
 *
 * ⚠️ Aralık YIL SINIRINI KENDİLİĞİNDEN AŞAR: 26 Aralık'ta pencere
 * 26.12.y – 09.01.(y+1) olur, çünkü bitiş tarihi başlangıçtan türetiliyor.
 * ⚠️ Bugün 29 Şubat ise o yılın 29 Şubat'ı yok — 1 Mart'tan başlanır.
 */
function yearWindows(field, today, days, fromYear, toYear) {
  const out = []
  for (let y = fromYear; y <= toYear; y++) {
    const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
    const feb29 = today.getMonth() === 1 && today.getDate() === 29 && !leap
    const start = feb29 ? new Date(y, 2, 1) : new Date(y, today.getMonth(), today.getDate())
    const end = new Date(start.getTime() + days * 86400000)
    out.push(`(${field} ge ${iso(start)} and ${field} le ${iso(end)})`)
  }
  return out
}

/** `or` terimlerini URL bütçesine göre parçalara böler. */
function chunkTerms(terms) {
  const chunks = []
  let cur = []
  let len = 0
  for (const term of terms) {
    if (cur.length && len + term.length + 4 > FILTER_BUDGET) {
      chunks.push(cur)
      cur = []
      len = 0
    }
    cur.push(term)
    len += term.length + 4
  }
  if (cur.length) chunks.push(cur)
  return chunks
}

async function runQuery(token, filter, select) {
  const url = `${API_BASE}/${ENTITY_SET}?$select=${select}&$filter=${encodeURIComponent(filter)}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
    },
  })
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return (await res.json()).value ?? []
}

/**
 * İki soru, iki sorgu kümesi — PARALEL.
 *
 * ⚠️ **MAİL SÜZGECİ İSTEMCİDE** (ölçüm yukarıda). Sorgu `@midea.com`
 * dışındaki adresleri de getiriyor, türetmeden ÖNCE eleniyor.
 *
 * Dönen şekil `{ status, birthdays, anniversaries, joiners }`; ASLA fırlatmaz.
 */
export async function fetchCelebrations(now = Date.now()) {
  let token
  try {
    token = await getToken()
  } catch (err) {
    return { status: err instanceof InteractionRequiredAuthError ? STATUS.denied : STATUS.error }
  }
  if (!token) return { status: STATUS.unauthenticated }

  const today = new Date(now)
  const thisYear = today.getFullYear()
  const bdaySelect = "mserp_name,mserp_mail,mserp_birthdate,mserp_positiondescription"
  const senSelect = "mserp_name,mserp_mail,mserp_senioritydate,mserp_positiondescription"

  const bdayChunks = chunkTerms(
    yearWindows("mserp_birthdate", today, BIRTHDAY_DAYS, OLDEST_BIRTH_YEAR, thisYear - 14),
  )
  /* ⚠️ ÜST SINIR `thisYear - 1` DEĞİL `thisYear` — ve bu, BUGÜN BAŞLAYANI
     BEDAVA getiren tek karakter. Pencere her yıl için `[bugün, bugün+14]`
     kuruluyor; BU YILIN penceresi tam olarak "bugün ya da önümüzdeki iki
     hafta içinde işe başlayan" demek, çünkü onların kıdem tarihi henüz
     hiçbir yıl dönümü doldurmamış. Ayrı bir sorgu açmak gerekmiyordu:
     terim sayısı 56'dan 57'ye çıkıyor, maliyet ise dönen SATIRDA değil
     (ölçüm yukarıda). Yıl 0 olanlar `deriveCelebrations`ta yıl dönümü
     listesinden AYRILIP `joiners`a gidiyor. */
  const annChunks = chunkTerms(
    yearWindows("mserp_senioritydate", today, ANNIVERSARY_DAYS, OLDEST_SENIORITY_YEAR, thisYear),
  )
  const jobs = [
    ...bdayChunks.map((c) => [`${BASE_FILTER} and (${c.join(" or ")})`, bdaySelect]),
    ...annChunks.map((c) => [`${BASE_FILTER} and (${c.join(" or ")})`, senSelect]),
  ]

  let results
  try {
    results = await Promise.all(jobs.map(([f, sel]) => runQuery(token, f, sel)))
  } catch (err) {
    // ⚠️ 400/401/403 AYNI ŞEYİ söylüyor: bu kullanıcı bu tabloyu okuyamıyor.
    // (400, F&O'nun data entity yetkisi hatası.)
    if (err.status === 400 || err.status === 401 || err.status === 403) {
      return { status: STATUS.denied }
    }
    return { status: STATUS.error }
  }

  // ⚠️ AYNI KİŞİ BİRDEN FAZLA SORGUDAN GELEBİLİR (doğum günü + yıl dönümü);
  // satırlar mail üzerinden BİRLEŞTİRİLİR, yoksa `deriveCelebrations` aynı
  // kişiyi iki kez listelerdi.
  const merged = new Map()
  for (const rows of results) {
    for (const row of rows) {
      const mail = String(row.mserp_mail ?? "").toLowerCase()
      if (!mail.endsWith("@midea.com")) continue
      merged.set(mail, { ...(merged.get(mail) ?? {}), ...row })
    }
  }
  return { status: STATUS.ready, ...deriveCelebrations([...merged.values()], now) }
}
