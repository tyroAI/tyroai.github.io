import { useMemo, useRef, useState, useSyncExternalStore } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import Idea01Icon from "@hugeicons/core-free-icons/Idea01Icon"
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useLocale } from "@/hooks/useLocale"
import { usePrompts } from "@/hooks/usePrompts"
import {
  getPromptFavorites,
  getPromptFavoritesServerSnapshot,
  subscribePromptFavorites,
} from "@/lib/promptFavorites"
import { promptIcon } from "./promptIcons"
import { PromptHeart } from "./PromptHeart"
import { PromptText } from "./PromptText"
import { pickPrompt } from "./pickPrompt"
// Katlama tek kaynaktan: "odeme" → "ödeme", I/ı çifti doğru eşleşsin diye.
import { cn, foldTr } from "@/lib/utils"

const RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
const ALL = "__all__"

/**
 * Öneri Laboratuvarı — hazır önerilerin tam listesi.
 *
 * Boş sohbetteki çipler bir VİTRİNDİR; burası katalogun tamamı. İki yüzey
 * aynı veriden beslenir, yani bir öneri eklemek tek yerde olur.
 *
 * SEÇİM GÖNDERMEZ, YAZAR: öneri besteciye düşer ve ilk yer tutucu
 * (`[proje no]`) seçili kalır. Doğrudan göndermek, içinde doldurulmamış
 * parantez olan bir cümleyi asistana yollamak olurdu.
 *
 * Bu turda düzelen dört şey:
 *
 * 1. ARAMA BANDA TAŞINDI. Pencerede üç yatay ayraç vardı ve arama gövdenin
 *    içinde, başlıktan kopuk duruyordu; galeri arayüzlerinin tamamı (Copilot
 *    Prompt Gallery, Gemini, Notion) aramayı başlıkla aynı banda koyuyor.
 * 2. SAYAÇ BAŞLIĞA DEĞİL, ÜÇ YERE. Başlıkta sayı göstermek moda; işe yarayanı
 *    seçim noktasındaki sayı. Toplam altyazıda, konu başına rayda, sonuç
 *    sayısı ise canlı bölgede. Üçü de TEK memo'dan okur — ayrı türetme,
 *    rozetin listeyle sessizce ayrışması demekti.
 * 3. ARAMA VE KONU ARTIK BİRLİKTE DARALTIR. Konuya basmak aramayı
 *    sıfırlıyordu; artık arama kalır, sonuç seçili konuya kapsanır ve
 *    "Tümü" katalogun tamamında gezer — rozetler ancak böyle anlam kazanır.
 * 4. TEK KIRILIM. Gövde 640'ta satıra dönerken ray düzeni 768'lik bir
 *    JS kontrolüyle seçiliyordu; arada kalan bantta yatay şerit sınıfları
 *    dikey rayın yerine geçip kart sütununu eziyordu. Artık ikisi de CSS'te
 *    ve aynı eşikte.
 */
