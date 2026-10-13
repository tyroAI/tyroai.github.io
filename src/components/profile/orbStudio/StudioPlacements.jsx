import TyroMascot from "@/components/brand/mascot/TyroMascot"

/**
 * Orb oluşturucunun iki YERLEŞİM önizlemesi — kaynağın "Karşılama" ve
 * "Dashboard" panelleri.
 *
 * ⚠️ **BUNLAR ÖNİZLEME, GERÇEK EKRAN DEĞİL.** Kaynak da öyle: giriş sayfasının
 * ve panelin küçültülmüş bir taklidi, maskotun o boşluklarda nasıl durduğunu
 * göstermek için. Gerçek `LoginPage`/`AppLauncher`ı buraya mount etmek
 * onların sağlayıcılarını, MSAL'ını ve rota bağlamını da getirirdi.
 *
 * ⚠️ **KAYNAĞIN SABİT HEX'LERİ TOKEN'A ÇEVRİLDİ.** `generator.html` kendi
 * içinde tek temalı ve `#eaf0f4`/`#0d405c` gibi literal renkler taşıyor; bu
 * uygulama iki temada ve 17 palette yaşıyor. Yerleşim, oranlar ve metinler
 * aynı — değişen yalnız renklerin nereden geldiği.
 *
 * ⚠️ **METİNLER SÖZLÜKTEN, KAYNAKTAKİ GİBİ SABİT DEĞİL** — biri hariç:
 * "HI, I'M TYRO" giriş ekranının KENDİ başlığı ve orada da her dilde
 * İngilizce (bkz. CLAUDE.md, Marka kuralları). Taklidin doğru olması için
 * aynen yazılıyor.
 *
 * ⚠️ **ÜÇ MASKOT DA `decorative`.** Kaynağın SVG'si kendi `role="img"` ve
 * TÜRKÇE `<title>`ını taşıyor; bu iki panel bir YERLEŞİM taklidi, yani ekran
 * okuyucuya "TYRO — Yörüngede, Nötr" diye üç kez tekrar etmesi katkı değil
 * gürültü. Panelin ne olduğunu altındaki açıklama satırı söylüyor.
 *
 * ⚠️ Panelin kendisi de `aria-hidden`: içindeki "Dashboard", "Chat", "Vessel
 * Ops" gibi satırlar BAĞLANTI DEĞİL, bir ekran görüntüsünün metni. Ekran
 * okuyucuda gezilebilir bir menü gibi duyulmaları yanlış olurdu.
 */

/** Karşılama (login) yerleşimi — dev başlık + ortada küre. */
export function LandingPreview({ t, mascotProps }) {
  return (
    <div className="space-y-2">
      <div
        aria-hidden="true"
        className="overflow-hidden rounded-2xl border border-border bg-[radial-gradient(ellipse_at_50%_35%,var(--plane-0)_0%,var(--background)_68%)] px-5 pb-8 pt-5 text-center"
      >
        <div className="flex items-center justify-between text-[0.75rem] text-muted-foreground">
          <b className="font-semibold text-foreground/80">tyroTrade</b>
          <span>TR</span>
        </div>

        <div className="relative grid min-h-[13rem] place-items-center">
          <span
            aria-hidden="true"
            className="absolute whitespace-nowrap text-[clamp(1.875rem,7.6vw,4rem)] font-extrabold tracking-[-0.06em] text-foreground/85"
          >
            HI, I&apos;M TYRO
          </span>
          {/* ⚠️ Kürenin z-index'i başlığın ÜSTÜNDE — kaynakta da öyle
              (`.hero .mini-orb{z-index:1}`): küre metnin önünde süzülüyor. */}
          <div className="relative z-10">
            <TyroMascot {...mascotProps} decorative size={150} />
          </div>
        </div>

        <h3 className="text-[1.25rem] font-semibold">
          TYRO <span className="text-brand-text">Trade</span>
        </h3>
        <p className="mx-auto mt-2 max-w-[22rem] text-[0.875rem] leading-relaxed text-muted-foreground">
          {t("login.motto")} {t("login.mottoEnd")}
        </p>
        <span className="mt-5 inline-block rounded-lg border border-border px-5 py-3 text-[0.6875rem] uppercase tracking-[0.16em] text-foreground/70">
          {t("login.cta")}
        </span>
      </div>
      <p className="text-center text-[0.75rem] text-muted-foreground">
        {t("orbStudio.landing.note")}
      </p>
    </div>
  )
}

/** Dashboard yerleşimi — sol menü taklidi + kahraman alanı + iki asistan kartı. */
export function DashboardPreview({ t, mascotProps }) {
  return (
    <div className="space-y-2">
      <div
        aria-hidden="true"
        className="grid overflow-hidden rounded-2xl border border-border @[560px]/profile:grid-cols-[9rem_minmax(0,1fr)]"
      >
        <aside className="hidden flex-col gap-5 border-r border-border bg-sidebar px-4 py-6 text-[0.75rem] text-muted-foreground @[560px]/profile:flex">
          <b className="font-semibold text-brand-deep">tyroTrade</b>
          <span className="text-brand-text">＋ {t("nav.quickAction")}</span>
          <span>{t("nav.dashboard")}</span>
          <span>{t("nav.chat")}</span>
          <span>{t("nav.emOverview")}</span>
          <span>{t("nav.vessels")}</span>
        </aside>

        <div className="bg-card px-5 py-6">
          <p className="text-[0.75rem] text-muted-foreground">
            tyroTrade &nbsp;/&nbsp; {t("nav.dashboard")}
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-3 @[560px]/profile:flex-nowrap @[560px]/profile:justify-start">
            <div className="min-w-0 flex-1">
              <h3 className="text-[clamp(1.25rem,3vw,1.75rem)] font-semibold tracking-tight">
                {t("chat.greeting.afternoon")}
              </h3>
              <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted-foreground">
                {t("dashboard.hero.subtitle")}
              </p>
            </div>
            <div className="shrink-0">
              <TyroMascot {...mascotProps} decorative size={104} />
            </div>
          </div>

          <p className="mt-5 text-[0.875rem] font-semibold">{t("launcher.agents.title")}</p>
          <div className="mt-2 flex flex-wrap gap-3">
            {["TYRO Trader", "TYRO Office"].map((name) => (
              <div
                key={name}
                className="min-w-[8rem] flex-1 rounded-xl border border-border px-3 py-3 text-[0.8125rem]"
              >
                <div className="-mt-1 mb-1">
                  <TyroMascot {...mascotProps} decorative size={34} />
                </div>
                {name}
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="text-center text-[0.75rem] text-muted-foreground">
        {t("orbStudio.dashboard.note")}
      </p>
    </div>
  )
}
