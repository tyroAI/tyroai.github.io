import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import Add01Icon from "@hugeicons/core-free-icons/Add01Icon"
import Edit02Icon from "@hugeicons/core-free-icons/Edit02Icon"
import Delete02Icon from "@hugeicons/core-free-icons/Delete02Icon"
import Refresh01Icon from "@hugeicons/core-free-icons/Refresh01Icon"
import Robot01Icon from "@hugeicons/core-free-icons/Robot01Icon"
import AiBrain02Icon from "@hugeicons/core-free-icons/AiBrain02Icon"
import DragDropVerticalIcon from "@hugeicons/core-free-icons/DragDropVerticalIcon"
import ArrowUp01Icon from "@hugeicons/core-free-icons/ArrowUp01Icon"
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon"
import Office365Icon from "@hugeicons/core-free-icons/Office365Icon"
import Settings02Icon from "@hugeicons/core-free-icons/Settings02Icon"
import Copy01Icon from "@hugeicons/core-free-icons/Copy01Icon"
import { notify } from "@/lib/notify"
import { Button } from "@/components/ui/button"
import SparklesIcon from "@hugeicons/core-free-icons/SparklesIcon"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { IconOrLogo } from "@/components/common/IconOrLogo"
import { EntityForm } from "./EntityForm"
import { GeneralTab } from "./GeneralTab"
import { MascotStudioCard } from "@/components/profile/orbStudio/MascotStudioCard"
import { useConfig } from "@/hooks/useConfig"
import { useLocale } from "@/hooks/useLocale"
import { useIsInGroup } from "@/hooks/useIsInGroup"
import { ADMIN_GROUP_ID } from "@/lib/constants"
import { cn } from "@/lib/utils"

// Admin tab visibility is gated on Entra ID group membership rather than a
// hardcoded UPN list. Membership check lives in useIsInGroup — see its
// docblock for the primary (idTokenClaims.groups) + Graph fallback strategy.

function IdChip({ label, value }) {
  const { t } = useLocale()
  async function handleCopy(e) {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(value)
      notify.success(t("settings.field.copied").replace("{name}", label))
    } catch {
      notify.error(t("settings.field.copyFailed"))
    }
  }
  const short = value.length > 10 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value
  return (
    <button
      type="button"
      onClick={handleCopy}
      title={`${label}: ${value}`}
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[0.625rem] transition hover:border-brand/40 hover:bg-brand-soft/40 hover:text-brand-deep"
    >
      <span className="font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <code className="font-mono text-foreground/80">{short}</code>
      <HugeiconsIcon icon={Copy01Icon} className="size-3 text-muted-foreground" strokeWidth={1.8} />
    </button>
  )
}

