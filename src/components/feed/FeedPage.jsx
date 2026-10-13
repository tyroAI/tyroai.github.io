import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { useMsal } from "@azure/msal-react"
import UserAdd01Icon from "@hugeicons/core-free-icons/UserAdd01Icon"
import { useCelebrations } from "@/hooks/useCelebrations"
import { useFeedPosts, useImportantMail, useMailById } from "@/hooks/useFeedPosts"
import { usePageAccess } from "@/hooks/usePageAccess"
import { useLocale } from "@/hooks/useLocale"
import { usePeoplePhotos } from "@/hooks/usePeoplePhotos"
import { ETHICS_LINE } from "@/lib/ethicsLine"
import { deriveHighlights, mergeTimeline, peopleRows, searchPosts } from "@/lib/feed"
import { FEED, FEED_SOURCES, sourceForTag } from "@/lib/feedPolicy"
import { writeFeedSeen } from "@/lib/feedSeen"
import { STATUS, requestGraphScopes } from "@/lib/graph"
import { cn } from "@/lib/utils"
import { EthicsHotline } from "./EthicsHotline"
import { FeedDocs } from "./FeedDocs"
import { FilesSkeleton } from "./files/FilesStates"
import { FILES_PAGE } from "@/lib/filesPolicy"
import { lastQuery, restoreFilesParams, stashFilesParams } from "@/lib/filesNav"
import { FeedHeader } from "./FeedHeader"
import { useFeedRefresh } from "./useFeedRefresh"
import { FEED_SECTIONS, FEED_VIEWS } from "./feedSections"
import { FeedTimeline } from "./timeline/FeedTimeline"
import { FeedStateCard } from "./timeline/FeedStateCard"
import { FeedPostDialog } from "./FeedPostDialog"
import { CelebrationPeople, CelebrationSkeleton, FeedDiscover, FeedPeople } from "./FeedRail"
import { ForYouSkeleton } from "./foryou/ForYouSkeleton"
import { markOpened } from "@/lib/forYouSession"

/**
 * Dosyalarım AYRI PARÇADA (§12.13): sekmeyi hiç açmayan herkese arama,
 * gezinme ve süzgeç katmanını indirtmemek için. `FILES_PAGE.enabled = false`
 * eski `FeedDocs` bento'sunu çizer — kabul edilene kadar geri dönüş yolu.
 */
const FeedFiles = lazy(() => import("./files/FeedFiles").then((m) => ({ default: m.FeedFiles })))
/**
 * Sana özel panosu da AYRI PARÇADA (2026-10-01): zarflı maskotun çizicisi ve
 * panonun kendisi yalnız sekme açılınca insin. İskeleti statik (`Suspense`
 * yedeği) ve maskotu İÇE ALMIYOR.
 */
const ForYouPanel = lazy(() =>
  import("./foryou/ForYouPanel").then((m) => ({ default: m.ForYouPanel })),
)

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  GÜNDEM AKIŞI — şirketin zaman akışı
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Dört kurumsal posta kutusundan (Haberler · Duyuru · İK · Eğitim) gelen
 * duyurular tek bir akışta, en yeniden eskiye. Politika `lib/feedPolicy.js`te,
 * sorgu `lib/feed.js`te, çekme `hooks/useFeedPosts.js`te.
 *
 * ── DÜZEN: KAPSAYICI SORGUSU, GÖRÜNTÜ ALANI DEĞİL ──────────────────────
 * Sohbet rıhtımı `<main>`ın KARDEŞİ ve sayfayı 340px'e kadar daraltabiliyor.
 * `lg:grid-cols-2` yazmak, rıhtım açıkken hâlâ geniş ekrandayız sanıp iki
 * kolonu 170px'e sıkıştırmak olurdu. Bütün kırılımlar `@container/feed`
 * üzerinden — Profil ve Güvenlik sayfalarının ölçüp yazdığı aynı tuzak.
 *
 * ── SÜZGEÇ İKİ YERDE DEĞİL, BİR YERDE ──────────────────────────────────
 * Etiket süzgeci DAR ekranda başlıktaki çip satırı, GENİŞ ekranda sağ raydaki
 * "Keşfet" listesi. İkisi aynı anda çizilmiyor: aynı kontrolü iki kez
 * göstermek "hangisi asıl?" sorusunu doğurur. Rayın listesi ayrıca SAYI
 * taşıyor (çipler taşımıyor), yani geniş ekranda daha zengin olan kazanıyor.
 *
 * ── KAYDIRMA ───────────────────────────────────────────────────────────
 * `<main>` `overflow-hidden`; sayfa KENDİ kaydırıcısını kuruyor. Sağ rayın
 * `sticky`si ancak bu kabın içinde çalışıyor.
 */

