import { useSyncExternalStore } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import PlusSignCircleIcon from "@hugeicons/core-free-icons/PlusSignCircleIcon"
import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon"
import { getUnreadCount, subscribeUnread } from "@/lib/chatBus"
import { getPendingBriefCount, subscribeWarm } from "@/lib/warmStart"
import { DAILY_BRIEF, resolveBriefWindow } from "@/lib/dailyBriefPolicy"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useLocale } from "@/hooks/useLocale"
import { useAnimatedIcon } from "@/hooks/useAnimatedIcon"
import { useFeedUnread } from "@/hooks/useFeedUnread"
import { cn } from "@/lib/utils"

const GROUP_LABEL = "text-[0.625rem] font-medium uppercase tracking-[0.14em] text-muted-foreground"

export function NavMain({ items, activeId, onSelect, onQuickAction }) {
  const { t } = useLocale()
  // Answers that landed while the user was on another page / tab. Read
  // straight from the store rather than threaded down through
  // DashboardLayout → Sidebar, since only this one row cares.
  const unreadAnswers = useSyncExternalStore(subscribeUnread, getUnreadCount, () => 0)
  // Hazırlanmış ama henüz açılmamış gün özeti. Aynı rozet, çünkü kullanıcı
  // için anlam aynı: "sohbette seni bekleyen bir şey var." Kaynak ise AYRI
  // (bkz. getPendingBriefCount) — okunmamış cevap sayacına yazmak, birini
  // temizleyen okumanın ötekini de sessizce temizlemesi demekti.
  const pendingBriefs = useSyncExternalStore(
    subscribeWarm,
    // ⚠️ PENCERE KAPANDIYSA ROZET DE SÖNER. Tampon bellekte durmaya devam
    // ediyor ama dashboard düğmesi pencere dışında özeti ARTIK AÇMIYOR
    // (etiket varsayılana dönüyor), yani yanan bir rozetin tıklanacak bir
    // karşılığı kalmıyordu — 23:55'te ısınıp 00:05'te bakan kullanıcının
    // göreceği şey buydu. Bir göstergenin en kötü hâli, işaret ettiği şeye
    // ulaşılamaması.
    () => (resolveBriefWindow() ? getPendingBriefCount(DAILY_BRIEF.freshMs) : 0),
    () => 0,
  )
  // Gündem Akışının okunmamış gönderi sayısı — AYRI bir kaynak ve ayrı bir
  // satır. Sohbet sayacına eklemek, birini temizleyen okumanın ötekini de
  // sessizce temizlemesi demekti (gün özetinde ölçülmüş aynı hata).
  const feedUnread = useFeedUnread()
  const badgeCount = { chat: unreadAnswers + pendingBriefs, feed: feedUnread }
  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                type="button"
                onClick={() => onQuickAction?.()}
                tooltip={t("nav.quickAction", "Yeni sohbet")}
                className="cursor-pointer bg-gradient-to-r from-brand-from via-brand-via to-brand-to text-brand-on-brand shadow-sm duration-200 ease-linear hover:brightness-110 hover:text-brand-on-brand active:text-brand-on-brand"
              >
                <HugeiconsIcon icon={PlusSignCircleIcon} />
                <span>{t("nav.quickAction", "Yeni sohbet")}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      <SidebarGroup data-tour="nav">
        <SidebarGroupLabel className={GROUP_LABEL}>{t("nav.workspace")}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item) => (
              <NavMainRow
                key={item.id}
                item={item}
                active={activeId === item.id}
                onSelect={onSelect}
                t={t}
                count={badgeCount[item.badge ?? item.id] ?? 0}
              />
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  )
}

/**
 * Tek satır — AYRI bir bileşen, çünkü `useAnimatedIcon` bir hook ve hook
 * `items.map` içinde çağrılamaz. `NavSecondary` aynı sebeple aynı şekli
 * taşıyor; ikisi tek desen.
 *
 * Animasyonu SATIR tetikliyor, ikonun kendi kutusu değil: 20px'lik glif
 * ~180px'lik satırın solunda duruyor ve etikete gelen imleç ona hiç
 * değmiyor — satır aydınlanırken ikon kıpırdamazdı (bkz. useAnimatedIcon).
 */
function NavMainRow({ item, active, onSelect, t, count = 0 }) {
  const { icon, hoverProps } = useAnimatedIcon(item)
  return (
    <SidebarMenuItem className="relative">
      {active && (
        <span
          aria-hidden="true"
          className="absolute -left-2 top-1/2 z-10 h-5 w-[0.1875rem] -translate-y-1/2 rounded-r-full bg-brand shadow-[1px_0_6px_-1px_color-mix(in_oklch,var(--brand-text),transparent_45%)]"
        />
      )}
      <SidebarMenuButton
        isActive={active}
        // External items override the tooltip to mention "opens in a new
        // tab" — the collapsed-rail tooltip is the only affordance
        // icon-only users see.
        tooltip={t(item.tooltipKey ?? item.labelKey)}
        disabled={!!item.comingSoon}
        onClick={() => onSelect(item)}
        {...hoverProps}
        className={cn(active && "text-brand [&_svg]:text-brand font-semibold")}
      >
        {icon}
        {/* Label has explicit collapsed-hide because shadcn's sidebar relies
            on `[&>span:last-child]:hidden` to clear the label on the
            icon-only rail. By adding a trailing external-link icon span
            AFTER the label (for item.isExternal), the label is no longer the
            last child and that rule misses it — so we hide it explicitly
            here. */}
        <span className="flex-1 group-data-[collapsible=icon]:hidden">{t(item.labelKey)}</span>
        {/* Unread answers. Count on the expanded rail; on the icon-only rail
            the label is gone, so it collapses to a dot pinned to the icon's
            corner. */}
        {/* ⚠️ Rozet kaynağı SATIRIN KENDİSİNDEN geliyor (`item.badge`), eskiden
            `item.id === "chat"` diye SABİT kodluydu. İkinci bir rozet için
            ikinci bir sabit dal açmak, üçüncüsünde aynı soruyu yeniden
            sordururdu. */}
        {count > 0 && (
          <>
            <span className="ml-auto inline-flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-brand px-1 text-[0.625rem] font-bold tabular-nums text-white group-data-[collapsible=icon]:hidden">
              {count > 9 ? "9+" : count}
            </span>
            <span
              aria-hidden="true"
              className="absolute right-1.5 top-1.5 hidden size-2 rounded-full bg-brand ring-2 ring-sidebar group-data-[collapsible=icon]:block"
            />
          </>
        )}
        {item.isExternal && (
          <HugeiconsIcon
            icon={ArrowUpRight01Icon}
            className="ml-auto size-3.5 shrink-0 text-muted-foreground/60 group-data-[collapsible=icon]:hidden"
            aria-hidden="true"
          />
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
