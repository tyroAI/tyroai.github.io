import { useRef, useState, useSyncExternalStore } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import Idea01Icon from "@hugeicons/core-free-icons/Idea01Icon"
import Bookmark02Icon from "@hugeicons/core-free-icons/Bookmark02Icon"
import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon"
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon"
import {
  getPromptFavorites,
  getPromptFavoritesServerSnapshot,
  reorderPromptFavorites,
  subscribePromptFavorites,
} from "@/lib/promptFavorites"
import { useLocale } from "@/hooks/useLocale"
import { usePrompts } from "@/hooks/usePrompts"
import { pickPrompt } from "./pickPrompt"
import { PromptCard } from "./PromptCard"
import { promptIcon } from "./promptIcons"
import { cn } from "@/lib/utils"

const RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"

/** Şeritte ilk anda kaç sekme görünür. Gerisi "+n" ile açılır. */
const VISIBLE_TABS = 4

/** Bir sekmenin kart olarak gösterdiği en fazla öneri sayısı. */
const CARDS_PER_TAB = 4

/** "Favoriler" sekmesinin id'si — katalogda karşılığı yok, açılış önerileri. */
const POPULAR = "__popular__"

/**
 * Boş sohbetin altındaki öneri yüzeyi.
 *
 * Yüzey SEKMELİ: bestecinin hemen altında konu sekmeleri, onların altında
 * seçili sekmenin önerileri KART olarak. Kartların düz metin listesinden
 * farkı, başlığın cümleyi bir bakışta özetlemesi — altı istemlik bir metin
 * yığınında kullanıcı hangi satırın ne yaptığını okumak zorunda kalıyordu.
 *
 * İlk sekme "Favoriler": sohbet açılınca ya da asistan değişince görünen dört
 * kart artık bir sekmenin içeriği, ekranda öylece duran bir blok değil.
 * Böylece "bu kartlar nereden geliyor, başkası var mı" sorusunun cevabı
 * yüzeyin kendisinde duruyor.
 *
 * Sekme başına EN FAZLA dört kart. Katalog sırası zaten en çok işe yarayanı
 * öne koyuyor; tamamı Öneri Laboratuvarı'nda ve "Tümü" çipi oraya açılıyor.
 *
 * Kırılım VIEWPORT değil KAPSAYICI: sohbet bir dock içinde de açılıyor
 * (340-760 px) ve `sm:` orada yanlış cevabı veriyor.
 */
