import { HugeiconsIcon } from "@hugeicons/react"
import HardDriveIcon from "@hugeicons/core-free-icons/HardDriveIcon"
import Moon02Icon from "@hugeicons/core-free-icons/Moon02Icon"
import Settings02Icon from "@hugeicons/core-free-icons/Settings02Icon"
import Sun03Icon from "@hugeicons/core-free-icons/Sun03Icon"
import { LOCALES } from "@/providers/LocaleProvider"
import { useLocale } from "@/hooks/useLocale"
import { usePalette } from "@/hooks/usePalette"
import { useTheme } from "@/hooks/useTheme"
import { Block, CardHead, Choice, ProfileCard } from "./primitives"
import { OrbStylePicker } from "./OrbStylePicker"
import { EdgeNotchDesignPicker } from "./EdgeNotchDesignPicker"

/**
 * "Tercihler" — tema, renk paleti, dil. tyroTrade'in aynı kartından port
 * (2026-09-08).
 *
 * Üçü de header'daki üç küçük düğmenin (ThemeToggle · PaletteSwitcher ·
 * LanguageSwitcher) yazdığı AYNI sağlayıcılara yazıyor; ikinci bir durum
 * yok, o yüzden buradan yapılan seçim header'da anında görünür ve tersi de
 * doğrudur. Header'daki düğmeler DURUYOR — bu kart onların yerine geçmiyor,
 * üçünü bir arada kıyaslanabilir hâlde gösteriyor.
 *
 * ── NEDEN AÇILIR LİSTE DEĞİL, IZGARA ───────────────────────────────────
 *
 * Header'da yer 32 pikseldir ve orada açılır liste doğru karar. Burada bir
 * sayfa var: 17 palet aynı anda görünüyor, seçilen olan çerçeveli ve
 * kullanıcı üç renk noktasını yan yana KIYASLAYABİLİYOR — açılır listede
 * her paleti tek tek açıp kapatmak gerekiyordu. Aynı gerekçe dil ve tema
 * için de geçerli: dördü/ikisi zaten ekranda.
 *
 * ── SEÇİM ANINDA UYGULANIR, "Kaydet" YOK ───────────────────────────────
 *
 * Üç tercihin üçü de görünüşü değiştiriyor, yani sonucu ekranın kendisi.
 * Bir "Kaydet" düğmesi, kullanıcının zaten gördüğü şeyi onaylamasını
 * istemek olurdu. Yazma sağlayıcıların içinde ve localStorage'a gidiyor
 * (`tyro-theme` · `tyro-palette` · `tyro-locale`) — kart bunu altında
 * AÇIKÇA söylüyor, çünkü tarayıcıda saklanan bir tercih başka bir cihazda
 * geri gelmiyor ve bu, kullanıcının bilmesi gereken bir sınır.
 */

/** Paletin renkleri — PaletteSwitcher'daki aynı gösterim. */
function Swatch({ colors, solid = false }) {
  if (solid) {
    return (
      <span
        style={{ backgroundColor: colors[0] }}
        className="size-4 shrink-0 rounded-full ring-1 ring-background"
      />
    )
  }
  return (
    <span className="inline-flex h-4 shrink-0 items-center -space-x-1.5">
      {colors.map((c, i) => (
        <span
          key={i}
          style={{ backgroundColor: c }}
          className="size-4 rounded-full ring-1 ring-background"
        />
      ))}
    </span>
  )
}

function PaletteGroup({ label, items, palette, setPalette, t }) {
  if (items.length === 0) return null
  return (
    <div className="space-y-2">
      {/* Kaş başlığın (Eyebrow) BÜYÜK HARFLİ hâli burada KULLANILMIYOR:
          "Gradient" Türkçe kipte CSS ile büyütülünce "GRADİENT" oluyor
          (i → İ) ve zaten bloğun kendi kaşı üstte duruyor — ikinci bir
          büyük harf kademesi gürültü olurdu. */}
      <p className="text-[0.6875rem] font-medium text-muted-foreground/70">{label}</p>
      {/* Kırılımlar KAPSAYICIYA bağlı, viewport'a değil: sohbet dock'u bir
          KOLON, açıldığında sayfaya kalan genişlik viewport'u yansıtmıyor. */}
      <div className="grid gap-2 @[520px]/profile:grid-cols-2 @[760px]/profile:grid-cols-3">
        {items.map((p) => (
          <Choice
            key={p.id}
            selected={palette === p.id}
            onClick={() => setPalette(p.id)}
            className="justify-between"
          >
            <span className="min-w-0 truncate">{t(p.labelKey, p.id)}</span>
            <Swatch colors={p.swatch} solid={p.group === "solid"} />
          </Choice>
        ))}
      </div>
    </div>
  )
}

