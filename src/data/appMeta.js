import pkg from "../../package.json"

export const appMeta = {
  name: "tyroAI",
  brand: "tyroAI · TTECH Business Solutions",
  parent: "Vega Global (demo)",
  version: pkg.version || "0.0.0",
  releaseDate: "2026",
  stack: ["React 19", "Vite 8", "Tailwind v4", "shadcn/ui"],
  iconLibrary: "Hugeicons",
}

export const localStorageRegistry = [
  {
    key: "tyro-theme",
    labelKey: "settings.general.storage.theme",
    descriptionKey: "settings.general.storage.themeDescription",
  },
  {
    key: "tyro-palette",
    labelKey: "settings.general.storage.palette",
    descriptionKey: "settings.general.storage.paletteDescription",
  },
  {
    key: "tyro-locale",
    labelKey: "settings.general.storage.locale",
    descriptionKey: "settings.general.storage.localeDescription",
  },
  {
    key: "tyro-config-v1",
    labelKey: "settings.general.storage.config",
    descriptionKey: "settings.general.storage.configDescription",
  },
  {
    key: "tyro-favorites-v1",
    labelKey: "settings.general.storage.favorites",
    descriptionKey: "settings.general.storage.favoritesDescription",
  },
  {
    key: "tyro-prompt-favorites-v1",
    labelKey: "settings.general.storage.promptFavorites",
    descriptionKey: "settings.general.storage.promptFavoritesDescription",
  },
  // ⚠️ Gündem Akışının SAKLADIĞI TEK ŞEY bir ISO zaman damgası — gönderi
  // kimliği, konusu ya da göndereni DEĞİL (akış önbellekleri yalnız bellekte,
  // gerekçesi useFeedPosts.js'te). Silinmesi zararsız: rozet bir kez akışın
  // tamamını "yeni" sayar, sonra kendini toparlar. Bu yüzden listede yeri var
  // — "Tümünü temizle" burada hiçbir işi yakmıyor.
  {
    key: "tyro-feed-seen-v1",
    labelKey: "settings.general.storage.feedSeen",
    descriptionKey: "settings.general.storage.feedSeenDescription",
  },
  // Anasayfa turunun görüldüğü an — bir zaman damgası. Silinirse tur bir
  // sonraki ziyarette yeniden açılır; başka bir şey kaybolmaz.
  {
    key: "tyro-myspace-tour-v2",
    labelKey: "settings.general.storage.myspaceTour",
    descriptionKey: "settings.general.storage.myspaceTourDescription",
  },
  // ⚠️ Tebrikler listesi BAŞKALARININ verisi, o yüzden envanterde yeri var:
  // "Tümünü temizle" onu gerçekten silmeli. Yazılan şey ad · ünvan · doğum
  // gününün GÜN-AYı · işe giriş yılı — doğum YILI yok. 12 saatte bir
  // tazelenir, çıkışta silinir, sahibinin karmasıyla damgalıdır.
  {
    key: "tyro-celebrations-v1",
    labelKey: "settings.general.storage.celebrations",
    descriptionKey: "settings.general.storage.celebrationsDescription",
  },
  // Dünya saatinin şehirleri ve ana şehri — kişisel veri değil, tercih.
  {
    key: "tyro-world-clock-v1",
    labelKey: "settings.general.storage.worldClock",
    descriptionKey: "settings.general.storage.worldClockDescription",
  },
]
