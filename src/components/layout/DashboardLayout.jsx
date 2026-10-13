import { lazy, Suspense, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "./Sidebar"
import { ChatDock } from "./ChatDock"
import { Header } from "./Header"
import { CommandPalette } from "@/components/common/CommandPalette"
import { WarmStart } from "@/components/chat/WarmStart"
import { primeCelebrations } from "@/hooks/useCelebrations"
import { EdgeNotch } from "./EdgeNotch"
import { MobileNotch } from "./MobileNotch"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { edgeNotchScope } from "@/lib/edgeNotchState"

// Yenilikler penceresi TEMBEL: `changelog.js` yalnız büyüyor ve doğrudan
// import etmek onu giriş paketine çivilerdi. Pencere zaten çoğu açılışta
// hiçbir şey çizmiyor.
const WhatsNewDialog = lazy(() =>
  import("@/components/changelog/WhatsNewDialog").then((m) => ({ default: m.WhatsNewDialog })),
)
import { useHotkey } from "@/hooks/useHotkey"
import { cn } from "@/lib/utils"

export function DashboardLayout({
  children,
  activeId,
  onActiveIdChange,
  onNewChat,
  // Favori bir agent'a tıklandığında sohbeti onunla açar. URL şeklini tek
  // yerde (App.jsx) tutmak için prop olarak iniyor.
  onOpenChatWithAgent,
  // The chat element, rendered here rather than among the routes so that it
  // keeps ONE parent across page / dock / hidden — see ChatDock and
  // PersistentChat.
  chatSlot,
  chatMode = "hidden",
  onCloseDock,
  onExpandChatToPage,
  onToggleDock,
}) {
  const navigate = useNavigate()
  const [searchOpen, setSearchOpen] = useState(false)
  useHotkey("mod+k", () => setSearchOpen((v) => !v))

  /**
   * Tebrikler listesini KABUK mount olurken ısıt.
   *
   * ⚠️ **SEBEP ÖLÇÜLDÜ** (2026-09-22, canlı): İK sanal entity'si 530 satırı
   * ~12 saniyede, ilk (soğuk) koşuda ~171 saniyede döndürüyor — maliyet
   * satır sayısına bağlı, aynı filtreyle 5 satır ~1,8 sn. Sayfa mount
   * olduğunda başlatılınca kullanıcı o 12 saniyeyi EKRANA BAKARAK
   * bekliyordu. Burada başlayınca bekleme, kullanıcının sayfaya gelene
   * kadar geçirdiği süreyle örtüşüyor.
   *
   * ⚠️ Bu bir HIZLANDIRMA DEĞİL, beklemenin yerini değiştirmek. Kalıcı çözüm
   * veriyi gece bir kez kopyalamaktır; o gelene kadar geçerli.
   *
   * ⚠️ Sekme başına TEK istek (modül önbelleği) ve yetkisi olmayanda hızlı
   * düşüyor — hata sessiz, ekranda bir şey değişmiyor.
   */
  useEffect(() => {
    primeCelebrations()
  }, [])

  /* ÇENTİK EKRANDA MI — üç tüketici: çentiğin kendisi, header'ın posta /
     dosya düğmeleri (çentik varken masaüstünde gizlenirler, bkz. Header) ve
     `<main>`in `data-notch`ı (sayfalar sağ kenarda 90px'lik rayın altına
     girmesin diye — bkz. `.notch-gutter`, index.css).
     Dashboard, sohbet ve Keşfet'te; rıhtım açıkken DEĞİL (sohbet kolonu sağ
     kenarı alıyor ve o hâlde header'daki düğmeler geri gelir). Geri almak:
     `notchVisible`ı false'a çivile.
     ⚠️ Keşfet 2026-09-20'de istek üzerine eklendi ("sağ çentik kısayol
     keşfet sayfasında da çıksın") ve TEK yeri burası değil: o sayfanın sağ
     rayı tam da çentiğin durduğu yerde, o yüzden `data-notch` ile bir oluk
     açılıyor. Kısayolu yeni bir sayfaya verirken o sayfanın sağ kenarında ne
     olduğuna BAKILMALI. */
  // ⚠️ mySpace 2026-09-28'de eklendi (istek: *"sağdaki çentik açıldığında
  // yeterli boşluğu bırak"*) ve sayfa kendi oluğunu `.notch-gutter` ile açıyor.
  // Pano da (`widgets`) Anasayfa'nın oluğunu (`.myspace-gutter`) kullanıyor.
  const wideNotch = useMediaQuery("(min-width: 1024px)")
  const notchVisible =
    (activeId === "dashboard" ||
      activeId === "chat" ||
      activeId === "feed" ||
      activeId === "myspace" ||
      activeId === "todo" ||
      activeId === "selfservice" ||
      activeId === "widgets") &&
    chatMode !== "dock"

  return (
    <SidebarProvider
      // h-[100dvh] + overflow-hidden caps the whole dashboard at the
      // viewport — without an UPPER bound at the top of the flex chain,
      // every `min-h-0` further down is toothless because the parent has
      // no defined height to constrain children against. The shadcn
      // primitive only sets `min-h-svh` (LOWER bound), so chat thread
      // content was growing the whole page and scrolling the body.
      // pwa:h-screen overrides to 100vh ONLY in installed standalone mode:
      // iOS miscomputes the dynamic viewport (dvh) on a freshly-launched
      // PWA's first paint → a bottom gap that only fills after a manual
      // scroll. 100vh is the static full-screen height that's correct from
      // frame one in standalone (no URL bar to track). Browser tabs keep
      // 100dvh. (Pattern verified against the tyrostrategy PWA.)
      className="bg-sidebar h-[100dvh] pwa:h-screen overflow-hidden"
      style={{
        "--sidebar-width": "15rem",
        "--sidebar-width-icon": "3rem",
      }}
    >
      {/* Yenilikler penceresi: kabukta mount edilir, sayfada değil —
          kullanıcı hangi rotaya düşerse düşsün bir kez çalışsın. Kendi
          koşullarını kendisi denetler ve çoğu açılışta hiçbir şey
          çizmez. */}
      <Suspense fallback={null}>
        <WhatsNewDialog />
      </Suspense>
      {/* Çizmez, ısıtır: kullanıcı sohbete basmadan önce SDK + belirteç +
          handshake ödensin (bkz. warmStart.js). Sayfada değil BURADA, çünkü
          kullanıcı hangi sayfaya düşerse düşsün ısınma başlamalı. */}
      <WarmStart />
      <AppSidebar
        activeId={activeId}
        onSelectActiveId={onActiveIdChange}
        onNewChat={onNewChat}
        onOpenChatWithAgent={onOpenChatWithAgent}
      />
      <SidebarInset
        className={cn(
          "bg-background overflow-hidden md:m-2 md:ml-0 md:rounded-xl md:shadow-sm md:peer-data-[state=collapsed]:ml-2 md:transition-[margin] md:duration-200 md:ease-linear",
          // PWA standalone (iOS Add-to-Home Screen): the webview takes the
          // FULL viewport including under the status bar / Dynamic Island
          // and the home indicator. Without these insets, the Header
          // disappears behind the system clock. Browser-tab visits get
          // insets=0, so nothing changes there.
          "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] md:pt-0 md:pb-0",
          // `min-h-0` so this flex-1 child cannot push the parent past its
          // bounds when nested scrollers (chat thread, settings list) have
          // taller content than the viewport. Without it, the chat header /
          // composer scroll off-screen with the page.
          "min-h-0",
        )}
      >
        <Header
          activeId={activeId}
          onOpenSearch={() => setSearchOpen(true)}
          onNavigate={navigate}
          onNewChat={onNewChat}
          onToggleDock={onToggleDock}
          dockOpen={chatMode === "dock"}
          notchVisible={notchVisible}
        />
        {/* min-h-0 here too — main is a flex-1 inside SidebarInset, same
            principle. Together with the chat root's min-h-0 (in ChatScreen)
            this makes the flex chain strictly bounded so only the chat
            scroller scrolls, never the page. */}
        {/* Row, not a single main: the chat column is a SIBLING of the page, so
            opening it shrinks the page instead of covering it. On /chat the
            page hides and the chat takes the whole area — same element, same
            position in the tree, only classes change. */}
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          {/* SAĞ KENAR ÇENTİĞİ — deneme (2026-09-20). Yalnız dashboard ve
              sohbette; rıhtım açıkken DEĞİL (sohbet kolonu sağ kenarı alıyor).
              Geri almak: bu satırı sil. */}
          {/* Genişte sağ kenar rayı, darda header çizgisinin altında yatay şerit. */}
          {notchVisible &&
            (wideNotch ? <EdgeNotch scope={edgeNotchScope(activeId)} /> : <MobileNotch />)}
          <main
            /* Çentiğin ekranda olup olmadığını SAYFAYA söyleyen tek kanal.
               Prop olarak geçirilemezdi: sayfalar `App.jsx`teki `<Routes>`
               altında çiziliyor, bu bileşenin çocuğu değil. */
            data-notch={notchVisible ? "on" : undefined}
            className={cn(
              "flex min-h-0 flex-1 flex-col overflow-hidden",
              chatMode === "page" && "hidden",
            )}
          >
            {children}
          </main>
          <ChatDock mode={chatMode} onClose={onCloseDock} onExpandToPage={onExpandChatToPage}>
            {chatSlot}
          </ChatDock>
        </div>
      </SidebarInset>
      <CommandPalette
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onNavigate={navigate}
        onNewChat={onNewChat}
      />
    </SidebarProvider>
  )
}