export function PreferencesCard() {
  const { t, locale, setLocale } = useLocale()
  const { preference, setTheme } = useTheme()
  const { palette, setPalette, palettes } = usePalette()

  const solidPalettes = palettes.filter((p) => p.group === "solid")
  const gradientPalettes = palettes.filter((p) => p.group !== "solid")

  return (
    <ProfileCard>
      <CardHead
        icon={Settings02Icon}
        title={t("user.preferences")}
        subtitle={t("profile.prefs.subtitle")}
      />

      <div className="divide-y divide-border/60">
        {/* ⚠️ DİL EN ÜSTTE. Gerekçesi sıradaki öteki blokların KENDİSİ:
            kart bu dilde yazılı ve tema/palet/orb/kart adları da öyle — dili
            değiştiren kişi altındaki her etiketi yeniden okuyor. Sıra bu
            yüzden DİL → tema → palet → orb → Yenilikler kartı. */}
        <Block label={t("header.language")} hint={t("profile.prefs.languageHint")}>
          <div className="grid max-w-lg gap-2 @[520px]/profile:grid-cols-2 @[760px]/profile:grid-cols-4">
            {LOCALES.map((code) => (
              <Choice
                key={code}
                selected={locale === code}
                onClick={() => setLocale(code)}
                className="justify-between"
              >
                <span className="min-w-0 truncate">{t(`locale.${code}`)}</span>
                {/* Dil kodu mono: adın kendisi o dilde yazılı (Русский,
                    العربية), kod ise her arayüzde okunabilir kalıyor. CSS
                    ile büyütülmüyor — Türkçe kipte "tr" dışındaki kodlar da
                    doğru çıksın diye harf dönüşümüne hiç girmiyoruz. */}
                <span className="shrink-0 font-mono text-[0.65625rem] text-muted-foreground">
                  {code}
                </span>
              </Choice>
            ))}
          </div>
        </Block>

        <Block label={t("profile.prefs.theme")} hint={t("profile.prefs.themeHint")}>
          <div className="grid max-w-md grid-cols-2 gap-2">
            <Choice selected={preference === "light"} onClick={() => setTheme("light")}>
              <HugeiconsIcon icon={Sun03Icon} className="size-4 shrink-0" strokeWidth={1.8} />
              {t("profile.prefs.light")}
            </Choice>
            <Choice selected={preference === "dark"} onClick={() => setTheme("dark")}>
              <HugeiconsIcon icon={Moon02Icon} className="size-4 shrink-0" strokeWidth={1.8} />
              {t("profile.prefs.dark")}
            </Choice>
          </div>
        </Block>

        <Block label={t("palette.title")} hint={t("profile.prefs.paletteHint")}>
          <div className="space-y-4">
            <PaletteGroup
              label={t("palette.group.solid")}
              items={solidPalettes}
              palette={palette}
              setPalette={setPalette}
              t={t}
            />
            <PaletteGroup
              label={t("palette.group.gradient")}
              items={gradientPalettes}
              palette={palette}
              setPalette={setPalette}
              t={t}
            />
          </div>
        </Block>
        <Block label={t("profile.prefs.orbStyle")} hint={t("profile.prefs.orbStyleHint")}>
          <OrbStylePicker />
        </Block>

        {/* ⚠️ "YENİLİKLER KARTI" SEÇİCİSİ KALKTI (2026-09-29): kart sidebar'dan
            kullanıcı menüsüne taşındı ve menü satırı görünüm seçmiyor — hep
            okuyan maskot (istek). Çizilmeyen bir kartın dört görünümünü
            sunmak, seçimin hiçbir şeyi değiştirmediği bir ayar olurdu.
            `WhatsNewCardPicker` ve `profile.prefs.whatsNewCard*` anahtarları
            DURUYOR — geri almak tek blok. Kaydedilmiş seçim (`useWhatsNewCardStyle`)
            çentiğin palet kabuğunun rengini hâlâ belirliyor. */}

        {/* Sağ kenar çentiğinin kabuğu — üç tasarım, canlı önizleme; ray aynı
            depoyu okuyor (`tyro-edge-notch-design-v1`). */}
        <Block label={t("profile.prefs.notchDesign")} hint={t("profile.prefs.notchDesignHint")}>
          <EdgeNotchDesignPicker />
        </Block>
      </div>

      <div className="px-5 pb-5">
        <p className="rounded-lg bg-foreground/[0.04] px-3 py-2.5 text-[0.6875rem] leading-relaxed text-muted-foreground">
          <HugeiconsIcon
            icon={HardDriveIcon}
            className="mr-1.5 inline size-3.5 align-[-2px]"
            strokeWidth={1.7}
          />
          {t("profile.prefs.storageNote")}
        </p>
      </div>
    </ProfileCard>
  )
}
