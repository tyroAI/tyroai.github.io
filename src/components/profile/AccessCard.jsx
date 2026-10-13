import { useState } from "react"
import { useMsal } from "@azure/msal-react"
import { HugeiconsIcon } from "@hugeicons/react"
import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon"
import CheckmarkCircle02Icon from "@hugeicons/core-free-icons/CheckmarkCircle02Icon"
import Copy01Icon from "@hugeicons/core-free-icons/Copy01Icon"
import HelpCircleIcon from "@hugeicons/core-free-icons/HelpCircleIcon"
import Settings02Icon from "@hugeicons/core-free-icons/Settings02Icon"
import SquareLock02Icon from "@hugeicons/core-free-icons/SquareLock02Icon"
import { IconOrLogo } from "@/components/common/IconOrLogo"
import { useConfig } from "@/hooks/useConfig"
import { useIsInGroup, UNKNOWN } from "@/hooks/useIsInGroup"
import { useLocale } from "@/hooks/useLocale"
import { useMe } from "@/hooks/useMe"
import { ADMIN_GROUP_ID } from "@/lib/constants"
import { isMsalConfigured } from "@/lib/msal"
import { Block, CardHead, CodeChip, Pill, ProfileCard } from "./primitives"

/**
 * "Yetkilerim" — kullanıcının kendi oturumunda çözümlenen erişimi.
 *
 * tyroTrade'in aynı adlı kartından uyarlandı (2026-09-08). Orada satırlar
 * SAYFA, burada ASİSTAN.
 *
 * ⚠️ **ASİSTAN KİLİDİ KALDIRILDI (2026-09-10, istek üzerine).** Bir zamanlar
 * bazı asistanlar Entra YÖNETİCİ ZİNCİRİNE göre kilitleniyordu ve bu kartın
 * asıl işi o kilidi görünür kılmaktı. Artık katalogda açık olan her asistan
 * herkese açık: satırlar "açık" olarak listeleniyor ve liste bir YETKİ
 * raporu değil, kullanıcının gerçekten görebildiği asistanların dökümü.
 *
 * ── NEDEN HÂLÂ VAR ─────────────────────────────────────────────────────
 *
 * Katalog sekmeleri (Ayarlar) hâlâ Entra GRUP ÜYELİĞİNDEN okunuyor
 * (`useIsInGroup`) ve bu SESSİZCE yanlış davranabilir: üyelik okunamazsa
 * sekmeler hiç görünmez, kullanıcı "yok" görür ve sebebini göremez.
 *
 * Bu kart o sebebi gösteriyor: ham kimlik + asistan dökümü + katalog
 * sekmelerinin üç değerli cevabı. Test yöntemi
 * tyroTrade'dekiyle aynı: "Profilim'i aç, Kopyala'ya bas, bana yapıştır."
 * Şifre paylaşımı yok, taklit yok, gerçek token.
 *
 * ── TASARIM KARARLARI ──────────────────────────────────────────────────
 *
 * **Herkese açık, yöneticiye özel değil.** "Ben ne görebiliyorum" sorusu
 * her kullanıcının kendi sorusu ve cevabı gizli bir bilgi değil.
 *
 * **Kilitli asistanlar da listelenir**, üstü çizili değil ama soluk ve
 * işaretsiz. Yalnızca açık olanları göstermek, "TYRO Trader diye bir
 * asistan var mı?" sorusunu cevapsız bırakırdı — ve dashboard'da kilitli
 * kart zaten görünüyor, burada gizlemek iki yüzeyi çelişkiye sokardı.
 *
 * **"Sorulamadı" bir cevap DEĞİL.** `useIsInGroup` üç değerli döner ve
 * üçüncüsü kendi rozetiyle yazılıyor; ret ile karıştırmak, BT'ye yanlış
 * soruyu sordurur.
 *
 * **Kopyala düğmesi düz metin üretir.** Ekran görüntüsü yerine metin:
 * Teams'e yapıştırılabiliyor, aranabiliyor ve UPN harf harf okunabiliyor —
 * bir küçük-L / büyük-i karışıklığı görüntüde fark edilmez.
 */

function AgentRow({ agent }) {
  const { t } = useLocale()
  return (
    <li className="flex items-center gap-3 py-2.5">
      <HugeiconsIcon
        icon={CheckmarkCircle02Icon}
        className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
        strokeWidth={2}
      />
      <span className="grid size-6 shrink-0 place-items-center overflow-hidden rounded-md text-muted-foreground">
        <IconOrLogo iconName={agent.iconName} logo={agent.logo} className="size-4" alt="" />
      </span>
      <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium text-foreground">
        {agent.name}
      </span>
      <Pill tone="success" className="shrink-0">
        {t("profile.agents.open")}
      </Pill>
    </li>
  )
}

