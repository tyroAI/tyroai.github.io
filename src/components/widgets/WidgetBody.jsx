import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon"
import { useLocale } from "@/hooks/useLocale"
import { STATUS } from "@/lib/graph"
import { WidgetEmpty } from "./WidgetEmpty"

/**
 * Widget gövdesinin ortak durumları: yükleniyor (satır iskeleti) · izin yok ·
 * okunamadı · hazır (`children`). Her widget aynı dili konuşsun.
 */
export function WidgetBody({ status, rows = 3, children }) {
  const { t } = useLocale()
  if (status === "loading")
    return (
      <div aria-hidden="true" className="mt-3 space-y-2.5">
        {Array.from({ length: rows }, (_, i) => (
          <span key={i} className="ms-skeleton block h-9 rounded-xl" />
        ))}
      </div>
    )
  if (status !== STATUS.ready)
    return (
      <WidgetEmpty icon={Alert02Icon}>
        {t(status === STATUS.denied ? "widgets.common.denied" : "widgets.common.unavailable")}
      </WidgetEmpty>
    )
  return children
}
