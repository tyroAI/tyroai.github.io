import { HugeiconsIcon } from "@hugeicons/react"
import DashboardCircleIcon from "@hugeicons/core-free-icons/DashboardCircleIcon"
import AiChat02Icon from "@hugeicons/core-free-icons/AiChat02Icon"
import SecurityCheckIcon from "@hugeicons/core-free-icons/SecurityCheckIcon"
import Settings01Icon from "@hugeicons/core-free-icons/Settings01Icon"
import AiArtIcon from "@hugeicons/core-free-icons/AiArtIcon"
import DashboardSquare01Icon from "@hugeicons/core-free-icons/DashboardSquare01Icon"
import TaskDone01Icon from "@hugeicons/core-free-icons/TaskDone01Icon"
import UserAccountIcon from "@hugeicons/core-free-icons/UserAccountIcon"
import { usePageAccess } from "@/hooks/usePageAccess"
import HelpCircleIcon from "@hugeicons/core-free-icons/HelpCircleIcon"
import UserCircleIcon from "@hugeicons/core-free-icons/UserCircleIcon"
import Megaphone01Icon from "@hugeicons/core-free-icons/Megaphone01Icon"
import CopilotIcon from "@hugeicons/core-free-icons/CopilotIcon"
import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon"
import Moon01Icon from "@hugeicons/core-free-icons/Moon01Icon"
import Sun01Icon from "@hugeicons/core-free-icons/Sun01Icon"
import LanguageCircleIcon from "@hugeicons/core-free-icons/LanguageCircleIcon"
import Add01Icon from "@hugeicons/core-free-icons/Add01Icon"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { useLocale } from "@/hooks/useLocale"
import { useIsInGroup } from "@/hooks/useIsInGroup"
import { useIsAppAdmin } from "@/hooks/useAuthorizations"
import { ADMIN_GROUP_ID } from "@/lib/constants"
import { useTheme } from "@/hooks/useTheme"

// Pages mirror what the sidebar shows (navMain + navSecondary). External
// items live in their own group below so Cmd+K still finds them but the
// visual grouping signals they leave the SPA. Keep these in sync with
// src/components/layout/Sidebar.jsx + HeaderSearch.jsx.
const PAGES = [
  // ⚠️ Anasayfa · Keşfet · To-Do kapılı sayfalar: listede duruyorlar ve
  // çizimde `canOpen` ile süzülüyorlar (`lib/pageAccess.js` — sidebar ve
  // rotayla AYNI karar). Kapalıyken aramada da yok: bulunup açılamayan bir
  // sayfa, arama kutusunun yalan söylemesi olurdu. Sıra sidebar'la aynı.
  { id: "myspace", path: "/myspace", labelKey: "nav.myspace", icon: DashboardSquare01Icon },
  { id: "selfservice", path: "/self-service", labelKey: "nav.selfService", icon: UserAccountIcon },
  { id: "feed", path: "/feed", labelKey: "nav.feed", icon: AiArtIcon },
  { id: "todo", path: "/todo", labelKey: "nav.todo", icon: TaskDone01Icon },
  { id: "chat", path: "/chat", labelKey: "nav.chat", icon: AiChat02Icon },
  // Çözümler (eski Dashboard) — sidebar'dan profil menüsüne taşındı; paletin
  // sırasında sidebar satırlarının hemen ardından.
  { id: "dashboard", path: "/dashboard", labelKey: "nav.dashboard", icon: DashboardCircleIcon },
  { id: "help", path: "/help", labelKey: "nav.help", icon: HelpCircleIcon },
  // Sidebar'a BİLEREK eklenmedi (kişinin kendi hesabı işin yanına konmaz);
  // aramada olmasaydı uygulamanın bulunamayan tek sayfası olurdu.
  { id: "profile", path: "/profile", labelKey: "nav.profile", icon: UserCircleIcon },
  // Sidebar'da da var; aramada olmaması, bir duyuru sayfasının aranarak
  // bulunamaması demek olurdu.
  { id: "whats-new", path: "/whats-new", labelKey: "nav.whatsNew", icon: Megaphone01Icon },
]

