import { HugeiconsIcon } from "@hugeicons/react"
import { cn } from "@/lib/utils"

/**
 * HAZIR İSTEM KUTUCUĞU — ikon + etiket, motion.dev'in "Motion+" düğmesinin
 * eğik silmesiyle (istek, 2026-10-01: *"motion.dev/examples'taki Motion+
 * butonunun animasyonunu istemiştim, hazır sorularda böyle olsun"*).
 *
 * ⚠️ İLK TUR YANLIŞ ÖRNEĞİ KOPYALADI: motion.dev'in "Rolling text button"ı
 * (etiket aşağı kayıp yukarıdan iniyordu). İstenen, examples sayfasının sağ
 * üstündeki MOTION+ düğmesiydi ve o başka bir efekt; kuralları gerçek
 * sayfanın CSS'inden okundu (`.fresh-primary-action`, index.css'teki
 * `.prompt-tile` notu).
 *
 * İKİ YÜZ, AYNI YERDE: alttaki yüz dinlenme hâli, üstteki (`prompt-tile-wipe`)
 * paletin gradyanında, beyaz yazılı kopya (`--tile-wipe-fill`, index.css) ve
 * `clip-path` ile gizli. Üstüne gelince kopya eğik bir
 * kenarla soldan sağa açılır; yazı yerinden OYNAMAZ, değişen yalnız renk.
 * ⚠️ İki yüzün dolgusu, yazı boyu ve ağırlığı AYNI olmak ZORUNDA (`font-medium`
 * köke yazılı, iki yüz de miras alıyor): satır başka yerden kırılırsa silme
 * geçerken yazı iki yerde görünür.
 * ⚠️ KOPYA KENARLIĞI DA ÖRTER (`-inset-px` + `rounded-[inherit]`, dolgu +1px).
 * İlk sürümde kopya kenarlığın İÇİNDE duruyordu ve kutucuk yarım piksele düşünce
 * köşe yumuşatması kenarlıkla dolgu arasında açık bir kıl çizgisi bırakıyordu
 * (ölçüldü: 1×–2× yoğunlukta 5 kutucuğun 4-5'i). Bu yüzden kökte `overflow`
 * gizli DEĞİL — kırpma kopyanın kendi yarıçapında.
 * ⚠️ KOPYANIN ETİKETİ GERÇEK METİN DEĞİL, `::before`: gerçek metin olsaydı
 * sayfada bul (Ctrl+F) görünmez kopyayı da bulur, seçip kopyalamak etiketi iki
 * kez verirdi. Kopya ayrıca `aria-hidden`.
 * ⚠️ DOKUNMATİKTE basınca küçülür (`data-pressed`): `:active` dokunuşta güvenilir
 * değil ve ilk turun `whileTap` geri bildirimi kaybolmasın. Farede referansın
 * 1px inişi (`:active`).
 *
 * Saf CSS — `motion` YOK: `clip-path` geçişi yarıda tersine dönünce kaldığı
 * yerden geri gider, ilk turun biriktirme durum makinesine gerek kalmadı.
 */
function release(e) {
  delete e.currentTarget.dataset.pressed
}

export function PromptTile({ icon, label, onClick, tone = "neutral", className }) {
  const brand = tone === "brand"
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={(e) => {
        if (e.pointerType !== "mouse") e.currentTarget.dataset.pressed = ""
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
      data-tone={tone}
      className={cn(
        "prompt-tile relative isolate flex min-h-11 w-full min-w-0 items-center rounded-2xl border px-2.5 py-2 text-left text-[0.8125rem] leading-snug",
        "hover:border-[color:var(--tile-wipe-edge)] focus-visible:border-[color:var(--tile-wipe-edge)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30",
        brand
          ? "border-brand/25 bg-brand/[0.07] font-medium text-foreground"
          : "border-border bg-card text-foreground/80",
        className,
      )}
    >
      <span className="relative z-[1] flex w-full min-w-0 items-center gap-2.5">
        <span
          aria-hidden="true"
          className={cn(
            "grid size-7 shrink-0 place-items-center rounded-xl",
            brand ? "bg-brand/[0.14] text-brand-ink" : "bg-foreground/[0.05] text-foreground/65",
          )}
        >
          <HugeiconsIcon icon={icon} className="size-4" strokeWidth={1.8} />
        </span>
        <span className="block min-w-0 flex-1 [overflow-wrap:anywhere]">{label}</span>
      </span>
      <span
        aria-hidden="true"
        className="prompt-tile-wipe pointer-events-none absolute -inset-px z-[2] flex items-center gap-2.5 rounded-[inherit] px-[calc(0.625rem+1px)] py-[calc(0.5rem+1px)]"
      >
        <span className="grid size-7 shrink-0 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--tile-wipe-fg)_16%,transparent)]">
          <HugeiconsIcon icon={icon} className="size-4" strokeWidth={1.8} />
        </span>
        <span
          data-label={label}
          className="block min-w-0 flex-1 [overflow-wrap:anywhere] before:content-[attr(data-label)]"
        />
      </span>
    </button>
  )
}
