/**
 * ⚠️ **BU KART AYARLAR SAYFASINDA ÇİZİLİYOR** (`settings/SettingsPage.jsx`),
 * Profilim'de değil — tyroTrade'de /settings sayfası kaldırılıp her şey
 * Profilim'e taşınmıştı, bu uygulamada iki sayfa da duruyor ve kullanıcı
 * stüdyoyu Ayarlar'da bekliyor (istek üzerine).
 *
 * Profilim → Tercihler'de yalnız KÜÇÜK seçici var (`OrbStylePicker`): orada
 * tema · palet · dil ile yan yana "küre mi maskot mu" seçilir, ince ayar
 * buraya gelir. Okuma sırası "önce seç, sonra ayarla" — yalnız iki sayfaya
 * bölünmüş hâli.
 *
 * Dosya yolu `components/profile/orbStudio/` olarak KALDI: tyroTrade'deki
 * yerinin aynısı, böylece iki depo arasındaki fark okunabilir kalıyor.
 */
import { useCallback, useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import Download04Icon from "@hugeicons/core-free-icons/Download04Icon"
import RefreshIcon from "@hugeicons/core-free-icons/RefreshIcon"
import SparklesIcon from "@hugeicons/core-free-icons/SparklesIcon"
import { agentStates, expressions, renderMascot } from "@/components/brand/mascot/mascot.mjs"
import { mascotColorsForPalette } from "@/components/brand/mascot/mascotPalette"
import TyroMascot from "@/components/brand/mascot/TyroMascot"
import { useLocale } from "@/hooks/useLocale"
import { useMascotSettings, useOrbStyle } from "@/hooks/useOrbStyle"
import { usePalette } from "@/hooks/usePalette"
import { resetMascotSettings, writeMascotSettings, writeOrbStyle } from "@/lib/orbStyle"
import { CardHead, ProfileCard } from "../primitives"
import { cn } from "@/lib/utils"
import { ColorPanel, ExpressionPanel, MotionPanel } from "./StudioPanels"
import { DashboardPreview, LandingPreview } from "./StudioPlacements"

/**
 * ORB OLUŞTURUCU — kullanıcının "Mascot Studio" generator'ının uygulama içi hâli
 * (2026-09-13, istek üzerine).
 *
 * Kullanıcının sözü: *"profilde Orb oluşturucu diye yeni sekme aç, orada da
 * göreyim aynısını — sadece sana ileride rahat tarif edebilmek için ve ne kadar
 * aynısını yapabildin diye görmek için."*
 *
 * Kaynak `generator.html`in kendisi: aynı üç görünüm şeridi (Generator ·
 * Karşılama · Dashboard), aynı sahne (kaş · maskot · başlık + açıklama · palet
 * adı · üç sahne düğmesi), aynı üç kontrol sekmesi (Renk · İfade · Hareket),
 * aynı akış demosu ve aynı SVG indirme.
 *
 * ⚠️ **HANGİSİ KAYDEDİLİR, HANGİSİ ÖNİZLEMEDİR — EKRANDA DA YAZILI.**
 * İstek "diğer parametreleri de buraya koy ki cam parlaklığını vb. oradan
 * kısarız" idi; yani stüdyo bir AYAR ekranı ama aynı zamanda kaynağın bir
 * tasarım/ihracat aracı. İkisi bir arada ancak sınır açıkça çizilirse durur:
 *
 * | kaydedilir (canlı küreye de uygulanır) | yalnız önizleme |
 * |---|---|
 * | ifade · mesh · cam parlaklığı · ışık · hız · göz kırpma · imleç takibi | palet · özel renkler · agent durumu · koyu zemin |
 *
 * ⚠️ **PALET NEDEN KAYDEDİLMEZ.** Canlı kürenin rengi uygulamanın PALETİNDEN
 * gelir (`mascotPalette.js`) — istek aynen böyleydi. Stüdyoda ikinci bir renk
 * tercihi yazsaydık "orb neden paletimden farklı" sorusu doğardı; buradaki
 * palet seçicisi kaynağın kendi seçicisi ve işi ÖNİZLETMEK.
 *
 * ⚠️ **AGENT DURUMU NEDEN KAYDEDİLMEZ.** Canlı küre gerçekten dinliyor /
 * düşünüyor / konuşuyor ve o, sohbetteki tek ilerleme göstergesi; kayıtlı bir
 * durum onu ezip göstergeyi yalancı yapardı. Boştaki durum yüzeye ait
 * (`BrandOrb`: login ve dashboard `orbiting`, sohbet `speaking`).
 */

/** Kaynağın kendi sırası: kontrol sekmeleri. */
const CONTROL_TABS = ["colors", "expressions", "states"]

/** Kaynağın kendi sırası: sahne görünümleri. */
const VIEWS = ["studio", "landing", "dashboard"]

/**
 * ⚠️ **KAYNAK 15 İFADEDEN 12'SİNİ ÇİZİYOR** (`expressions.slice(0,12)`) ve bu
 * korundu: `listening` · `processing` · `speaking` son üçtür ve üçü de bir
 * AGENT DURUMUNUN ifadesi, yani Hareket sekmesinde zaten seçiliyorlar.
 */
const FACE_COUNT = 12

/** Akış demosunun sırası ve adım süresi — kaynaktan birebir. */
const DEMO_SEQUENCE = [
  "greeting",
  "idle",
  "logging-in",
  "listening",
  "thinking",
  "searching",
  "planning",
  "working",
  "speaking",
  "success",
  "idle",
]
const DEMO_STEP_MS = 3400

export function MascotStudioCard() {
  const { t } = useLocale()
  const { palette: appPalette } = usePalette()
  const orbStyle = useOrbStyle()
  const saved = useMascotSettings()

  // ── ÖNİZLEMEYE AİT durum (diske yazılmaz) ────────────────────────────
  const [view, setView] = useState("studio")
  const [controlTab, setControlTab] = useState("states")
  const [state, setState] = useState("orbiting")
  /**
   * ⚠️ **PALET TÜRETİLİR, SNAPSHOT'LANMAZ.** Bir tur `useState(appPalette)`
   * yazıldı ve sahne uygulamanın paletinden KOPUYORDU: header'ın palet
   * seçicisi /profile'da da duruyor, yani kişi Orb sekmesindeyken paleti
   * değiştirebiliyor; bütün uygulama ve canlı küre yeni renge geçerken
   * stüdyo — "kürenin görüntüsü bu" diyen ekran — eski renkte kalıyordu.
   * Artık üzerine yazılmadıkça uygulamanın paletini izliyor; stüdyodan bir
   * palet seçilirse ondan sonra o seçim geçerli (önizleme, diske yazılmaz).
   */
  const [paletteOverride, setPaletteOverride] = useState(null)
  const palette = paletteOverride ?? appPalette
  /**
   * ⚠️ **İFADE DURUMU İZLER — KAYNAĞIN KENDİ KURALI.** `generator.html`in
   * `setState`i `state.expression = agentStates.find(...)[3]` yazıyor, yani
   * bir agent durumu seçmek yüzü de değiştiriyor (Uyku → kapalı gözler,
   * Sorun oluştu → üzgün). Bir tur bu bağ kopmuştu ve 11 adımlık demo 11
   * gövdeyi TEK donuk yüzle oynuyordu.
   *
   * Kayıtlı ifade ise KULLANICININ seçimi ve canlı küreye giden değer; bu
   * yüzden önizlemenin ifadesi ayrı tutuluyor: durum seçmek yalnız burayı
   * oynatır, yüz seçmek ikisini birden yazar.
   */
  const [previewExpression, setPreviewExpression] = useState(saved.expression)
  const [colors, setColors] = useState(null)
  const [dark, setDark] = useState(false)
  const [motion, setMotion] = useState(true)
  const [demoStep, setDemoStep] = useState(-1)
  const [status, setStatus] = useState("")

  const timer = useRef(null)

  const stopDemo = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    setDemoStep(-1)
  }, [])

  // Sekme gizlenince demo durur (kaynağın `visibilitychange` kancası) ve
  // bileşen sökülürken zamanlayıcı temizlenir — yoksa profilden çıkan
  // kullanıcının arkasında 11 adımlık bir zincir çalışmaya devam ederdi.
  useEffect(() => {
    const onHidden = () => {
      if (document.hidden) stopDemo()
    }
    document.addEventListener("visibilitychange", onHidden)
    return () => {
      document.removeEventListener("visibilitychange", onHidden)
      if (timer.current) clearTimeout(timer.current)
    }
  }, [stopDemo])

  function playDemo() {
    if (demoStep >= 0) {
      stopDemo()
      return
    }
    setMotion(true)
    let index = 0
    const step = () => {
      const key = DEMO_SEQUENCE[index]
      setState(key)
      const info = agentStates.find((entry) => entry[0] === key)
      if (info) setPreviewExpression(info[3])
      setDemoStep(index)
      index += 1
      if (index < DEMO_SEQUENCE.length) {
        timer.current = setTimeout(step, DEMO_STEP_MS)
      } else {
        stopDemo()
      }
    }
    step()
  }

  function selectState(next) {
    stopDemo()
    setState(next)
    // Kaynağın kuralı: durum kendi varsayılan ifadesini getirir.
    const info = agentStates.find((entry) => entry[0] === next)
    if (info) setPreviewExpression(info[3])
    setStatus("")
  }

  function selectExpression(next) {
    stopDemo()
    setPreviewExpression(next)
    writeMascotSettings({ expression: next })
    setStatus("")
  }

  // Renk seçimi ÖNİZLEMEYE ait: hem palet hem özel renkler yalnız bu ekranı ve
  // indirilen SVG'yi etkiler.
  function selectPalette(id) {
    setPaletteOverride(id)
    setColors(null)
    setStatus("")
  }

  const effectiveColors = colors ?? mascotColorsForPalette(palette)

  /** Sahnedeki ve önizlemelerdeki maskotun ortak prop'ları. */
  const mascotProps = {
    state,
    expression: previewExpression,
    colors: effectiveColors,
    mesh: saved.mesh,
    meshIntensity: saved.meshIntensity,
    meshSpread: saved.meshSpread,
    glow: saved.glow,
    gloss: saved.gloss,
    speed: saved.speed,
    blink: saved.blink,
    followPointer: saved.follow,
    motion,
  }

  const stateInfo = agentStates.find((entry) => entry[0] === state) ?? agentStates[1]
  const expressionInfo =
    expressions.find((entry) => entry[0] === previewExpression) ?? expressions[0]
  // Kaynağın kendi kuralı: `idle`de başlık İFADEYİ yazar, gerisinde DURUMU.
  const headline = state === "idle" ? expressionInfo[1] : stateInfo[1]

  function exportSvg() {
    // ⚠️ İndirilen SVG TEK dosyadır, yani mesh onun İÇİNDE olmak zorunda —
    // ekrandaki ayrı katman bir dosyaya sığmaz. Kaynağın kendi mesh'i
    // çiziliyor; yoğunluk/yayılım ayarları ekrana ait, dosyaya değil.
    const svg = renderMascot({ ...mascotProps, mesh: saved.mesh, id: "tyro-export" })
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }))
    const link = document.createElement("a")
    link.href = url
    const name = colors ? "custom" : palette
    link.download = `tyro-${saved.mesh ? "mesh-" : ""}${name}-${state}-${previewExpression}${motion ? "-animated" : ""}.svg`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setStatus(t("orbStudio.exportDone"))
  }

  return (
    <ProfileCard>
      <CardHead
        icon={SparklesIcon}
        title={t("orbStudio.title")}
        subtitle={t("orbStudio.subtitle")}
      />

      <div className="space-y-4 px-5 pb-5">
        {/* Maskot seçili değilse stüdyo yine çalışır ama ekranda hiçbir şeyi
            değiştirmez — kullanıcı bunu bilmeden ayar kısarsa hiçbir şey
            olmadığını sanır. Şerit tek tıkla görünümü açar. */}
        {orbStyle !== "mascot" && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand/30 bg-brand/[0.06] px-3 py-2.5">
            <p className="text-[0.75rem] leading-relaxed text-foreground/85">
              {t("orbStudio.notSelected")}
            </p>
            <button
              type="button"
              onClick={() => writeOrbStyle("mascot")}
              className="shrink-0 rounded-lg border border-brand/40 bg-card px-2.5 py-1.5 text-[0.75rem] font-medium text-foreground transition hover:bg-brand-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [min-height:max(1.75rem,28px)] [@media(pointer:coarse)]:min-h-9"
            >
              {t("orbStudio.selectMascot")}
            </button>
          </div>
        )}

        <Switcher
          items={VIEWS}
          value={view}
          onChange={setView}
          label={t("orbStudio.viewGroup")}
          render={(id) => t(`orbStudio.view.${id}`)}
        />

        {view === "studio" ? (
          <div className="grid gap-4 overflow-hidden rounded-2xl border border-border @[760px]/profile:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] @[760px]/profile:gap-0">
            {/* ── SAHNE ───────────────────────────────────────────────── */}
            <div
              className={cn(
                "relative flex flex-col items-center justify-center gap-2 px-4 py-6 transition-colors",
                dark
                  ? "bg-[radial-gradient(ellipse_at_50%_44%,#122c40_0%,#09131f_65%)] text-white"
                  : "bg-[radial-gradient(ellipse_at_50%_44%,var(--plane-0)_0%,var(--background)_60%)]",
              )}
            >
              <span
                className={cn(
                  "self-start text-[0.6875rem] tracking-[0.16em]",
                  dark ? "text-white/55" : "text-muted-foreground",
                )}
              >
                TYRO / LIQUID GLASS
              </span>

              {/* ⚠️ `decorative`: SVG'nin kendi `role="img"` + TÜRKÇE `<title>`ı
                  (maskot kaynağının metni) İngilizce/Rusça/Arapça arayüzde de
                  okunuyordu. Bilgiyi hemen altındaki `aria-live` başlık +
                  açıklama taşıyor, yani ikinci bir ad zaten tekrar olurdu. */}
              <TyroMascot {...mascotProps} decorative size={180} className="my-1" />

              {/* ⚠️ `lang="tr"`: başlık ve açıklama maskot kaynağının kendi
                  metinleri, sözlükten gelmiyor (bkz. `StudioPanels.jsx`). */}
              <div lang="tr" className="text-center" aria-live="polite">
                <p className="text-[1.0625rem] font-semibold tracking-tight">{headline}</p>
                <p
                  className={cn(
                    "mx-auto mt-1 max-w-[19rem] text-[0.8125rem] leading-relaxed",
                    dark ? "text-white/65" : "text-muted-foreground",
                  )}
                >
                  {stateInfo[2]}
                </p>
              </div>

              <p
                className={cn(
                  "mt-2 text-[0.6875rem] tracking-[0.08em]",
                  // ⚠️ `/80` ölçüldü: 11px'te 3,23:1. Tam mürekkep.
                  dark ? "text-white/70" : "text-muted-foreground",
                )}
              >
                {colors
                  ? t("orbStudio.customGradient")
                  : t(`palette.${paletteKey(palette)}`, palette)}
              </p>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                {/* ⚠️ **ETİKETİ DEĞİŞEN DÜĞME `aria-pressed` TAŞIMAZ.** İkisi
                    birden çevrilince ekran okuyucu tam TERSİNİ söylüyordu:
                    koyu zemini AÇAN kişi "Açık zemin, basılı" duyuyor, yani
                    aktif kipin Açık zemin olduğu bildiriliyordu. Durumu bu iki
                    düğmede ETİKETİN KENDİSİ taşıyor (kaynağın da yaptığı bu);
                    `aria-pressed` yalnız etiketi SABİT olan Mesh'te kalıyor.
                    Görsel vurgu (`active`) ayrı bir prop. */}
                <StageButton dark={dark} active={!motion} onClick={() => setMotion((v) => !v)}>
                  {motion ? t("orbStudio.pause") : t("orbStudio.play")}
                </StageButton>
                <StageButton dark={dark} active={dark} onClick={() => setDark((v) => !v)}>
                  {dark ? t("orbStudio.lightStage") : t("orbStudio.darkStage")}
                </StageButton>
                <StageButton
                  dark={dark}
                  pressed={saved.mesh}
                  onClick={() => writeMascotSettings({ mesh: !saved.mesh })}
                >
                  {t("orbStudio.mesh")}
                </StageButton>
              </div>
            </div>

            {/* ── KONTROLLER ──────────────────────────────────────────── */}
            <aside className="flex flex-col gap-4 border-t border-border bg-card px-4 py-5 @[760px]/profile:border-l @[760px]/profile:border-t-0">
              <Switcher
                items={CONTROL_TABS}
                value={controlTab}
                onChange={setControlTab}
                label={t("orbStudio.controlGroup")}
                render={(id) => t(`orbStudio.tab.${id}`)}
              />

              {controlTab === "colors" && (
                <ColorPanel
                  t={t}
                  palette={palette}
                  colors={colors}
                  effectiveColors={effectiveColors}
                  onPalette={selectPalette}
                  onColors={setColors}
                  gloss={saved.gloss}
                  glow={saved.glow}
                  mesh={saved.mesh}
                  meshIntensity={saved.meshIntensity}
                  meshSpread={saved.meshSpread}
                  onSetting={writeMascotSettings}
                />
              )}
              {controlTab === "expressions" && (
                <ExpressionPanel
                  t={t}
                  count={FACE_COUNT}
                  expression={previewExpression}
                  onExpression={selectExpression}
                  blink={saved.blink}
                  follow={saved.follow}
                  onSetting={writeMascotSettings}
                />
              )}
              {controlTab === "states" && (
                <MotionPanel
                  t={t}
                  state={state}
                  onState={selectState}
                  speed={saved.speed}
                  onSetting={writeMascotSettings}
                  demoStep={demoStep}
                  demoLength={DEMO_SEQUENCE.length}
                  onDemo={playDemo}
                />
              )}

              <div className="mt-auto space-y-2 pt-2">
                <button
                  type="button"
                  onClick={exportSvg}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-3 py-3 text-[0.8125rem] font-medium text-background transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                >
                  <HugeiconsIcon icon={Download04Icon} className="size-4" strokeWidth={1.8} />
                  {motion ? t("orbStudio.exportAnimated") : t("orbStudio.exportStatic")}
                </button>
                <p className="text-center text-[0.6875rem] leading-relaxed text-muted-foreground">
                  {t("orbStudio.exportNote")}
                </p>
                {/* Durum satırı da marka mürekkebinde değil: `text-brand-deep`
                    bazı paletlerde AA'nın altına düşüyor (bkz. `primitives.jsx`). */}
                <p className="text-center text-[0.6875rem] text-foreground/85" role="status">
                  {status}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    resetMascotSettings()
                    setStatus(t("orbStudio.resetDone"))
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-[0.75rem] text-muted-foreground transition hover:bg-foreground/[0.03] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [min-height:max(1.75rem,28px)] [@media(pointer:coarse)]:min-h-9"
                >
                  <HugeiconsIcon icon={RefreshIcon} className="size-3.5" strokeWidth={1.8} />
                  {t("orbStudio.reset")}
                </button>
              </div>
            </aside>
          </div>
        ) : view === "landing" ? (
          <LandingPreview t={t} mascotProps={mascotProps} />
        ) : (
          <DashboardPreview t={t} mascotProps={mascotProps} />
        )}

        {/* Sınır KALICI METİN, balon değil: dokunmatikte balon hiç açılmaz ve
            "neyi kısınca ne değişir" bu ekranın tek kararı. */}
        <p className="rounded-lg bg-foreground/[0.04] px-3 py-2.5 text-[0.6875rem] leading-relaxed text-muted-foreground">
          {t("orbStudio.scopeNote")}
        </p>
      </div>
    </ProfileCard>
  )
}

