import ExclamationMarkIcon from "@hugeicons/core-free-icons/ExclamationMarkIcon"
import Flag02Icon from "@hugeicons/core-free-icons/Flag02Icon"
import PinIcon from "@hugeicons/core-free-icons/PinIcon"

/**
 * Sana özel panosunun ORTAK görünüşü — gerçek bileşenler ve iskelet AYNI
 * kabukları okuyor, yani yüklenince kart boy değiştirmiyor. Bileşen DEĞİL
 * (React Refresh sınırı: bileşen dosyasından sabit ihraç edilmez).
 */

/** İşaretin glifi (kutucuk, şerit başı, filtre çipi). Ton `lib/forYouBoard.js` › `LANES`. */
export const LANE_ICON = { pinned: PinIcon, flagged: Flag02Icon, high: ExclamationMarkIcon }
