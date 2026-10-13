import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon"
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon"
import CargoShipIcon from "@hugeicons/core-free-icons/CargoShipIcon"
import ChartLineData01Icon from "@hugeicons/core-free-icons/ChartLineData01Icon"
import Coins02Icon from "@hugeicons/core-free-icons/Coins02Icon"
import DocumentValidationIcon from "@hugeicons/core-free-icons/DocumentValidationIcon"
import File01Icon from "@hugeicons/core-free-icons/File01Icon"
import Idea01Icon from "@hugeicons/core-free-icons/Idea01Icon"
import Mail01Icon from "@hugeicons/core-free-icons/Mail01Icon"
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon"
import StickyNote01Icon from "@hugeicons/core-free-icons/StickyNote01Icon"
import Task01Icon from "@hugeicons/core-free-icons/Task01Icon"
import UserGroupIcon from "@hugeicons/core-free-icons/UserGroupIcon"

/**
 * Katalogdaki `iconHint` → çizilecek ikon.
 *
 * Katalog ikon ADI taşımaz, KAVRAM taşır ("mail", "ship", "money"). Sebebi:
 * içerik ile çizim ayrı kalsın ve katalog yazan (insan ya da model) paketin
 * ikon adlarını bilmek zorunda olmasın — yanlış yazılmış tek bir ad derlemeyi
 * kırardı. Tanınmayan kavram ampule düşer.
 */
const BY_HINT = {
  mail: Mail01Icon,
  calendar: Calendar03Icon,
  file: File01Icon,
  document: DocumentValidationIcon,
  people: UserGroupIcon,
  ship: CargoShipIcon,
  money: Coins02Icon,
  chart: ChartLineData01Icon,
  search: Search01Icon,
  task: Task01Icon,
  alert: Alert02Icon,
  note: StickyNote01Icon,
}

export function promptIcon(hint) {
  return BY_HINT[(hint ?? "").toLowerCase()] ?? Idea01Icon
}

export { Idea01Icon }
