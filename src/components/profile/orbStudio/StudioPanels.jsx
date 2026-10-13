import { agentStates, expressions, eyesMarkup } from "@/components/brand/mascot/mascot.mjs"
import { palettes as appPalettes } from "@/data/palettes"
import { mascotColorsForPalette } from "@/components/brand/mascot/mascotPalette"
import { Choice } from "../primitives"
import { cn } from "@/lib/utils"

/**
 * Orb oluşturucunun üç kontrol paneli — kaynak `generator.html`in
 * Renk · İfade · Hareket sekmeleri.
 *
 * ⚠️ **PALET IZGARASI BİZİM 17 PALETİMİZ, MASKOTUN 12'Sİ DEĞİL.** Kaynağın
 * listesi kendi paletleri; burada anlamlı olan uygulamanın seçenekleri, çünkü
 * canlı kürenin rengini onlar belirliyor (`mascotPalette.js`). Maskotun 12
 * paleti zaten o köprünün içinde — bir kullanıcı için ikinci bir palet
 * dağarcığı öğrenmek gürültü olurdu.
 *
 * ⚠️ **SEÇİM KUTUSU `Choice`** — Tercihler'deki palet/tema/dil kutusunun
 * aynısı. Kaynağın kendi `palette-btn`/`state-btn`/`face-btn` sınıfları sabit
 * hex taşıyor ve bu uygulama iki temada, 17 palette yaşıyor.
 */

/**
 * Paletin üç rengi, KAYNAĞIN kendi `.swatch`ı: 48×9px'lik yatay bir şerit.
 *
 * ⚠️ **DÜĞME DİKEY — ÖLÇÜLMÜŞ DÜZELTME.** Bir tur `Choice`ın yatay düzeni
 * kullanıldı (ad solda, şerit sağda) ve kontrol kolonu ~320px olduğu için
 * ADLARIN YARISI KIRPILDI: "Ocean Br…", "Chocolat…", "Pastel La…". Kaynak bu
 * sorunu zaten çözmüş — `.palette-btn{flex-direction:column;align-items:
 * flex-start}`, yani şerit ÜSTTE, ad kendi satırında ve tam genişlikte.
 */
function Swatch({ colors }) {
  return (
    <span
      aria-hidden="true"
      className="h-[0.5625rem] w-12 shrink-0 rounded-full"
      style={{ background: `linear-gradient(90deg, ${colors.join(",")})` }}
    />
  )
}

/**
 * Kaynağın kendi kaydırıcısı: 0-100 girdi, 0-1 ayar.
 *
 * ⚠️ **`aria-label` ŞART, SARMALAYAN `<label>` YETMEZ.** Hız kaydırıcısında
 * etiketin içinde bir `<output>` de var; erişilebilir ad hesabı o `<output>`ı
 * da metne katıyor ve ekran okuyucu kontrolü "100, kaydırıcı" diye adsız
 * okuyordu (ölçüldü). Gloss/glow bir tık ötede doğru okunduğu için tutarsızlık
 * kontrolün bozuk olduğunu düşündürüyordu.
 */
function Slider({ label, value, onChange, min = 0, max = 100, suffix }) {
  return (
    <label className="flex items-center justify-between gap-3 text-[0.8125rem]">
      <span className="min-w-0 truncate text-foreground/85">{label}</span>
      <span className="flex shrink-0 items-center gap-2">
        {suffix ? (
          <output className="w-8 text-right text-[0.6875rem] text-muted-foreground">
            {suffix}
          </output>
        ) : null}
        {/* ⚠️ Ham `<input type=range>` 16px yüksekliğinde çiziliyor ve bu,
            deponun "32px altı dokunma hedefi 0" kuralını çiğniyordu
            (ölçüldü, 390px). Yükseklik vermek rayı ortada tutuyor, yalnız
            isabet kutusunu büyütüyor. Literal yazılır — `pointer-coarse:`
            varyantı Tailwind v4'te YOK ve şablondan kurulan sınıf adları
            tarayıcıya hiç görünmez. */}
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
          className="w-28 accent-[var(--brand-via)] [min-height:max(2rem,32px)] [@media(pointer:coarse)]:min-h-11"
        />
      </span>
    </label>
  )
}

