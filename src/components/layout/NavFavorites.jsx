import { HugeiconsIcon } from "@hugeicons/react"
import HeartRemoveIcon from "@hugeicons/core-free-icons/HeartRemoveIcon"
import { AnimatePresence, motion } from "motion/react"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { IconOrLogo } from "@/components/common/IconOrLogo"
import { useLocale } from "@/hooks/useLocale"
import { useFavorites } from "@/hooks/useFavorites"
import { safeExternalUrl } from "@/lib/utils"

const GROUP_LABEL = "text-[0.625rem] font-medium uppercase tracking-[0.14em] text-muted-foreground"

function FavoriteItem({ item, onOpenChat, onRemove }) {
  const { t } = useLocale()
  const { isMobile, setOpenMobile } = useSidebar()
  const isAgent = item.kind === "agent"

  const open = () => {
    if (isMobile) setOpenMobile(false)
    if (isAgent) {
      onOpenChat?.(item.id)
      return
    }
    const safe = safeExternalUrl(item.url)
    if (safe !== "#") window.open(safe, "_blank", "noopener,noreferrer")
  }

  return (
    <SidebarMenuItem>
      <Tooltip>
        <TooltipTrigger asChild>
          <SidebarMenuButton type="button" onClick={open} className="cursor-pointer">
            <span className="grid size-5 shrink-0 place-items-center overflow-hidden rounded-[0.3125rem]">
              <IconOrLogo
                iconName={item.iconName}
                logo={item.logo}
                strokeWidth={1.6}
                className="size-5"
              />
            </span>
            <span className="truncate">{item.name}</span>
          </SidebarMenuButton>
        </TooltipTrigger>
        {item.description && !isMobile && (
          <TooltipContent side="right" sideOffset={12} className="max-w-xs">
            <p className="leading-relaxed text-background">{item.description}</p>
          </TooltipContent>
        )}
      </Tooltip>
      {/* Çıkarma tek tıkla, menü ardında değil: favori listesi zaten
          kullanıcının kendi kurduğu kısa bir liste, oradan bir şey atmak
          iki adım istemeyecek kadar sıradan bir iş. */}
      <SidebarMenuAction
        showOnHover
        onClick={onRemove}
        aria-label={t("favorites.remove")}
        title={t("favorites.remove")}
        className="rounded-sm hover:text-brand"
      >
        <HugeiconsIcon icon={HeartRemoveIcon} />
      </SidebarMenuAction>
    </SidebarMenuItem>
  )
}

export function NavFavorites({ onOpenChat }) {
  const { t } = useLocale()
  const { items, toggle } = useFavorites()

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel className={GROUP_LABEL}>{t("nav.favorites")}</SidebarGroupLabel>
      <SidebarMenu>
        {/* Boşken de duruyor — bölümün varlığı, kartlardaki kalbin nereye
            yazdığını anlatan tek ipucu. Görünmez bir bölüm keşfedilemez. */}
        {items.length === 0 ? (
          <SidebarMenuItem>
            <p className="px-2 py-1.5 text-[0.6875rem] leading-snug text-muted-foreground">
              {t("favorites.empty")}
            </p>
          </SidebarMenuItem>
        ) : (
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <motion.div
                key={`${item.kind}:${item.id}`}
                initial={{ opacity: 0, y: -4, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -4, height: 0 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <FavoriteItem
                  item={item}
                  onOpenChat={onOpenChat}
                  onRemove={() => toggle(item.kind, item)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </SidebarMenu>
    </SidebarGroup>
  )
}