/** Palet kimliğinden sözlük anahtarı: `ocean-breeze-v2` → `oceanBreezeV2`. */
function paletteKey(id) {
  return id.replace(/-([a-z0-9])/g, (_, ch) => ch.toUpperCase())
}

/** Kaynağın `switcher`ı — gömülü ray + yüzen aktif düğme (uygulamanın imzası). */
function Switcher({ items, value, onChange, label, render }) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex gap-1 rounded-xl bg-muted/60 p-1 dark:bg-white/[0.04]"
    >
      {items.map((id) => {
        const selected = id === value
        return (
          <button
            key={id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(id)}
            className={cn(
              "min-w-0 flex-1 truncate rounded-lg px-2 py-2 text-[0.75rem] font-medium transition",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
              "[min-height:max(1.75rem,28px)] [@media(pointer:coarse)]:min-h-9",
              selected
                ? "bg-background text-foreground shadow-sm dark:bg-neutral-800 dark:text-white"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {render(id)}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Sahnenin üç küçük düğmesi — koyu zeminde de okunur kalmak zorunda.
 *
 * `pressed` = basılı DURUMU duyurulur (etiketi sabit olan düğme).
 * `active`  = yalnız GÖRSEL vurgu; etiketi zaten çevrilen düğmeler için.
 */
function StageButton({ dark, pressed, active, onClick, children }) {
  const on = pressed ?? active
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "rounded-lg border px-3 py-2 text-[0.75rem] transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
        "[min-height:max(1.75rem,28px)] [@media(pointer:coarse)]:min-h-9",
        dark
          ? on
            ? "border-brand-to/60 bg-white/15 text-white"
            : "border-white/25 text-white/80 hover:bg-white/10"
          : on
            ? // Seçili mürekkep marka değil `foreground` — bkz. `StudioPanels.jsx`.
              "border-brand/50 bg-brand-soft/40 font-medium text-foreground dark:bg-brand/15"
            : "border-border text-foreground/80 hover:bg-foreground/[0.03]",
      )}
    >
      {children}
    </button>
  )
}