/** Panelin gösterdiği her şeyin düz metin hâli — Kopyala bunu üretir. */
function asPlainText({ upn, agents, manage, t }) {
  return [
    `${t("profile.session")}: ${upn || "—"}`,
    `${t("profile.manage")}: ${manage}`,
    `${t("profile.agents")}:`,
    ...(agents.length
      ? agents.map((a) => `  ✓ ${a.name} — ${t("profile.agents.open")}`)
      : [`  ${t("profile.agents.empty")}`]),
  ].join("\n")
}

export function AccessCard() {
  const { t } = useLocale()
  const me = useMe()
  const { accounts } = useMsal()
  const { agents } = useConfig()
  const isAdmin = useIsInGroup(ADMIN_GROUP_ID)
  const [copied, setCopied] = useState(false)

  const signedIn = isMsalConfigured && accounts.length > 0
  const upn = signedIn ? me.email : ""

  const manageLabel =
    isAdmin === true
      ? t("profile.manage.open")
      : isAdmin === UNKNOWN
        ? t("profile.manage.unknown")
        : t("profile.manage.closed")

  async function copy() {
    try {
      await navigator.clipboard?.writeText(asPlainText({ upn, agents, manage: manageLabel, t }))
      setCopied(true)
      // Onay geçici: kalıcı bir "Kopyalandı" ikinci kopyalamanın çalışıp
      // çalışmadığını söylemez.
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Pano izni yoksa (bazı tarayıcılar HTTP'de reddeder) sessiz kal —
      // metin ekranda zaten okunabilir durumda.
    }
  }

  return (
    <ProfileCard>
      <CardHead
        icon={SquareLock02Icon}
        title={t("profile.access.title")}
        subtitle={t("profile.access.subtitle")}
        action={
          <button
            type="button"
            onClick={copy}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand-deep px-3.5 text-[0.8125rem] font-semibold text-white shadow-sm outline-none transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-brand-via/40 active:scale-[0.98]"
          >
            <HugeiconsIcon icon={Copy01Icon} size={15} strokeWidth={2} />
            {copied ? t("profile.access.copied") : t("profile.access.copy")}
          </button>
        }
      />

      <div className="divide-y divide-border/60">
        {/* Oturum: bütün kuralların çözüldüğü HAM kimlik. Mono, çünkü harf
            harf okunacak. */}
        <Block label={t("profile.session")} hint={t("profile.session.hint")}>
          <div className="flex flex-wrap items-center gap-2">
            <CodeChip>{upn || "—"}</CodeChip>
            {signedIn ? (
              <Pill tone="success" icon={CheckmarkCircle02Icon}>
                {me.fullName}
              </Pill>
            ) : (
              <Pill tone="warn" icon={Alert02Icon}>
                {t("profile.session.preview")}
              </Pill>
            )}
          </div>
        </Block>

        {/* Katalog sekmeleri: Entra GRUP üyeliği. Üç değerli. */}
        <Block label={t("profile.manage")} hint={t("profile.manage.hint")}>
          <div className="flex flex-wrap items-center gap-2">
            <HugeiconsIcon
              icon={Settings02Icon}
              className="size-4 shrink-0 text-muted-foreground"
              strokeWidth={1.7}
            />
            {isAdmin === true ? (
              <Pill tone="success" icon={CheckmarkCircle02Icon}>
                {manageLabel}
              </Pill>
            ) : isAdmin === UNKNOWN ? (
              <Pill tone="warn" icon={HelpCircleIcon}>
                {manageLabel}
              </Pill>
            ) : (
              <Pill tone="muted">{manageLabel}</Pill>
            )}
          </div>
          {isAdmin === UNKNOWN ? (
            <p className="text-[0.6875rem] leading-relaxed text-muted-foreground">
              {t("profile.manage.unknownHint")}
            </p>
          ) : null}
        </Block>

        {/* Asistanlar: Entra YÖNETİCİ ZİNCİRİ. Kilitliler de listelenir. */}
        <Block label={t("profile.agents")} hint={t("profile.agents.hint")}>
          {agents.length === 0 ? (
            <p className="text-[0.8125rem] text-muted-foreground/70">{t("profile.agents.empty")}</p>
          ) : (
            <ul className="-my-1 divide-y divide-border/40">
              {agents.map((agent) => (
                <AgentRow key={agent.id} agent={agent} />
              ))}
            </ul>
          )}
        </Block>
      </div>

      <div className="px-5 pb-5">
        <p className="rounded-lg bg-foreground/[0.04] px-3 py-2.5 text-[0.6875rem] leading-relaxed text-muted-foreground">
          {t("profile.access.hint")}
        </p>
      </div>
    </ProfileCard>
  )
}
