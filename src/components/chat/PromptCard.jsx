import { HugeiconsIcon } from "@hugeicons/react"
import DragDropVerticalIcon from "@hugeicons/core-free-icons/DragDropVerticalIcon"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"
import { PromptHeart } from "./PromptHeart"
import { PromptText } from "./PromptText"

/* İki yüz (kart ve silmenin kopyası) AYNI kutuyu kurar: satır başka yerden
   kırılırsa silme geçerken yazı iki yerde görünür (`PromptTile`ın kuralı). */
const FACE = "flex w-full items-start gap-2.5 @max-lg/chat:gap-2"
const ICON_BOX = "mt-px grid size-6 shrink-0 place-items-center rounded-lg"
const TITLE = "block truncate text-[0.78125rem] font-semibold leading-tight"
// ⚠️ `block` YAZILMAZ: `line-clamp`in `-webkit-box`ını ezer, metin üçüncü satıra taşar.
const BODY = "mt-0.5 line-clamp-2 text-[0.71875rem] leading-[1.35] [overflow-wrap:anywhere]"

/* Kalp ve tutamak silmenin ÜSTÜNDE: koyu kopyanın üstünde okunsunlar diye
   mürekkepleri döner. Gecikme, silme sağ kenara varana kadar beyaz bir kalbin
   açık kartta kaybolmasın diye. */
const ON_WIPE = cn(
  "[@media(hover:hover)]:[.prompt-tile:hover_&]:text-[color:var(--tile-wipe-fg)]",
  "[@media(hover:hover)]:[.prompt-tile:hover_&]:delay-200",
  "[@media(hover:hover)]:[.prompt-tile:hover_&]:hover:bg-[color-mix(in_oklab,var(--tile-wipe-fg)_18%,transparent)]",
)

function release(e) {
  delete e.currentTarget.dataset.pressed
}

/**
 * Sohbetin öneri kartı (`PromptStarters`). Üstüne gelince Anasayfa'nın hazır
 * istem kutucuğundaki eğik silme: paletin gradyanında, beyaz yazılı kopya
 * soldan sağa açılır, yazı yerinden oynamaz (kurallar `myspace-surfaces.css`
 * › `.prompt-tile`).
 *
 * ⚠️ KÖK `div`, SEÇİM BİR KAPLAMA DÜĞMESİ: kart `<button>` olsaydı kalp iç içe
 * düğme olurdu (bkz. `PromptHeart`). Kaplama DOM'da kalpten önce gelir; yüz
 * (`z-[1]`) kaplamanın üstünde ama `pointer-events-none`, tıklama kaplamaya
 * düşer.
 *
 * ⚠️ Sürükleme yalnız Favoriler sekmesindeki KENDİ favorilerde (`sortable`);
 * HTML5 sürükleme klavyeye hizmet etmiyor, tutamak ok tuşlarını da taşıyor.
 */
export function PromptCard({
  prompt: p,
  icon,
  sortable,
  dragging,
  favorite,
  showHeart,
  onPick,
  onDragStart,
  onDragEnd,
  onNudge,
}) {
  const { t } = useLocale()
  return (
    <div
      draggable={sortable || undefined}
      onDragStart={
        sortable
          ? (e) => {
              onDragStart(p.key)
              e.dataTransfer.effectAllowed = "move"
              // Firefox veri olmadan sürüklemeyi başlatmıyor.
              e.dataTransfer.setData("text/plain", p.key)
            }
          : undefined
      }
      onDragEnd={sortable ? onDragEnd : undefined}
      onPointerDown={(e) => {
        if (e.pointerType !== "mouse") e.currentTarget.dataset.pressed = ""
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
      className={cn(
        "prompt-tile group/starter relative isolate flex h-full w-full rounded-xl border border-border/60 bg-card px-3 py-2.5 text-left short:py-2 @max-lg/chat:py-2",
        "hover:border-[color:var(--tile-wipe-edge)] focus-within:outline-none focus-within:ring-2 focus-within:ring-brand/40",
        dragging && "opacity-40",
      )}
    >
      <button
        type="button"
        onClick={() => onPick(p)}
        className="prompt-tile-hit absolute inset-0 z-0 rounded-xl focus:outline-none"
      >
        <span className="sr-only">{p.title}</span>
      </button>
      {sortable && (
        <span
          role="button"
          tabIndex={0}
          aria-label={t("prompts.reorder", { name: p.title })}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
              e.preventDefault()
              onNudge(p.key, -1)
            } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
              e.preventDefault()
              onNudge(p.key, 1)
            }
          }}
          className={cn(
            "absolute right-7 top-1.5 z-10 grid size-5 cursor-grab place-items-center rounded",
            "text-muted-foreground/45 opacity-0 transition hover:text-muted-foreground",
            "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
            "group-hover/starter:opacity-100 active:cursor-grabbing",
            ON_WIPE,
          )}
        >
          <HugeiconsIcon icon={DragDropVerticalIcon} className="size-3.5" strokeWidth={1.8} />
        </span>
      )}
      {showHeart && (
        <PromptHeart
          promptKey={p.key}
          favorite={favorite}
          className={cn("group-hover/starter:opacity-100", ON_WIPE)}
        />
      )}
      <span className={cn(FACE, "pointer-events-none relative z-[1]")}>
        <span className={cn(ICON_BOX, "bg-brand/10 text-brand-ink")}>
          <HugeiconsIcon icon={icon} className="size-3.5" strokeWidth={1.9} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn(TITLE, "text-foreground")}>{p.title}</span>
          {/* İki satır: Öneri Laboratuvarı aynı istemi TAM yazıyor, iki yüzey
              aynı kartı farklı vaat etmesin. Tam metin zaten besteciye düşer. */}
          <span className={cn(BODY, "text-muted-foreground")}>
            <PromptText text={p.text} />
          </span>
        </span>
      </span>
      {/* Silmenin kopyası — kenarlığı da örter (`-inset-px`, dolgu +1px). */}
      <span
        aria-hidden="true"
        className="prompt-tile-wipe pointer-events-none absolute -inset-px z-[2] flex rounded-[inherit] px-[calc(0.75rem+1px)] py-[calc(0.625rem+1px)] short:py-[calc(0.5rem+1px)] @max-lg/chat:py-[calc(0.5rem+1px)]"
      >
        <span className={FACE}>
          <span
            className={cn(ICON_BOX, "bg-[color-mix(in_oklab,var(--tile-wipe-fg)_16%,transparent)]")}
          >
            <HugeiconsIcon icon={icon} className="size-3.5" strokeWidth={1.9} />
          </span>
          <span className="min-w-0 flex-1">
            <span data-label={p.title} className={cn(TITLE, "before:content-[attr(data-label)]")} />
            <span
              className={cn(BODY, "text-[color-mix(in_oklab,var(--tile-wipe-fg)_82%,transparent)]")}
            >
              <PromptText text={p.text} ghost />
            </span>
          </span>
        </span>
      </span>
    </div>
  )
}