/* Yönetici kapısının arkasındaki iki sayfa. ⚠️ Kapalıyken aramada da YOK —
   Keşfet'in kuralının aynısı: bulunup açılamayan bir sayfa, arama kutusunun
   yalan söylemesi olurdu. Kapılar da yüzeyin kendi kapılarıyla AYNI:
   Güvenlik iki kapıdan BİRİYLE açılıyor (Entra grubu ya da `tyro_isadmin`,
   NavUser'daki satırla aynı), katalog yalnız Entra grubuyla — o bir Profil
   sekmesi ve `ProfilePage` onu `=== true` ile çiziyor. */
const ADMIN_PAGES = [
  {
    id: "security",
    path: "/security",
    labelKey: "nav.security",
    icon: SecurityCheckIcon,
    gate: "any",
  },
  /* ⚠️ Ayarlar ARTIK BİR SAYFA DEĞİL: `/settings` `/profile?tab=catalog`e
     yönlendiriyor. Arama doğrudan gerçek adrese gidiyor, yönlendirmeye
     değil — yoksa geri düğmesi kullanıcıyı aradığı yere geri atardı. */
  {
    id: "settings",
    path: "/profile?tab=catalog",
    labelKey: "nav.settings",
    icon: Settings01Icon,
    gate: "group",
  },
]

const EXTERNAL = [
  {
    id: "copilot",
    href: "https://m365.cloud.microsoft/chat",
    labelKey: "nav.copilot",
    subtitleKey: "nav.copilotSubtitle",
    icon: CopilotIcon,
  },
]

export function CommandPalette({ open, onOpenChange, onNavigate, onNewChat }) {
  const { t, toggle: toggleLocale } = useLocale()
  const { theme, toggle: toggleTheme } = useTheme()
  /* Yönetici kapıları — üç değerli cevapta `=== true`, yani "soramadık"
     hâli ÜYE SAYILMAZ (bu deponun fail-closed kuralı). */
  const inAdminGroup = useIsInGroup(ADMIN_GROUP_ID) === true
  const isAuthzAdmin = useIsAppAdmin() === true
  const { canOpen } = usePageAccess()
  const pages = [
    ...PAGES.filter((p) => canOpen(p.path)),
    ...ADMIN_PAGES.filter((p) =>
      p.gate === "group" ? inAdminGroup : inAdminGroup || isAuthzAdmin,
    ),
  ]

  const close = () => onOpenChange?.(false)

  const go = (path) => {
    onNavigate?.(path)
    close()
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title={t("cmd.placeholder")}>
      <CommandInput placeholder={t("cmd.placeholder")} />
      <CommandList>
        <CommandEmpty>{t("cmd.empty")}</CommandEmpty>

        <CommandGroup heading={t("cmd.groupPages")}>
          {pages.map((p) => (
            <CommandItem key={p.id} value={t(p.labelKey)} onSelect={() => go(p.path)}>
              <HugeiconsIcon icon={p.icon} size={16} strokeWidth={1.5} />
              <span className="font-medium">{t(p.labelKey)}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t("cmd.groupExternal")}>
          {EXTERNAL.map((p) => (
            <CommandItem
              key={p.id}
              value={`${t(p.labelKey)} ${t(p.subtitleKey)}`}
              onSelect={() => {
                window.open(p.href, "_blank", "noopener,noreferrer")
                close()
              }}
            >
              <HugeiconsIcon icon={p.icon} size={16} strokeWidth={1.5} />
              <span className="font-medium">{t(p.labelKey)}</span>
              <span className="ml-2 truncate text-xs text-muted-foreground">
                {t(p.subtitleKey)}
              </span>
              <HugeiconsIcon
                icon={ArrowUpRight01Icon}
                size={14}
                strokeWidth={1.5}
                className="ml-auto text-muted-foreground/70"
              />
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t("cmd.groupActions")}>
          <CommandItem
            value={t("nav.quickAction")}
            onSelect={() => {
              onNewChat?.()
              close()
            }}
          >
            <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={1.5} />
            <span>{t("nav.quickAction")}</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              toggleTheme()
              close()
            }}
          >
            <HugeiconsIcon
              icon={theme === "dark" ? Sun01Icon : Moon01Icon}
              size={16}
              strokeWidth={1.5}
            />
            {t("cmd.actionToggleTheme")}
          </CommandItem>
          <CommandItem
            onSelect={() => {
              toggleLocale()
              close()
            }}
          >
            <HugeiconsIcon icon={LanguageCircleIcon} size={16} strokeWidth={1.5} />
            {t("cmd.actionToggleLocale")}
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