function EntityRow({
  item,
  kind,
  onEdit,
  onDelete,
  onToggleActive,
  index,
  count,
  onMove,
  dragProps,
  isDragging,
  isDropTarget,
  labels,
}) {
  // Dashboard kartlarıyla AYNI üç muamele (bkz. AppLauncher): asistan
  // gradyan, AI ürün açık zemin + koyu mürekkep, iş uygulaması dolu koyu.
  // Aynı kayıt iki yerde aynı görünmeli, yoksa ayarlardaki satırla
  // dashboard'daki kart iki farklı şey gibi okunuyor.
  const tone =
    kind === "agent"
      ? "bg-gradient-to-br from-brand-from via-brand-via to-brand-to"
      : kind === "businessApp"
        ? "bg-brand-fill-deep"
        : kind === "aiApp"
          ? "bg-brand-soft text-brand-on-soft"
          : ""
  const isAgent = kind === "agent"
  const isActive = item.isActive !== false
  const hasAnyId = isAgent && (item.tenantId || item.clientId || item.agentId)
  return (
    <div
      {...dragProps}
      className={cn(
        "group flex items-start gap-2 rounded-xl border bg-card p-3 transition",
        "hover:border-brand/40 hover:shadow-sm",
        // Switched off: dashed and faded, but still fully legible and still
        // editable. It is a row that exists and isn't being shown — not a
        // tombstone.
        isActive ? "border-border" : "border-dashed border-border/70 opacity-60",
        isDragging && "opacity-40",
        isDropTarget && "border-brand ring-2 ring-brand/30",
      )}
    >
      {/* Grip: the drag affordance. Reordering is also available without a
          pointer via the arrows below it, which is what keyboard and touch
          users get — HTML5 drag-and-drop serves neither. */}
      <div className="flex shrink-0 flex-col items-center gap-0.5 pt-0.5">
        <span
          className="cursor-grab text-muted-foreground/50 transition group-hover:text-muted-foreground active:cursor-grabbing"
          aria-hidden="true"
        >
          <HugeiconsIcon icon={DragDropVerticalIcon} className="size-4" strokeWidth={1.8} />
        </span>
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => onMove(index, index - 1)}
            disabled={index === 0}
            aria-label={labels.moveUp.replace("{name}", item.name)}
            className="grid size-5 place-items-center rounded text-muted-foreground/60 transition hover:bg-foreground/[0.06] hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          >
            <HugeiconsIcon icon={ArrowUp01Icon} className="size-3.5" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => onMove(index, index + 1)}
            disabled={index === count - 1}
            aria-label={labels.moveDown.replace("{name}", item.name)}
            className="grid size-5 place-items-center rounded text-muted-foreground/60 transition hover:bg-foreground/[0.06] hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          >
            <HugeiconsIcon icon={ArrowDown01Icon} className="size-3.5" strokeWidth={2} />
          </button>
        </div>
      </div>

      <div
        className={cn(
          "grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl text-white shadow-sm",
          tone,
        )}
      >
        <IconOrLogo iconName={item.iconName} logo={item.logo} className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className="truncate text-sm font-semibold">{item.name}</h4>
          {item.logo && (
            <Badge
              variant="outline"
              className="h-5 border-brand/40 px-1.5 text-[0.625rem] text-brand-deep"
            >
              LOGO
            </Badge>
          )}
          {!isActive && (
            <Badge
              variant="outline"
              className="h-5 border-border px-1.5 text-[0.625rem] text-muted-foreground"
            >
              {labels.offTag}
            </Badge>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {item.description || (!isAgent ? item.url || "—" : "—")}
        </p>
        {hasAnyId && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {item.tenantId && <IdChip label="Tenant" value={item.tenantId} />}
            {item.clientId && <IdChip label="Client" value={item.clientId} />}
            {item.agentId && <IdChip label="Agent" value={item.agentId} />}
          </div>
        )}
      </div>
      {/* Always visible, unlike edit/delete: it carries STATE, and a control
          that shows the current value cannot appear only on hover. */}
      <div className="flex shrink-0 items-center px-1 pt-1.5">
        <Checkbox
          checked={isActive}
          onCheckedChange={(next) => onToggleActive(item, next === true)}
          aria-label={labels.toggleAria.replace("{name}", item.name)}
          className="size-5"
        />
      </div>

      <div className="flex shrink-0 gap-1 transition-opacity md:opacity-0 md:group-hover:opacity-100">
        <Button
          size="icon"
          variant="ghost"
          className="size-9 sm:size-8"
          onClick={() => onEdit(item)}
          aria-label="Edit"
        >
          <HugeiconsIcon icon={Edit02Icon} className="size-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-9 text-muted-foreground hover:text-destructive sm:size-8"
          onClick={() => onDelete(item)}
          aria-label="Delete"
        >
          <HugeiconsIcon icon={Delete02Icon} className="size-4" />
        </Button>
      </div>
    </div>
  )
}

