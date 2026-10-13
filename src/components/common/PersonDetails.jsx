import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon"
import Building03Icon from "@hugeicons/core-free-icons/Building03Icon"
import Location01Icon from "@hugeicons/core-free-icons/Location01Icon"
import Copy01Icon from "@hugeicons/core-free-icons/Copy01Icon"
import Mail01Icon from "@hugeicons/core-free-icons/Mail01Icon"
import SmartPhone01Icon from "@hugeicons/core-free-icons/SmartPhone01Icon"
import TelephoneIcon from "@hugeicons/core-free-icons/TelephoneIcon"
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon"
import { PersonAvatar } from "@/components/common/PersonAvatar"
import { useLocale } from "@/hooks/useLocale"
import { usePeoplePhotos } from "@/hooks/usePeoplePhotos"
import { cn } from "@/lib/utils"

const LABEL = "block text-[0.625rem] font-medium uppercase tracking-[0.06em] text-muted-foreground"
const telOf = (value) => `tel:${value.replace(/[^\d+]/g, "")}`

/**
 * Kişinin iletişim satırları ve yöneticisi (dizin profili, `usePersonProfile`): e-posta
 * (kopyala), iş ve cep telefonu (`tel:`), şirket · şehir, yöneticisi. `roomy` (bölmede): telefonlar
 * da kopyalanır, dokunmatik hedefler 44 px.
 * Kişi kartı (`PersonCard`) ve Ekibim'in kişi bölmesi paylaşır. Yalnız dizinde olan satırlar
 * çizilir: boş "Telefon —" satırı, telefonu olmadığını değil bilmediğimizi söylerdi. Profil yoksa
 * (yükleniyor, okunamadı) yalnız bilinen adres.
 *
 * `hideCompany`: şirket zaten başlıkta (Ekibim bölmesinin bilgi çipi) — satırda yalnız adres.
 *
 * `className`: iki bloğun (liste, yönetici) her birinin sınıfı. Yönetici satırını çağıran bağlar:
 * `renderManager(manager, row)` (`row(props)` satırı verilen düğme özellikleriyle çizer), yoksa
 * basınca `onManager(manager)`.
 */
export function PersonDetails({
  profile: p,
  address,
  roomy = false,
  hideCompany = false,
  onManager,
  renderManager,
  className,
}) {
  const { t, locale } = useLocale()
  const manager = p?.manager
  const row = (props) => <ManagerRow manager={manager} {...props} />
  const company = hideCompany ? null : p?.company
  return (
    <>
      {(address || p?.phones?.length || p?.mobile || company || p?.city) && (
        <ul className={cn("space-y-0.5", className)}>
          {address && (
            <CopyRow icon={Mail01Icon} label={t("person.email")} value={address} roomy={roomy} />
          )}
          {p?.phones?.map((ph) => (
            <PhoneRow
              key={ph}
              icon={TelephoneIcon}
              label={t("person.phone")}
              value={ph}
              roomy={roomy}
            />
          ))}
          {p?.mobile && (
            <PhoneRow
              icon={SmartPhone01Icon}
              label={t("person.mobile")}
              value={p.mobile}
              roomy={roomy}
            />
          )}
          {(company || p?.city) && (
            <li className="flex items-start gap-2.5 rounded-lg px-2 py-1.5">
              <HugeiconsIcon
                icon={company ? Building03Icon : Location01Icon}
                className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                strokeWidth={1.9}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span className={LABEL} lang={locale}>
                  {t(company ? "person.company" : "person.address")}
                </span>
                <span lang="tr" className="block text-foreground/85 [overflow-wrap:anywhere]">
                  {[company, p.city].filter(Boolean).join(" · ")}
                </span>
              </span>
            </li>
          )}
        </ul>
      )}
      {manager && (
        <div className={className}>
          <p lang={locale} className={cn(LABEL, "px-2 pb-1")}>
            {t("person.manager")}
          </p>
          {renderManager
            ? renderManager(manager, row)
            : row({ onClick: () => onManager?.(manager) })}
        </div>
      )}
    </>
  )
}

