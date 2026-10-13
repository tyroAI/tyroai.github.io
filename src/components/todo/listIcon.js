import Flag02Icon from "@hugeicons/core-free-icons/Flag02Icon"
import LeftToRightListBulletIcon from "@hugeicons/core-free-icons/LeftToRightListBulletIcon"
import UserGroupIcon from "@hugeicons/core-free-icons/UserGroupIcon"

/**
 * Listenin glifi — işaretli e-posta bayrak, paylaşılan kişiler, gerisi liste.
 * Ayrı dosya: bir bileşen dosyasından işlev ihraç etmek React Refresh
 * sınırını bozuyor (deponun kuralı).
 */
export function listIcon(list) {
  if (list?.kind === "flagged") return Flag02Icon
  if (list?.isShared) return UserGroupIcon
  return LeftToRightListBulletIcon
}