export function PromptStarters({ agentName, onPick, onOpenLab, collapsed = false }) {
  const { t } = useLocale()
  const { topics: allTopics, starters } = usePrompts(agentName)
  /**
   * ⚠️ **ŞERİT KATALOĞUN TAMAMINI ÇİZMEZ.** Şerit bestecinin hemen altında
   * ve boş sohbetin her açılışında göz önünde; Öneri Laboratuvarı ise ampul
   * düğmesiyle İSTENEREK açılıyor. `labOnly` işaretli konu katalogda
   * duruyor, aranabiliyor ve laboratuvarda tam listesiyle çıkıyor — yalnız
   * bu şeritte çizilmiyor.
   *
   * ⚠️ Süzgeç KATALOĞA değil YÜZEYE ait: veriyi kırpmak konuyu Lab'dan da
   * silerdi ve "hiçbir konu gizlenmez" kuralı orada hâlâ geçerli.
   */
  const topics = allTopics.filter((tp) => !tp.labOnly)
  const [openId, setOpenId] = useState(POPULAR)
  // Roving tabindex: şerit tek Tab durağı, içinde ok tuşlarıyla gezilir.
  const [focusedChip, setFocusedChip] = useState(0)
  // Sürüklenen favorinin anahtarı. ⚠️ Erken dönüşten ÖNCE: hook sırası
  // her render'da aynı olmak zorunda.
  const [dragKey, setDragKey] = useState(null)
  const [showAll, setShowAll] = useState(false)
  const rowRef = useRef(null)
  // Dar alanda kartlar KAPALI başlar. Kapsayıcı sorgusu bunu tek başına
  // yapamaz: hangi konunun açık olduğu React durumu ve bir CSS kuralı onu
  // değiştiremez — kapalıyken HİÇBİR çip seçili görünmemeli, yoksa panel
  // yokken seçili duran bir sekme kalırdı.
  // `collapsed` — DOCK'TA kartlar kapalı başlar; şerit tek satır kalır ve
  // kartlar ancak bir konuya basılınca açılır. Kararı YÜZEY verir, ölçüm
  // değil: dock kullanıcı tarafından yeniden boyutlandırılıyor, yani geniş
  // açılmış bir dock ölçüme "sayfa" diye görünür ve kartlar yine gelirdi.
  // `App.jsx` dock ile sayfayı zaten `isChat` ile ayırıyor.
  const [panelOpen, setPanelOpen] = useState(false)
  // Aktif sekmenin kaçıncı öneri sayfasındayız. Sekme değişince sıfırlanır.
  const [page, setPage] = useState(0)
  // Kullanıcının kendi işaretledikleri. Kayıt localStorage'da, sıra
  // ANLAMLI: en son işaretlenen en başta (bkz. `lib/promptFavorites.js`).
  const favorites = useSyncExternalStore(
    subscribePromptFavorites,
    getPromptFavorites,
    getPromptFavoritesServerSnapshot,
  )

  if (topics.length === 0) return null

  const favSet = new Set(favorites)

  /**
   * ⚠️ **SÜRÜKLEME YALNIZ FAVORİ KARTLARDA** (istek üzerine, 2026-09-20).
   * Favoriler sekmesi iki şey gösteriyor: kullanıcının işaretledikleri ve
   * arkalarından gelen katalog varsayılanları. Sıralanabilir olan yalnız
   * BİRİNCİSİ, çünkü ikincisinin sırası katalogun — ve bir varsayılanı
   * sürüklemek onu sessizce favoriye çevirseydi, kullanıcı yalnızca yerini
   * değiştirmek isterken listesini de değiştirmiş olurdu.
   *
   * Görsel ipucu ücretsiz geliyor: bu sekmede kalp de yalnız favori
   * kartlarda çiziliyor, yani tutamak tam olarak kalbin olduğu yerde.
   *
   * ⚠️ HTML5 sürükleme klavyeye ve DOKUNMATİĞE hizmet etmiyor. Ayarlar
   * sayfası bunu ok DÜĞMELERİYLE çözüyor; burada kart dar ve iki düğme daha
   * onu boğardı, o yüzden klavye tutamağın üstünde OK TUŞLARIYLA çalışıyor.
   * Dokunmatikte sıralama yok — kalple ekleyip çıkarmak duruyor.
   */
  function moveFavorite(fromKey, toKey) {
    if (!fromKey || !toKey || fromKey === toKey) return
    const keys = favorites.slice()
    const from = keys.indexOf(fromKey)
    const to = keys.indexOf(toKey)
    if (from === -1 || to === -1) return
    keys.splice(to, 0, keys.splice(from, 1)[0])
    reorderPromptFavorites(keys)
  }

  function nudgeFavorite(key, delta) {
    const keys = favorites.slice()
    const from = keys.indexOf(key)
    const to = from + delta
    if (from === -1 || to < 0 || to >= keys.length) return
    keys.splice(to, 0, keys.splice(from, 1)[0])
    reorderPromptFavorites(keys)
  }

  /**
   * ⚠️ **FAVORİ ŞERİDİNDE KULLANICI VARSAYILANI EZER** (2026-09-18, istek
   * üzerine: *"bizim default favorilerdekini ezsin, ilk sıraya gelsin,
   * sırayla ezebilsin"*). Önce kullanıcının işaretledikleri — kaydedildikleri
   * sırayla — sonra katalogun açılış önerilerinden işaretlenmemiş olanlar.
   * Tavan aynı (`CARDS_PER_TAB`), yani her yeni favori bir varsayılanı iter.
   *
   * ⚠️ Favori kart KONUSUNDAN da bulunur: şerit yalnız `starters`ı değil,
   * bütün konuların istemlerini tarar — kullanıcı bir İK kartını
   * işaretlediyse favorilerde onu görmeli.
   */
  const byKey = new Map()
  for (const p of [...starters, ...topics.flatMap((tp) => tp.prompts)]) {
    if (p.key && !byKey.has(p.key)) byKey.set(p.key, p)
  }
  // Öksüz işaret (metni değişmiş istem) sessizce düşer — silinmez.
  const pinned = favorites.map((k) => byKey.get(k)).filter(Boolean)

  const popular = {
    id: POPULAR,
    label: t("prompts.popular"),
    iconHint: "star",
    prompts: [...pinned, ...starters.filter((s) => !favSet.has(s.key))],
  }
  const tabs = starters.length > 0 ? [popular, ...topics] : topics
  const hidden = showAll ? 0 : Math.max(0, tabs.length - VISIBLE_TABS)
  const shown = hidden > 0 ? tabs.slice(0, VISIBLE_TABS) : tabs
  const hasToggle = hidden > 0 || showAll
  const stops = shown.length + (hasToggle ? 1 : 0) + 1
  const focusIndex = Math.min(focusedChip, stops - 1)

  // Seçili sekme TÜRETİLİR: asistan değişince küme de değişiyor ve saklanan
  // id artık var olmayabiliyor.
  const active = tabs.find((x) => x.id === openId) ?? tabs[0]
  // ⚠️ KONU sekmesinde de favori ÖNE gelir (istek üzerine: "ilgili tabda da
  // en başta gelsin"), sıra bozulmadan — `filter` kararlıdır, favorisi
  // olmayan bir konuda tek piksel değişmez. Favoriler sekmesi zaten
  // sıralanmış geliyor, ikinci kez sıralanmaz.
  const ordered =
    active?.id === POPULAR
      ? (active?.prompts ?? [])
      : [
          ...(active?.prompts ?? []).filter((p) => favSet.has(p.key)),
          ...(active?.prompts ?? []).filter((p) => !favSet.has(p.key)),
        ]
  /**
   * ⚠️ **OKLAR SEKME DEĞİŞTİRMEZ, AYNI SEKMEDE SAYFALAR** (2026-09-18, istek
   * üzerine: *"İK sekmesinde biz sadece 4 tanesini gösteriyoruz ama arkada
   * daha fazlası var; prompt lab'taki diğer önerilere geçiş yapsın, her sekme
   * KENDİ İÇİNDE"*).
   *
   * Bir tur oklar sekmeler arasında geziyordu ve geri alındı: sekmeler zaten
   * çip şeridinde tek tıkla duruyor, yani ok var olan bir yolu ikinci kez
   * açıyordu. Asıl ulaşılamayan şey sekmenin GÖRÜNMEYEN önerileriydi — kart
   * tavanı dörtte ve gerisi yalnız Öneri Laboratuvarı'ndan görülebiliyordu.
   */
  const pageCount = Math.max(1, Math.ceil(ordered.length / CARDS_PER_TAB))
  // ⚠️ `page` KISTIRILIR, doğrudan kullanılmaz: sekme değişince sıfırlanıyor
  // ama favori eklemek/çıkarmak da listeyi kısaltabiliyor; son sayfada kalan
  // kullanıcı boş bir ızgarayla karşılaşmasın.
  const pageAt = Math.min(page, pageCount - 1)
  // ⚠️ DAR ALANDA (rıhtım · telefon) SAYFA YOK: oklar orada çizilmiyor ve
  // kutu kendi içinde kayıyor, yani sekmenin TÜM önerileri listede durur;
  // sayfa dışı kartlar yalnız genişte (`@lg/chat`) gizlenir. Yoksa Favoriler'in
  // ikinci sayfası rıhtımdan hiç açılamazdı.
  const onPage = (i) => Math.floor(i / CARDS_PER_TAB) === pageAt
  const canPrev = pageAt > 0
  const canNext = pageAt < pageCount - 1
  function stepPage(d) {
    setPage(Math.min(Math.max(pageAt + d, 0), pageCount - 1))
  }
  // Geniş alanda panel HER ZAMAN açık — bugünkü davranış değişmedi.
  const showCards = !collapsed || panelOpen

  function pickTab(id) {
    if (collapsed) {
      // Açık konuya tekrar basmak KAPATIR: açan jestin tersi aynı jesttir.
      if (id === openId && panelOpen) {
        setPanelOpen(false)
        return
      }
      setPanelOpen(true)
    }
    setOpenId(id)
    setPage(0)
  }

  function moveFocus(next) {
    const i = (next + stops) % stops
    setFocusedChip(i)
    rowRef.current?.querySelectorAll("[data-chip]")[i]?.focus()
  }

  function onStripKeyDown(e) {
    if (e.key === "ArrowRight") {
      e.preventDefault()
      moveFocus(focusIndex + 1)
    } else if (e.key === "ArrowLeft") {
      e.preventDefault()
      moveFocus(focusIndex - 1)
    } else if (e.key === "Home") {
      e.preventDefault()
      moveFocus(0)
    } else if (e.key === "End") {
      e.preventDefault()
      moveFocus(stops - 1)
    }
  }

  /**
   * ⚠️ **OKLAR KART ALANININ İKİ YANINDA** (kullanıcı yerlerini ekran
   * görüntüsünde işaretledi). Izgaranın DIŞINA konumlanır (`-left-9` /
   * `-right-9`), yani kart genişliğinden tek piksel çalmaz. Dar kipte
   * (`@max-lg/chat`) o boşluk yok — orada çizilmez ve kart kutusu zaten
   * kendi içinde kayıyor.
   */
  const ARROW = cn(
    "absolute top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full",
    "border border-border/70 bg-background text-foreground/60 shadow-sm",
    "transition hover:border-brand/40 hover:text-foreground disabled:pointer-events-none disabled:opacity-0",
    // Dokunmatikte hover YOK: kaba işaretçide oklar her zaman görünür.
    "opacity-0 group-hover/cards:opacity-100 focus-visible:opacity-100 [@media(pointer:coarse)]:opacity-100",
    "@max-lg/chat:hidden",
    RING,
  )

  return (
    <div className="w-full">
      {/* GENİŞ ALANDA SARAR, DAR ALANDA KAYAR. Dört sekme + "+n" + "Tümü"
          çoğu genişlikte tek satır; sarmak, kesilen bir çipten iyidir. */}
      <div
        /* Dar alanda çipler bir PANELİ AÇIP KAPATIYOR, sekme değiştirmiyor.
           `role="tablist"` orada yanlış söz: ARIA bir tablist'te her zaman
           seçili bir sekme bekler, oysa kapalıyken hiçbiri seçili değil.
           Akordiyon düğmeleri `aria-expanded` ile kendini anlatır. */
        role={collapsed ? undefined : "tablist"}
        aria-label={t("prompts.topics")}
        ref={rowRef}
        onKeyDown={onStripKeyDown}
        className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-center gap-1.5 @max-lg/chat:w-fit @max-lg/chat:max-w-full @max-lg/chat:flex-nowrap @max-lg/chat:justify-start @max-lg/chat:overflow-x-auto @max-lg/chat:overscroll-x-contain @max-lg/chat:[scrollbar-width:none] @max-lg/chat:[&::-webkit-scrollbar]:hidden"
      >
        {shown.map((tab, i) => {
          // Kapalıyken HİÇBİRİ seçili değil: paneli olmayan seçili bir
          // sekme, kullanıcıya olmayan bir içeriği vaat ederdi.
          const selected = tab.id === active?.id && showCards
          return (
            <button
              key={tab.id}
              type="button"
              role={collapsed ? undefined : "tab"}
              data-chip=""
              tabIndex={focusIndex === i ? 0 : -1}
              onFocus={() => setFocusedChip(i)}
              aria-selected={collapsed ? undefined : selected}
              aria-expanded={collapsed ? selected : undefined}
              aria-controls="prompt-tab-panel"
              onClick={() => pickTab(tab.id)}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[0.8125rem] font-medium transition @max-lg/chat:h-8 @max-lg/chat:px-3 @max-lg/chat:text-[0.78125rem]",
                RING,
                selected
                  ? "border-brand/40 bg-brand/10 text-brand-ink"
                  : "border-border/70 bg-background text-foreground/80 hover:text-foreground",
              )}
            >
              <HugeiconsIcon
                icon={tab.id === POPULAR ? Bookmark02Icon : promptIcon(tab.iconHint)}
                className={cn("size-4 shrink-0", selected ? "text-brand-ink" : "text-brand-via")}
                strokeWidth={1.7}
              />
              {tab.label}
            </button>
          )
        })}

        {/* "+2" ⇄ "Daha az" — aynı çip iki yönde çalışır. */}
        {hasToggle && (
          <button
            type="button"
            data-chip=""
            tabIndex={focusIndex === shown.length ? 0 : -1}
            onFocus={() => setFocusedChip(shown.length)}
            aria-expanded={showAll}
            onClick={() => {
              if (showAll) {
                setShowAll(false)
                // Seçili sekme artık görünmüyorsa ilkine dön: sekmesi olmayan
                // bir panel, kullanıcının nerede olduğunu bilememesi demek.
                if (!tabs.slice(0, VISIBLE_TABS).some((x) => x.id === openId)) setOpenId(tabs[0].id)
              } else {
                setShowAll(true)
              }
            }}
            aria-label={
              showAll ? t("prompts.lessTopicsLabel") : t("prompts.moreTopicsLabel", { n: hidden })
            }
            className={cn(
              "inline-flex h-9 shrink-0 items-center rounded-full border border-border/70 bg-background px-3 text-[0.8125rem] font-medium text-foreground/70 transition hover:text-foreground @max-lg/chat:h-8 @max-lg/chat:px-2.5 @max-lg/chat:text-[0.78125rem]",
              RING,
            )}
          >
            {showAll ? t("prompts.lessTopics") : t("prompts.moreTopics", { n: hidden })}
          </button>
        )}

        <button
          type="button"
          data-chip=""
          tabIndex={focusIndex === stops - 1 ? 0 : -1}
          onFocus={() => setFocusedChip(stops - 1)}
          onClick={onOpenLab}
          aria-label={t("prompts.allPrompts")}
          className={cn(
            "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-dashed border-border bg-background px-3.5 text-[0.8125rem] font-medium text-foreground/70 transition hover:border-brand/40 hover:text-foreground @max-lg/chat:h-8 @max-lg/chat:px-3 @max-lg/chat:text-[0.78125rem]",
            RING,
          )}
        >
          <HugeiconsIcon
            icon={Idea01Icon}
            className="size-4 shrink-0 text-brand-via"
            strokeWidth={1.7}
          />
          {/* ⚠️ SAYI `allTopics`TEN, süzülmüş `topics`ten DEĞİL: bu çip
              LABORATUVARI açıyor ve orada `labOnly` konular da görünüyor.
              Süzülmüş sayıyı yazmak "Tümü · 3" deyip 5 konu açmak olurdu —
              tavan ile sayı birbirini yalanlamaz. */}
          {t("prompts.allWithCount", { n: allTopics.length })}
        </button>
      </div>

      {/* ANİMASYON YOK, bilinçli — iki kez bedelini ödedik.
          `AnimatePresence mode="wait"` eski paneli çıkışı bitene kadar DOM'da
          tutuyordu: sekme seçili görünürken ekranda önceki sekmenin kartları
          duruyordu. Çıkışı kaldırınca da içerik motion'ın `initial → animate`
          adımına bağlı kaldı, yani animasyon herhangi bir sebeple koşmazsa
          panel GÖRÜNMEZ oluyor. Sekme değişimi zaten anlık olmalı; içeriğin
          görünürlüğünü bir animasyona bağlamanın karşılığı yok. */}
      {active && showCards && (
        <div className="group/cards relative mx-auto mt-3 w-full max-w-2xl short:mt-2 @max-lg/chat:mt-2">
          <button
            type="button"
            onClick={() => stepPage(-1)}
            disabled={!canPrev}
            aria-label={t("prompts.prevPrompts")}
            className={cn(ARROW, "-left-9")}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" strokeWidth={1.9} />
          </button>
          <ul
            key={active.id}
            id="prompt-tab-panel"
            role={collapsed ? "group" : "tabpanel"}
            aria-label={active.label}
            // Dar alanda İKİ kart görünür, gerisi KAYDIRILIR. Eskiden
            // üçüncü ve dördüncü kart tamamen gizleniyordu: telefonda bir
            // sekmenin yarısı erişilemez kalıyordu. Kutu iki kart yüksekliğinde
            // sabit ve kendi içinde kayıyor; `overscroll-contain` sayfayı
            // peşinden sürüklemiyor.
            className="grid w-full grid-cols-2 gap-2 short:gap-1.5 @max-lg/chat:max-h-[8.75rem] @max-lg/chat:grid-cols-1 @max-lg/chat:gap-1.5 @max-lg/chat:overflow-y-auto @max-lg/chat:overflow-x-hidden @max-lg/chat:overscroll-contain"
          >
            {ordered.map((p, i) => {
              // Sıralanabilir mi: yalnız Favoriler sekmesindeki KENDİ
              // favorilerin (bkz. yukarıdaki gerekçe).
              const sortable = active?.id === POPULAR && favSet.has(p.key)
              return (
                <li
                  key={p.id}
                  className={onPage(i) ? undefined : "@lg/chat:hidden"}
                  onDragOver={sortable ? (e) => e.preventDefault() : undefined}
                  onDrop={
                    sortable
                      ? (e) => {
                          e.preventDefault()
                          moveFavorite(dragKey, p.key)
                          setDragKey(null)
                        }
                      : undefined
                  }
                >
                  {/* ⚠️ VARSAYILAN FAVORİDE "EKLE" KALBİ ÇİZİLMEZ: Favoriler
                      sekmesindeki kart zaten favoride. Kullanıcının KENDİ
                      eklediği kartta kalp DOLU çıkar ve çıkarmaya yarar.
                      Konu sekmelerinde kalp her kartta: orası bir katalog. */}
                  <PromptCard
                    prompt={p}
                    icon={promptIcon(p.iconHint ?? active.iconHint)}
                    sortable={sortable}
                    dragging={sortable && dragKey === p.key}
                    favorite={favSet.has(p.key)}
                    showHeart={active?.id !== POPULAR || favSet.has(p.key)}
                    onPick={(prompt) => pickPrompt(prompt, onPick)}
                    onDragStart={setDragKey}
                    onDragEnd={() => setDragKey(null)}
                    onNudge={nudgeFavorite}
                  />
                </li>
              )
            })}
          </ul>
          <button
            type="button"
            onClick={() => stepPage(1)}
            disabled={!canNext}
            aria-label={t("prompts.nextPrompts")}
            className={cn(ARROW, "-right-9")}
          >
            <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" strokeWidth={1.9} />
          </button>
        </div>
      )}

      {/* Kartın kırpılabilen metni ile besteciye düşen tam metin arasındaki
          sözleşme. Hover'a bağlı hiçbir bilgi yok, tek telafi bu cümle. */}
      <p className="mt-2 text-center text-[0.6875rem] leading-snug text-muted-foreground/80 short:hidden @max-lg/chat:hidden">
        {t("prompts.pickHint")}
      </p>
    </div>
  )
}
