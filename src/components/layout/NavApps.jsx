import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import MoreHorizontalIcon from "@hugeicons/core-free-icons/MoreHorizontalIcon"
import LinkSquare02Icon from "@hugeicons/core-free-icons/LinkSquare02Icon"
import FavouriteIcon from "@hugeicons/core-free-icons/FavouriteIcon"
import HeartRemoveIcon from "@hugeicons/core-free-icons/HeartRemoveIcon"
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { useConfig } from "@/hooks/useConfig"
import { useAppLock } from "@/hooks/useAuthorizations"
import { appliesTo } from "@/lib/appLockPolicy"
import { useFavorites } from "@/hooks/useFavorites"
import { cn, safeExternalUrl } from "@/lib/utils"

const GROUP_LABEL = "text-[0.625rem] font-medium uppercase tracking-[0.14em] text-muted-foreground"
// Kaç girdi katlanmadan gösterilir.
//
// Yol: 3 → 5 (2026-08-21, istek üzerine: iki grup birden katlanınca
// sidebar'ın yarısı "daha fazla" düğmesinden oluşuyordu) → **3** (2026-09-15,
// istek üzerine: "max 3 uygulamadan sonra x tane daha olarak görünsün").
//
// ⚠️ İkinci karar birincisini GERİ ALIYOR ve sonucu bilinçli: tohum
// katalogda AI 6, İş 4 uygulama var, yani 5'te yalnız AI katlanıyordu —
// 3'te İKİSİ DE katlanıyor ve sidebar'da iki "daha fazla" düğmesi birden
// duruyor. 2026-08-21'de kaçınılan durum tam olarak bu; kullanıcı bu kez
// kısalığı seçti.
//
// Sayı TEK yerde: iki grup da (`NavApps`) aynı `AppGroup`tan geçiyor, yani
// daha da kısaltmak ya da bir gruba özel eşik vermek bu satırdan başlar.
const COLLAPSE_THRESHOLD = 3