export function FeedPage() {
  const { t } = useLocale()
  const { instance, accounts } = useMsal()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState("")
  /**
   * "Şimdi" — DAKİKADA BİR tazelenen bir durum, render'da okunan bir saat
   * DEĞİL.
   *
   * ⚠️ İki iş yapıyor. (1) `deriveHighlights` pencereyi (son 45 / 14 gün)
   * buna göre hesaplıyor; varsayılanı `Date.now()` olsaydı render SAF
   * OLMAZDI — bu depoda `Date.now()` render'da yasak (`react-hooks/purity`)
   * ve EdgeNotch aynı çözümü taşıyor. (2) Kartlara pals veriyor: `formatAgo`
   * içeride saate bakıyor ve yeniden çizim olmadan "2 saat önce" bir saat
   * sonra hâlâ "2 saat önce" yazardı. Uzun açık kalan bir akışta bu görünür
   * bir yalan; dakikada bir çizim onun bedeli.
   */
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  // ⚠️ Süzgeç ve açık gönderi ADRESTE: bir duyuru paylaşılabiliyor, geri
  // düğmesi pencereyi kapatıyor ve sekme yer imlenebiliyor. `replace: true` —
  // etiket değiştirmek bir gezinme değil (ProfilePage'in aynı sözleşmesi).
  const rawTag = params.get("tag")
  const tag = sourceForTag(rawTag) ? rawTag : null
  const openId = params.get("post")
  // ⚠️ Sekme de ADRESTE (`?view=`): sayfanın `?tag=` / `?post=` sözleşmesinin
  // aynısı — yer imlenebiliyor ve bir destek turunda paylaşılabiliyor.
  // Tanınmayan değer sessizce Gündem'e düşer.
  const rawView = params.get("view")
  const view = FEED_VIEWS.some((v) => v.id === rawView) ? rawView : "agenda"
  const section = FEED_SECTIONS.some((x) => x.id === params.get("sec"))
    ? params.get("sec")
    : "agenda"
  // ⚠️ SAĞ RAY YALNIZ POPÜLER'DE (2026-10-02, istek: *"sana özel ve dosyalarım
  // sekmesinde sağdaki trendler, doğum günleri ve diğer kartlar olmasın, o
  // sekmeler nefes alsın"*). 09-23'te tersine karar verilmişti ("ray üç bölümde
  // de kalsın"); iki pano (Sana özel · Dosyalarım) kendi bento düzenini
  // taşıyınca ray onları 17rem daraltıp kalabalık gösteriyordu. Izgara orada
  // TEK kolon, panolar tam genişlikte.
  const showRail = section === "agenda"
  const access = usePageAccess()
  // İşaretli postalar Akışım ve Sana özel açıkken sorulur (üç posta sorgusu,
  // sırayla); Dosyalarım'da hiç.
  const important = useImportantMail(section === "important" || section === "agenda")

  const { status, posts, hasMore, loadingMore, loadError, loadMore, refresh, refreshing, pages } =
    useFeedPosts(tag)
  const { onRefresh, onRefreshImportant, busyRefresh } = useFeedRefresh({
    section,
    feed: { refresh, refreshing },
    important,
  })
  /**
   * Sayfanın KENDİ kaydırıcısı — kapak görselinin ön yükleme gözlemcisine
   * KÖK olarak veriliyor.
   *
   * ⚠️ `root: null` (görüntü alanı) ile `rootMargin` bu sayfada ÇALIŞMIYOR:
   * pay yalnız KÖKÜN dikdörtgenine uygulanıyor, ara kaydırıcıların kırpması
   * ise olduğu gibi kalıyor. Yani `<main>` görüntü alanından kısaysa (rıhtım
   * açık, header var) 300px'lik ön yükleme sessizce kayboluyor ve kapak
   * ancak kart tam görününce inmeye başlıyordu.
   */
  const scrollerRef = useRef(null)
  const photos = usePeoplePhotos(FEED_SOURCES.map((s) => s.address))

  // ⚠️ Damga EN YENİ gönderiye çekiliyor, YALNIZ İLERİ gidiyor
  // (`writeFeedSeen`) ve YALNIZ SÜZGEÇSİZ görünümde yazılıyor. Süzülmüş
  // listenin en yenisi akışın en yenisi değil: bir etiket bağlantısıyla
  // gelen ilk ziyaret, damgayı hiç görülmemiş gönderilerin ARKASINA koyup
  // rozeti yanlış yakardı. Sayfayı süzgeçsiz açmak okumak sayılıyor.
  const newestIso = tag ? null : (posts[0]?.received?.toISOString() ?? null)
  useEffect(() => {
    if (newestIso) writeFeedSeen(newestIso)
  }, [newestIso])

  // Akışım = duyurular + işaretli postalar (etiket süzgeci varken yalnız
  // duyurular: süzgeç bir KANAL seçiyor, kişisel postanın kanalı yok).
  // ⚠️ YALNIZ SABİTLİ OLAN POSTA AKIŞIM'DA YOK (2026-10-01, istek: *"akışım
  // sekmesinde sabitlenenleri gösterme, onlar sana özelde görülsün; önemli ve
  // bayraklılar kalsın"*). İki cümle aynı iletide çakışınca (sabitli VE
  // bayraklı/yüksek önemli) ikincisi kazanır: bayraklı ya da önemli bir iş
  // sabitlense de yapılacak bir iştir. Kural İLETİNİN kendisine bakar,
  // kaynağına değil — yalnız sabitli bir kurumsal duyuru da akıştan çıkar;
  // hepsi Sana özel'de duruyor. Sabitleme okunamadıysa (`pinned` yok) hiçbir
  // şey gizlenmez.
  const merged = useMemo(
    () =>
      (tag || status !== STATUS.ready || important.status !== STATUS.ready
        ? posts
        : mergeTimeline(posts, important.items, { hasMore })
      ).filter((p) => !p.pinned || p.flag === "flagged" || p.importance === "high"),
    [posts, important.items, important.status, status, tag, hasMore],
  )
  /**
   * ⚠️ **KISA BEKLEME PENCERESİ** (en çok 1,5 sn). Duyurular tek istekte,
   * işaretliler sırayla üç istekte geliyor; akış önce çizilseydi en yeni
   * işaretli posta birkaç yüz milisaniye sonra listenin TEPESİNE girip her
   * şeyi bir kart aşağı iterdi. İşaretliler gelene kadar iskelet kalıyor;
   * gecikirlerse akış yine açılıyor ve onlar sonradan katılıyor.
   */
  const [graceOver, setGraceOver] = useState(false)
  const waitingMarked =
    section === "agenda" && !tag && status === STATUS.ready && important.status === "loading"
  useEffect(() => {
    if (!waitingMarked) return undefined
    const id = setTimeout(() => setGraceOver(true), 1500)
    return () => clearTimeout(id)
  }, [waitingMarked])
  const holdAgenda = waitingMarked && !graceOver
  const personalAddresses = useMemo(
    () => [...new Set(merged.filter((p) => p.personal && p.address).map((p) => p.address))],
    [merged],
  )
  const personalPhotos = usePeoplePhotos(personalAddresses)
  const shown = useMemo(() => searchPosts(merged, query), [merged, query])
  // ⚠️ Sayılar YALNIZ süzgeçsizken: bir etiket seçiliyken sunucudan zaten
  // yalnız o etiket geliyor ve öteki üçüne "0" yazmak yanlış olurdu.
  // Akışım'da GÖRÜNEN her kart sayılır: işaretli postalar `personal` satırına
  // (Trendler kutusunun "Sana özel" satırı), duyurular kanalına.
  const counts = useMemo(() => {
    if (tag) return {}
    const out = {}
    for (const p of merged) {
      const k = p.personal ? "personal" : p.tag
      out[k] = (out[k] ?? 0) + 1
    }
    return out
  }, [merged, tag])

  // ⚠️ Adreste açık kalan gönderi YÜKLENMİŞ listede olmayabilir (sayfa
  // yenilendi ve gönderi üçüncü sayfadaydı). O hâlde tek başına getiriliyor;
  // yoksa `?post=` tıklanabilir ama hiçbir şey açmayan bir adres olurdu.
  const listed =
    merged.find((p) => p.id === openId) ?? important.items?.find((p) => p.id === openId) ?? null
  // ⚠️ Yedek okuma KAYNAK KAPISIZ (`fetchMailById`): Akışım artık kişisel
  // postaları da taşıyor ve kapılı okuma (`fetchPostById`) onlar için `null`
  // dönüp pencereyi hiç açmıyordu. Kurumsal iletide de aynı alanları veriyor.
  const fetched = useMailById(
    openId,
    Boolean(openId) && !listed && important.status !== "loading" && section !== "docs",
  )
  const open = listed ?? fetched
  // Kişisel postanın göndericisi kurumsal kutulardan biri değil — fotoğrafı ayrı.
  const openPhotos = usePeoplePhotos(open && !open.tag && open.address ? [open.address] : [])

  /**
   * ⚠️ **KİŞİ SEKMESİ ETİKETİ TEMİZLER.** Ray bugün de süzülmüş `posts`tan
   * türüyor, ama orada etiket çipleri GÖRÜNÜR duruyor; sekmede çip şeridi
   * çizilmiyor, yani "Haberler" seçiliyken Doğum Günleri'ne basan kişi
   * AÇIKLAMASIZ boş bir liste görürdü — görünmeyen bir süzgecin çizdiği boşluk.
   *
   * ⚠️ **BAŞA SARAR.** Akış üçüncü sayfada olabiliyor; sekme değiştirmek
   * kaydırma konumunu koruyunca yeni sekme ekranın çok aşağısında başlıyordu.
   *
   * `replace: true` — sekme değiştirmek bir gezinme değil (`setTag`in aynı
   * sözleşmesi): üç sekmeye basan kişi geri düğmesine üç kez basmasın.
   */
  function setView(next, nextTag) {
    const p = new URLSearchParams(params)
    if (next && next !== "agenda") p.set("view", next)
    else p.delete("view")
    if (nextTag) p.set("tag", nextTag)
    else if (next !== "agenda") p.delete("tag")
    p.delete("post")
    setParams(p, { replace: true })
    scrollerRef.current?.scrollTo({ top: 0 })
  }
  /**
   * Trendler sekmesinden bir kanal seçmek — süzgeci kurar VE Gündem'e döner.
   *
   * ⚠️ Aynı sekmede kalmak, seçimin sonucunu başka bir sekmede saklamak
   * olurdu. Seçili kanala TEKRAR basmak süzgeci kaldırır ve yine Gündem'e
   * götürür — rayda (geniş ekran) aynı düğme zaten böyle davranıyor.
   */
  function pickTrend(next) {
    setView("agenda", next ?? undefined)
  }
  function setTag(next) {
    const p = new URLSearchParams(params)
    if (next) p.set("tag", next)
    else p.delete("tag")
    p.delete("post")
    setParams(p, { replace: true })
  }
  /**
   * ⚠️ **GÖNDERİ AÇMAK `replace` DEĞİL, PUSH.** Etiket değiştirmek bir
   * gezinme değil (`setTag` `replace: true` kalıyor — üç çipe basan kişi geri
   * düğmesine üç kez basmasın), ama pencere AÇMAK öyle: `replace` ile
   * yazıldığında geri tuşu pencereyi kapatmıyor, kullanıcıyı /feed'den
   * TÜMDEN atıyordu — üstelik bu dosyanın kendi yorumu "geri düğmesi
   * pencereyi kapatıyor" diye söz veriyordu. Kapatırken `replace`: kapanış
   * geçmişe ikinci bir kayıt eklemesin, yoksa bir açıp kapatma iki geri
   * tuşu ederdi.
   */
  function setOpen(id, replace = false) {
    const p = new URLSearchParams(params)
    if (id) {
      // Sana özel'in "Sıradaki"si bu oturumda açılan postayı sıradan çıkarır.
      markOpened(accounts[0]?.homeAccountId, id)
      p.set("post", id)
      setParams(p, { replace })
      return
    }
    p.delete("post")
    setParams(p, { replace: true })
  }
  async function connect() {
    const ok = await requestGraphScopes(instance, accounts[0], ["Mail.Read"])
    // İKİ liste de yeniden sorulur (bug #5): Sana özel'in "Bağlan"ı yalnız
    // duyuruları tazeliyordu, işaretli postalar izinsiz hâlde kalıyordu.
    if (ok) {
      refresh()
      important.refresh()
    }
  }

  /**
   * "Tebrikler" sekmesinin BOŞ olup olmadığı.
   *
   * ⚠️ Aynı saf yardımcılar `FeedPeople`in içinde de çağrılıyor. İkinci bir
   * KURAL değil, aynı kuralın ikinci kez ÇALIŞTIRILMASI — girdi de sonuç da
   * aynı, ayrışma riski yok; alternatifi satırları yukarıda türetip prop
   * olarak geçirmekti ve o, rayla sekmenin farklı yollardan beslenmesi
   * demekti.
   */
  /**
   * İKnın kendi kütüğü — doğum günleri ve yeni katılanlar.
   *
   * ⚠️ **POSTADAN TÜRETMENİN YERİNE GEÇER, YANINA DEĞİL.** `FeedPeople`
   * duyurunun KONUSUNDAN ad ayıklıyor; bu kütükten okuyor. İkisini birden
   * çizmek aynı kişiyi iki kez listelemek olurdu.
   *
   * ⚠️ **AMA ESKİSİ SİLİNMEDİ — YEDEK OLDU.** Ölçüldü (2026-09-22): bu
   * entityi okuma yetkisi herkeste DEĞİL ve kime açıldığı uygulamadan
   * bilinemiyor. Yetkisi olmayanda `denied` dönüyor ve sekme postadan
   * türetilen eski listeye düşüyor — yani kart kimsede boş kalmıyor.
   */
  /**
   * Üst kademe bölüm. Adresten okunur, adrese yazılır; tanınmayan bir değer
   * sessizce Gündem'e düşer (`ProfilePage`in `?tab=` kuralının aynısı).
   */
  // Trendler'deki "Sana özel" satırı: bölüme götürür, oradayken Akışım'a döner.
  const personalRow = {
    active: section === "important",
    onSelect: () => {
      setSection(section === "important" ? "agenda" : "important")
      scrollerRef.current?.scrollTo({ top: 0 })
    },
  }
  const setSection = (next) => {
    // Dosyalarım'ın f* parametreleri (konum, süzgeçler) başka bölümde adreste
    // DURMAZ — Akışım'ın adresi onları taşımasın; dönünce geri gelirler
    // (`lib/filesNav.js`, yalnız bellekte).
    let p = new URLSearchParams(params)
    if (section === "docs" && next !== "docs") p = stashFilesParams(p)
    if (next === "docs" && section !== "docs") p = restoreFilesParams(p)
    if (section === "important" && next !== "important") p.delete("mark")
    if (next === "agenda") p.delete("sec")
    else p.set("sec", next)
    setParams(p, { replace: true })
  }

  const celebrations = useCelebrations()
  const celOk = celebrations.status === STATUS.ready

  /** Postadan türeyen kartlardan en az biri dolu mu (boş durum kapısı için). */
  const hasCongrats = useMemo(
    () =>
      ["joiner", "birthday"].some(
        (kind) => peopleRows(deriveHighlights(posts, kind, now), FEED.people.limit).length > 0,
      ),
    [posts, now],
  )

  /**
   * ⚠️ **HER KART KENDİ EN HIZLI KAYNAĞINDAN — SAHADA BİLDİRİLDİ**
   * (2026-09-22: *"aramıza yeni katılanları mailden okuyorduk, daha
   * hızlıydı, onu neden bozdun"*). Haklıydı ve kural artık şu:
   *
   *   Aramıza yeni katılanlar → POSTA. İK'nın karşılama duyurusundan
   *     türüyor ve o gönderiler akış için ZATEN yüklü: bedava, anında,
   *     üstelik satıra basınca duyurunun kendisi açılıyor. İK kütüğünden
   *     okumak aynı listeyi ~2 saniyeye çıkarmıştı.
   *   Doğum günleri · İş yıl dönümleri → İK KÜTÜĞÜ. Onların duyurusu yok;
   *     tek kaynak kütük, o yüzden beklemeye değer.
   *
   * Doğum gününün postadan türeyen bir YEDEĞİ var (kütük okunamazsa);
   * yıl dönümünün yok — o da kütük yoksa hiç çizilmiyor.
   */
  const celLoading = celebrations.status === "loading"
  const celPeople = (
    <>
      {/* Postadan — anında, beklemesiz. */}
      <FeedPeople kind="joiner" posts={posts} now={now} onOpen={setOpen} />
      {celOk ? (
        <>
          <CelebrationPeople kind="birthday" people={celebrations.birthdays} />
          <CelebrationPeople kind="anniversary" people={celebrations.anniversaries} />
        </>
      ) : celLoading ? (
        <>
          <CelebrationSkeleton kind="birthday" />
          <CelebrationSkeleton kind="anniversary" />
        </>
      ) : (
        /* Kütük okunamadı — doğum günü postadan türeyen yedeğine düşer. */
        <FeedPeople kind="birthday" posts={posts} now={now} onOpen={setOpen} />
      )}
    </>
  )
  /**
   * ⚠️ **BOŞ DURUM KAPISI: HİÇBİR KART ÇİZİLMEDİYSE.** Yeni katılanlar
   * postadan geldiği için `hasCongrats` onu zaten sayıyor; kütük tarafı da
   * boşsa sekme bomboş kalmasın diye tek bir kart yazılıyor. Yükleniyorken
   * YAZILMAZ — orada iskelet var.
   */
  const celEmpty =
    !hasCongrats &&
    !celLoading &&
    !(celOk && (celebrations.birthdays?.length || celebrations.anniversaries?.length))
  const people = celPeople

  return (
    /* ⚠️ **BU KABUK ETİK HATTININ ÇAPASIDIR, SÜS DEĞİL.** Hap sayfanın sağ
       alt köşesinde duruyor ve `position: fixed` ile GÖRÜNTÜ ALANINA
       bağlanamaz: sohbet rıhtımı `<main>`in kardeşi, açılınca sayfayı
       daraltıyor ama görüntü alanı aynı kalıyor — çakılı bir hap rıhtımın
       bestecisinin üstüne otururdu. Kabuk `<main>`i dolduruyor, hap ona
       `absolute` ile bağlı, yani rıhtımla birlikte sola kayıyor.
       Kaydırıcı DEĞİŞMEDİ: `@container/feed` ve bütün eşikler hâlâ
       aşağıdaki kutuda. */
    <div className="relative flex h-full min-h-0 w-full flex-col">
      <div
        ref={scrollerRef}
        className="@container/feed mx-auto flex h-full w-full max-w-6xl flex-col overflow-y-auto overflow-x-hidden px-4 pb-12 pt-5 sm:px-6"
      >
        {/* ── Başlık ─────────────────────────────────────────────────────── */}
        {/* ⚠️ `notch-gutter` KAPSAYICIDA DEĞİL, İÇERİDE — ve bu ölçülmüş bir
            zorunluluk. Oluk `@container/feed`in kendi kutusuna konunca o kutu
            1104 → 1003 pikselе düşüyor, `@[64rem]` eşiği tutmuyor ve sağ ray
            TAMAMEN kayboluyordu: taşmayı önlemek için rayı silmek. İki blok da
            aynı oluğu alıyor, yoksa arama satırı ile ray birbirinden kayar. */}
        <FeedHeader
          scrollerRef={scrollerRef}
          section={section}
          onSection={setSection}
          view={view}
          onView={setView}
          tag={tag}
          onClearTag={() => setTag(null)}
          showRail={showRail}
          important={important}
          query={query}
          onQuery={setQuery}
          busyRefresh={busyRefresh}
          onRefresh={onRefresh}
        />

        {/* ── İÇERİK + RAY ──────────────────────────────────────────────
            ⚠️ 2026-10-02'den beri ray YALNIZ Popüler'de (`showRail`); aşağıdaki
            09-23 notu o günün kararı, kolon kuralı hâlâ geçerli.
            ⚠️ **IZGARA ARTIK HER BÖLÜMDE ÇİZİLİYOR** (2026-09-23, istek
            üzerine: *"dokümanlar ve eğitime tıklayınca da sağdaki trendler vs
            kartları açık kalsın, soldaki alana yerleştir onları"*). Önceden
            ızgara Gündem PANELİNİN kendisiydi, yani ray da onunla birlikte
            kayboluyordu. Bugün ızgara kabuk: SOL kolon bölüme göre değişiyor,
            SAĞ ray sabit kalıyor.
            ⚠️ **KOLON AÇIKÇA YAZILIR** (`col-start-`), sıraya güvenilmez:
            gizlenen bir panel (`display:none`) ızgara öğesi olmaktan çıkıyor
            ve kalan çocuklar bir kolon SOLA kayıyordu — ray sol kolona,
            içerik sağa düşerdi. */}
        <div
          className={cn(
            "notch-gutter mt-4 grid shrink-0 grid-cols-1 items-start gap-5",
            showRail && "@[64rem]/feed:grid-cols-[minmax(0,1fr)_17rem]",
          )}
        >
          <div
            role="tabpanel"
            id="feed-panel-agenda"
            aria-labelledby="feed-sec-agenda"
            hidden={section !== "agenda"}
            className={cn(
              "flex min-w-0 flex-col gap-3 @[64rem]/feed:col-start-1",
              section !== "agenda" && "hidden",
              /* ⚠️ YALNIZ DAR EKRANDA gizlenir. Geniş ekranda sekme şeridi de
                 çizilmiyor, yani `view` orada bir şey ifade etmiyor; koşulsuz
                 gizlemek adresinde `?view=joiners` taşıyan bir yer imini
                 masaüstünde akışsız açardı. */
              view !== "agenda" && "@max-[64rem]/feed:hidden",
            )}
          >
            <FeedTimeline
              status={status}
              posts={shown}
              total={merged.length}
              hold={holdAgenda}
              importantLoading={important.status === "loading"}
              photoFor={(address) => photos.get(address) ?? personalPhotos.get(address)}
              now={now}
              scrollerRef={scrollerRef}
              onOpen={setOpen}
              hasMore={hasMore}
              loadingMore={loadingMore}
              loadError={loadError}
              loadMore={loadMore}
              pages={pages}
              maxPages={FEED.maxPages}
              onConnect={connect}
              onRefresh={onRefresh}
            />
          </div>

          {/* ── SANA ÖZEL — aynı SOL kolonda, yalnız açıkken mount ────────
              ⚠️ DOM'da RAYIN ÖNÜNDE: sekme sırası pano → ray olsun (N1); eskiden
              ray, panonun "Sıradaki"sinden önce odak alıyordu. Satır yerleşimi
              açık (`row-start-1`), sıraya güvenilmiyor. */}
          {section === "important" && (
            <div
              role="tabpanel"
              id="feed-panel-important"
              aria-labelledby="feed-sec-important"
              className="min-w-0 @[64rem]/feed:col-start-1 @[64rem]/feed:row-start-1"
            >
              <Suspense fallback={<ForYouSkeleton now={now} />}>
                <ForYouPanel
                  state={important}
                  query={query}
                  now={now}
                  onOpen={setOpen}
                  onConnect={connect}
                  onRetry={onRefreshImportant}
                  onClearQuery={() => setQuery("")}
                  todoOpen={access.todo}
                />
              </Suspense>
            </div>
          )}

          {/* Sağ ray — yalnız geniş KAPSAYICIDA ve yalnız Popüler'de (`showRail`);
              `sticky` bu sayfanın kendi kaydırıcısına göre çalışıyor. */}
          {showRail && (
            <aside className="hidden flex-col gap-3 @[64rem]/feed:sticky @[64rem]/feed:top-[calc(var(--feed-head,0px)-0.5rem)] @[64rem]/feed:col-start-2 @[64rem]/feed:row-start-1 @[64rem]/feed:flex">
              <FeedDiscover counts={counts} tag={tag} onTagChange={setTag} personal={personalRow} />
              {people}
            </aside>
          )}

          {/* ── TEBRİKLER sekmesi (yalnız dar ekran) ─────────────────────
              ⚠️ SIRA: önce "Aramıza yeni katılanlar", altında doğum günleri
              (istek, 2026-09-22). Rayda da aynı sıra duruyor.
              ⚠️ **BOŞ DURUM TEK KART.** İki blok da boş olabiliyor ve
              `FeedPeople` boşken `null` dönüyor; blok başına bir kart koymak
              aynı cümleyi iki kez yazmak olurdu. */}
          <div
            className={cn(
              "flex-col gap-3 @[64rem]/feed:hidden",
              section === "agenda" && view === "congrats" ? "flex" : "hidden",
            )}
          >
            {people}
            {celEmpty && (
              <FeedStateCard
                icon={UserAdd01Icon}
                title={t("feed.congratsEmpty")}
                body={t("feed.peopleEmptyBody")}
              />
            )}
          </div>

          {/* ── TRENDLER sekmesi (yalnız dar ekran) ───────────────────────
              ⚠️ Rayın KENDİ bileşeni, ikinci bir liste değil: sayaç, oran
              çubuğu ve sıralama tek yerde kalıyor. */}
          <div
            className={cn(
              "flex-col gap-3 @[64rem]/feed:hidden",
              section === "agenda" && view === "trends" ? "flex" : "hidden",
            )}
          >
            <FeedDiscover
              counts={counts}
              tag={tag}
              onTagChange={pickTrend}
              personal={personalRow}
            />
          </div>

          {/* ── DOKÜMANLAR — aynı SOL kolonda ─────────────────────────────
              ⚠️ GİZLENMİYOR, MOUNT EDİLMİYOR — Gündem'in aksine. Taşıdığı
              tek durum açık klasör; onu korumanın karşılığı, hiç bakılmayan
              sekmenin 14 görselini peşin indirmek olurdu. */}
          {section === "docs" && (
            <div
              role="tabpanel"
              id="feed-panel-docs"
              aria-labelledby="feed-sec-docs"
              className="min-w-0 @[64rem]/feed:col-start-1 @[64rem]/feed:row-start-1"
            >
              {FILES_PAGE.enabled ? (
                <Suspense
                  fallback={
                    // Parça inerken panonun KENDİ iskeleti: açılışta klasör çipleri + son
                    // dosyalar, bir yerdeyken ya da süzgeçliyken satırlar.
                    <FilesSkeleton
                      home={
                        !["floc", "fsrc", "ft", "fd", "fp"].some((k) => params.has(k)) &&
                        lastQuery().trim().length < FILES_PAGE.minQuery
                      }
                    />
                  }
                >
                  <FeedFiles scrollerRef={scrollerRef} now={now} />
                </Suspense>
              ) : (
                <FeedDocs />
              )}
            </div>
          )}
        </div>

        <FeedPostDialog
          post={open}
          photo={open ? (photos.get(open.address) ?? openPhotos.get(open.address)) : undefined}
          open={Boolean(open)}
          onOpenChange={(next) => !next && setOpen(null)}
          // Önceki/sonraki yalnız Popüler'in sırasında; gezinme geçmişe kayıt eklemez.
          list={section === "agenda" ? shown : null}
          onNavigate={(id) => setOpen(id, true)}
        />
      </div>

      {/* ETİK HATTI — geri almak tek satır: `ETHICS_LINE.enabled = false`.
          Alt kenar payı `env(safe-area-inset-bottom)` ile TABANLI: kurulu
          PWA'da telefonun ev çubuğu bu köşeye düşüyor ve düz bir 1.5rem
          onun altında kalabilir. Ölçülmedi, önlem. */}
      {ETHICS_LINE.enabled && (
        <div className="absolute right-6 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-20">
          <EthicsHotline />
        </div>
      )}
    </div>
  )
}
