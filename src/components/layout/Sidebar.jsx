import AiChat02Icon from "@hugeicons/core-free-icons/AiChat02Icon"
import AiArtIcon from "@hugeicons/core-free-icons/AiArtIcon"
import DashboardSquare01Icon from "@hugeicons/core-free-icons/DashboardSquare01Icon"
import TaskDone01Icon from "@hugeicons/core-free-icons/TaskDone01Icon"
import UserAccountIcon from "@hugeicons/core-free-icons/UserAccountIcon"
import { useEffect } from "react"
import { useLocation } from "react-router-dom"
import { usePageAccess } from "@/hooks/usePageAccess"
import { DashboardSquare01Icon as AnimatedDashboardIcon } from "@/components/ui/dashboard-square-01"
import { toast } from "sonner"
import { placeToastStack } from "@/lib/toastAvoid"
import { motion } from "motion/react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar"
import { TyroLogo } from "@/components/brand/TyroLogo"
import { BrandText } from "@/components/brand/BrandText"
import { NavMain } from "./NavMain"
import { NavApps } from "./NavApps"
import { NavFavorites } from "./NavFavorites"
import { NavUser } from "./NavUser"
import { useLocale } from "@/hooks/useLocale"
import { useUnreadChangelog } from "@/hooks/useUnreadChangelog"

// M365 Copilot bağlantısı bu menüde değil, `HeaderSearch` ve `CommandPalette`'te.
// `handleSelect` hem `showConstructionToast` hem de harici (`isExternal` + `href`,
// routera girmeden yeni sekme) girdileri karşılıyor.
//
// ⚠️ SIRA: Anasayfa · Self Servis · Keşfet · To-Do · Chat — komut paleti ve
// header araması aynı sırayı izler. Çözümler (`/dashboard`) bu menüde değil,
// profil menüsünde (`NavUser`, Profilim'in altı).
const navMain = [
  // Anasayfa (eski adıyla Akışım) — açılış sayfası ve listenin başı.
  // ⚠️ İkon `Orbit01` (istek: *"çok daha güzel minimal uygun bir ikon"*):
  // sayfanın merkezi küre ve bu glif ona bakıyor; komşu üç ikonla aynı görsel
  // ağırlıkta. Güneş-ay elendi (tema düğmesinin dili, "görünüm ayarı" diye
  // okunurdu), gün doğumu 20px'te ince ve alta yaslı kaldı. Arama ve komut
  // paleti AYNI glifi taşıyor — üç yüzey ayrışmasın.
  {
    id: "myspace",
    labelKey: "nav.myspace",
    icon: DashboardSquare01Icon,
    // Üzerine gelince kutucuklar sırayla yerine oturur (hugeicons-animated).
    animatedIcon: AnimatedDashboardIcon,
    ready: true,
  },
  // Self Servis: izin, masraf ve iş avansı kayıtları (ERP) — Anasayfa'nın hemen altında.
  { id: "selfservice", labelKey: "nav.selfService", icon: UserAccountIcon, ready: true },
  // Keşfet — Chat'ten ÖNCE (istek üzerine, 2026-09-20: önce "Chat'in altına",
  // aynı gün "Chat'ten önce gelsin"). Sıra bir niyet ifadesi: uygulamaya giren
  // kişi önce şirkette ne olduğunu görüyor, sonra bir iş için asistana gidiyor.
  //
  // `badge: "feed"` GENEL bir kapı: rozet kaynağını NavMain seçiyor, satır
  // yalnız "benim bir rozetim var" diyor. Öncesinde koşul `item.id === "chat"`
  // diye SABİT kodluydu ve ikinci bir rozet için ikinci bir sabit dal
  // gerekirdi.
  //
  // ⚠️ Kapalıyken satır HİÇ çizilmez — politika dosyasının "tek satır" sözü.
  // Kapısı çizimde (`visibleNav`): şalter + kitle, kişiye göre.
  { id: "feed", labelKey: "nav.feed", icon: AiArtIcon, ready: true, badge: "feed" },
  // To-Do (istek, 2026-09-30: *"sidebar'da To-Do ismiyle, İngilizce-Türkçe
  // aynı"*). Anasayfa'nın "Bugünün odağı" bu sayfanın BUGÜN görünümü.
  { id: "todo", labelKey: "nav.todo", icon: TaskDone01Icon, ready: true },
  { id: "chat", labelKey: "nav.chat", icon: AiChat02Icon, ready: true },
]

