import Archive02Icon from "@hugeicons/core-free-icons/Archive02Icon"
import News01Icon from "@hugeicons/core-free-icons/News01Icon"
import UserStar01Icon from "@hugeicons/core-free-icons/UserStar01Icon"

// Kimlikler adreste (`?sec=`) ve yer imlerinde: adlar değişse de kimlik değişmez.
export const FEED_SECTIONS = [
  { id: "agenda", labelKey: "feed.section.agenda", icon: News01Icon },
  { id: "important", labelKey: "feed.section.important", icon: UserStar01Icon },
  // Çentiğin ve header'ın "Dosyalar"ıyla aynı glif.
  { id: "docs", labelKey: "feed.section.docs", icon: Archive02Icon },
]

// Dar ekranda (sağ ray yokken) Popüler'in iç görünümleri: akış · kişiler · kanallar.
export const FEED_VIEWS = [
  { id: "agenda", labelKey: "feed.view.agenda" },
  { id: "congrats", labelKey: "feed.view.congrats" },
  { id: "trends", labelKey: "feed.discover" },
]
