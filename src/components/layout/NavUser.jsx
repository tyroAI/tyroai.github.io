import { HugeiconsIcon } from "@hugeicons/react"
import UnfoldMoreIcon from "@hugeicons/core-free-icons/UnfoldMoreIcon"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { UserAvatar } from "@/components/common/UserAvatar"
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useIsAppAdmin, useOpenRequestCount } from "@/hooks/useAuthorizations"
import { useIsInGroup } from "@/hooks/useIsInGroup"
import { useLocale } from "@/hooks/useLocale"
import { useMe } from "@/hooks/useMe"
import { useMyProfileDetails } from "@/hooks/useMyProfileDetails"
import { useSignOut } from "@/hooks/useSignOut"
import { ADMIN_GROUP_ID } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { UserButtonText } from "./user-menu/UserButtonText"
import { UserMenuContent } from "./user-menu/UserMenuContent"
import { loadWhatsNewRow } from "./user-menu/whatsNewRow"

/**
 * Kenar çubuğunun altındaki kullanıcı düğmesi: avatar (üstünde rozet) · ad · ünvan (yoksa
 * e-posta) · aç/kapa oku; menüsü `UserMenuContent`. Rozet iki sayıyı toplar (okunmamış
 * yenilik + bekleyen talep) — hangisi olduğunu menünün satırları söyler; kenar çubuğu
 * daralınca yalnız avatar kalır ve rozet orada görünür. Talep varsa kehribar.
 *
 * @param unreadChangelog okunmamış yenilik sayısı (`Sidebar` sayar, tek sayaç).
 */
export function NavUser({ unreadChangelog = 0 }) {
  const { isMobile, setOpenMobile } = useSidebar()
  const { t } = useLocale()
  const me = useMe()
  const { details } = useMyProfileDetails()
  // Güvenlik iki kapıdan biriyle görünür: Entra yönetici grubu ya da yetki yöneticisi
  // (`tyro_isadmin`). Yetki yöneticisi bekleyen talep varsa doğrudan o sekmeye gider.
  const isAdmin = useIsInGroup(ADMIN_GROUP_ID) === true
  const isAuthzAdmin = useIsAppAdmin() === true
  const openRequests = useOpenRequestCount()
  const badgeTotal = unreadChangelog + openRequests
  const securityTo = isAuthzAdmin
    ? openRequests > 0
      ? "/security?tab=requests"
      : "/security"
    : isAdmin
      ? "/security?tab=app"
      : null
  const navigateTo = useNavigate()
  // Telefonda çekmece de kapanır; aynı sayfa seçilince rota değişmez, Sidebar'ın kuralı tetiklenmez.
  const navigate = (to) => {
    navigateTo(to)
    if (isMobile) setOpenMobile(false)
  }
  const handleSignOut = useSignOut()
  const prefetch = () => void loadWhatsNewRow().catch(() => {})
  // İpucu menü açıkken susar (ikisi aynı köşeden açılır).
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              onPointerEnter={prefetch}
              onFocus={prefetch}
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center"
            >
              <div className="relative -ms-1 size-8 shrink-0 group-data-[collapsible=icon]:ms-0 group-data-[collapsible=icon]:size-6">
                <UserAvatar photoUrl={me.photoUrl} label={me.fullName} />
                {badgeTotal > 0 && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute -right-1 -top-1 grid min-w-[1rem] place-items-center rounded-full px-0.5 text-[0.5625rem] font-bold leading-4 tabular-nums ring-2 ring-sidebar",
                      openRequests > 0
                        ? "bg-amber-500 text-white"
                        : "bg-badge text-badge-foreground",
                    )}
                  >
                    {badgeTotal > 9 ? "9+" : badgeTotal}
                  </span>
                )}
              </div>
              {unreadChangelog > 0 && (
                <span className="sr-only">{t("user.badge.news", { n: unreadChangelog })}</span>
              )}
              {openRequests > 0 && (
                <span className="sr-only">{t("user.badge.requests", { n: openRequests })}</span>
              )}
              <UserButtonText
                name={me.fullName}
                subtitle={details?.jobTitle || me.email}
                menuOpen={menuOpen}
              />
              <HugeiconsIcon
                icon={UnfoldMoreIcon}
                strokeWidth={1.8}
                className="ms-auto size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden"
              />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <UserMenuContent
            me={me}
            isAdmin={isAdmin}
            securityTo={securityTo}
            openRequests={openRequests}
            unreadChangelog={unreadChangelog}
            navigate={navigate}
            onSignOut={handleSignOut}
            side={isMobile ? "bottom" : "right"}
          />
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
