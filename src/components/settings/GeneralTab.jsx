import { useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import Delete02Icon from "@hugeicons/core-free-icons/Delete02Icon"
import Refresh01Icon from "@hugeicons/core-free-icons/Refresh01Icon"
import Sun01Icon from "@hugeicons/core-free-icons/Sun01Icon"
import ColorsIcon from "@hugeicons/core-free-icons/ColorsIcon"
import GlobalIcon from "@hugeicons/core-free-icons/GlobalIcon"
import Database02Icon from "@hugeicons/core-free-icons/Database02Icon"
import HardDriveIcon from "@hugeicons/core-free-icons/HardDriveIcon"
import { notify } from "@/lib/notify"
import { Button } from "@/components/ui/button"
import { useLocale } from "@/hooks/useLocale"
import { useTheme } from "@/hooks/useTheme"
import { usePalette } from "@/hooks/usePalette"
import { useConfig } from "@/hooks/useConfig"
import { localStorageRegistry } from "@/data/appMeta"
import { cn } from "@/lib/utils"

const ENTRY_ICON = {
  "tyro-theme": Sun01Icon,
  "tyro-palette": ColorsIcon,
  "tyro-locale": GlobalIcon,
  "tyro-config-v1": Database02Icon,
}

function byteSize(str) {
  if (!str) return 0
  if (typeof Blob !== "undefined") return new Blob([str]).size
  return new TextEncoder().encode(str).length
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export function GeneralTab() {
  const { t } = useLocale()
  const { theme } = useTheme()
  const { palette } = usePalette()
  const { locale } = useLocale()
  const config = useConfig()
  const [bump, setBump] = useState(0)

  const summaries = useMemo(
    () => ({
      "tyro-theme": theme,
      "tyro-palette": palette,
      "tyro-locale": locale,
      // allAgents: bu satır localStorage cache'inin İÇERİĞİNİ özetliyor,
      // kullanıcıya görünen listeyi değil — cache her zaman tam listeyi tutar.
      "tyro-config-v1": `${config.allAgents.length} agent · ${config.aiApps.length} AI · ${config.businessApps.length} iş`,
    }),
    [
      theme,
      palette,
      locale,
      config.allAgents.length,
      config.aiApps.length,
      config.businessApps.length,
    ],
  )

  const entries = useMemo(() => {
    void bump
    return localStorageRegistry.map((entry) => {
      const raw = window.localStorage.getItem(entry.key)
      return {
        ...entry,
        raw,
        size: byteSize(raw),
        present: raw !== null,
        summary: summaries[entry.key] ?? "—",
      }
    })
  }, [summaries, bump])

  const totalSize = entries.reduce((sum, e) => sum + e.size, 0)
  const presentCount = entries.filter((e) => e.present).length

  function handleRefresh() {
    setBump((b) => b + 1)
    notify.success(t("settings.general.toast.refreshed"))
  }

  function handleClearKey(key) {
    window.localStorage.removeItem(key)
    setBump((b) => b + 1)
    notify.success(t("settings.general.toast.cleared").replace("{key}", key))
  }

  function handleClearAll() {
    for (const entry of localStorageRegistry) {
      window.localStorage.removeItem(entry.key)
    }
    setBump((b) => b + 1)
    notify.success(t("settings.general.toast.clearedAll"))
    setTimeout(() => window.location.reload(), 600)
  }

  return (
    <div className="space-y-10">
      {/* ⚠️ **UYGULAMA KİMLİK BLOĞU KALDIRILDI** (2026-09-17, istek üzerine:
          "o logolu ortadaki bölümü kaldır, ona gerek yok, garip gözüküyor").

          64px'lik logo + sürüm + teknoloji listesi + telif, bu bileşenin
          tek göründüğü yerde — Profilim → İzinler — bildirim izni ile
          yerel depolamanın ARASINA giriyordu. İkisi de "tarayıcı senin
          adına ne tutuyor" sorusunun cevabı; aradaki künye ise bir hakkında
          kutusu. Yanlış sekmede duran doğru bir bilgi, yanlış bilgidir.

          Sürüm dizesi bu turda uygulamadan tümüyle düştü (`appMeta.version`
          artık hiçbir yerde çizilmiyor). Kayıt `data/appMeta.js`te duruyor;
          bir yere geri konacaksa yeri Yardım ya da Güvenlik → Uygulama
          yetkileri, bir izin sekmesi değil. */}

      {/* Storage section */}
      <section className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold tracking-tight">
              {t("settings.general.storage.sectionTitle")}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("settings.general.storage.sectionSubtitle")}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={handleRefresh}
            >
              <HugeiconsIcon icon={Refresh01Icon} className="size-3.5" />
              {t("settings.general.storage.refresh")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={handleClearAll}
            >
              <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
              {t("settings.general.storage.clearAll")}
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card">
          {entries.map((entry, i) => {
            const Icon = ENTRY_ICON[entry.key] ?? Database02Icon
            return (
              <div
                key={entry.key}
                className={cn(
                  "group flex items-center gap-4 px-5 py-4 transition",
                  i > 0 && "border-t border-border/60",
                  !entry.present && "opacity-60",
                )}
              >
                <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft/50 text-brand-deep">
                  <HugeiconsIcon icon={Icon} className="size-4" strokeWidth={1.6} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <p className="text-sm font-medium text-foreground">{t(entry.labelKey)}</p>
                    <code className="font-mono text-[0.625rem] text-muted-foreground/70">
                      {entry.key}
                    </code>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {entry.present ? entry.summary : t("settings.general.storage.empty")}
                  </p>
                </div>
                <div className="hidden shrink-0 text-right sm:block">
                  <p className="font-mono text-xs tabular-nums text-muted-foreground">
                    {formatSize(entry.size)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "size-9 shrink-0 text-muted-foreground/60 transition hover:text-destructive sm:size-8",
                    // Always visible on touch; hover-reveal on hover-capable
                    // devices only. Pure `opacity-0 group-hover:opacity-100`
                    // would hide the button on mobile where hover never fires.
                    "md:opacity-0 md:group-hover:opacity-100",
                    !entry.present && "pointer-events-none",
                  )}
                  disabled={!entry.present}
                  onClick={() => handleClearKey(entry.key)}
                  title={t("settings.general.storage.clearEntry")}
                >
                  <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
                </Button>
              </div>
            )
          })}

          {/* Footer summary */}
          <div className="flex items-center justify-between gap-3 border-t border-border/60 bg-muted/20 px-5 py-3 text-xs">
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <HugeiconsIcon icon={HardDriveIcon} className="size-3.5" strokeWidth={1.6} />
              {presentCount} / {entries.length} <span className="text-muted-foreground/60">·</span>{" "}
              {t("settings.general.storage.total").toLowerCase()}
            </span>
            <span className="font-mono font-semibold tabular-nums text-foreground">
              {formatSize(totalSize)}
            </span>
          </div>
        </div>

        <p className="text-[0.6875rem] leading-relaxed text-muted-foreground/70">
          {t("settings.general.storage.note")}
        </p>
      </section>
    </div>
  )
}
