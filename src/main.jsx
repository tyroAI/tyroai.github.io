// ⚠️ DOSYANIN İLK SATIRI, ve ESM importlarından ÖNCE yazılmış olması
// yetmiyor — importlar hoist ediliyor, yani bu satıra gelinmesi "bütün
// bağımlılıklar indi ve çalıştı" demek. Açılış bekçisinin (index.html)
// beklediği işaret tam olarak bu: giriş modülü GERÇEKTEN koştu mu.
window.__TYRO_BOOT__ = 1

// DEMO: ağ katmanı her şeyden ÖNCE kurulur — dış dünyaya giden istek yok.
import { demoReady } from "@/demo/install"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { MsalProvider } from "@azure/msal-react"
import "@fontsource/kanit/700.css"
import "./index.css"
// generative-loaders ships its own stylesheet; the package renders nothing
// without it. After index.css so our tokens win any collision.
import "generative-loaders/styles.css"
import App from "./App.jsx"
import { msalInstance, ensureMsalInitialized } from "@/lib/msal"
import { onNotificationAction } from "@/lib/notify/browserNotify"
import { requestOpenChat } from "@/lib/chatBus"
import { applyCacheMigration } from "@/lib/cacheMigration"
import { ThemeProvider } from "@/providers/ThemeProvider"
import { LocaleProvider } from "@/providers/LocaleProvider"
import { PaletteProvider } from "@/providers/PaletteProvider"
import { ConfigProvider } from "@/providers/ConfigProvider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ErrorBoundary } from "@/components/common/ErrorBoundary"
import { loadDictionary, savedLocale } from "@/lib/i18nDictionaries"

// BASE_URL: GitHub Pages kökü ("/").
const basename = import.meta.env.BASE_URL.replace(/\/$/, "") || "/"

{
  // BEFORE React reads localStorage: one-time cleanup of agent logos the old
  // Copilot `bot` table fetch left in the config cache. See the module — the
  // fetch is gone, but its output would otherwise keep rendering from cache.
  applyCacheMigration()

  // Answer-notification buttons. A service-worker notification has no default
  // click behaviour: notify-sw.js focuses this tab and posts the chosen action
  // here, and this turns it into the same in-app "open the chat" signal the
  // toast uses. Registered at boot, outside React, so it works whatever screen
  // happens to be mounted when the click arrives.
  onNotificationAction((action) => requestOpenChat({ focusComposer: action === "reply" }))

  // bfcache: sessiz SSO turunu başlatan belge HİÇ çizilmedi (#root boş) ama
  // oturum geçmişinde duruyor. Geri düğmesi onu olduğu gibi geri
  // yükleyebilir — modül betikleri bfcache dönüşünde YENİDEN ÇALIŞMAZ — ve
  // ekranda kalıcı bir beyaz sayfa kalır. Yeniden yüklüyoruz; sekme başına
  // tek deneme işareti (sessionStorage) bu yenilemenin turu tekrar
  // tetiklemesini imkânsız kılıyor.
  window.addEventListener("pageshow", (e) => {
    if (e.persisted && !document.getElementById("root")?.hasChildNodes()) {
      window.location.reload()
    }
  })

  // Kayıtlı dilin sözlüğü MSAL açılışıyla paralel iner; çizim onu bekler (Türkçe yanıp
  // sönmesin). İnemezse Türkçe çizilir, dil sağlayıcısı sonra yeniden dener.
  const dictionaryReady = loadDictionary(savedLocale()).catch(() => null)
  const start = () => dictionaryReady.then(renderApp)

  let rendered = false
  function renderApp() {
    if (rendered) return // bir throw'dan sonra ikinci kez createRoot olmasın
    rendered = true
    createRoot(document.getElementById("root")).render(
      <StrictMode>
        {/* Son savunma: sağlayıcılar dahil her şey; panel router ve dil olmadan da çizilir. */}
        <ErrorBoundary scope="app">
          <BrowserRouter basename={basename}>
            <MsalProvider instance={msalInstance}>
              <ThemeProvider>
                <PaletteProvider>
                  <LocaleProvider>
                    <ConfigProvider>
                      <TooltipProvider delayDuration={150}>
                        <App />
                      </TooltipProvider>
                    </ConfigProvider>
                  </LocaleProvider>
                </PaletteProvider>
              </ThemeProvider>
            </MsalProvider>
          </BrowserRouter>
        </ErrorBoundary>
      </StrictMode>,
    )
    // Açılış bekçisinin sayaçlarını durdur (bkz. index.html): buraya
    // gelindiyse React kök ağacı gerçekten monte edildi.
    window.__tyroBootOk?.()
  }

  // DEMO: sessiz SSO ve oturum yoklaması yok — sahte örnek hemen hazır.
  demoReady
    .then(() => ensureMsalInitialized())
    .catch((err) => console.warn("[boot] unexpected failure:", err?.message || err))
    .then(start)
}