/**
 * Kaynağın kendi onay kutusu satırı.
 *
 * ⚠️ **DOKUNMA HEDEFİ SATIRIN TAMAMI.** Ham kutu 17px ve satır 20px'ti;
 * telefonda 12px şaşan bir parmak KOMŞU satırı açıp yanlış ayarı sessizce
 * değiştiriyordu (ölçüldü). `<label>` zaten kutuyu tetikliyor, yani hedefi
 * büyütmek için ona yükseklik vermek yeterli — dolgu KUTUYA değil SATIRA
 * verilir (bu depoda bir kez ölçülmüş kural).
 */
function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-[0.8125rem] [min-height:max(2rem,32px)] [@media(pointer:coarse)]:min-h-11">
      <span className="min-w-0 truncate text-foreground/85">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-[1.0625rem] shrink-0 accent-[var(--brand-via)]"
      />
    </label>
  )
}

function PanelHead({ title, count }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-[0.875rem] font-semibold">{title}</h3>
      {count ? (
        <span className="shrink-0 text-[0.75rem] text-muted-foreground">{count}</span>
      ) : null}
    </div>
  )
}

/** RENK — palet ızgarası + özel renkler + cam parlaklığı / ışık yoğunluğu. */
export function ColorPanel({
  t,
  palette,
  colors,
  effectiveColors,
  onPalette,
  onColors,
  gloss,
  glow,
  mesh,
  meshIntensity,
  meshSpread,
  onSetting,
}) {
  return (
    <div className="space-y-4">
      {/* ⚠️ **IŞIK GRUBU PALETLERİN ÜSTÜNDE — SAHADA BULUNAMADIĞI İÇİN**
          (2026-09-14: *"mesh ayarlanabilir olarak orb builder'a koysana"* —
          oysa kaydırıcılar zaten vardı). Kaynakta bu panel palet → özel renk →
          cam/ışık sırasındaydı ve iki mesh kaydırıcısı 17 palet düğmesinin
          ALTINDA kalıyordu: kişi Hareket sekmesinden geliyor, "mesh" diye bir
          IŞIK arıyor ve "Renk" panelinin dibine kadar kaydırması gerekiyordu.
          Sıra bu yüzden ters çevrildi — sık ayarlanan önde, bir kez seçilen
          palet arkada. Kaynaktan bilinçli sapma ve tek sebebi bu.

          ⚠️ Mesh AÇ/KAPA da buraya alındı: sahnedeki düğme duruyor (kaynağın
          kendi yeri) ama üç mesh kontrolünün üçü birden tek grupta. */}
      <div className="space-y-3 rounded-xl border border-border/70 bg-foreground/[0.02] p-3">
        <PanelHead title={t("orbStudio.lightGroup")} count="" />
        <Slider
          label={t("orbStudio.gloss")}
          value={Math.round(gloss * 100)}
          onChange={(v) => onSetting({ gloss: v / 100 })}
        />
        <Slider
          label={t("orbStudio.glow")}
          value={Math.round(glow * 100)}
          onChange={(v) => onSetting({ glow: v / 100 })}
        />
        <Toggle
          label={t("orbStudio.mesh")}
          checked={mesh}
          onChange={(v) => onSetting({ mesh: v })}
        />
        {/* Mesh kapalıyken kaydırıcılar çizilmez: hiçbir şey yapmayan iki
            kontrol, affordansın yalan söylemesi olurdu. Aralık 50-200
            (× 0,5 - 2,0), `orbStyle.js`in kendi sınırıyla aynı. */}
        {mesh ? (
          <>
            <Slider
              label={t("orbStudio.meshIntensity")}
              value={Math.round(meshIntensity * 100)}
              min={50}
              max={200}
              onChange={(v) => onSetting({ meshIntensity: v / 100 })}
            />
            <Slider
              label={t("orbStudio.meshSpread")}
              value={Math.round(meshSpread * 100)}
              min={50}
              max={200}
              onChange={(v) => onSetting({ meshSpread: v / 100 })}
            />
          </>
        ) : null}
      </div>

      <PanelHead
        title={t("orbStudio.colors.title")}
        count={t("orbStudio.colors.count", { n: appPalettes.length })}
      />

      <div className="grid gap-2 @[420px]/profile:grid-cols-2">
        {appPalettes.map((p) => (
          <Choice
            key={p.id}
            selected={!colors && palette === p.id}
            onClick={() => onPalette(p.id)}
            className="min-h-14 flex-col items-start gap-2"
          >
            <Swatch colors={mascotColorsForPalette(p.id)} />
            <span className="min-w-0 max-w-full truncate text-[0.6875rem]">
              {t(p.labelKey, p.id)}
            </span>
          </Choice>
        ))}
      </div>

      <div className="flex items-end justify-between gap-2">
        {[0, 1, 2].map((i) => (
          <label key={i} className="flex flex-col gap-1.5 text-[0.6875rem] text-muted-foreground">
            {t("orbStudio.colors.custom", { n: i + 1 })}
            <input
              type="color"
              value={effectiveColors[i]}
              onChange={(e) => {
                const next = [...effectiveColors]
                next[i] = e.target.value
                onColors(next)
              }}
              className="h-8 w-14 cursor-pointer rounded-md border border-border bg-card p-0.5"
            />
          </label>
        ))}
      </div>

      <p className="text-[0.6875rem] leading-relaxed text-muted-foreground">
        {t("orbStudio.colors.note")}
      </p>
    </div>
  )
}

