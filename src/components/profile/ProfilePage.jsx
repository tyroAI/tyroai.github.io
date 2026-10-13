import { useSearchParams } from "react-router-dom"
import { motion } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import Notification01Icon from "@hugeicons/core-free-icons/Notification01Icon"
import Settings02Icon from "@hugeicons/core-free-icons/Settings02Icon"
import SquareLock02Icon from "@hugeicons/core-free-icons/SquareLock02Icon"
import SparklesIcon from "@hugeicons/core-free-icons/SparklesIcon"
import Robot01Icon from "@hugeicons/core-free-icons/Robot01Icon"
import { useIsInGroup } from "@/hooks/useIsInGroup"
import { ADMIN_GROUP_ID } from "@/lib/constants"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLocale } from "@/hooks/useLocale"
import { IdentityCard } from "./IdentityCard"
import { AccessCard } from "./AccessCard"
import { MascotStudioCard } from "./orbStudio/MascotStudioCard"
import { SettingsPage } from "@/components/settings/SettingsPage"
import { GeneralTab } from "@/components/settings/GeneralTab"
import { PreferencesCard } from "./PreferencesCard"
import { NotificationsCard } from "./NotificationsCard"
import { cn } from "@/lib/utils"

/**
 * "Profilim" (`/profile`) — hesap, yetki, tercih ve bildirim tek sayfada.
 * tyroTrade'in aynı sayfasından port (2026-09-08, istek üzerine).
 *
 * Bu dört konu kullanıcı menüsünde dört satırdı ve ÜÇÜ hiçbir yere
 * gitmiyordu (`onClick`siz duruyorlardı). Hepsi buraya taşındı ve menü TEK
 * öğeye indi (Profil) — dört satırın hepsi aynı sayfaya gidince menü,
 * aşağıdaki sekme şeridini ikinci kez ve daha kötü bir yerde çiziyor olurdu.
 *
 * İki sekme başka bir yüzeyden TAŞINDI, kopyalanmadı:
 *  • Bildirimler, Ayarlar → Genel'den (`GeneralTab`'in `NotificationSection`'ı
 *    silindi). Aynı izni yöneten iki yüzey "hangisi asıl?" sorusunu doğurur.
 *  • Tercihler ise header'daki üç düğmenin (tema · palet · dil) YERİNE
 *    geçmiyor — o düğmeler duruyor ve aynı sağlayıcılara yazıyor. Buradaki
 *    kazanç kıyaslanabilirlik: 14 palet aynı anda görünüyor.
 *
 * ── SEKME NEDEN ADRESTE ────────────────────────────────────────────────
 *
 * Menü tek satıra indi ama `?tab=` var, çünkü üç şeyi birden veriyor:
 * Yardım'daki "Görünüm & Dil" kartı doğrudan Tercihler'e gidiyor, bir
 * destek turunda "şuraya bak" → /profile?tab=access paylaşılabiliyor ve
 * kullanıcı bir sekmeyi yer imleyebiliyor. Sekme durumu bileşenin İÇİNE
 * çekilirse bu üçü birden kaybolur.
 *
 * `replace: true` bilinçli: sekme değiştirmek bir GEZİNME değil, aynı
 * sayfanın başka bir yüzü. Yığına eklenirse üç sekmeye bakan kullanıcı geri
 * düğmesine üç kez basmak zorunda kalır.
 *
 * Bilinmeyen bir `?tab=` değeri sessizce ilk sekmeye düşer — yer imi
 * bozulduğunda kullanıcı boş bir sayfa değil, profilini görür.
 *
 * ── SAYFA KORUNMUYOR ───────────────────────────────────────────────────
 *
 * Bir yetki gerektirmiyor: gösterdiği her şey kullanıcının KENDİ verisi ve
 * zaten Entra ile giriş yapmıştır (App.jsx'in kimlik kapısı bunun üstünde).
 * Yetkilerim sekmesi de bilinçli olarak herkese açık: "ben ne
 * görebiliyorum" sorusunun cevabı gizli bir bilgi değil.
 */

/**
 * ⚠️ **HER ŞEY PROFİLDE YÖNETİLİYOR** (istek üzerine). Ayrı bir "Ayarlar"
 * sayfası yok; `/settings` artık `/profile?tab=catalog`e yönlendiriyor —
 * tyroTrade'deki düzenin aynısı.
 *
 * Sıra bir OKUMA sırasıdır: önce KİM olduğum (Yetkilerim), sonra NASIL
 * göründüğü (Tercihler), sonra orbun ayar masası, sonra NE göründüğü
 * (Asistanlar — yalnız yönetici), en sonda tarayıcının benim adıma tuttuğu
 * şeyler (İzinler: bildirim izni + yerel depolama).
 */
const TABS = ["access", "preferences", "orb", "catalog", "notifications"]

