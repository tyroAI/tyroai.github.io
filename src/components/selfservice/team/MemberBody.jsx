import { useEffect, useMemo, useRef } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import AiChat02Icon from "@hugeicons/core-free-icons/AiChat02Icon"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import { PersonActions } from "@/components/common/PersonActions"
import { useLocale } from "@/hooks/useLocale"
import { buildProfile } from "@/lib/selfServiceProfile"
import { ProfileHeader } from "../header/ProfileHeader"
import { MemberContact } from "./MemberContact"
import { MemberLeaves } from "./MemberLeaves"
import { MemberSoon } from "./MemberSoon"
import { relationTitle } from "./teamText"

/**
 * KİŞİ BÖLMESİ'nin gövdesi (bölme ve çekmece ortak), ayrı bir kişi kartı olmadan tek yerde: profil
 * başlığı (Graph; sicil ERP'den tamamlanır), dört eylem (Sohbet · E-posta · Ara · Toplantı),
 * "Yaklaşanlar" (sıradaki izin, doğum günü, iş yıl dönümü), "İletişim" (kişi kartının satırları ve
 * yöneticisi), izinler (`MemberLeaves`: bakiye ve tür yalnız bana bağlıda) ve tek "TYRO'ya sor".
 * Ekibin masrafı, avansı ve izin açıklaması gösterilmez. `focusOnMount`: bölme başka bir üyeye
 * geçtiyse (yönetici satırı) odak ve kaydırma yeni kişinin başına.
 */
export function MemberBody({ row, rows, today, status, onAsk, onClose, onSwitch, focusOnMount }) {
  const { t } = useLocale()
  const rootRef = useRef(null)
  const p = row.person
  const report = row.relation === "report"
  const profile = useMemo(
    () => ({
      ...buildProfile({
        graph: p,
        worker: row.personnel ? { personnel: row.personnel } : null,
      }),
      status: "ready",
    }),
    [p, row.personnel],
  )
  const question = t(
    report
      ? "selfService.team.ask.member"
      : row.relation === "manager"
        ? "selfService.team.ask.manager"
        : "selfService.team.ask.teammate",
    { name: p.name, address: p.address },
  )

  useEffect(() => {
    if (!focusOnMount) return
    const el = rootRef.current
    el?.focus({ preventScroll: true })
    el?.scrollIntoView({ block: "start" })
  }, [focusOnMount])

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      role="group"
      aria-label={p.name}
      className="@container/ss flex flex-1 flex-col outline-none"
    >
      {onClose && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-[0.75rem] font-medium text-muted-foreground">
            {relationTitle(row.relation, t)}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("selfService.close")}
            className="-me-1.5 grid size-9 place-items-center rounded-full text-muted-foreground transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 pointer-coarse:size-11"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="size-4" strokeWidth={2} />
          </button>
        </div>
      )}
      <ProfileHeader profile={profile} level={2} self={false} wrapMeta className="rounded-2xl" />
      <PersonActions address={p.address} upn={p.upn} className="mt-2" />
      <MemberSoon row={row} today={today} status={status} />
      <MemberContact person={p} rows={rows} onSwitch={onSwitch} />
      <MemberLeaves row={row} today={today} status={status} />
      <div className="mt-auto pt-6">
        <button
          type="button"
          onClick={() => onAsk(question)}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand-fill-deep px-3 text-[0.8125rem] font-semibold text-brand-on-brand transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 pointer-coarse:h-11"
        >
          <HugeiconsIcon icon={AiChat02Icon} className="size-4" strokeWidth={1.9} />
          {t("selfService.askTyro")}
        </button>
      </div>
    </div>
  )
}
