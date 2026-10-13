import {
  Fragment,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import { createPortal } from "react-dom"
import { HugeiconsIcon } from "@hugeicons/react"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"
import { REFERENCE_TABS, tabsForAgent } from "./references/referenceSources"
import {
  MeetingsTab,
  PeopleTab,
  MailTab,
  OneDriveTab,
  SharePointTab,
} from "./references/OfficeTabs"

/** Seçili sekme id'si — küme değişince ilkine düşer. */
function activeIdOf(tabs, tabId) {
  return tabs.some((x) => x.id === tabId) ? tabId : (tabs[0]?.id ?? "")
}

const OFFICE_BODIES = {
  meetings: MeetingsTab,
  people: PeopleTab,
  mail: MailTab,
  onedrive: OneDriveTab,
  sharepoint: SharePointTab,
}

/**
 * "/" ile açılan referans seçici.
 *
 * Neden PORTAL + `position: fixed`: bestecinin iç kabuğu `overflow-hidden` ve
 * dış kabuğa taşma verilemiyor (`.composer-beam::before` iki piksel dışarı
 * taşan bir çerçeve çiziyor). Akış içinde açılan bir liste kesilirdi.
 *
 * Odak textarea'da KALIR — satırlar odak almaz. Kullanıcı yazmaya devam
 * ediyor: "/" ile imleç arasındaki metin sorgudur. Bu yüzden textarea bir
 * combobox gibi etiketlenir ve seçili satır `aria-activedescendant` ile
 * duyurulur; programatik odak/blur dokunmatikte yumuşak klavyeyi kapatırdı.
 */
export const ReferencePicker = forwardRef(function ReferencePicker(
  { anchorRef, agentName, query, onPick, onClose, autoFocusSearch, onActiveOptionChange },
  ref,
) {
  const { t } = useLocale()
  const tabs = tabsForAgent(agentName)
  const [tabId, setTabId] = useState(tabs[0]?.id ?? REFERENCE_TABS[0].id)
  const bodyRef = useRef(null)
  const panelRef = useRef(null)
  const searchRef = useRef(null)
  const [pos, setPos] = useState(null)
  // Panelin kendi arama kutusu. Bestecideki "/" sorgusuyla YARIŞMAZ: kutuya
  // bir şey yazıldığı anda süzme onu izler, boşaltılınca "/" sorgusuna geri
  // döner. İki ayrı kutuya aynı anda yazan kimse yok; ama fareyle gelen
  // kullanıcı bestecide yazmak zorunda kalmasın diye ikisi de çalışıyor.
  const [panelQuery, setPanelQuery] = useState("")
  const effectiveQuery = panelQuery.trim() ? panelQuery : query

  // Seçili satır BURADA tutulur ve sorgu/sekme değişince türetilerek sıfırlanır.
  // Listenin içinde tutulduğunda iki şey bozuluyordu: ekran okuyucuya
  // duyurulacak `aria-activedescendant` yukarı çıkamıyordu ve yeni sonuç
  // kümesi tesadüfen aynı sayıda satır döndürdüğünde seçim eski satırda
  // kalıp Enter yanlış kaydı ekliyordu.
  const selKey = `${activeIdOf(tabs, tabId)}::${effectiveQuery}`
  const [sel, setSel] = useState({ key: selKey, i: 0 })
  const index = sel.key === selKey ? sel.i : 0

  // Asistan değişince sekme kümesi de değişiyor; seçili sekme artık kümede
  // yoksa ilkine düşülür. Effect yerine türetme: effect zincirleme render
  // üretirdi ve bu karar tamamen mevcut proplardan çıkarılabiliyor.
  const activeId = activeIdOf(tabs, tabId)
  const activeTab = tabs.find((x) => x.id === activeId) ?? tabs[0]

  const measure = useCallback(() => {
    const el = anchorRef?.current
    if (!el) return
    // Besteci gizlendiyse (rota değişti, dock kapandı) panel de kapanır:
    // portal document.body'de yaşıyor ve kendi başına ekranda asılı kalırdı.
    if (el.checkVisibility && !el.checkVisibility()) return onClose()
    const r = el.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) return onClose()
    // Sekmeler sarmalanıyor ve altında bir arama kutusu var: dar bir panel
    // on sekmeyi iki satıra bile sığdırmıyordu. Genişlik bestecinin
    // genişliğini AŞMAZ, çünkü panel onun altında/üstünde hizalı duruyor.
    const width = Math.min(r.width, 640)
    // Panel HANGİ TARAFTA daha çok yer varsa oraya açılır ve o tarafın
    // boşluğu kadar TAVANLANIR.
    //
    // Ölçülen yüksekliğe göre karar vermek işe yaramıyor: panele bir tavan
    // konduğu anda `offsetHeight` o tavanı okur, küçülen yükseklik bir
    // sonraki ölçümde "artık üste sığıyor" der ve panel iki taraf arasında
    // salınır. Boşluk kıyaslaması ise tamamen çapadan türüyor, yani
    // sabit.
    //
    // Sohbet düzeninde besteci en altta olduğu için üst taraf her zaman
    // açık ara geniş — davranış değişmiyor. Değişen, bestecinin ekranın
    // ortasında durduğu karşılama ekranı: panel oraya sığmıyordu ve
    // listenin altı ekranın dışında kalıyordu. Kabuk `overflow-hidden`
    // ile kilitli olduğu için o satırlara ulaşmanın hiçbir yolu yoktu.
    const spaceAbove = r.top - 12
    const spaceBelow = window.innerHeight - r.bottom - 12
    const above = spaceAbove > spaceBelow
    setPos({
      left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)),
      width,
      // Taban: iki sekme satırı + arama + birkaç satır. Bundan aşağısında
      // panel zaten okunmuyor; o daralıkta taşmasına izin vermek, hiçbir
      // şey göstermemekten iyi.
      maxHeight: Math.max(220, above ? spaceAbove : spaceBelow),
      ...(above ? { bottom: window.innerHeight - r.top + 8 } : { top: r.bottom + 8 }),
    })
  }, [anchorRef, onClose])

  useLayoutEffect(() => {
    // Ölçüm bir effect'te yapılmak ZORUNDA: konum DOM'un yerleşmiş hâlinden
    // okunuyor. Render sırasında okunsaydı besteci büyüdüğünde (mobilde 2,
    // masaüstünde 6 satıra kadar) panel eski yerinde kalırdı.
    measure()
  }, [measure, query, panelQuery, activeId])

  // Düğmeyle açıldıysa odak arama kutusuna gider: fareyle/dokunarak gelen
  // kullanıcı bestecide "/" yazmadı, yazacağı ilk şey aramadır. Klavyeyle
  // "/" yazan kullanıcıda odak besteciden ALINMAZ — cümlesini yazmaya devam
  // ediyor ve sorgu zaten oradan geliyor.
  useEffect(() => {
    if (autoFocusSearch) searchRef.current?.focus()
  }, [autoFocusSearch])

  useEffect(() => {
    // Ölçüm bir kareye BİR KEZ: kaydırma olayları saniyede onlarca kez
    // geliyor ve her biri `getBoundingClientRect` ile zorunlu yerleşim
    // tetikliyordu — 200 satırlık bir listede kaydırma takılıyordu.
    let frame = 0
    const onAny = (e) => {
      // Panelin KENDİ listesi kaydırılıyorsa panelin yeri değişmiyor.
      if (e?.target?.nodeType === 1 && panelRef.current?.contains(e.target)) return
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        measure()
      })
    }
    window.addEventListener("resize", onAny)
    window.addEventListener("scroll", onAny, true)
    // Besteci `display:none` olduğunda (rota değişimi — sohbet ekranı
    // unmount EDİLMİYOR, gizleniyor) hiçbir resize/scroll olayı gelmiyor ve
    // panel portalda ekranda asılı kalıyordu. Gözlemci o anda 0×0 kutu
    // bildiriyor, measure da kapatıyor.
    const ro = anchorRef?.current ? new ResizeObserver(() => onAny()) : null
    if (ro && anchorRef.current) ro.observe(anchorRef.current)
    // Telefonda yumuşak klavye görünen alanı kısaltıyor ve panel klavyenin
    // altında kalıyordu; `visualViewport` onu haber veren tek olay.
    window.visualViewport?.addEventListener("resize", onAny)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener("resize", onAny)
      window.removeEventListener("scroll", onAny, true)
      window.visualViewport?.removeEventListener("resize", onAny)
      ro?.disconnect()
    }
  }, [measure, anchorRef])

  // Dışarı tıklama kapatır; panelin KENDİSİNE yapılan tıklama sayılmaz.
  // Panel portalda yaşadığı için besteci ağacının dışında ve `contains`
  // kontrolü olmadan her tıklama "dışarı" görünürdü.
  useEffect(() => {
    function onDown(e) {
      if (panelRef.current?.contains(e.target)) return
      if (anchorRef?.current?.contains(e.target)) return
      onClose()
    }
    document.addEventListener("pointerdown", onDown, true)
    return () => document.removeEventListener("pointerdown", onDown, true)
  }, [anchorRef, onClose])

  // Seçili sekme şeridin dışında kalabiliyor (on sekme, dar panel): Alt+ok ile
  // gezinirken ya da tıklamayla seçilen sekme görünür alana çekilir.
  useEffect(() => {
    panelRef.current
      ?.querySelector('[role="tab"][aria-selected="true"]')
      ?.scrollIntoView({ inline: "nearest", block: "nearest" })
  }, [activeId])

  // Aktif satırın id'si besteciye çıkar (aria-activedescendant).
  useEffect(() => {
    onActiveOptionChange?.(index >= 0 ? `ref-list-${index}` : null)
    return () => onActiveOptionChange?.(null)
  }, [index, onActiveOptionChange])

  const step = useCallback(
    (delta) => {
      const i = tabs.findIndex((x) => x.id === activeId)
      const next = tabs[(i + delta + tabs.length) % tabs.length]
      if (next) setTabId(next.id)
    },
    [tabs, activeId],
  )

  useImperativeHandle(
    ref,
    () => ({
      move: (d) => bodyRef.current?.move(d),
      pick: () => bodyRef.current?.pick() ?? false,
      nextTab: () => step(1),
      prevTab: () => step(-1),
      activeOptionId: bodyRef.current?.activeId ?? null,
    }),
    [step],
  )

  if (!pos) return null

  // Panel portalda: kapsayıcı sorguları burada eşleşmiyor, ölçü panelin
  // kendi genişliği. 380 pikselin altında etiketler ve ikincil bilgi çekilir.
  const compact = pos.width < 380
  const Body = OFFICE_BODIES[activeId]
  const scopeNote = activeTab ? t(activeTab.scopeKey) : ""

  return createPortal(
    <div
      ref={panelRef}
      // Dock mobilde z-50, arkasındaki perde z-40: menü ikisinin de üstünde.
      // `data-ref-layer` panelin dışarı-tıklama muafiyeti için işaret.
      data-ref-layer=""
      style={{ position: "fixed", ...pos }}
      // `flex flex-col`: tavan devreye girdiğinde küçülecek olan LİSTE
      // olsun. Sekme şeridi, arama kutusu ve kapsam altbilgisi kendi
      // içerik yüksekliklerinin altına inemez (overflow'ları `visible`,
      // yani otomatik asgari boyutları içerik kadar); listenin overflow'u
      // ise `auto`, o yüzden asgari boyutu 0 ve daralma ona düşer.
      className="z-[60] flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-popover shadow-xl"
    >
      <div
        role="tablist"
        aria-label={t("ref.tabs")}
        // SARMALANIR, kaydırılmaz: yatay şeritte onuncu sekme ekranın
        // dışında kalıyordu ve orada bir şey olduğu hiç belli olmuyordu.
        // İki satır, gizli bir sekmeden iyidir.
        className="flex flex-wrap gap-1 border-b border-border/60 p-2"
      >
        {tabs.map((tab, i) => {
          const active = tab.id === activeId
          // İki küme birden gösterildiğinde (genel asistan) araya ince bir
          // ayraç girer: on sekmelik bir yığında hangisinin ofis hangisinin
          // ticaret olduğu ancak böyle görünüyor.
          const groupBreak = i > 0 && tabs[i - 1].group !== tab.group
          return (
            <Fragment key={tab.id}>
              {groupBreak && (
                <span aria-hidden className="mx-1 my-1 w-px self-stretch bg-border/70" />
              )}
              <button
                type="button"
                role="tab"
                aria-selected={active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setTabId(tab.id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[0.71875rem] font-medium transition-colors",
                  active
                    ? "border-brand/30 bg-brand/10 text-brand-ink"
                    : "border-transparent text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
              >
                {/* Dar panelde ikon düşer, ETİKET kalır: on sekme telefonda
                  dört satıra yayılıyordu ve ikon o satırların yarısını
                  yiyordu. Etiket olmadan hangi sekme olduğu anlaşılmıyor,
                  ikon olmadan anlaşılıyor. */}
                {!compact && (
                  <HugeiconsIcon icon={tab.icon} className="size-3.5 shrink-0" strokeWidth={1.8} />
                )}
                <span className="whitespace-nowrap">{t(tab.labelKey)}</span>
              </button>
            </Fragment>
          )
        })}
      </div>

      {/* Sekme altındaki arama: seçili sekmenin kayıtlarında metin arar.
          Fareyle gelen kullanıcı bestecideki "/" sorgusunu bilmek zorunda
          kalmasın diye var; klavye buradan da listeyi sürer (↑↓ ve Enter),
          yani odak kutuya geçtiğinde seçim yeteneği kaybolmuyor. */}
      <div className="border-b border-border/60 px-2 py-1.5">
        <div className="flex items-center gap-1.5 rounded-lg bg-foreground/[0.04] px-2 py-1.5">
          <HugeiconsIcon
            icon={Search01Icon}
            className="size-3.5 shrink-0 text-muted-foreground"
            strokeWidth={1.8}
          />
          <input
            ref={searchRef}
            value={panelQuery}
            onChange={(e) => setPanelQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.nativeEvent?.isComposing || e.keyCode === 229) return
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault()
                bodyRef.current?.move(e.key === "ArrowDown" ? 1 : -1)
                return
              }
              if (e.key === "Enter") {
                e.preventDefault()
                bodyRef.current?.pick()
                return
              }
              if (e.key === "Escape") {
                e.preventDefault()
                // Sohbet dock'u Escape'i window'da dinliyor: durdurulmazsa
                // tek basış TÜM paneli kapatır.
                e.stopPropagation()
                onClose()
              }
            }}
            placeholder={t("ref.search", { tab: activeTab ? t(activeTab.labelKey) : "" })}
            aria-label={t("ref.search", { tab: activeTab ? t(activeTab.labelKey) : "" })}
            className="min-w-0 flex-1 bg-transparent text-[0.78125rem] outline-none placeholder:text-muted-foreground/70"
          />
          {panelQuery && (
            <button
              type="button"
              aria-label={t("ref.clearSearch")}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setPanelQuery("")
                searchRef.current?.focus()
              }}
              className="grid size-4 place-items-center rounded-sm text-muted-foreground hover:text-foreground"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-3" strokeWidth={2.4} />
            </button>
          )}
        </div>
      </div>

      {/* Her sekmenin bir gövdesi var (hepsi Office kümesinden). Yine de
          koşullu: `activeId` bilinmeyen bir id'ye düşerse — sekme kümesi
          değişip saklanan id eskidiyse — boş bir panel, çöken bir panelden
          iyidir. */}
      {Body && (
        <Body
          ref={bodyRef}
          query={effectiveQuery}
          onPick={onPick}
          compact={compact}
          index={index}
          onIndexChange={(i) => setSel({ key: selKey, i })}
        />
      )}

      {/* Kapsam altbilgisi: liste neyin tamamı DEĞİL onu söyler. Yazılmazsa
          kullanıcı gördüğü listeyi "her şey" sanıyor. */}
      <div className="flex items-center justify-between gap-3 border-t border-border/60 bg-muted/30 px-3 py-1.5">
        <p className="min-w-0 flex-1 text-[0.65625rem] leading-snug text-muted-foreground">
          {scopeNote}
        </p>
        {/* Klavye ipucu yalnızca yer varken: dar panelde kapsam cümlesinin
            önüne geçiyordu ve kapsam daha önemli. */}
        {!compact && (
          <p className="shrink-0 text-[0.625rem] text-muted-foreground/70">{t("ref.keyHint")}</p>
        )}
      </div>
    </div>,
    document.body,
  )
})

export default ReferencePicker