export function PromptLab({ open, onOpenChange, agentName, onPick }) {
  const { t } = useLocale()
  const { topics } = usePrompts(agentName)
  const [pickedTopic, setPickedTopic] = useState(ALL)
  const [query, setQuery] = useState("")
  const searchRef = useRef(null)
  const resultsRef = useRef(null)
  const railRef = useRef(null)
  // Kullanıcının favorileri — kalpler burada da dolu/boş çizilsin diye.
  const favorites = useSyncExternalStore(
    subscribePromptFavorites,
    getPromptFavorites,
    getPromptFavoritesServerSnapshot,
  )
  const favSet = useMemo(() => new Set(favorites), [favorites])
  // Seçimle kapanışta odağı Radix'in tetikleyiciye iade etmesini engeller:
  // besteci odağı `handlePromptPick` içinde alıyor ve iade onu geri çalıyordu.
  const pickedRef = useRef(false)

  // Seçili konu TÜRETİLİR: asistan değişince katalog da değişiyor ve saklanan
  // id artık var olmayabiliyor.
  const topicId =
    pickedTopic === ALL || topics.some((x) => x.id === pickedTopic) ? pickedTopic : ALL

  const q = foldTr(query.trim())

  // Rozet ve liste TEK kaynaktan. Ayrı iki türetme, rozetin filtresiz
  // listenin filtreli olması gibi klasik bir hataya davetiye.
  const matchesByTopic = useMemo(
    () =>
      new Map(
        topics.map((tp) => [
          tp.id,
          q
            ? tp.prompts.filter(
                (p) =>
                  foldTr(p.title).includes(q) ||
                  foldTr(p.text).includes(q) ||
                  foldTr(tp.label).includes(q),
              )
            : tp.prompts,
        ]),
      ),
    [topics, q],
  )

  const totalPrompts = useMemo(() => topics.reduce((n, tp) => n + tp.prompts.length, 0), [topics])

  const results = useMemo(() => {
    const pick = (tp) => (matchesByTopic.get(tp.id) ?? []).map((p) => ({ ...p, topic: tp }))
    if (topicId === ALL) return topics.flatMap(pick)
    const tp = topics.find((x) => x.id === topicId)
    return tp ? pick(tp) : []
  }, [topics, topicId, matchesByTopic])

  const topicsWithHits = topics.filter((tp) => (matchesByTopic.get(tp.id) ?? []).length > 0).length
  const activeTopic = topics.find((x) => x.id === topicId) ?? null

  const rail = [
    {
      id: ALL,
      label: t("prompts.all"),
      icon: Idea01Icon,
      n:
        results.length && !q
          ? totalPrompts
          : topics.reduce((n, tp) => n + (matchesByTopic.get(tp.id) ?? []).length, 0),
    },
    ...topics.map((tp) => ({
      id: tp.id,
      label: tp.label,
      icon: promptIcon(tp.iconHint),
      n: (matchesByTopic.get(tp.id) ?? []).length,
    })),
  ]

  function onRailKeyDown(e) {
    const keys = ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Home", "End"]
    if (!keys.includes(e.key)) return
    e.preventDefault()
    const items = [...(railRef.current?.querySelectorAll("[data-rail]") ?? [])]
    const at = items.findIndex((el) => el === document.activeElement)
    const last = items.length - 1
    let next
    if (e.key === "ArrowDown" || e.key === "ArrowRight") next = at < 0 ? 0 : Math.min(at + 1, last)
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = at < 0 ? 0 : Math.max(at - 1, 0)
    else if (e.key === "Home") next = 0
    else next = last
    items[next]?.focus()
    items[next]?.scrollIntoView({ inline: "center", block: "nearest" })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        onOpenAutoFocus={(e) => {
          // Odak DOM'daki ilk düğmeye (kapat) düşüyordu; aramaya ulaşmak altı
          // Tab sürüyordu. Dokunmatikte arama odaklanmaz — yumuşak klavye
          // pencerenin yarısını yerdi.
          e.preventDefault()
          if (window.matchMedia("(hover: hover) and (pointer: fine)").matches)
            searchRef.current?.focus()
          else resultsRef.current?.focus()
        }}
        onCloseAutoFocus={(e) => {
          if (pickedRef.current) {
            e.preventDefault()
            pickedRef.current = false
          }
        }}
        onKeyDown={(e) => {
          // Escape önce ARAMAYI temizler, sonra pencereyi kapatır. Durdurmak
          // şart: sohbet dock'u Escape'i window'da dinliyor.
          if (e.key === "Escape" && query) {
            e.preventDefault()
            e.stopPropagation()
            setQuery("")
            searchRef.current?.focus()
          }
        }}
        className={cn(
          "flex flex-col gap-0 overflow-hidden p-0",
          "h-[min(92dvh,44rem)] w-[calc(100vw-1.5rem)] max-w-none sm:max-h-none",
          "sm:w-full sm:max-w-[54rem]",
        )}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border/60 px-4 py-2.5 sm:px-5 sm:py-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand-ink">
            {/* Bestecideki ampulün AYNI glifi: düğme ile açtığı yer aynı
                işareti taşısın. */}
            <HugeiconsIcon icon={Idea01Icon} className="size-4" strokeWidth={1.9} />
          </span>
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-[0.9375rem] font-semibold leading-tight">
              {t("prompts.labTitle")}
            </DialogTitle>
            <DialogDescription className="mt-0.5 truncate text-[0.71875rem] leading-tight">
              {totalPrompts > 0
                ? t("prompts.labSubtitleCount", {
                    n: totalPrompts,
                    agent: agentName || t("prompts.assistant"),
                  })
                : t("prompts.labSubtitle", { agent: agentName || t("prompts.assistant") })}
            </DialogDescription>
          </div>

          <div className="order-last w-full sm:order-none sm:w-64 lg:w-72">
            <div className="flex items-center gap-1.5 rounded-lg bg-foreground/[0.04] px-2 py-1.5 ring-1 ring-transparent transition focus-within:bg-foreground/[0.06] focus-within:ring-brand/40">
              <HugeiconsIcon
                icon={Search01Icon}
                className="size-3.5 shrink-0 text-muted-foreground"
                strokeWidth={1.8}
              />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                type="search"
                inputMode="search"
                enterKeyHint="search"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                aria-label={t("prompts.search")}
                aria-controls="promptlab-results"
                aria-describedby="promptlab-count"
                placeholder={t("prompts.search")}
                className="min-w-0 flex-1 bg-transparent text-[0.78125rem] outline-none placeholder:text-muted-foreground/70 [&::-webkit-search-cancel-button]:hidden"
              />
              {query && (
                <button
                  type="button"
                  aria-label={t("prompts.clear")}
                  onClick={() => {
                    setQuery("")
                    searchRef.current?.focus()
                  }}
                  // 24 piksel: 16'lık hedef dokunmatikte WCAG 2.5.8'in altında.
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground hover:text-foreground",
                    RING,
                  )}
                >
                  <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" strokeWidth={2.4} />
                </button>
              )}
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("sheet.close")}
            onClick={() => onOpenChange(false)}
            className="size-8 shrink-0 rounded-lg [&_svg]:!size-4"
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          <nav
            ref={railRef}
            onKeyDown={onRailKeyDown}
            aria-label={t("prompts.topics")}
            // Tek DOM, iki düzen, TEK kırılım: dar alanda yatay şerit,
            // 640'tan itibaren sol ray. Eskiden düzeni JS (768) seçiyordu ve
            // arada kalan bantta ikisi çakışıyordu.
            className="flex shrink-0 gap-1.5 overflow-x-auto overscroll-x-contain border-b border-border/60 px-3 py-2 [scrollbar-width:none] sm:block sm:w-56 sm:space-y-0.5 sm:overflow-x-visible sm:overflow-y-auto sm:overscroll-contain sm:border-b-0 sm:border-r sm:p-2 [&::-webkit-scrollbar]:hidden"
          >
            {rail.map((item) => {
              const active = item.id === topicId
              return (
                <button
                  key={item.id}
                  type="button"
                  data-rail=""
                  tabIndex={active ? 0 : -1}
                  aria-current={active ? "true" : undefined}
                  onClick={() => setPickedTopic(item.id)}
                  className={cn(
                    "flex min-h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-left text-[0.75rem] transition sm:min-h-0 sm:w-full sm:px-2.5 sm:py-2 sm:text-[0.78125rem]",
                    RING,
                    active
                      ? "bg-brand/10 font-semibold text-brand-ink"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                  )}
                >
                  <HugeiconsIcon icon={item.icon} className="size-4 shrink-0" strokeWidth={1.8} />
                  <span className="whitespace-nowrap sm:whitespace-normal sm:leading-tight">
                    {item.label}
                  </span>
                  {/* Sayı SEÇİM NOKTASINDA durur. Sıfır sonuçta satır
                      kaybolmaz, yalnızca söner — kullanıcı katalogun şeklini
                      kaybetmesin. */}
                  <span
                    className={cn(
                      "ml-auto shrink-0 pl-1 text-[0.65625rem] tabular-nums text-muted-foreground/70",
                      item.n === 0 && "opacity-40",
                    )}
                  >
                    {item.n}
                  </span>
                </button>
              )
            })}
          </nav>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <p
              id="promptlab-count"
              role="status"
              aria-live="polite"
              className="px-4 pb-1 pt-3 text-[0.71875rem] leading-snug text-muted-foreground sm:px-5"
            >
              {query.trim()
                ? // Tek konuya düşen sonuçta "1 konuda" demiyoruz: çoğul eki
                  // dört dilde ayrı bir mekanizma ister ve cümle zaten sayıyı
                  // taşıyor.
                  topicId === ALL && topicsWithHits > 1
                  ? t("prompts.resultCountIn", { n: results.length, topics: topicsWithHits })
                  : t("prompts.resultCount", { n: results.length })
                : // "Tümü" + arama yokken sayı ZATEN altyazıda: aynı sayıyı
                  // iki satır arayla tekrar etmek yerine seçimin ne yapacağını
                  // söylüyoruz — kullanıcının burada bilmediği tek şey o.
                  (activeTopic?.blurb ?? t("prompts.pickHint"))}
            </p>

            <ul
              id="promptlab-results"
              ref={resultsRef}
              tabIndex={-1}
              // İki sütun 768'den itibaren: 640'ta ray çıkınca kart sütunu
              // 180 pikselе iniyordu.
              className="grid min-h-0 flex-1 auto-rows-min grid-cols-1 gap-1.5 overflow-y-auto overflow-x-hidden overscroll-contain p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] outline-none sm:p-4 md:grid-cols-2"
            >
              {results.map((p) => (
                <li key={`${p.topic.id}-${p.id}`}>
                  {/* ⚠️ KÖK `div`, SEÇİM BİR KAPLAMA DÜĞMESİ — kalp iç içe
                      düğme doğurmasın diye (bkz. `PromptHeart`). Kaplama
                      DOM'da kalpten ÖNCE gelir. */}
                  <div
                    className={cn(
                      "group/prompt relative flex w-full items-start gap-3 rounded-xl border border-border/60 bg-card px-3 py-2.5 text-left transition hover:border-brand/40 hover:bg-brand/[0.04]",
                      "focus-within:outline-none focus-within:ring-2 focus-within:ring-brand/40",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        pickedRef.current = true
                        pickPrompt(p, onPick)
                        onOpenChange(false)
                      }}
                      className="absolute inset-0 z-0 rounded-xl focus:outline-none"
                    >
                      <span className="sr-only">{p.title}</span>
                    </button>
                    {/* Laboratuvar bir KATALOG: her kartta kalp var, çünkü
                        hiçbiri "zaten favoride" değil (favori şeridinin
                        varsayılan kartlarındaki kural burada geçmez). */}
                    <PromptHeart
                      promptKey={p.key}
                      favorite={favSet.has(p.key)}
                      className="group-hover/prompt:opacity-100"
                    />
                    <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand-ink">
                      <HugeiconsIcon
                        icon={promptIcon(p.topic.iconHint)}
                        className="size-3.5"
                        strokeWidth={1.9}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.78125rem] font-semibold leading-tight">
                        {p.title}
                      </span>
                      <span className="mt-1 block text-[0.75rem] leading-snug text-muted-foreground [overflow-wrap:anywhere]">
                        <PromptText text={p.text} />
                      </span>
                      {(query.trim() || topicId === ALL) && (
                        <span className="mt-1 block text-[0.65625rem] uppercase tracking-wide text-muted-foreground/70">
                          {p.topic.label}
                        </span>
                      )}
                    </span>
                    {/* Dokunmatikte hover yok: ok orada SÖNÜK ama görünür
                        durur, imleçli cihazda eski davranış korunur.
                        ⚠️ Kalp sağ ÜSTE oturduğu için ok ona çarpmasın diye
                        bir kademe aşağıda başlar. */}
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      className="mt-6 size-4 shrink-0 text-muted-foreground opacity-40 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/prompt:opacity-70"
                      strokeWidth={2}
                    />
                  </div>
                </li>
              ))}
              {results.length === 0 && (
                <li className="col-span-full px-2 py-10 text-center" role="status">
                  <p className="text-[0.78125rem] font-medium">{t("prompts.noResults")}</p>
                  <p className="mt-1 text-[0.71875rem] text-muted-foreground">
                    {t("prompts.noResultsHint")}
                  </p>
                  {query && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setQuery("")
                        searchRef.current?.focus()
                      }}
                      className="mt-3 h-7 rounded-full px-3 text-[0.71875rem]"
                    >
                      {t("prompts.clear")}
                    </Button>
                  )}
                </li>
              )}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
