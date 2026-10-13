import { useId } from "react"
import { PersonAvatar } from "@/components/common/PersonAvatar"
import { useLocale } from "@/hooks/useLocale"
import { usePeoplePhotos } from "@/hooks/usePeoplePhotos"
import { usePresence } from "@/hooks/usePresence"
import { metaOf } from "@/lib/selfServiceProfile"
import { cn } from "@/lib/utils"
import { MetaChips, MetaChipsSkeleton } from "./MetaChips"
import { ProfileStats } from "./ProfileStats"

// Çip sırasının yeri: dar kapta tam en, genişte adın sütunu.
const CHIPS_AT =
  "col-span-2 mt-2.5 @[40rem]/ss:col-span-1 @[40rem]/ss:col-start-2 @[40rem]/ss:mt-1.5"

/**
 * KOMPAKT PROFİL BAŞLIĞI — ERP self servisinin başlığının karşılığı: solda avatar (Graph
 * fotoğrafı + varlık noktası, yoksa baş harfler), ad, sicil, altında unvan ve etiketli bilgi
 * çipleri (şirket, departman, ofis, çalışan tipi; dar kapta avatarın altından tam en); sağda
 * istatistikler (hizmet süresi, bağlı olunan kişi); altta isteğe bağlı şerit: görünüm anahtarı
 * (`views`) ve eylemler (`actions`).
 *
 * Kişiden bağımsız: Self Servis'te kişinin kendisi (`useSelfServiceProfile`), Ekibim'in kişi
 * bölmesinde ekip üyesi (`buildProfile` biçimi). Palet yalnız ince şeritte ve zemindeki
 * hafif yıkamada; yazı kartın kendi renginde (AA her palette).
 *
 * @param {object} p
 * @param {object} p.profile `buildProfile` biçimi + `status`, `pending` (isteğe bağlı)
 * @param {1|2|3} [p.level] ad başlığının düzeyi (sayfada 1, bölmede 2)
 * @param {boolean} [p.self] kişinin kendisi mi (yönetici etiketi "Bağlı olduğum kişi")
 * @param {import("react").ReactNode} [p.views] görünüm anahtarı (alt şeridin başı)
 * @param {import("react").ReactNode} [p.actions] eylemler (alt şeridin sonu)
 * @param {boolean} [p.wrapMeta] unvan iki satıra kadar kırılır (dar bölmede bilgi kesilmesin)
 */
export function ProfileHeader({
  profile,
  level = 1,
  self = true,
  views,
  actions,
  wrapMeta = false,
  className,
}) {
  const { t } = useLocale()
  const titleId = useId()
  const Heading = `h${level}`
  const loading = profile?.status === "loading"
  const address = profile?.address ?? ""
  const upn = profile?.upn || address
  const photos = usePeoplePhotos(profile?.photo || !address ? [] : [address])
  const photo = profile?.photo ?? photos.get(address) ?? null
  const presence = usePresence(upn ? [upn] : []).get(upn)
  const { title, chips } = metaOf(profile)
  const fromErp = profile?.sources?.personnel === "erp"

  return (
    <section
      aria-labelledby={titleId}
      className={cn("ms-surface relative isolate overflow-hidden rounded-[1.5rem]", className)}
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-from via-brand-via to-brand-to"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-br from-brand/[0.08] via-brand/[0.02] to-transparent"
      />
      <div className="grid gap-3 px-4 pb-3.5 pt-4 @[40rem]/ss:px-5 @[56rem]/ss:grid-cols-[minmax(0,1fr)_auto] @[56rem]/ss:items-center @[56rem]/ss:gap-6 @[56rem]/ss:pb-4 shortest:py-3">
        {/* Dar kapta çipler avatarın altından tam ende (telefonda olağan veriyle iki sıra);
            genişte adın sütununda, avatar iki sırayı kaplar. */}
        <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 @[40rem]/ss:gap-x-4">
          <PersonAvatar
            name={profile?.name ?? ""}
            photo={photo}
            presence={presence}
            presenceLabel={presence ? t(`calendar.presence.${presence}`) : undefined}
            className="size-12 [&>span:first-of-type]:text-[0.9375rem] @[40rem]/ss:row-span-2 @[40rem]/ss:size-14 @[40rem]/ss:[&>span:first-of-type]:text-[1.0625rem]"
          />
          <div className="min-w-0">
            {/* Ad ile sicil sığmazsa sicil alta iner: ad kesilmesin. */}
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
              <Heading
                id={titleId}
                lang="tr"
                className="min-w-0 truncate text-[1.125rem] font-semibold leading-tight tracking-[-0.015em] text-foreground @[40rem]/ss:text-[1.375rem]"
              >
                {profile?.name}
              </Heading>
              {profile?.personnel && (
                <span
                  title={fromErp ? t("selfService.profile.fromErp") : undefined}
                  className="shrink-0 rounded-md bg-foreground/[0.06] px-1.5 py-px text-[0.75rem] font-semibold tabular-nums text-foreground/70"
                >
                  <span className="sr-only">{t("selfService.profile.personnel")} </span>#
                  {profile.personnel}
                </span>
              )}
            </div>
            {loading ? (
              <span
                aria-hidden="true"
                className="ms-skeleton mt-1.5 block h-3.5 w-48 max-w-full rounded-full"
              />
            ) : (
              title && (
                <p
                  lang="tr"
                  title={title}
                  className={cn(
                    "mt-0.5 text-[0.8125rem] font-medium leading-snug text-foreground/80 @[40rem]/ss:text-[0.875rem]",
                    wrapMeta ? "line-clamp-2" : "truncate",
                  )}
                >
                  {title}
                </p>
              )
            )}
          </div>
          {loading ? (
            <MetaChipsSkeleton className={CHIPS_AT} />
          ) : (
            <MetaChips chips={chips} className={CHIPS_AT} />
          )}
        </div>
        <ProfileStats profile={profile} self={self} />
      </div>
      {(views || actions) && (
        // Anahtar ile eylemler sığmazsa eylemler alt satıra geçer: seçenek adları kesilmesin.
        <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-t border-border/60 px-3 py-2 @[40rem]/ss:px-4">
          <div className="min-w-0">{views}</div>
          <div className="ms-auto flex min-w-0 shrink-0 items-center">{actions}</div>
        </div>
      )}
    </section>
  )
}
