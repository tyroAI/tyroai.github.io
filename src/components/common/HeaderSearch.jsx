import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon"
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
import Moon02Icon from "@hugeicons/core-free-icons/Moon02Icon"
import Sun03Icon from "@hugeicons/core-free-icons/Sun03Icon"
import LanguageSquareIcon from "@hugeicons/core-free-icons/LanguageSquareIcon"
import Add01Icon from "@hugeicons/core-free-icons/Add01Icon"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
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

// Keep in sync with src/components/layout/Sidebar.jsx + CommandPalette.jsx.
// External group below mirrors the Copilot sidebar entry — same URL, same
// new-tab behavior, same external arrow hint.
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
  // Çözümler (eski Dashboard) — sidebar'dan profil menüsüne taşındı; aramada
  // sidebar satırlarının hemen ardından.
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

export function HeaderSearch({ onNavigate, onNewChat }) {
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
  const [open, setOpen] = useState(false)

  const go = (path) => {
    onNavigate?.(path)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-tour="search"
          aria-label={t("header.searchAria")}
          className="ml-auto hidden sm:flex items-center gap-2 h-9 px-3 rounded-xl border border-input/80 bg-background/60 text-sm text-muted-foreground hover:bg-accent hover:text-foreground hover:border-input transition shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-56 lg:w-72 relative pointer-coarse:after:absolute pointer-coarse:after:-inset-y-1"
        >
          <HugeiconsIcon icon={Search01Icon} className="size-4 shrink-0" />
          <span className="flex-1 text-left truncate">{t("header.search")}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={6} className="w-[23.75rem] p-0 overflow-hidden">
        <Command className="[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group]]:px-2 [&_[cmdk-input]]:h-10 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-2.5 [&_[cmdk-item]_svg]:h-4 [&_[cmdk-item]_svg]:w-4">
          <CommandInput placeholder={t("header.search")} />
          <CommandList>
            <CommandEmpty>{t("cmd.empty")}</CommandEmpty>

            <CommandGroup heading={t("cmd.groupPages")}>
              {pages.map((p) => (
                <CommandItem key={p.id} value={t(p.labelKey)} onSelect={() => go(p.path)}>
                  <HugeiconsIcon icon={p.icon} />
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
                    setOpen(false)
                  }}
                >
                  <HugeiconsIcon icon={p.icon} />
                  <span className="font-medium">{t(p.labelKey)}</span>
                  <span className="ml-2 truncate text-xs text-muted-foreground">
                    {t(p.subtitleKey)}
                  </span>
                  <HugeiconsIcon
                    icon={ArrowUpRight01Icon}
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
                  setOpen(false)
                }}
              >
                <HugeiconsIcon icon={Add01Icon} />
                <span>{t("nav.quickAction")}</span>
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  toggleTheme()
                  setOpen(false)
                }}
              >
                <HugeiconsIcon icon={theme === "dark" ? Sun03Icon : Moon02Icon} />
                {t("cmd.actionToggleTheme")}
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  toggleLocale()
                  setOpen(false)
                }}
              >
                <HugeiconsIcon icon={LanguageSquareIcon} />
                {t("cmd.actionToggleLocale")}
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
