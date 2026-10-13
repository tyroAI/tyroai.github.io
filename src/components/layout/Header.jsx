import { useEffect, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon"
import SidebarLeftIcon from "@hugeicons/core-free-icons/SidebarLeftIcon"
import Robot01Icon from "@hugeicons/core-free-icons/Robot01Icon"
import { useAnimatedIcon } from "@/hooks/useAnimatedIcon"
import { useSidebar } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { BrandText } from "@/components/brand/BrandText"
import { HeaderSearch } from "@/components/common/HeaderSearch"
import { BoardEditToggle } from "./BoardEditToggle"
import { HeaderToolsMenu } from "./HeaderToolsMenu"
import { FilesPopover } from "@/components/common/FilesPopover"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { MailPopover } from "@/components/common/MailPopover"
import { CalendarPopover } from "@/components/common/CalendarPopover"
import { onPanelRequest } from "@/lib/panelBus"
import { SpecialDaysPopover } from "@/components/common/SpecialDaysPopover"
import { WorldClockButton } from "@/components/worldclock/WorldClockButton"
import { HeaderCalendarButton } from "./HeaderCalendarButton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Robot01Icon as AnimatedRobotIcon } from "@/components/ui/robot-01"
import { useIsMobile } from "@/hooks/use-mobile"
import { useLocale } from "@/hooks/useLocale"
import { usePageAccess } from "@/hooks/usePageAccess"
import { cn } from "@/lib/utils"

function PremiumSidebarTrigger() {
  const { toggleSidebar } = useSidebar()
  const { t } = useLocale()
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      data-tour="nav-trigger"
      aria-label={t("nav.toggleSidebar")}
      className="-ml-1 size-9 shrink-0 rounded-xl [&_svg]:!size-5 text-muted-foreground hover:text-foreground relative pointer-coarse:after:absolute pointer-coarse:after:-inset-1"
    >
      <HugeiconsIcon icon={SidebarLeftIcon} />
    </Button>
  )
}

const PAGE_LABEL_KEY = {
  dashboard: "nav.dashboard",
  chat: "nav.chat",
  feed: "nav.feed",
  myspace: "nav.myspace",
  todo: "nav.todo",
  selfservice: "nav.selfService",
  widgets: "nav.widgets",
  settings: "nav.settings",
  help: "nav.help",
  profile: "nav.profile",
  // ⚠️ Bu ikisi EKSİKTİ: /security ve /whats-new açıkken başlık "Dashboard"
  // yazıyordu — yani ekranın söylediği yer ile bulunulan yer farklıydı.
  security: "nav.security",
  "whats-new": "nav.whatsNew",
}

