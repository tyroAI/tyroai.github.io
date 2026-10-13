import { Suspense, lazy } from "react"
import { useNavigate } from "react-router-dom"
import { HugeiconsIcon } from "@hugeicons/react"
import HelpCircleIcon from "@hugeicons/core-free-icons/HelpCircleIcon"
import Logout01Icon from "@hugeicons/core-free-icons/Logout01Icon"
import PaintBoardIcon from "@hugeicons/core-free-icons/PaintBoardIcon"
import SecurityCheckIcon from "@hugeicons/core-free-icons/SecurityCheckIcon"
import TranslateIcon from "@hugeicons/core-free-icons/TranslateIcon"
import UserCircleIcon from "@hugeicons/core-free-icons/UserCircleIcon"
import { UserAvatar } from "@/components/common/UserAvatar"
import {
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"
import { useLocale } from "@/hooks/useLocale"
import { usePalette } from "@/hooks/usePalette"
import { cn } from "@/lib/utils"
import { LOCALES } from "@/providers/LocaleProvider"
import { PaletteOptions, PaletteSwatch } from "../PaletteOptions"
import { BADGE, ITEM } from "./menuStyles"
import { ThemeSegment } from "./ThemeSegment"
import { loadWhatsNewRow } from "./whatsNewRow"

// Parça inemezse satır yine çizilir (kürenin yerinde sade yuva): menüde kaybolan satır
// "Yenilikler nereye gitti?" sorusunu doğururdu.
const WhatsNewMenuRow = lazy(() =>
  loadWhatsNewRow().catch(() => ({ default: WhatsNewRowFallback })),
)

function WhatsNewRowFallback({ unread = 0 }) {
  const { t } = useLocale()
  const navigate = useNavigate()
  return (
    <DropdownMenuItem className={ITEM} onClick={() => navigate("/whats-new")}>
      <span aria-hidden="true" className="-my-1 block size-9 shrink-0 rounded-full bg-brand/10" />
      <span className="flex-1">{t("whatsNew.title")}</span>
      {unread > 0 && (
        <span className={cn(BADGE, "bg-badge !text-badge-foreground")}>
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </DropdownMenuItem>
  )
}

/**
 * Kullanıcı menüsü (kenar çubuğunun altındaki düğme açar): başlık [avatar · ad (+ Yönetici) ·
 * e-posta] · [Profil, Güvenlik, Yardım] · [Tema, Renk paleti, Dil] · [Yenilikler] · [Çıkış]. Tema/palet/dil header'dan buraya taşındı (tek yer).
 */
export function UserMenuContent({
  me,
  isAdmin,
  securityTo,
  openRequests,
  unreadChangelog,
  navigate,
  onSignOut,
  side,
}) {
  const { t, locale, setLocale } = useLocale()
  const { palette, palettes } = usePalette()
  const current = palettes.find((p) => p.id === palette)

  return (
    <DropdownMenuContent
      side={side}
      align="end"
      sideOffset={6}
      className="w-[15.5rem] rounded-[10px] p-1"
    >
      <DropdownMenuLabel className="p-0 font-normal">
        <div className="flex items-center gap-2.5 p-2">
          {/* Ad hemen yanında: avatar süs (menünün çocuğu olarak "img" rolü taşımasın). */}
          <div aria-hidden="true" className="size-[2.125rem] shrink-0">
            <UserAvatar photoUrl={me.photoUrl} label={me.fullName} />
          </div>
          <div className="grid min-w-0 flex-1 gap-0.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-[0.8125rem] font-medium leading-tight text-foreground">
                {me.fullName}
              </span>
              {isAdmin && (
                <span className="h-[1.0625rem] min-w-0 shrink truncate rounded-[4px] border-[0.5px] border-border bg-foreground/[0.04] px-[5px] text-[0.6875rem] font-medium leading-4 text-muted-foreground">
                  {t("user.roleAdmin")}
                </span>
              )}
            </div>
            <span className="truncate text-xs text-muted-foreground">{me.email}</span>
          </div>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />

      <DropdownMenuGroup>
        <DropdownMenuItem className={ITEM} onClick={() => navigate("/profile")}>
          <HugeiconsIcon icon={UserCircleIcon} strokeWidth={1.8} />
          {t("user.profile")}
        </DropdownMenuItem>
        {securityTo && (
          <DropdownMenuItem className={ITEM} onClick={() => navigate(securityTo)}>
            <HugeiconsIcon icon={SecurityCheckIcon} strokeWidth={1.8} />
            {t("nav.security")}
            {openRequests > 0 && (
              <span className={cn(BADGE, "bg-amber-500/20 text-amber-700 dark:text-amber-300")}>
                {openRequests}
              </span>
            )}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem className={ITEM} onClick={() => navigate("/help")}>
          <HugeiconsIcon icon={HelpCircleIcon} strokeWidth={1.8} />
          {t("nav.help")}
        </DropdownMenuItem>
      </DropdownMenuGroup>
      {/* Yönetici bölümü (Çözümler, Pano) menüde yok: sayfalar adresle açılır, kapıları
          aynı (`lib/pageAccess.js`). */}
      <DropdownMenuSeparator />

      <ThemeSegment />
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className={ITEM}>
          <HugeiconsIcon icon={PaintBoardIcon} strokeWidth={1.8} />
          <span className="flex-1">{t("palette.title")}</span>
          {current && <PaletteSwatch colors={current.swatch} solid={current.group === "solid"} />}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="max-h-[min(70dvh,26rem)] w-56 overflow-y-auto">
          <PaletteOptions />
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className={ITEM}>
          <HugeiconsIcon icon={TranslateIcon} strokeWidth={1.8} />
          <span className="flex-1">{t("header.language")}</span>
          <span className="text-[0.6875rem] font-medium uppercase text-muted-foreground">
            {locale}
          </span>
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="w-44">
          <DropdownMenuRadioGroup value={locale} onValueChange={setLocale}>
            {LOCALES.map((code) => (
              <DropdownMenuRadioItem key={code} value={code} className="pointer-coarse:min-h-11">
                {t(`locale.${code}`)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuSeparator />

      <Suspense fallback={<WhatsNewRowFallback unread={unreadChangelog} />}>
        <WhatsNewMenuRow unread={unreadChangelog} />
      </Suspense>
      <DropdownMenuSeparator />

      {/* Çıkış yıkıcı değil: öteki satırlar gibi nötr (referans menünün kuralı). */}
      <DropdownMenuItem className={ITEM} onClick={onSignOut}>
        <HugeiconsIcon icon={Logout01Icon} strokeWidth={1.8} />
        {t("user.signout")}
      </DropdownMenuItem>
    </DropdownMenuContent>
  )
}