function EntitySection({
  kind,
  items,
  headerIcon,
  onAdd,
  onEdit,
  onDelete,
  onReorder,
  onToggleActive,
  onReset,
  labels,
}) {
  const shownCount = items.filter((i) => i.isActive !== false).length
  const [dragIndex, setDragIndex] = useState(null)
  const [overIndex, setOverIndex] = useState(null)

  // Hands the WHOLE id list down, not just the pair that swapped: the order is
  // stored as a number per row, so the provider needs to know every position
  // to work out which rows actually have to be written.
  function move(from, to) {
    if (to < 0 || to >= items.length || from === to) return
    const ids = items.map((i) => String(i.id))
    const [moved] = ids.splice(from, 1)
    ids.splice(to, 0, moved)
    onReorder(ids)
  }

  function dragPropsFor(index) {
    return {
      draggable: true,
      onDragStart: (e) => {
        setDragIndex(index)
        e.dataTransfer.effectAllowed = "move"
        // Firefox refuses to start a drag without data on the transfer.
        e.dataTransfer.setData("text/plain", String(index))
      },
      onDragOver: (e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"
        if (overIndex !== index) setOverIndex(index)
      },
      onDrop: (e) => {
        e.preventDefault()
        if (dragIndex !== null) move(dragIndex, index)
        setDragIndex(null)
        setOverIndex(null)
      },
      onDragEnd: () => {
        setDragIndex(null)
        setOverIndex(null)
      },
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-deep">
            <HugeiconsIcon icon={headerIcon} className="size-4" strokeWidth={1.6} />
          </div>
          <div>
            <h3 className="text-base font-semibold">{labels.title}</h3>
            <p className="max-w-xl text-xs text-muted-foreground">{labels.subtitle}</p>
            <p className="mt-1 max-w-xl text-[0.6875rem] text-muted-foreground/80">
              {labels.orderHint}
            </p>
            <p className="mt-0.5 max-w-xl text-[0.6875rem] text-muted-foreground/80">
              {labels.visibilityHint}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs tabular-nums text-muted-foreground">
            {labels.count.replace("{shown}", shownCount).replace("{total}", items.length)}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={onReset}
          >
            <HugeiconsIcon icon={Refresh01Icon} className="size-3.5" />
            {labels.reset}
          </Button>
          <Button
            type="button"
            size="sm"
            className={cn(
              "h-9 gap-1.5 border-0 bg-brand text-white shadow-sm",
              "hover:bg-brand hover:brightness-110 hover:shadow-md hover:text-white",
            )}
            onClick={onAdd}
          >
            <HugeiconsIcon icon={Add01Icon} className="size-3.5" strokeWidth={2} />
            {labels.add}
          </Button>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          {labels.empty}
        </div>
      ) : (
        /* Tek kolon, bilerek: iki kolonlu ızgarada "yukarı" düğmesi satırı
           bir SIRA değil bir HÜCRE geriye taşıyordu ve sürükleme hedefi de
           okunmuyordu. Sıralanabilir bir liste tek sütun olmak zorunda. */
        <div className="grid grid-cols-1 gap-2">
          {items.map((item, index) => (
            <EntityRow
              key={item.id}
              item={item}
              kind={kind}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleActive={onToggleActive}
              index={index}
              count={items.length}
              onMove={move}
              dragProps={dragPropsFor(index)}
              isDragging={dragIndex === index}
              isDropTarget={overIndex === index && dragIndex !== null && dragIndex !== index}
              labels={labels}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * ⚠️ **BU SAYFA ARTIK PROFİLİN İÇİNDE YAŞIYOR** (`embedded`).
 *
 * tyroTrade'de /settings diye bir sayfa YOK: her şey Profilim'de yönetiliyor
 * ve /settings yalnız `/profile?tab=catalog`e yönlendiriyor. Bu uygulama da
 * aynı düzene geçti (istek üzerine) — kişinin kendi tarayıcısındaki tercihi
 * olan hiçbir şeyin ayrı bir "Ayarlar" sayfası olmasına gerek yok.
 *
 * `embedded` iki şeyi kapatır: sayfanın KENDİ başlığı (profilin başlığı
 * zaten var) ve dış kaydırma kabuğu (profil sekmesi kendi kabuğunu
 * getiriyor). Depolama ve Orb sekmeleri de gömülü kipte ÇİZİLMEZ: ikisi
 * profilin kendi sekmelerine taşındı ve iki yerde birden durmaları,
 * kullanıcının hangisinin geçerli olduğunu sorması demekti.
 */
export function SettingsPage({ embedded = false } = {}) {
  const { t } = useLocale()
  const config = useConfig()
  // `undefined` (Graph fallback in flight) is treated as false so the admin
  // tabs never flash visible-then-hidden. Real admins see the tabs the
  // moment the check resolves — either synchronously from the ID-token
  // groups claim (no flash) or ~300-500 ms after a fresh login if the
  // claim isn't configured and we have to hit Graph.
  const isInAdminGroup = useIsInGroup(ADMIN_GROUP_ID)
  const showAdminTabs = isInAdminGroup === true
  // Gömülü kipte "general" sekmesi hiç çizilmiyor (Depolama profile taşındı),
  // yani varsayılan ilk GÖRÜNEN sekme olmalı — yoksa hiçbir içerik açılmaz.
  const [tab, setTab] = useState(embedded ? "agents" : "general")
  const [editing, setEditing] = useState(null) // { kind, value } | null
  const [deletePrompt, setDeletePrompt] = useState(null) // { kind, item } | null

  // Non-admin lands on /settings → force them onto the general tab. Without
  // this, if a non-admin's localStorage somehow had a stale "agents" value
  // they'd see an empty TabsContent (since the trigger is hidden).
  // Yönetici değilse yalnız "general" açılabilir; gömülü kipte o da yok, yani
  // bu kullanıcı için katalog sekmesinin içi zaten boş kalır (üstteki şerit de
  // tek sekme bile çizmez). Profil sekmesi bu yüzden yöneticiye göre gizlenir.
  const fallbackTab = embedded ? "agents" : "general"
  const safeTab = showAdminTabs || tab === fallbackTab ? tab : fallbackTab

  function openNew(kind) {
    setEditing({ kind, value: null })
  }
  function openEdit(kind, value) {
    setEditing({ kind, value })
  }
  function closeForm() {
    setEditing(null)
  }

  async function handleSave(saved) {
    if (!editing) return
    const { kind } = editing
    try {
      if (kind === "agent") await config.upsertAgent(saved)
      if (kind === "aiApp") await config.upsertAiApp(saved)
      if (kind === "businessApp") await config.upsertBusinessApp(saved)
      notify.success(t("settings.toast.saved").replace("{name}", saved.name))
      setEditing(null)
    } catch {
      // Remote write failed — keep the dialog open so the user can retry.
      notify.error(t("settings.toast.saveError").replace("{name}", saved.name))
    }
  }

  async function confirmDelete() {
    if (!deletePrompt) return
    const { kind, item } = deletePrompt
    try {
      if (kind === "agent") await config.removeAgent(item.id)
      if (kind === "aiApp") await config.removeAiApp(item.id)
      if (kind === "businessApp") await config.removeBusinessApp(item.id)
      notify.success(t("settings.toast.deleted").replace("{name}", item.name))
      setDeletePrompt(null)
    } catch {
      notify.error(t("settings.toast.deleteError").replace("{name}", item.name))
    }
  }

  async function handleReorder(collection, ids) {
    try {
      await config.reorder(collection, ids)
    } catch {
      // The provider already put the old order back — say why it snapped back,
      // otherwise the row looks like it refused to move for no reason.
      notify.error(t("settings.toast.reorderError"))
    }
  }

  async function handleToggleActive(collection, item, isActive) {
    try {
      await config.setActive(collection, item.id, isActive)
    } catch {
      // The provider already restored the previous value.
      notify.error(t("settings.toast.visibilityError").replace("{name}", item.name))
    }
  }

  function handleReset(collection, labelKey) {
    config.reset(collection)
    notify.success(t("settings.toast.reset").replace("{name}", t(labelKey)))
  }

  return (
    <div
      className={cn(
        "flex min-h-0 w-full flex-1 flex-col font-sans",
        embedded
          ? "gap-5"
          : "mx-auto max-w-6xl gap-5 overflow-y-auto px-3 py-5 sm:gap-6 sm:px-4 sm:py-6 lg:px-6 lg:py-8",
      )}
      style={{ fontFamily: '"Inter Variable", "Inter", system-ui, sans-serif' }}
    >
      {!embedded && (
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("settings.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("settings.subtitle")}</p>
        </header>
      )}

      <Tabs value={safeTab} onValueChange={setTab} className="flex-1">
        <TabsList
          className={cn(
            // Recessed-track segmented-control (iOS/macOS). The track is a soft fill +
            // subtle inset shadow ONLY — no border — so the single visible frame is the
            // floating active thumb (see TabsTrigger). A track border here would compete
            // with the thumb and read as two clashing frames.
            //
            // py-2 px-0: vertical breathing room around the thumb but NO horizontal
            // padding, so the first/last tab sits flush with the track's outer ends.
            // Without this an inactive sliver of track was visible to the left of the
            // first tab and to the right of the last. The first/last trigger pick up
            // a matching rounded-l-3xl / rounded-r-3xl so the outer button corners
            // hug the track's rounded ends instead of poking out of the curve.
            "h-auto w-full rounded-3xl bg-muted/60 px-0 py-2",
            "shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]",
            "flex gap-1",
            "overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            "md:overflow-visible",
            "dark:bg-white/[0.04] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]",
          )}
        >
          {[
            // Gömülü kipte bu ikisi ÇİZİLMEZ: Depolama profilin İzinler
            // sekmesine, Orb oluşturucu kendi sekmesine taşındı.
            {
              value: "general",
              icon: Settings02Icon,
              label: t("settings.tabs.general"),
              adminOnly: false,
              pageOnly: true,
            },
            // ⚠️ `adminOnly: false`: orb görünümü KİŞİSEL bir tercih (tema ·
            // palet · dil ile aynı sınıf, bu tarayıcıda yaşıyor), katalog
            // yönetimi değil. Admin kapısının arkasına koymak, herkesin
            // değiştirebildiği bir ayarı kimsenin bulamayacağı yere koymak
            // olurdu.
            {
              value: "orb",
              icon: SparklesIcon,
              label: t("profile.tabs.orb"),
              adminOnly: false,
              pageOnly: true,
            },
            {
              value: "agents",
              icon: Robot01Icon,
              label: t("settings.tabs.agents"),
              adminOnly: true,
            },
            {
              value: "aiApps",
              icon: AiBrain02Icon,
              label: t("settings.tabs.aiApps"),
              adminOnly: true,
            },
            {
              value: "businessApps",
              icon: Office365Icon,
              label: t("settings.tabs.businessApps"),
              adminOnly: true,
            },
          ]
            .filter((tabDef) => !(embedded && tabDef.pageOnly))
            .filter((tabDef) => !tabDef.adminOnly || showAdminTabs)
            .map((tabDef) => (
              <TabsTrigger
                key={tabDef.value}
                value={tabDef.value}
                aria-label={tabDef.label}
                className={cn(
                  // flex-1 makes each segment fill an equal share of the track. On
                  // mobile the labels are HIDDEN — only the icon shows — so all 4
                  // tabs fit at 375px without horizontal scroll. The active tab's
                  // label appears below the track (see ActiveTabLabel) so the
                  // user always sees which page they're on. sm:+ shows icon +
                  // inline label like before.
                  //
                  // first:rounded-l-3xl / last:rounded-r-3xl — the first/last button's
                  // outer corners match the track's outer corner (24 px) so the active
                  // thumb fills the track's rounded "ear" cleanly with no gray sliver
                  // between thumb and track edge. Middle tabs keep rounded-xl (12 px).
                  "group relative flex h-11 flex-1 items-center justify-center gap-2 rounded-xl first:rounded-l-3xl last:rounded-r-3xl border-0 bg-transparent px-2 text-[0.8125rem] font-medium whitespace-nowrap sm:h-10 sm:px-3",
                  "text-muted-foreground transition-all duration-200 ease-out",
                  "hover:text-foreground hover:bg-foreground/[0.04]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-0",
                  // Active = floating thumb on the recessed track. Separation is purely
                  // fill + soft drop shadow — NO ring/border, so it never competes with
                  // the track (that was the clashing double-frame). Tonal ladder:
                  // page < track fill < thumb fill.
                  "data-[state=active]:bg-background data-[state=active]:text-foreground",
                  "data-[state=active]:shadow-[0_1px_2px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.06)]",
                  // Dark active thumb must be OPAQUE — a translucent white/0.12 let
                  // the track's inset shadow bleed through and read as a line drawn
                  // across the middle of the active button. neutral-800 (#262626) is
                  // the opaque equivalent of white/0.12 over the dark page background.
                  "dark:data-[state=active]:bg-neutral-800 dark:data-[state=active]:text-white",
                  "dark:data-[state=active]:shadow-[0_1px_0_rgba(255,255,255,0.1)_inset,0_2px_8px_rgba(0,0,0,0.45)]",
                )}
              >
                <HugeiconsIcon
                  icon={tabDef.icon}
                  className="size-[1.125rem] shrink-0 opacity-70 transition group-data-[state=active]:opacity-100 sm:size-[0.9375rem]"
                  strokeWidth={1.6}
                />
                <span className="hidden truncate sm:inline">{tabDef.label}</span>
              </TabsTrigger>
            ))}
        </TabsList>

        {/* Mobile-only active-tab label below the icon-only track so users
            always see which page they're on. Hidden on sm+ where labels
            live inline in the tabs themselves. */}
        <p
          className="mt-3 text-center text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-muted-foreground sm:hidden"
          aria-hidden="true"
        >
          {(() => {
            const labels = {
              general: t("settings.tabs.general"),
              agents: t("settings.tabs.agents"),
              aiApps: t("settings.tabs.aiApps"),
              businessApps: t("settings.tabs.businessApps"),
            }
            return labels[safeTab]
          })()}
        </p>

        <TabsContent value="general" className="mt-8">
          <GeneralTab />
        </TabsContent>

        <TabsContent value="orb" className="mt-8">
          <MascotStudioCard />
        </TabsContent>

        <TabsContent value="agents" className="mt-8">
          <EntitySection
            kind="agent"
            headerIcon={Robot01Icon}
            // allAgents: bu sekme admin CRUD'u — görünürlük kuralına takılan
            // kısıtlı agent da yönetilebilir kalmalı (sekmenin kendisi zaten
            // ADMIN_GROUP_ID üyeliğiyle gizli).
            items={config.allAgents}
            onAdd={() => openNew("agent")}
            onEdit={(item) => openEdit("agent", item)}
            onDelete={(item) => setDeletePrompt({ kind: "agent", item })}
            onReorder={(ids) => handleReorder("agents", ids)}
            onToggleActive={(item, next) => handleToggleActive("agents", item, next)}
            onReset={() => handleReset("agents", "settings.tabs.agents")}
            labels={{
              title: t("settings.agent.sectionTitle"),
              subtitle: t("settings.agent.sectionSubtitle"),
              add: t("settings.agent.addAction"),
              reset: t("settings.action.reset"),
              moveUp: t("settings.order.moveUp"),
              moveDown: t("settings.order.moveDown"),
              orderHint: t("settings.order.hint"),
              visibilityHint: t("settings.visibility.hint"),
              toggleAria: t("settings.visibility.toggleAria"),
              offTag: t("settings.visibility.offTag"),
              count: t("settings.visibility.count"),
              empty: t("settings.agent.empty"),
            }}
          />
        </TabsContent>

        <TabsContent value="aiApps" className="mt-8">
          <EntitySection
            kind="aiApp"
            headerIcon={AiBrain02Icon}
            // allAiApps: kapalı olanlar da listede — yoksa geri açılamazlardı.
            items={config.allAiApps}
            onAdd={() => openNew("aiApp")}
            onEdit={(item) => openEdit("aiApp", item)}
            onDelete={(item) => setDeletePrompt({ kind: "aiApp", item })}
            onReorder={(ids) => handleReorder("aiApps", ids)}
            onToggleActive={(item, next) => handleToggleActive("aiApps", item, next)}
            onReset={() => handleReset("aiApps", "settings.tabs.aiApps")}
            labels={{
              title: t("settings.aiApp.sectionTitle"),
              subtitle: t("settings.aiApp.sectionSubtitle"),
              add: t("settings.aiApp.addAction"),
              reset: t("settings.action.reset"),
              moveUp: t("settings.order.moveUp"),
              moveDown: t("settings.order.moveDown"),
              orderHint: t("settings.order.hint"),
              visibilityHint: t("settings.visibility.hint"),
              toggleAria: t("settings.visibility.toggleAria"),
              offTag: t("settings.visibility.offTag"),
              count: t("settings.visibility.count"),
              empty: t("settings.aiApp.empty"),
            }}
          />
        </TabsContent>

        <TabsContent value="businessApps" className="mt-8">
          <EntitySection
            kind="businessApp"
            headerIcon={Office365Icon}
            items={config.allBusinessApps}
            onAdd={() => openNew("businessApp")}
            onEdit={(item) => openEdit("businessApp", item)}
            onDelete={(item) => setDeletePrompt({ kind: "businessApp", item })}
            onReorder={(ids) => handleReorder("businessApps", ids)}
            onToggleActive={(item, next) => handleToggleActive("businessApps", item, next)}
            onReset={() => handleReset("businessApps", "settings.tabs.businessApps")}
            labels={{
              title: t("settings.businessApp.sectionTitle"),
              subtitle: t("settings.businessApp.sectionSubtitle"),
              add: t("settings.businessApp.addAction"),
              reset: t("settings.action.reset"),
              moveUp: t("settings.order.moveUp"),
              moveDown: t("settings.order.moveDown"),
              orderHint: t("settings.order.hint"),
              visibilityHint: t("settings.visibility.hint"),
              toggleAria: t("settings.visibility.toggleAria"),
              offTag: t("settings.visibility.offTag"),
              count: t("settings.visibility.count"),
              empty: t("settings.businessApp.empty"),
            }}
          />
        </TabsContent>
      </Tabs>

      <EntityForm
        kind={editing?.kind}
        open={Boolean(editing)}
        initialValue={editing?.value}
        onClose={closeForm}
        onSave={handleSave}
      />

      <Dialog open={Boolean(deletePrompt)} onOpenChange={(v) => !v && setDeletePrompt(null)}>
        <DialogContent className="sm:max-w-[26.25rem]">
          <DialogHeader>
            <DialogTitle>{t("settings.deletePrompt.title")}</DialogTitle>
            <DialogDescription>
              {t("settings.deletePrompt.body").replace("{name}", deletePrompt?.item?.name ?? "")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePrompt(null)}>
              {t("settings.action.cancel")}
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              {t("settings.action.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