/** İFADE — 12 yüz düğmesi + göz kırpma / imleç takibi. */
export function ExpressionPanel({ t, count, expression, onExpression, blink, follow, onSetting }) {
  const faces = expressions.slice(0, count)
  return (
    <div className="space-y-4">
      <PanelHead
        title={t("orbStudio.faces.title")}
        count={t("orbStudio.faces.count", { n: faces.length })}
      />

      <div className="grid grid-cols-3 gap-1.5">
        {faces.map(([id, label]) => {
          const selected = id === expression
          return (
            <button
              key={id}
              type="button"
              aria-pressed={selected}
              onClick={() => onExpression(id)}
              className={cn(
                "flex min-h-[4.5rem] flex-col items-center justify-center gap-2 rounded-xl border px-1 py-2.5 text-[0.6875rem] transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
                selected
                  ? // ⚠️ SEÇİLİ MÜREKKEP MARKA DEĞİL, `foreground`. `text-brand-deep` marka
                    // zemininin üstünde PALETE GÖRE düşüyor — ölçüldü (açık tema):
                    // Amber 3,05 · Sunset 4,16. Seçili olduğunu kenarlık, zemin ve
                    // `aria-pressed` zaten söylüyor; renk 17 paletin hepsinde
                    // güvenli olmak zorunda ve marka mürekkebi değil.
                    "border-brand/45 bg-brand-soft/40 font-medium text-foreground dark:bg-brand/15"
                  : "border-transparent text-muted-foreground hover:bg-foreground/[0.04]",
              )}
            >
              {/* Göz şekli maskotun KENDİ `eyesMarkup`ından; ikinci bir ikon
                  seti çizmek ekrandaki ifadeyle düğmedeki ifadeyi zamanla
                  ayrıştırırdı. `currentColor` düğmenin mürekkebini alıyor. */}
              <svg
                viewBox="155 200 130 85"
                aria-hidden="true"
                className="h-6 w-10 overflow-visible"
                dangerouslySetInnerHTML={{ __html: eyesMarkup(id, "currentColor") }}
              />
              {/* ⚠️ `lang="tr"` — ifade ve durum adları MASKOT KAYNAĞININ
                  kendi metinleri (`mascot.mjs`), sözlükten gelmiyor ve
                  uygulamanın dili ne olursa olsun Türkçe. Çevirmek "aynısını
                  yap" isteğini bozardı; en azından ekran okuyucu doğru
                  telaffuz etsin. */}
              <span lang="tr" className="max-w-full truncate">
                {label}
              </span>
            </button>
          )
        })}
      </div>

      <div className="space-y-3 border-t border-border/60 pt-3">
        <Toggle
          label={t("orbStudio.blink")}
          checked={blink}
          onChange={(v) => onSetting({ blink: v })}
        />
        <Toggle
          label={t("orbStudio.follow")}
          checked={follow}
          onChange={(v) => onSetting({ follow: v })}
        />
      </div>
    </div>
  )
}