function AppItem({ app, kind }) {
  const { t } = useLocale()
  const { isMobile, setOpenMobile } = useSidebar()
  const { isFavorite, toggle } = useFavorites()
  const favorite = isFavorite(kind, app)
  const href = safeExternalUrl(app.url)
  // Tap on app row should also close the mobile sheet (the user is leaving
  // for an external tab; the sheet would still be open behind it on return).
  const closeOnTap = () => {
    if (isMobile) setOpenMobile(false)
  }
  return (
    <SidebarMenuItem>
      <Tooltip>
        <TooltipTrigger asChild>
          <SidebarMenuButton asChild>
            <a href={href} target="_blank" rel="noopener noreferrer" onClick={closeOnTap}>
              <span className="grid size-5 shrink-0 place-items-center overflow-hidden rounded-[0.3125rem]">
                <IconOrLogo
                  iconName={app.iconName}
                  logo={app.logo}
                  strokeWidth={1.6}
                  className="size-5"
                />
              </span>
              <span>{app.name}</span>
            </a>
          </SidebarMenuButton>
        </TooltipTrigger>
        {app.description && !isMobile && (
          <TooltipContent side="right" sideOffset={12} className="max-w-xs">
            <p className="leading-relaxed text-background">{app.description}</p>
          </TooltipContent>
        )}
      </Tooltip>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction showOnHover className="rounded-sm data-[state=open]:bg-accent">
            <HugeiconsIcon icon={MoreHorizontalIcon} />
            <span className="sr-only">{t("nav.more")}</span>
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-44 rounded-lg"
          side={isMobile ? "bottom" : "right"}
          align={isMobile ? "end" : "start"}
        >
          <DropdownMenuItem asChild>
            <a href={href} target="_blank" rel="noopener noreferrer" onClick={closeOnTap}>
              <HugeiconsIcon icon={LinkSquare02Icon} />
              <span>{t("apps.openExternal")}</span>
            </a>
          </DropdownMenuItem>
          {/* "Yer imine ekle" buradaydı ve HİÇBİR ŞEY yapmıyordu — tıklayan
              kullanıcı bir yere eklendiğini sanıp o yeri arıyordu. Aynı
              satır artık kartlardaki kalple aynı listeye yazıyor. */}
          <DropdownMenuItem onSelect={() => toggle(kind, app)}>
            <HugeiconsIcon icon={favorite ? HeartRemoveIcon : FavouriteIcon} />
            <span>{favorite ? t("favorites.remove") : t("favorites.add")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}

function AppGroup({ titleKey, apps, kind }) {
  const { t } = useLocale()
  const [expanded, setExpanded] = useState(false)

  if (apps.length === 0) return null

  const overflow = apps.length > COLLAPSE_THRESHOLD
  // İlk N HER ZAMAN çizilir; kalanı yalnız açıkken, aşağıdaki
  // `AnimatePresence` bloğunda. (Eskiden burada bir `visible` vardı ve
  // "açıkken tüm liste" dalı hemen altında yeniden dilimleniyordu — aynı
  // sonucu veren ama iki yerde eşik taşıyan yanıltıcı bir ara değişken.)
  const head = apps.slice(0, COLLAPSE_THRESHOLD)
  const hiddenCount = apps.length - COLLAPSE_THRESHOLD

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel className={GROUP_LABEL}>{t(titleKey)}</SidebarGroupLabel>
      <SidebarMenu>
        {head.map((app) => (
          <AppItem key={app.id} app={app} kind={kind} />
        ))}
        <AnimatePresence initial={false}>
          {expanded &&
            apps.slice(COLLAPSE_THRESHOLD).map((app, i) => (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: -4, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -4, height: 0 }}
                transition={{ duration: 0.22, delay: i * 0.025, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <AppItem app={app} kind={kind} />
              </motion.div>
            ))}
        </AnimatePresence>
        {overflow && (
          <SidebarMenuItem>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className={cn(
                "group/more relative mt-0.5 flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1.5",
                "text-[0.6875rem] font-medium tracking-tight text-muted-foreground transition",
                "hover:bg-sidebar-accent/40 hover:text-foreground",
              )}
            >
              <span>
                {expanded
                  ? t("nav.showLess")
                  : t("nav.showMore").replace("{count}", String(hiddenCount))}
              </span>
              <motion.span
                animate={{ rotate: expanded ? 180 : 0 }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                className="inline-flex"
              >
                <HugeiconsIcon icon={ArrowDown01Icon} className="size-3" strokeWidth={2} />
              </motion.span>
            </button>
          </SidebarMenuItem>
        )}
      </SidebarMenu>
    </SidebarGroup>
  )
}

/**
 * ⚠️ **KİLİTLİ UYGULAMA SIDEBAR'DA GÖRÜNMEZ** (2026-09-17, istek üzerine:
 * "erişimim olmayan şeyi sidebarda görememeliyim").
 *
 * Dashboard kartı kilitli görünmeye DEVAM ediyor ve bu bir çelişki değil,
 * iki yüzeyin iki farklı sorusu: dashboard KATALOG ("neler var, nasıl
 * isterim" — talep düğmesi orada), sidebar GİDİLECEK YERLER listesi.
 * Açılmayan bir satırı kısayol listesinde tutmak, her tıklamada aynı
 * duvara çarptırmak olurdu.
 *
 * ⚠️ Kilit ÇÖZÜLENE KADAR süzme YAPILMAZ (`useAppLock` beklerken `isLocked`
 * hep false): liste bir an dolu görünüp kısalıyor. Tersi — boş başlayıp
 * dolmak — sidebar'ı her açılışta bir kare boş göstermek olurdu.
 *
 * ⚠️ İş uygulamaları kilit kapsamı dışında (`appliesTo`), o yüzden o grup
 * hiç süzülmüyor — kapsamın tek kaynağı `lib/appLockPolicy.js`.
 */
export function NavApps() {
  const { aiApps, businessApps } = useConfig()
  const lock = useAppLock()
  const openAiApps = useMemo(
    () => (appliesTo("aiApp") ? aiApps.filter((a) => !lock.isLocked(a.name)) : aiApps),
    [aiApps, lock],
  )
  return (
    <>
      <AppGroup titleKey="nav.appsAI" apps={openAiApps} kind="aiApp" />
      <AppGroup titleKey="nav.appsBusiness" apps={businessApps} kind="businessApp" />
    </>
  )
}
