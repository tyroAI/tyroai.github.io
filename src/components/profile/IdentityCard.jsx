import { useMsal } from "@azure/msal-react"
import { HugeiconsIcon } from "@hugeicons/react"
import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon"
import Briefcase01Icon from "@hugeicons/core-free-icons/Briefcase01Icon"
import Building01Icon from "@hugeicons/core-free-icons/Building01Icon"
import HelpCircleIcon from "@hugeicons/core-free-icons/HelpCircleIcon"
import Location01Icon from "@hugeicons/core-free-icons/Location01Icon"
import Mail01Icon from "@hugeicons/core-free-icons/Mail01Icon"
import Shield01Icon from "@hugeicons/core-free-icons/Shield01Icon"
import SmartPhone01Icon from "@hugeicons/core-free-icons/SmartPhone01Icon"
import { UserAvatar } from "@/components/common/UserAvatar"
import { useIsInGroup, UNKNOWN } from "@/hooks/useIsInGroup"
import { useLocale } from "@/hooks/useLocale"
import { useMe } from "@/hooks/useMe"
import { useMyProfileDetails } from "@/hooks/useMyProfileDetails"
import { ADMIN_GROUP_ID } from "@/lib/constants"
import { isMsalConfigured } from "@/lib/msal"
import { CodeChip, Pill, ProfileCard } from "./primitives"

/**
 * Sayfanın kim olduğunu söyleyen kart — Yetkilerim kartının ÜSTÜNDE durur.
 * tyroTrade'in aynı adlı kartından uyarlandı (2026-09-08).
 *
 * ── ÜÇ KAYNAK, ÜÇ FARKLI GÜVEN DERECESİ ────────────────────────────────
 *
 *  1. `useMe()` — MSAL id-token'ı: ad, UPN, Graph fotoğrafı. Her zaman var.
 *  2. `useMyProfileDetails()` — Graph `/me`: görev, departman, ofis, telefon,
 *     dizin maili. SESSİZ ya da hiç; alınamazsa satırlar hiç çizilmez.
 *     Uydurma yoktur — boş bir "Departman —" satırı, bilgiyi bilmediğimizi
 *     değil, kişinin departmanı olmadığını söylerdi.
 *  3. `useIsInGroup(ADMIN_GROUP_ID)` — yöneticilik. ÜÇ değerli bir cevap:
 *     üye / değil / SORULAMADI. Üçüncüsü ayrı gösteriliyor, çünkü hook'un
 *     kendi docblock'undaki uyarı burada da geçerli — sorulamamış bir soruyu
 *     "hayır" saymak, kullanıcıya olmayan bir ret bildirmek olur.
 *
 * ── MAİL ile UPN AYNI SATIRDA DEĞİL ────────────────────────────────────
 *
 * tyroAI'de bütün erişim kuralları (yönetici zinciri, yönetici grubu) Entra
 * kimliği üzerinden çözülüyor. Dizin maili UPN'den FARKLIYSA ikisi birlikte
 * gösteriliyor ve hangisinin kuralı belirlediği yazıyor: "agent bende
 * kilitli" sorusunda BT'ye yanlış adresi vermek en pahalı hata.
 */

function DetailRow({ icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex min-w-0 items-center gap-2">
      <HugeiconsIcon
        icon={icon}
        className="size-4 shrink-0 text-muted-foreground/70"
        strokeWidth={1.7}
      />
      <span className="sr-only">{label}: </span>
      <span className="min-w-0 truncate text-[0.78125rem] text-muted-foreground" title={value}>
        {value}
      </span>
    </div>
  )
}