/** HAREKET — 17 agent durumu + hız + akış demosu. */
export function MotionPanel({ t, state, onState, speed, onSetting, demoStep, demoLength, onDemo }) {
  const running = demoStep >= 0
  return (
    <div className="space-y-4">
      <PanelHead
        title={t("orbStudio.states.title")}
        count={t("orbStudio.states.count", { n: agentStates.length })}
      />

      <div className="grid gap-1.5 @[420px]/profile:grid-cols-2">
        {agentStates.map(([id, label], i) => {
          const selected = id === state
          return (
            <button
              key={id}
              type="button"
              aria-pressed={selected}
              onClick={() => onState(id)}
              className={cn(
                "flex min-h-10 items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-[0.75rem] transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
                selected
                  ? // ⚠️ SEÇİLİ MÜREKKEP MARKA DEĞİL, `foreground`. `text-brand-deep` marka
                    // zemininin üstünde PALETE GÖRE düşüyor — ölçüldü (açık tema):
                    // Amber 3,05 · Sunset 4,16. Seçili olduğunu kenarlık, zemin ve
                    // `aria-pressed` zaten söylüyor; renk 17 paletin hepsinde
                    // güvenli olmak zorunda ve marka mürekkebi değil.
                    "border-brand/45 bg-brand-soft/40 font-medium text-foreground dark:bg-brand/15"
                  : "border-border text-muted-foreground hover:bg-foreground/[0.03]",
              )}
            >
              {/* ⚠️ Sıra numarası `/70` ile soluk yazılmıştı ve 10px'te
                  kontrastı 2,71:1 çıkıyordu (ölçüldü, canvas ile sRGB'ye
                  çözülerek). Kaynağın kendi `#829baa`si de aynı bantta ama bu
                  depoda 10px'lik bir kaşın tabanı AA. Tam mürekkep. */}
              {/* ⚠️ Sıra numarası bir tur `/70` ile soluk yazıldı ve 10px'te
                  kontrastı 2,71:1 çıktı; tam mürekkebe alınınca SEÇİLİ satırda
                  4,39'da kaldı (marka zemininin üstünde). Artık satırın KENDİ
                  mürekkebini miras alıyor — hiyerarşiyi mono yazı ve punto
                  taşıyor, renk değil. Ölçüldü: 4,5 altı 0. */}
              <span className="shrink-0 font-mono text-[0.625rem] text-current opacity-80">
                {String(i + 1).padStart(2, "0")}
              </span>
              {/* Kaynağın kendi Türkçe durum adı — bkz. İfade panelindeki not. */}
              <span lang="tr" className="min-w-0 truncate">
                {label}
              </span>
            </button>
          )
        })}
      </div>

      <div className="space-y-3 border-t border-border/60 pt-3">
        {/* Kaynağın aralığı 40-200 ve ayar `değer/100` — yani 0,4×-2,0×,
            `mascot.mjs`in kendi `clamp(speed,1,.4,2)` sınırıyla birebir. */}
        <Slider
          label={t("orbStudio.speed")}
          value={Math.round(speed * 100)}
          min={40}
          max={200}
          suffix={`${String(speed.toFixed(1)).replace(".0", "")}×`}
          onChange={(v) => onSetting({ speed: v / 100 })}
        />
        <button
          type="button"
          aria-pressed={running}
          onClick={onDemo}
          className={cn(
            "w-full rounded-lg border px-3 py-2 text-[0.75rem] transition",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
            "[min-height:max(1.75rem,28px)] [@media(pointer:coarse)]:min-h-9",
            running
              ? "border-brand/45 bg-brand-soft/40 font-medium text-foreground dark:bg-brand/15"
              : "border-border text-foreground/80 hover:bg-foreground/[0.03]",
          )}
        >
          {running
            ? t("orbStudio.demoStop", { step: demoStep + 1, total: demoLength })
            : t("orbStudio.demoPlay")}
        </button>
        <p className="text-center text-[0.6875rem] leading-relaxed text-muted-foreground">
          {t("orbStudio.states.note")}
        </p>
      </div>
    </div>
  )
}