export function Header({
  activeId = "myspace",
  onOpenSearch,
  onNavigate,
  onNewChat,
  onToggleDock,
  dockOpen,
  notchVisible = false,
}) {
  const [filesOpen, setFilesOpen] = useState(false)
  /* Posta, takvim ve dosyalar ÇENTİKTE: çentik ekrandayken header'da bu üç düğme yok — genişte
     sağ kenar rayı, darda header çizgisinin altındaki yatay şerit (`MobileNotch`); header her
     genişlikte aynı (dünya saati · özel günler · TYRO). Çentik yalnız dashboard, sohbet,
     Keşfet, To-Do ve Anasayfa/Pano'da ve rıhtım kapalıyken var; Ayarlar/Profil gibi
     sayfalarda ve rıhtım açıkken düğmeler header'da kalır, yoksa posta ve dosyalara hiçbir
     yerden ulaşılamazdı. Ayrıntı: docs/features/sag-centik.md. */
  const wide = useMediaQuery("(min-width: 1024px)")
  const notchOnScreen = notchVisible
  // Sayfadan gelen panel isteği (`lib/panelBus`): çentik ekranda değilken
  // posta ve takvim burada çiziliyor, yani isteği de burası üstlenir.
  const [mailOpen, setMailOpen] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  useEffect(() => {
    if (notchOnScreen) return undefined
    const offMail = onPanelRequest("mail", () => {
      setMailOpen(true)
      return true
    })
    const offCalendar = onPanelRequest("calendar", () => {
      setCalendarOpen(true)
      return true
    })
    return () => {
      offMail()
      offCalendar()
    }
  }, [notchOnScreen])
  const { t } = useLocale()
  const pageAccess = usePageAccess()
  const { icon: tyroIcon, hoverProps: tyroHover } = useAnimatedIcon({
    icon: Robot01Icon,
    animatedIcon: AnimatedRobotIcon,
  })
  const pageLabelKey = PAGE_LABEL_KEY[activeId] ?? "nav.myspace"
  const mobile = useIsMobile()
  // Widget düzenleme: Pano'da ve (kitlesi içindeysen) Anasayfa'da. Telefonda Araçlar
  // menüsünde — satıra sekizinci düğme sığmıyor, sohbet hapı ekranın dışına taşıyordu.
  const editToggle = (activeId === "widgets" ||
    (activeId === "myspace" && pageAccess.homeEdit)) && (
    <BoardEditToggle labelKey={activeId === "myspace" ? "header.editHome" : "header.editBoard"} />
  )
  const toolItems = [
    ...(notchOnScreen
      ? []
      : [{ id: "files", node: <FilesPopover open={filesOpen} onOpenChange={setFilesOpen} /> }]),
    ...(mobile && editToggle ? [{ id: "edit", node: editToggle }] : []),
  ]

  return (
    <header
      data-slot="app-header"
      className="group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-14 pwa:h-11 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      {/* Dar ekranda boşluklar daralır: kontroller arasında gap-3 tek başına
          ~84px yer tutuyor ve dosya/posta/takvim düğmeleri geldikten sonra
          360px'te satır taşıyor. Kontrol saklamak yerine aradaki boşluğu
          almak, hiçbir işlevi gizlemeden yeri açıyor. */}
      <div className="flex w-full items-center gap-1.5 px-3 pb-px sm:gap-3 sm:px-4 lg:px-6">
        <PremiumSidebarTrigger />

        <span className="h-5 w-px shrink-0 bg-border/70 rounded-full" aria-hidden="true" />

        <Breadcrumb className="min-w-0">
          {/* Marka yalnız geniş ekranda: tablet dikeyde (kenar çubuğu açık, logo orada) "tyroAI ›"
              sığmıyor ve başlık iki satıra kırılıyordu. */}
          <BreadcrumbList className="min-w-0 flex-nowrap text-sm">
            <BreadcrumbItem className="hidden lg:flex items-center">
              <a href="#" className="hover:opacity-80 transition-opacity">
                <BrandText className="text-sm" />
              </a>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden lg:block [&>svg]:size-3.5 text-muted-foreground/60" />
            <BreadcrumbItem>
              <BreadcrumbPage className="truncate font-medium">{t(pageLabelKey)}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <HeaderSearch onNavigate={onNavigate} onNewChat={onNewChat} />

        <button
          type="button"
          onClick={onOpenSearch}
          data-tour="search"
          aria-label={t("header.searchAria")}
          className="ml-auto sm:hidden grid shrink-0 place-items-center size-10 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition relative pointer-coarse:after:absolute pointer-coarse:after:-inset-0.5"
        >
          <HugeiconsIcon icon={Search01Icon} className="size-5" />
        </button>

        {/* ⚠️ DÖRT ARAÇ TEK DÜĞMENİN ALTINDA — açılan "gooey" yelpaze.
            Tema · Palet · Dil · Dosyalar artık satırda tek tek durmuyor
            (Dosyalar çentik ekrandayken hiç yok — üstteki not);
            başlık satırı bu dördünü taşırken dar ekranda taşıyordu ve asıl
            iş düğmeleri (posta, takvim, TYRO) sıkışıyordu.

            ⚠️ "⋯" MENÜSÜ SÖKÜLDÜ: tek işi telefonda tema/palet/dil üçlüsünü
            saklamaktı ve artık dördü de HER boyutta bu menünün içinde. Aynı
            üç bileşen iki kez basılmıyor, yani kopya durum da kalmadı. */}
        {/* Araçlar: tema/palet/dil kullanıcı menüsüne taşındı; geriye Dosyalar (çentik ekranda
            değilken) ve telefonda düzenleme kalıyor. Tek öğe kaldıysa yelpaze yerine doğrudan. */}
        {toolItems.length > 1 ? (
          <HeaderToolsMenu className="ml-auto sm:ml-0" items={toolItems} />
        ) : toolItems.length === 1 ? (
          <span className="ml-auto flex shrink-0 sm:ml-0">{toolItems[0].node}</span>
        ) : null}
        {/* Posta → Takvim. İkisi de aynı kalıbın yüzeyi (bkz. src/lib/graph.js):
            sessiz token, "izin yok" ile "veri yok"un ayrı durumları, ve
            panelden TYRO'ya soru park etme. Takvim düğmesi DateTimePill'in
            kendisidir — tarih hapı panelin tetikleyicisi. */}
        {!notchOnScreen && <MailPopover open={mailOpen} onOpenChange={setMailOpen} />}
        {/* TARİH HAPI: genişte ve çentik ekrandayken özel günleri açar; takvim çentikte (ya da
            çentik yokken genişte kendi düğmesinde). Dar ekranda çentik yokken (Ayarlar/Profil,
            rıhtım açık) hap eskisi gibi ajandayı açar — takvime ulaşılabilsin. */}
        {/* Widget düzenleme kipi — Pano'da ve (kitlesi içindeysen) Anasayfa'da: dünya
            saatinin solunda (sayfada ayrı bir "Düzenle" satırı yok). */}
        {!mobile && editToggle}
        {/* Dünya saati her boyutta; geniş masaüstünde yerel saat ve tarih yanında (bildirim ayrı). */}
        <WorldClockButton showClock={wide} />
        {wide || notchOnScreen ? (
          <>
            {!notchOnScreen && (
              <CalendarPopover
                trigger={<HeaderCalendarButton label={t("header.calendar")} />}
                open={calendarOpen}
                onOpenChange={setCalendarOpen}
              />
            )}
            <SpecialDaysPopover />
          </>
        ) : (
          <CalendarPopover open={calendarOpen} onOpenChange={setCalendarOpen} />
        )}
        {/* Sohbeti sayfanın YANINDA açar. Sidebar'daki Sohbet girdisi hâlâ tam
            sayfaya gider — iki farklı niyet: "bunu okurken asistanla çalış" ve
            "konuşmaya git".

            Satırın sonunda ve buradaki tek DOLU kontrol: header'ın birincil
            eylemi. Dolgu palet token'larından, yani seçilen paleti takip
            ediyor.

            Hap her zaman marka renkli olduğu için "açık" durumu renkle
            verilemiyor; onun yerine bir halka.

            ⚠️ YALNIZ İKON (2026-09-28, istek: *"TYRO yazısını sil, sadece
            ikon kalsın"*). Görünen etiket gidince adı `aria-label` taşıyor —
            zaten oradaydı — ve fare için ipucu balonu. Hap daireye döndü;
            boyu yanındaki 36px'lik düğmelerden yine bilerek kısa (dolu bir
            daire, kontur bir gliften ağır okunuyor). */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              aria-label={t("chatDock.toggle")}
              aria-pressed={dockOpen}
              onClick={onToggleDock}
              {...tyroHover}
              className={cn(
                // Yanındaki 36px'lik ikon düğmelerinden bilerek kısa: dolu bir
                // hap zaten kontur bir glife göre daha ağır okunuyor, aynı
                // yüksekliğe çıkarınca satırın en gürültülü öğesi oluyordu.
                // ⚠️ `max(2rem,28px)`: alçak pencerede kök yazı 12,8px'e iniyor
                // (bkz. index.css yoğunluk bloğu) ve `h-8` o zaman 25,6px
                // oluyor — dokunma hedefinin altı. Hap 28'de durur; 16px kökte
                // boy birebir eskisi.
                "size-8 shrink-0 rounded-full p-0 [&_svg]:!size-[1.125rem] [min-height:max(2rem,28px)] [min-width:max(2rem,28px)]",
                // Dokunmatikte görünmez pay: 32 px hap 44 px'lik hedef olur, satır taşmaz.
                "relative pointer-coarse:after:absolute pointer-coarse:after:-inset-1.5",
                // Dashboard'daki AI asistan rozetlerinin ta kendisi olan dolgu,
                // yani asistan iki yerde de aynı şey gibi okunuyor.
                // `border-0` ŞART: Button'ın tabanı `border border-transparent`
                // + `bg-clip-padding` taşıyor, yani dolgu o 1px kenarlığın
                // ALTINA boyanmıyor ve arkadaki header oradan sızıyor — halka
                // hemen dışına oturduğunda bu, hapı çevreleyen beyaz bir çizgi
                // olarak okunuyor.
                "border-0 bg-gradient-to-br from-brand-from via-brand-via to-brand-to text-brand-on-brand",
                "shadow-sm transition hover:brightness-110 hover:text-brand-on-brand",
                // Halka hapa DOĞRUDAN yaslanır: `ring-offset-1` araya
                // `--background` renginde 1px koyuyor ve açık temada bu, hapı
                // çevreleyen beyaz bir çizgi gibi okunuyor.
                dockOpen && "ring-2 ring-brand/45",
              )}
            >
              {tyroIcon}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("chatDock.toggle")}</TooltipContent>
        </Tooltip>
      </div>
    </header>
  )
}
