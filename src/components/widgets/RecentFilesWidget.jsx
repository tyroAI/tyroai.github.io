import { HugeiconsIcon } from "@hugeicons/react"
import Doc01Icon from "@hugeicons/core-free-icons/Doc01Icon"
import File01Icon from "@hugeicons/core-free-icons/File01Icon"
import Folder01Icon from "@hugeicons/core-free-icons/Folder01Icon"
import Note01Icon from "@hugeicons/core-free-icons/Note01Icon"
import Pdf01Icon from "@hugeicons/core-free-icons/Pdf01Icon"
import Ppt01Icon from "@hugeicons/core-free-icons/Ppt01Icon"
import Xls01Icon from "@hugeicons/core-free-icons/Xls01Icon"
import { useLocale } from "@/hooks/useLocale"
import { useWidgetData } from "@/hooks/useWidgetData"
import { fetchRecentFiles } from "@/lib/widgetSources"
import { cn } from "@/lib/utils"
import { ago } from "./format"
import { WidgetBody } from "./WidgetBody"
import { WidgetEmpty } from "./WidgetEmpty"
import { WidgetFrame } from "./WidgetFrame"
import { PageBody, Pager } from "./paging/Pager"
import { usePager } from "./paging/usePager"

// Belge türünün rengi Office'inkine yakın: tanıdık bir ipucu, süs değil.
const KIND = {
  Word: [Doc01Icon, "bg-blue-500/12 text-blue-600 dark:text-blue-400"],
  Excel: [Xls01Icon, "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"],
  PowerPoint: [Ppt01Icon, "bg-orange-500/12 text-orange-600 dark:text-orange-400"],
  Pdf: [Pdf01Icon, "bg-red-500/12 text-red-600 dark:text-red-400"],
  OneNote: [Note01Icon, "bg-purple-500/12 text-purple-600 dark:text-purple-400"],
}
const OTHER = [File01Icon, "bg-muted text-muted-foreground"]

/**
 * Kaldığın yerden devam — son açtığın belgeler (OneDrive · SharePoint ·
 * Teams); satıra basınca belge tarayıcıda açılır.
 */
export function RecentFilesWidget({ className }) {
  const { t, locale } = useLocale()
  const res = useWidgetData("recent-files", fetchRecentFiles)
  const files = res.data ?? []
  const pager = usePager(files, 3)
  return (
    <WidgetFrame
      id="recent-files"
      title={t("widgets.files.title")}
      icon={Folder01Icon}
      busy={res.status === "loading"}
      className={className}
      pager={<Pager pager={pager} label={t("widgets.files.title")} />}
    >
      <WidgetBody status={res.status} rows={4}>
        {files.length ? (
          <PageBody pager={pager} className="mt-3">
            {pager.items.map((f) => {
              const [icon, tone] = KIND[f.type] ?? OTHER
              return (
                <li key={f.id}>
                  <a
                    href={f.webUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={f.title}
                    className="-mx-2 flex min-h-11 items-center gap-2.5 rounded-xl px-2 transition hover:bg-accent/60"
                  >
                    <span
                      className={cn("grid size-8 shrink-0 place-items-center rounded-lg", tone)}
                    >
                      <HugeiconsIcon icon={icon} className="size-4" strokeWidth={1.8} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.8125rem] font-medium">{f.title}</span>
                      <span className="block truncate text-[0.6875rem] text-muted-foreground">
                        {[f.container, ago(f.at, locale)].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </a>
                </li>
              )
            })}
          </PageBody>
        ) : (
          <WidgetEmpty icon={Folder01Icon}>{t("widgets.files.empty")}</WidgetEmpty>
        )}
      </WidgetBody>
    </WidgetFrame>
  )
}