/**
 * Yönetici kapısının arkasındaki sekmeler.
 *
 * ⚠️ **ADRES DE SÜZÜLÜR, YALNIZ SEKME ŞERİDİ DEĞİL.** Sekme listesinden
 * çıkarmak yetmiyordu: `?tab=catalog` yazan bir bağlantı `TABS.includes`
 * testini geçiyor, tetik çizilmediği için seçili sekme HİÇBİR ŞEY
 * göstermiyor ve kullanıcı sekme şeridinin altında boş bir sayfaya
 * bakıyordu. Aynı delik orb sekmesi kapanınca ikiye çıkardı.
 *
 * ⚠️ **GERİ DÜŞÜŞ YALNIZ KESİN "HAYIR"DA.** `useIsInGroup` üç değerli ve
 * cevap gelene kadar `undefined`; `=== true` ile süzmek, bir yöneticinin
 * header aramasından gelen `/profile?tab=catalog` bağlantısını ilk karede
 * "Yetkilerim"e düşürürdü ve cevap gelince geri dönmezdi. Bu yüzden test
 * `=== false`: beklerken istenen sekme korunuyor, içerik cevap gelince
 * çiziliyor.
 */
const ADMIN_TABS = new Set(["orb", "catalog"])

export function ProfilePage() {
  const { t, locale } = useLocale()
  const [params, setParams] = useSearchParams()

  const requested = params.get("tab")
  const adminVerdict = useIsInGroup(ADMIN_GROUP_ID)
  const isAdmin = adminVerdict === true
  const gatedOff = ADMIN_TABS.has(requested) && adminVerdict === false
  const tab = TABS.includes(requested) && !gatedOff ? requested : TABS[0]

  function selectTab(next) {
    const nextParams = new URLSearchParams(params)
    nextParams.set("tab", next)
    setParams(nextParams, { replace: true })
  }

  const tabDefs = [
    { value: "access", icon: SquareLock02Icon, label: t("profile.access.title") },
    { value: "preferences", icon: Settings02Icon, label: t("user.preferences") },
    // ⚠️ ORB STÜDYOSU DA YALNIZ YÖNETİCİ (istek, 2026-09-20). Maskotun
    // ayar masası bir TASARIM aracı: kullanıcıya "şunu ayarla" demeyen,
    // yanlış kullanıldığında yalnız kafa karıştıran bir yüzey. Tercih
    // olarak değil, katalog gibi bir yönetim aracı olarak duruyor.
    ...(isAdmin ? [{ value: "orb", icon: SparklesIcon, label: t("profile.tabs.orb") }] : []),
    // ⚠️ YALNIZ YÖNETİCİ. Katalog yönetimi (asistanlar, AI ürünleri, iş
    // uygulamaları) admin işi; sekmeyi herkese göstermek, açınca içi boş
    // bir sekme göstermek olurdu.
    ...(isAdmin ? [{ value: "catalog", icon: Robot01Icon, label: t("profile.tabs.catalog") }] : []),
    // ⚠️ ETİKET "Bildirimler" DEĞİL. Sekme tarayıcı bildirim İZNİNİ ve bu
    // tarayıcıda saklananları yönetiyor, bildirimlerin KENDİSİNİ değil —
    // header'daki zil ayrı bir yüzey; iki yere aynı adı vermek "bildirimlerim
    // kapalı mı" diye bakan kullanıcıyı yanlış yere gönderirdi. Aynı ad
    // tyroTrade'de de kullanılıyor.
    { value: "notifications", icon: Notification01Icon, label: t("profile.tab.notifyPermission") },
  ]

  return (
    // ⚠️ KAPSAYICI, VIEWPORT DEĞİL. Kartların ızgaraları `@[...]/profile`
    // kırılımlarını kullanıyor: sohbet dock'u bir KOLON olduğu için 1440px
    // pencerede 640px panel açılınca sayfaya ~540px kalıyor ama `lg:` hâlâ
    // tutuyor ve 14 palet üç sütuna sıkışıyordu.
    <div className="@container/profile mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col gap-5 overflow-y-auto px-3 py-5 sm:gap-6 sm:px-4 sm:py-6 lg:px-6 lg:py-8">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-1"
      >
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("profile.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("profile.subtitle")}</p>
      </motion.header>

      {/* Kimlik kartı sekmelerin ÜSTÜNDE: hangi sekmede olursa olsun
          kullanıcı kimin hesabına baktığını görmeye devam etsin. */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, delay: 0.04, ease: [0.22, 1, 0.36, 1] }}
      >
        <IdentityCard />
      </motion.div>

      <Tabs value={tab} onValueChange={selectTab} className="flex-1">
        {/* Segment kontrolü /settings ile BİREBİR aynı: iki platform sayfası
            aynı imzayı taşısın (gömülü track + yüzen aktif düğme). */}
        <TabsList
          className={cn(
            "h-auto w-full rounded-3xl bg-muted/60 px-0 py-2",
            "shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]",
            "flex gap-1",
            // ⚠️ KIRILIM VIEWPORT DEĞİL KAPSAYICI (`@container/profile`):
            // sohbet dock'u bir KOLON, yani 1440px pencerede panel açıkken
            // `md:` hâlâ tutuyor ama sayfaya ~540px kalıyor ve beş sekmelik
            // şerit yuvarlak track'in dışına taşıyordu.
            "overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            "@[720px]/profile:overflow-visible",
            "dark:bg-white/[0.04] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]",
          )}
        >
          {tabDefs.map((tabDef) => (
            <TabsTrigger
              key={tabDef.value}
              value={tabDef.value}
              aria-label={tabDef.label}
              className={cn(
                // ⚠️ `min-w-0` ŞART: `flex-1` tek başına içerik genişliğinin
                // altına inemez, yani dar alanda sekme küçülmez, TAŞAR.
                // ⚠️ `whitespace-normal` AÇIKÇA yazılır — `ui/tabs.jsx`in kendi
                // tarifi `whitespace-nowrap` taşıyor ve tailwind-merge ancak
                // AYNI ailede bir sınıf verilirse onu düşürür. Sadece kaldırmak
                // yetmez: sarma olmayınca `line-clamp` de hiçbir şey yapmaz.
                // İkisi birlikte, beşinci sekmenin daralttığı etiket bütçesinde
                // (kap `max-w-4xl` ≈848px → sekme başına ~122px) "Orb
                // oluşturucu" gibi etiketleri KIRPMAK yerine iki satıra sarar.
                "group relative flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl first:rounded-l-3xl last:rounded-r-3xl border-0 bg-transparent px-2 text-[0.8125rem] font-medium whitespace-normal sm:h-10 sm:px-3",
                "text-muted-foreground transition-all duration-200 ease-out",
                "hover:text-foreground hover:bg-foreground/[0.04]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-0",
                "data-[state=active]:bg-background data-[state=active]:text-foreground",
                "data-[state=active]:shadow-[0_1px_2px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.06)]",
                "dark:data-[state=active]:bg-neutral-800 dark:data-[state=active]:text-white",
                "dark:data-[state=active]:shadow-[0_1px_0_rgba(255,255,255,0.1)_inset,0_2px_8px_rgba(0,0,0,0.45)]",
              )}
            >
              <HugeiconsIcon
                icon={tabDef.icon}
                className="size-[1.125rem] shrink-0 opacity-70 transition group-data-[state=active]:opacity-100 sm:size-[0.9375rem]"
                strokeWidth={1.6}
              />
              {/* ⚠️ `truncate` + `inline` GİTTİ, `line-clamp-2` GELDİ. İkisi de
                  `display` yazar: `inline` `-webkit-box`ı ezerse satır sınırı
                  hiç uygulanmaz — bu yüzden görünürlüğü de AYNI yardımcı
                  taşıyor (`hidden` altta, eşiğin üstünde `line-clamp-2`).
                  `overflow-wrap:anywhere` RU "Предпочтения" için: tek uzun
                  kelime, sarılacak boşluğu yok. */}
              <span className="hidden text-center leading-[1.15] [overflow-wrap:anywhere] @[560px]/profile:line-clamp-2">
                {tabDef.label}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Telefonda sekmelerde yalnızca ikon var; hangi sekmede olduğunu
            track'in altındaki bu satır söylüyor (/settings ile aynı çözüm).
            `lang` ŞART: CSS ile büyütülen "Yetkilerim" Türkçe kipte
            "YETKİLERİM" olmalı, "YETKILERIM" değil. */}
        <p
          lang={locale}
          className="mt-3 text-center text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-muted-foreground @[560px]/profile:hidden"
          aria-hidden="true"
        >
          {tabDefs.find((d) => d.value === tab)?.label}
        </p>

        <TabsContent value="access" className="mt-6">
          <AccessCard />
        </TabsContent>
        <TabsContent value="preferences" className="mt-6">
          <PreferencesCard />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="orb" className="mt-6">
            <MascotStudioCard />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="catalog" className="mt-6">
            {/* Katalog yönetimi ESKİ Ayarlar sayfasının kendisi, gömülü
                kipte: kendi başlığını ve dış kabuğunu çizmez, Depolama ve
                Orb sekmelerini de göstermez (ikisi profilin kendi
                sekmelerinde). CRUD tek yerde kaldı — ikinci bir kopya
                zamanla ayrışırdı. */}
            <SettingsPage embedded />
          </TabsContent>
        )}
        <TabsContent value="notifications" className="mt-6">
          <NotificationsCard />
          {/* ⚠️ **DEPOLAMA ENVANTERİ BURAYA TAŞINDI** (eski Ayarlar → Genel).
              Sekmenin adı "İzinler" ve ikisi de TARAYICININ kullanıcı adına
              tuttuğu şeyler: biri bildirim izni, öteki bu tarayıcıda saklanan
              tercihler. Tercihler kartının dibinde durması da düşünülebilirdi
              ama orası "ne seçiyorum", burası "tarayıcıda ne duruyor". */}
          <div className="mt-6">
            <GeneralTab />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
