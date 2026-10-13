import { HugeiconsIcon } from "@hugeicons/react"
import SquareLock01Icon from "@hugeicons/core-free-icons/SquareLock01Icon"
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon"
import { useLocale } from "@/hooks/useLocale"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  ERİŞİM ÖRTÜSÜ — sohbetin ORTASINDA, arkası bulanık
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Kullanıcının açabileceği tek bir asistan kalmadığında sohbet ekranının
 * üstüne biner. Ekran SÖKÜLMEZ: arkada duruyor, bulanık ve etkileşimsiz —
 * kişi gideceği yeri görüyor, yalnız şimdilik giremiyor (istek üzerine,
 * 2026-09-23: *"chat ekranına girebilsin ama orada erişim iste çıksın,
 * arka blurlu şekilde tam ortaya getir"*).
 *
 * ⚠️ **BULANIKLIK ARKADA, KARTTA DEĞİL.** `AppLauncher`ın kilitli kartında
 * bir kez yazılmış kural: örtünün İÇİ net kalmalı. Orada çare
 * `backdrop-blur`dı (örtü kartın üstünde duruyor); burada bulanıklaşan şey
 * ekranın KENDİSİ, o yüzden `filter: blur` doğrudan arka katmana veriliyor
 * ve kart onun KARDEŞİ — çocuğu olsaydı o da bulanırdı.
 *
 * ⚠️ **ARKA KATMAN `aria-hidden` + `pointer-events-none`.** Görsel olarak
 * sönük ama DOM'da duran bir besteci, ekran okuyucuya hâlâ "yazı alanı"
 * diye okunur ve klavyeyle odaklanabilirdi — bu depoda defalarca ölçülmüş
 * sınıftan bir hata (`opacity-0` tek başına bir öğeyi etkileşimden
 * çıkarmaz). İkisi birden şart: `pointer-events-none` fareyi,
 * `aria-hidden` okuyucuyu, `tabIndex={-1}` de sekme sırasını kapatır.
 *
 * ⚠️ **TALEP BURADA AÇILMAZ, KATALOGDA AÇILIR.** Talep APP BAZLI
 * (`tyro_requestapp`, satır başına bir app) ve sohbet bir app değil — hangi
 * asistan için istendiğini kullanıcı seçmek zorunda. Not alanıyla birlikte
 * tam akış kilitli kartın örtüsünde; ikinci bir talep yüzeyi açmak aynı
 * kaydı iki farklı biçimde yazan iki yol demekti. Düğme oraya götürüyor ve
 * kartın metni nereye gittiğini SÖYLÜYOR.
 */
export function AgentAccessOverlay({ onGoToCatalogue }) {
  const { t } = useLocale()
  return (
    <div className="absolute inset-0 z-30 grid place-items-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card/95 p-6 text-center shadow-2xl ring-1 ring-foreground/5 backdrop-blur-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand-on-soft">
          <HugeiconsIcon icon={SquareLock01Icon} className="size-6" strokeWidth={1.8} />
        </span>
        <h2 className="mt-4 text-[1rem] font-semibold tracking-tight">{t("chat.locked.title")}</h2>
        <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted-foreground">
          {t("chat.locked.body")}
        </p>
        <button
          type="button"
          onClick={onGoToCatalogue}
          className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-brand-fill-deep px-4 py-2 text-[0.8125rem] font-medium text-white shadow-sm transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [@media(pointer:coarse)]:min-h-11"
        >
          {t("lock.requestCta")}
          <HugeiconsIcon icon={ArrowRight01Icon} className="size-4 shrink-0" strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}