function showComingSoon(label, t) {
  placeToastStack()
  toast.custom(
    (id) => (
      <motion.div
        initial={{ opacity: 0, y: 56, scale: 0.88 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 360, damping: 22, mass: 0.9 }}
        className="pointer-events-auto flex w-[min(440px,calc(100vw-2rem))] items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-2xl ring-1 ring-brand/15 sm:gap-4 sm:p-5"
      >
        <motion.div
          initial={{ rotate: -25, scale: 0.6 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 14, delay: 0.06 }}
          className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-from via-brand-via to-brand-to text-brand-on-brand shadow-md"
        >
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
              strokeLinecap="round"
            />
          </svg>
        </motion.div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold leading-tight">
            {t("construction.title").replace("{label}", label)}
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground leading-snug">
            {t("construction.body")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => toast.dismiss(id)}
          className="rounded-md px-2 py-1 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          {t("construction.dismiss")}
        </button>
      </motion.div>
    ),
    { duration: 5000 },
  )
}

export function AppSidebar({
  activeId,
  onSelectActiveId,
  onNewChat,
  onOpenChatWithAgent,
  ...props
}) {
  const { t } = useLocale()
  const { isMobile, setOpenMobile } = useSidebar()
  const unreadChangelog = useUnreadChangelog()
  const location = useLocation()

  // Telefonda çekmece, sayfa değişince kapanır — menüden (profil menüsü, Yenilikler satırı…)
  // gelen her geçiş için tek kural; aksi hâlde sayfa arkada açılıyor, çekmece önde kalıyordu.
  useEffect(() => {
    if (isMobile) setOpenMobile(false)
  }, [location.pathname, location.search, isMobile, setOpenMobile])
  // Güvenlik satırının kapısı. KATI `=== true`: çözülmemiş üyelik cevabı
  // yönetici sayılmaz (fail-closed).

  // Keşfet ve Akışım kitlesi daraltılmış iki sayfa (`lib/pageAccess.js`).
  // Kapalıyken satır HİÇ çizilmez: açılamayan bir sayfaya giden satır yalan
  // söylerdi. Rota da AYNI kararla yönlendiriyor, yani ikisi ayrışamaz.
  const access = usePageAccess()
  const visibleNav = navMain.filter(
    (item) =>
      (item.id !== "feed" || access.feed) &&
      (item.id !== "myspace" || access.myspace) &&
      (item.id !== "todo" || access.todo) &&
      (item.id !== "selfservice" || access.selfService),
  )

  const handleSelect = (item) => {
    // External items (e.g. Copilot) live outside TYRO — open in a new tab
    // and bypass the router entirely. Intentionally we do NOT call
    // onSelectActiveId, so the breadcrumb + left brand stripe stay on the
    // page the user was on (you didn't navigate inside the SPA).
    if (item.isExternal && item.href) {
      window.open(item.href, "_blank", "noopener,noreferrer")
      if (isMobile) setOpenMobile(false)
      return
    }
    if (item.ready) {
      onSelectActiveId?.(item.id)
      if (item.showConstructionToast) showComingSoon(t(item.labelKey), t)
      // On mobile the sidebar is a sheet — dismiss it after a nav selection
      // so the destination page is fully visible. Material spec + iOS HIG
      // both prescribe this. The setOpenMobile is a no-op on desktop.
      if (isMobile) setOpenMobile(false)
      return
    }
    showComingSoon(t(item.labelKey), t)
    if (isMobile) setOpenMobile(false)
  }

  // ⚠️ YENİLİKLER ARTIK KULLANICI MENÜSÜNDE, YARDIM'IN ALTINDA (2026-09-29,
  // istek: *"yenilik mini kartını profil menüsü içine al; yenilik sayısı
  // varsa profil avatarının üstünde göster"*). 2026-09-10'dan beri sidebar'ın
  // dibinde bir KARTTI (`SidebarWhatsNew`) ve gerekçesi "sayaç, görmek için
  // menü açmak gereken yerde işe yaramaz" idi; o itirazı artık avatarın
  // rozeti karşılıyor — sayı avatarda, hangi satırda olduğu menüde. Kart
  // bileşenleri (`SidebarWhatsNew`, `changelog/card/*`) DURUYOR ama
  // çizilmiyor: geri almak buraya tek satır + Tercihler'deki seçici.
  // ⚠️ **İKİNCİL ŞERİT BOŞALDI — BİLEŞENİ DE ÇİZİLMİYOR.** İçindeki tek
  // satır Ayarlar'dı ve Ayarlar sayfası kalmadı (her şey Profilim'de, bkz.
  // `ProfilePage`); Profil'e kullanıcı kartından ve aramadan gidiliyor.
  // tyroTrade'in sidebar'ında da bu şerit yok. Liste ve `NavSecondary`
  // git geçmişinde; yeni bir ikincil satır gerekirse ikisi birlikte döner.
  // ⚠️ Bu şeritte bir zamanlar GÜVENLİK de vardı (2026-09-11'de avatar
  // menüsüne taşındı) ve YENİLİKLER de (altta KART oldu — `SidebarWhatsNew`;
  // daraltılmış kipte kart sığmadığı için orada satırın eşi bir düğme çıkar,
  // onu da o bileşen kendisi kuruyor).

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault()
            onSelectActiveId?.("myspace")
            if (isMobile) setOpenMobile(false)
          }}
          className="flex items-center gap-1.5 py-2 pl-[0.1875rem] pr-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          <TyroLogo size={28} className="size-7 shrink-0" />
          <BrandText className="overflow-hidden whitespace-nowrap transition-[opacity,max-width] duration-200 ease-linear group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0 max-w-[12.5rem] opacity-100" />
        </a>
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={visibleNav}
          activeId={activeId}
          onSelect={handleSelect}
          onQuickAction={onNewChat}
        />
        {/* Sohbetin hemen altında: favoriler kullanıcının kendi kısayol
            listesi, uygulama katalogundan (NavApps) önce gelir. */}
        <NavFavorites onOpenChat={onOpenChatWithAgent} />
        <NavApps />
        {/* ⚠️ **DİP BLOK KAYDIRMADA YERİNDE KALIR** (`sticky bottom-0`) ve
            bugün yalnız bir AYRAÇ taşıyor. Yenilikler kartı buradaydı
            (2026-09-10 → 2026-09-29) ve blok onun için yapışkandı: AI listesi
            "Daha fazla göster" ile açılınca kart kayıp görünmez oluyordu.
            Kart kullanıcı menüsüne taşındı; ayraç liste ile avatar satırını
            ayırıyor ve yapışkanlık onu da dipte tutuyor.

            `mt-auto` KALIYOR ve ikisi çelişmiyor: içerik kısayken `mt-auto`
            bloğu dibe iter, uzunken `sticky` onu dipte tutar.

            ⚠️ ZEMİN ŞART: yapışkan blok saydam kalsaydı altından kayan menü
            satırları ayracın içinden geçerdi. `bg-sidebar` kabın kendi zemini.
            `z-10` de şart — aynı yığın bağlamında sonra gelen kardeşler yoksa
            üste biner. */}
        <div className="sticky bottom-0 z-10 mt-auto bg-sidebar">
          {/* Ayraç: liste ile alttaki avatar satırı arasında; daraltılmış
              kipte çizilmez. Dikey boşluk 6px (my-0.5): sidebar'ın son
              pikselleri bir kaydırma şeridine dönüşmesin diye dar tutuldu.
              Telif metni `appMeta.js`te YERİNDE; bileşen git geçmişinde. */}
          <div
            aria-hidden="true"
            className="mx-3 my-0.5 h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent group-data-[collapsible=icon]:hidden"
          />
        </div>
      </SidebarContent>
      <SidebarFooter>
        {/* Yenilik sayısı avatarın rozetinde ve menünün Yenilikler satırında
            (2026-09-29 — kart sidebar'dan menüye taşındı). */}
        <NavUser unreadChangelog={unreadChangelog} />
      </SidebarFooter>
    </Sidebar>
  )
}