function RowText({ label, value }) {
  const { locale } = useLocale()
  return (
    <span className="min-w-0 flex-1">
      <span className={LABEL} lang={locale}>
        {label}
      </span>
      <span className="block text-foreground/85 tabular-nums [overflow-wrap:anywhere]">
        {value}
      </span>
    </span>
  )
}

/** Telefon satırı: kendisi `tel:` bağlantısı; bölmede sağda kopyala düğmesi (masaüstünde arama yok). */
function PhoneRow({ icon, label, value, roomy }) {
  const link = (
    <a
      href={telOf(value)}
      className={cn(
        "flex items-start gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
        roomy && "min-w-0 flex-1 pointer-coarse:min-h-11",
      )}
    >
      <HugeiconsIcon
        icon={icon}
        className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
        strokeWidth={1.9}
        aria-hidden="true"
      />
      <RowText label={label} value={value} />
    </a>
  )
  if (!roomy) return <li>{link}</li>
  return (
    <li className="flex items-center gap-1">
      {link}
      <CopyButton value={value} labelKey="person.copyPhone" roomy />
    </li>
  )
}

/** Adres satırı: metin seçilebilir, sağdaki düğme kopyalar. */
function CopyRow({ icon, label, value, roomy }) {
  return (
    <li className="flex items-center gap-1">
      <span className="flex min-w-0 flex-1 items-start gap-2.5 rounded-lg px-2 py-1.5 select-text">
        <HugeiconsIcon
          icon={icon}
          className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
          strokeWidth={1.9}
          aria-hidden="true"
        />
        <RowText label={label} value={value} />
      </span>
      <CopyButton value={value} labelKey="person.copy" roomy={roomy} />
    </li>
  )
}

function CopyButton({ value, labelKey, roomy }) {
  const { t } = useLocale()
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // Pano kapalı (izin yok) — satırın kendisi seçilebilir metin, kopyalanabilir.
    }
  }
  const label = copied ? t("person.copied") : t(labelKey)
  return (
    <>
      <button
        type="button"
        onClick={copy}
        aria-label={label}
        title={label}
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
          roomy ? "pointer-coarse:size-11" : "[@media(pointer:coarse)]:size-10",
        )}
      >
        <HugeiconsIcon
          icon={copied ? Tick02Icon : Copy01Icon}
          className={cn("size-3.5", copied && "text-emerald-600")}
          strokeWidth={2}
          aria-hidden="true"
        />
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? t("person.copied") : ""}
      </span>
    </>
  )
}

/** Yönetici satırı; `label` verilmezse "kişi kartına geç" (kart içinde yöneticiye geçiş). */
export function ManagerRow({ manager, label, className, ...props }) {
  const { t } = useLocale()
  const photo = usePeoplePhotos(manager.address ? [manager.address] : []).get(manager.address)
  return (
    <button
      type="button"
      aria-label={label ?? t("person.openManager", { name: manager.name })}
      {...props}
      className={cn(
        "group/mgr flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [@media(pointer:coarse)]:min-h-12",
        className,
      )}
    >
      <PersonAvatar name={manager.name} photo={photo} className="size-8" />
      <span className="min-w-0 flex-1">
        <span lang="tr" className="block truncate font-semibold text-foreground/90">
          {manager.name}
        </span>
        {manager.title && (
          <span lang="tr" className="block truncate text-[0.6875rem] text-muted-foreground">
            {manager.title}
          </span>
        )}
      </span>
      <HugeiconsIcon
        icon={ArrowRight01Icon}
        className="size-3.5 shrink-0 text-muted-foreground transition group-hover/mgr:text-foreground"
        strokeWidth={2}
        aria-hidden="true"
      />
    </button>
  )
}
