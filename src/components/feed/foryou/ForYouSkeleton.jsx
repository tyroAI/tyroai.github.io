import { SkelLine } from "@/components/common/bento"
import { SummaryTray, TrayStatSkeleton } from "@/components/common/SummaryTray"
import { useLocale } from "@/hooks/useLocale"
import { LANES } from "@/lib/forYouBoard"
import { cn } from "@/lib/utils"
import {
  HERO_GLOW,
  HERO_GRADIENT,
  HERO_GRID,
  HERO_ORB_BOX,
  HERO_ORB_CELL,
  HERO_SHELL,
  HERO_TEXT,
  HERO_TITLE,
  HERO_TRAY_CELL,
  SLOT_ROW,
} from "@/components/common/summaryCard"
import { LANE_ICON } from "./look"
import "./foryou.css"

/**
 * SANA ÖZEL İSKELETİ — panonun GERÇEK kabuklarıyla (`look.js`): tek kart
 * (tepside "Sıradaki" + gerçek ad ve glifli üç sayı), liste başı, iki raf
 * kartı, üç satır.
 * İki iş görüyor: tembel parça inerken `Suspense` yedeği (`FeedPage` onu
 * statik içe alıyor) ve panonun kendi yükleme hâli (`mascot` yuvasıyla).
 *
 * ⚠️ MASKOTU İÇE ALMAZ (`mascot` yuvası): bu dosya Keşfet'in ana parçasında;
 * maskotun çizicisi yalnız Sana özel açılınca insin (`MascotOrb` sınırı).
 * ⚠️ Kartın boyu yüklenince DEĞİŞMEZ: aynı kabuk, aynı yer tutan metin bloğu,
 * aynı yükseklikte tepsi.
 */
export function ForYouSkeleton({ mascot = null }) {
  const { t } = useLocale()
  return (
    <div className="@container/foryou min-w-0" aria-busy="true">
      <div className="pb-20">
        <p role="status" className="sr-only">
          {t("myspace.loading")}
        </p>
        <section
          aria-hidden="true"
          style={{ "--hero-ink": "#ffffff", "--i": 0 }}
          className={cn(HERO_SHELL, "foryou-rise")}
        >
          <span className={HERO_GRADIENT} />
          <span className={HERO_GLOW} />
          <div className={HERO_GRID}>
            <div className={HERO_TEXT}>
              <span className={cn(HERO_TITLE, "block")}>
                <span className="block h-[0.9em] w-4/5 rounded-xl bg-muted" />
              </span>
              <span className="relative mt-0.5 block w-1/2 text-[0.875rem] leading-snug">
                <span className="invisible">&nbsp;</span>
                <span className="absolute inset-x-0 top-1/2 block h-3.5 -translate-y-1/2 rounded-full bg-muted" />
              </span>
            </div>
            <div className={HERO_ORB_CELL}>
              <div className={HERO_ORB_BOX}>{mascot}</div>
            </div>
            <div className={HERO_TRAY_CELL}>
              <SummaryTray
                label={t("feed.important.tiles.aria")}
                top={
                  <span className={cn(SLOT_ROW, "pointer-events-none")}>
                    <span className="ms-skeleton size-9 shrink-0 rounded-full" />
                    <span className="min-w-0 flex-1">
                      <SkelLine text="text-[0.875rem]" width="w-3/4" />
                      <SkelLine text="mt-0.5 text-[0.75rem]" width="w-1/2" />
                    </span>
                  </span>
                }
              >
                {LANES.map((lane) => (
                  <TrayStatSkeleton
                    key={lane.id}
                    icon={LANE_ICON[lane.id]}
                    label={t(`feed.important.${lane.id}`)}
                  />
                ))}
              </SummaryTray>
            </div>
          </div>
        </section>
        <section aria-hidden="true" className="mt-8 @[34rem]/foryou:mt-10">
          <p className="text-[1.25rem] font-semibold tracking-[-0.02em] @[34rem]/foryou:text-[1.375rem]">
            {t("feed.important.list.title")}
          </p>
          <SkelLine text="mt-1 text-[0.8125rem] leading-snug" width="w-2/3 max-w-[72ch]" />
          <div className="mt-5 space-y-7">
            <ul className="grid grid-cols-1 gap-3 @[30rem]/foryou:grid-cols-2 @[30rem]/foryou:gap-4">
              {[0, 1].map((i) => (
                <li key={i} className="ms-surface flex flex-col rounded-[1.5rem] p-4">
                  <span className="flex items-start gap-2.5">
                    <span className="ms-skeleton size-8 shrink-0 rounded-full" />
                    <span className="min-w-0 flex-1">
                      <SkelLine text="text-[0.8125rem]" width="w-28" />
                      <SkelLine text="mt-0.5 text-[0.6875rem]" width="w-16" />
                    </span>
                  </span>
                  <SkelLine text="mt-3 text-[0.9375rem] leading-snug" width="w-4/5" />
                  <SkelLine text="mt-1 text-[0.8125rem] leading-relaxed" width="w-full" />
                  <SkelLine text="text-[0.8125rem] leading-relaxed" width="w-2/3" />
                  <span className="ms-skeleton mt-4 block h-8 w-28 rounded-full" />
                </li>
              ))}
            </ul>
            <div>
              <span className="ms-skeleton mb-2 ml-3 block h-3 w-28 rounded-full" />
              <ul className="ms-surface rounded-[1.5rem] p-1.5">
                {["w-3/5", "w-1/2", "w-2/3"].map((w) => (
                  <li key={w} className="flex items-start gap-3 rounded-[1.125rem] px-3 py-3">
                    <span className="ms-skeleton mt-0.5 size-9 shrink-0 rounded-full" />
                    <span className="min-w-0 flex-1">
                      <SkelLine text="text-[0.8125rem]" width="w-32" />
                      <SkelLine text="mt-1 text-[0.875rem] leading-snug" width={w} />
                      <SkelLine text="mt-0.5 text-[0.78125rem]" width="w-4/5" />
                    </span>
                    <span className="ms-skeleton h-8 w-20 shrink-0 self-center rounded-full" />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
