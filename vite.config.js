import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { VitePWA } from "vite-plugin-pwa"
import { buildInfo } from "./scripts/vite/buildInfo.mjs"
import { iconShards } from "./scripts/vite/iconShards.mjs"

// https://vite.dev/config/
export default defineConfig(() => ({
  // GitHub Pages proje sitesi: https://tyroai.github.io/tyroAI/
  base: "/tyroAI/",
  plugins: [
    react(),
    tailwindcss(),
    buildInfo(),
    iconShards(),
    VitePWA({
      /**
       * ⚠️ **`"autoUpdate"` DEĞİL — ve bu kartın var olma şartı.**
       *
       * `useRegisterSW`in `onNeedRefresh`i yalnız servis çalışanı `waiting`
       * durumuna geçince ateşleniyor. `autoUpdate` + `skipWaiting` ikilisi
       * yeni çalışanı o duruma HİÇ sokmuyor, yani "yeni sürüm hazır" diye
       * bir an oluşmuyordu. Kart eklenecekse kapı burada açılmak zorunda.
       *
       * Karşılığı: güncelleme artık kendiliğinden geçmiyor, kullanıcı
       * kartın düğmesine basıyor. İstenen de buydu — akan bir cevabın ya da
       * yazılmakta olan bir mesajın ortasında sayfayı kendi kendine
       * yenilemek, kullanıcının işini elinden almaktı.
       */
      registerType: "prompt",
      /**
       * ⚠️ OTOMATİK ENJEKTE EDİLEN `registerSW.js` KAPATILDI: kaydı artık
       * `UpdatePrompt` yapıyor (`virtual:pwa-register/react`). İkisi birden
       * açık kalsaydı aynı çalışan iki ayrı yoldan kaydedilirdi ve
       * workbox-window kendi kurmadığı bir kurulumu "harici" sayıyor — yani
       * "yeni sürüm" olayının hangi daldan geleceği tarayıcıya göre
       * değişirdi.
       */
      injectRegister: null,
      includeAssets: ["favicon.svg", "pwa-icon.svg", "pwa-icon-maskable.svg"],
      manifest: {
        name: "tyroAI - Kurumsal AI Platformu (Demo)",
        short_name: "tyroAI",
        description:
          "tyroAI - kurumsal AI çalışma alanı. Asistanlar, AI ürünleri ve iş uygulamalarına tek bir yerden erişim. Demo ortamı, tüm veriler kurgusaldır.",
        theme_color: "#dd2a7b",
        background_color: "#0a1628",
        display: "standalone",
        orientation: "portrait",
        lang: "tr",
        scope: "/tyroAI/",
        start_url: "/tyroAI/",
        icons: [
          {
            src: "pwa-icon.svg",
            sizes: "192x192 512x512 any",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "pwa-icon-maskable.svg",
            sizes: "192x192 512x512 any",
            type: "image/svg+xml",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Answer notifications go through the service worker so they can
        // carry action buttons (Yanıtla / Kapat) — the page-level
        // Notification constructor cannot do that. A SW notification has no
        // default click behaviour, so notify-sw.js adds the click handler.
        // importScripts keeps the generateSW strategy and this whole precache
        // config untouched; no switch to injectManifest needed.
        importScripts: ["/tyroAI/notify-sw.js"],
        // ⚠️ **`**/*.js` DEĞİL.** Bu desen dist'teki HER chunk'ı ön-önbelleğe
        // koyuyordu — ikon setinin tembel parçası (5,2 MB) dahil. Yani ikonlar
        // giriş paketinden çıkarıldıktan sonra bile herkes onları ARKA PLANDA
        // indirmeye devam ederdi ve optimizasyon yalnız ilk boyamada
        // görünürdü. Kabuk için gereken chunk'lar adlarıyla yazılı; tembel
        // parçalar ilk kullanıldıklarında aşağıdaki `assets-runtime`
        // kuralıyla önbelleğe girer (adları hash'li, yani bayatlamazlar).
        //
        // `mp3` YOK: ses dosyaları (228 KB) yalnızca giriş ekranındaki orb
        // için ve giriş zaten çevrimiçi yapılıyor. Kabuk değiller; ilk
        // kullanımda ağdan gelirler.
        globPatterns: [
          "**/*.{css,html,svg,png}",
          "assets/index-*.js",
          "assets/vendor-*.js",
          "**/*-latin-*.woff2",
        ],
        /**
         * ⚠️ **AÇIKÇA `undefined` — anahtarı SİLMEK YETMİYOR.**
         *
         * vite-plugin-pwa'nın varsayılanı `"index.html"` ve kendi
         * varsayılanlarını bizimkilerin üstüne yayarak birleştiriyor; anahtar
         * yokken üretilen `sw.js`te `NavigationRoute` yine çıkıyor.
         * `null` da olmaz: workbox-build şeması alanı "isteğe bağlı STRING"
         * diye doğruluyor ve `null` düşüyor.
         *
         * ── NEDEN KAPATILIYOR ──────────────────────────────────────────
         *
         * `navigateFallback` workbox'a bir `NavigationRoute` kurduruyor ve
         * generateSW onu runtimeCaching'ten ÖNCE kaydediyor. Workbox kayıt
         * sırasına göre eşleştirdiği için aşağıdaki NetworkFirst navigasyon
         * kuralı ÖLÜ KODdu (deploy edilmiş `sw.js`te doğrulandı): her
         * navigasyon ön-önbellekteki `index.html`i alıyordu.
         *
         * Sonucu sahada görüldü (tyrotrade, aynı ayar): eski HTML sunuluyor,
         * o HTML'in bağlandığı hash'li parçalar yeni deploy'da sunucudan
         * kalkmış oluyor, uygulama hiç başlayamıyor — HTML ve CSS boyanıyor
         * ("açılır gibi oluyor"), React hiç yüklenmiyor ("boş ekran").
         * Yenilemek de kurtarmıyor, çünkü yenileme yine aynı eski HTML'i
         * getiriyor.
         */
        navigateFallback: undefined,
        runtimeCaching: [
          {
            // Hash'li varlıklar değişmezdir: bir kez indirilir, sonsuza kadar
            // önbellekten okunur. Yeni deploy yeni hash demek, yani bayat
            // sürüm diye bir şey olmuyor; eski kayıtları `expiration`
            // temizler. Ön-önbellek daraltıldığı için ÇEVRİMDIŞI davranışı
            // ayakta tutan kural budur.
            urlPattern: ({ url, request }) =>
              url.origin === self.location.origin &&
              url.pathname.startsWith("/tyroAI/assets/") &&
              (request.destination === "script" || request.destination === "style"),
            handler: "CacheFirst",
            options: {
              cacheName: "tyro-assets-runtime",
              // ⚠️ **80 DEĞİL 300** (≈ üç sürüm). tyrotrade'de tek bir
              // derleme 84 parça üretiyordu ve tavan 80'di: sürüm KENDİ
              // parçalarını kendisi atıyordu. Bizde bir derleme bugün 27
              // parça, yani tek sürüm sığıyor — ama üç sürüm sonra 81'e
              // çıkıp aynı yere geliyor. Bu sayıyı düşürmek isteyen, önce
              // `ls dist/assets/*.{js,css} | wc -l` çalıştırmak zorunda.
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // ⚠️ Bu kural bugüne kadar ÖLÜ KODDU (yukarıdaki
            // `navigateFallback` gerekçesine bak). Artık gerçekten çalışıyor:
            // dönen kullanıcı HER ZAMAN bugünün HTML'ini alıyor, ağ 3 saniyede
            // cevap vermezse önbellekteki son sürüme düşüyor.
            //
            // ⚠️ AUTH DÖNÜŞÜ KURALA HİÇ GİRMİYOR (eski `navigateFallbackDenylist`in
            // yerini bu alıyor): eşleşmeyen bir istek servis çalışanından
            // geçmez, doğrudan ağdan gelir. MSAL'ın cevabını önbellekten
            // sunmak, satır içi köprü betiğinin eski sürümünü çalıştırmak
            // demekti.
            urlPattern: ({ request, url }) =>
              request.mode === "navigate" && !/(^|&|\?)(code|error|state)=/.test(url.search),
            handler: "NetworkFirst",
            options: {
              cacheName: "tyro-html",
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 8 },
            },
          },
        ],
        cleanupOutdatedCaches: true,
        /**
         * ⚠️ **İKİSİ DE `false` OLDU** ve ikisinin de ayrı gerekçesi var.
         *
         * `skipWaiting: true` iken yeni çalışan `waiting` durumuna HİÇ
         * girmiyor; `useRegisterSW`in `onNeedRefresh`i ise yalnız o olayla
         * ateşleniyor — yani "yeni sürüm hazır" kartı asla çıkamazdı.
         *
         * İkincisi daha sinsi: erken etkinleşen çalışan
         * `cleanupOutdatedCaches` ile ESKİ ön-önbelleği siliyor ve bunu
         * ESKİ kodu koşturan AÇIK bir sekmenin altından yapıyor. O sekme
         * tembel bir parçayı (ör. Ayarlar sayfası) ilk kez istediğinde
         * dosya ne sunucuda ne önbellekte kalıyor.
         *
         * Güncelleme artık kullanıcının düğmesiyle geçiyor
         * (`updateServiceWorker(true)`), yani kontrol onda.
         */
        skipWaiting: false,
        clientsClaim: false,
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MiB — current main bundle ~6.6 MiB
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
}))