export function IdentityCard() {
  const { t } = useLocale()
  const me = useMe()
  const { accounts } = useMsal()
  const { details } = useMyProfileDetails()
  const isAdmin = useIsInGroup(ADMIN_GROUP_ID)

  // Gerçek bir Entra oturumu var mı? `?devauth=1` bypass'ında ve MSAL
  // yapılandırılmamışken `useMe` mock kullanıcıya düşer; kartın kimlik
  // rozetleri o kişiye aitmiş gibi görünmesin.
  const signedIn = isMsalConfigured && accounts.length > 0

  const upn = me.email || ""
  const directoryMail = details?.mail ?? ""
  // Karşılaştırma küçük harfe indirilerek yapılıyor: Entra UPN'leri karışık
  // yazılmış (`Ad.Soyad@…`) ve harf büyüklüğü bir fark değil.
  const mailDiffers =
    directoryMail && upn && directoryMail.trim().toLowerCase() !== upn.trim().toLowerCase()

  return (
    <ProfileCard className="p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
        {/* Fotoğraf varsa Graph'tan gelen kare, yoksa markanın kendi küresi
            ve baş harf (bkz. UserAvatar / PastelOrb). */}
        <div className="size-20 shrink-0 sm:size-24">
          <UserAvatar photoUrl={me.photoUrl} label={me.fullName}>
            <span
              className="select-none text-[1.625rem] font-semibold leading-none"
              style={{ letterSpacing: "-0.02em", color: "var(--avatar-text)" }}
            >
              {me.initials}
            </span>
          </UserAvatar>
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{me.fullName}</h2>
            <a
              href={`mailto:${me.email}`}
              // Dokunma hedefi: kaba işaretçide dikey dolguyla 32px'e çıkar;
              // masaüstünde satır aralığı bozulmasın diye negatif kenar
              // boşluğu YOK.
              className="inline-flex max-w-full items-center gap-1.5 py-0.5 text-[0.8125rem] text-muted-foreground transition hover:text-brand [@media(pointer:coarse)]:py-2"
            >
              <HugeiconsIcon icon={Mail01Icon} className="size-4 shrink-0" strokeWidth={1.7} />
              <span className="truncate font-mono text-[0.78125rem]">{me.email}</span>
            </a>
          </div>

          {/* Durum rozetleri. Yöneticilik ÜÇ değerli — "sorulamadı" ayrı bir
              rozet, çünkü sorulmamış bir soruyu "hayır" diye basmak
              kullanıcıya olmayan bir ret bildirmek olurdu. */}
          <div className="flex flex-wrap items-center gap-2">
            {!signedIn ? (
              <Pill tone="warn" icon={Alert02Icon}>
                {t("profile.session.preview")}
              </Pill>
            ) : isAdmin === true ? (
              <Pill tone="brand" icon={Shield01Icon}>
                {t("profile.admin")}
              </Pill>
            ) : isAdmin === UNKNOWN ? (
              <Pill tone="warn" icon={HelpCircleIcon}>
                {t("profile.adminUnknown")}
              </Pill>
            ) : (
              <Pill tone="muted">{t("profile.notAdmin")}</Pill>
            )}
          </div>

          {/* Dizin kaydı. Graph susarsa bu satırların hiçbiri çizilmez. */}
          {details ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <DetailRow
                icon={Briefcase01Icon}
                label={t("profile.field.jobTitle")}
                value={details.jobTitle}
              />
              <DetailRow
                icon={Building01Icon}
                label={t("profile.field.department")}
                value={details.department}
              />
              <DetailRow
                icon={Location01Icon}
                label={t("profile.field.office")}
                value={details.officeLocation}
              />
              <DetailRow
                icon={SmartPhone01Icon}
                label={t("profile.field.phone")}
                value={details.phone}
              />
            </div>
          ) : null}

          {mailDiffers ? (
            <div className="space-y-1.5 rounded-lg bg-foreground/[0.04] px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.6875rem] text-muted-foreground">
                <span className="font-medium">{t("profile.field.mail")}</span>
                <CodeChip>{directoryMail}</CodeChip>
              </div>
              <p className="text-[0.6875rem] leading-relaxed text-muted-foreground">
                {t("profile.mailDiffers")}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </ProfileCard>
  )
}
