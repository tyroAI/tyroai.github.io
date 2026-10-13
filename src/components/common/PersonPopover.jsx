import { useId, useMemo, useRef, useState } from "react"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { useHoverIntent } from "@/hooks/useHoverIntent"
import { useLocale } from "@/hooks/useLocale"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { alignFor, roomiestSide } from "@/lib/placement"
import { PersonCard } from "./PersonCard"

// Kartın yaklaşık ölçüsü (px) — yön seçimi için.
const CARD_SIZE = { width: 336, height: 540 }

/**
 * Bir tetikten açılan kişi kartı.
 *
 * `children` bir işlev: `(trigger) => …` — dönen props bir ya da BİRDEN ÇOK
 * düğmeye yayılabilir (gönderi kartında foto ve ad ayrı sütunlarda ama aynı
 * kartı açıyor). Kart basılan düğmeye yaslanır (`PopoverAnchor virtualRef`).
 *
 * @param {object} p
 * @param {{name?: string, address?: string, title?: string}} p.person
 * @param {{kind: "birthday"|"anniversary"|"joiner", text?: string, years?: number}} [p.context]
 * @param {{label: string, icon?: object, onClick: () => void}} [p.extraAction]
 * @param {boolean} [p.hover] fareyle üstüne gelince de açılır (karta geçince açık
 *   kalır, ikisinden de çıkınca kapanır; fareyle açılan kart odağı çalmaz,
 *   basılırsa sabitlenir). Dokunmatik ve klavye eskisi gibi basışla.
 */
export function PersonPopover({
  person,
  context,
  extraAction,
  side = "bottom",
  align = "start",
  hover = false,
  children,
}) {
  const { t } = useLocale()
  const id = useId()
  // ⚠️ DAR EKRANDA KART SATIRIN ALTINDA: 390 px'te ne sol ne sağ yana sığıyor
  // ve Radix yanı koruyup kartı ekranın dışına (x = −313) itiyordu (ölçüldü).
  const roomy = useMediaQuery("(min-width: 40rem)")
  const [anchor, setAnchor] = useState(null)
  // Yön açılırken seçilir: tercih `side`, sığmazsa en geniş boşluk — sağ alttaki
  // bir karttan açılan kart üste çevrilip header'ın altına sıkışıyordu.
  const [placed, setPlaced] = useState(side)
  const openAt = (el) => {
    setPlaced(roomiestSide(el.getBoundingClientRect(), CARD_SIZE, side))
    setAnchor(el)
  }
  // Popper bir "ölçülebilir" ister; basılan düğme durumda tutuluyor, nesne ona bakıyor.
  const virtualRef = useMemo(() => ({ current: anchor }), [anchor])
  // Kapanınca odağın döneceği düğme (kapanırken `anchor` boşalıyor, bu kalıyor).
  const [returnTo, setReturnTo] = useState(null)
  const outside = useRef(false)
  const open = Boolean(anchor)
  const intent = useHoverIntent()
  const close = () => {
    intent.cancel()
    setAnchor(null)
  }
  const hoverClose = (e) => e.pointerType === "mouse" && intent.close(() => setAnchor(null))

  const trigger = {
    type: "button",
    // Tetiklerin hepsi işaretli: kart açıkken birine basmak "dışarı tıklama"
    // sayılıp kapatıp yeniden AÇMASIN (Radix'in kendi tetiği için yaptığı).
    "data-person-trigger": id,
    "aria-haspopup": "dialog",
    "aria-expanded": open,
    onClick: (e) => {
      // Altta gerilmiş bir kaplama ya da satırın kendi tıklaması olabilir.
      e.stopPropagation()
      intent.cancel()
      const el = e.currentTarget
      setReturnTo(el)
      // Fareyle açılmış karta basmak onu kapatmaz, sabitler.
      const pin = intent.isHover() && anchor === el
      intent.reset()
      if (pin) return
      if (anchor === el) close()
      else openAt(el)
    },
    ...(hover && {
      onPointerEnter: (e) => {
        if (e.pointerType !== "mouse" || (open && !intent.isHover())) return
        const el = e.currentTarget
        intent.open(() => {
          setReturnTo(el)
          openAt(el)
        })
      },
      onPointerLeave: hoverClose,
    }),
  }

  return (
    <Popover open={open} onOpenChange={(next) => !next && close()}>
      <PopoverAnchor virtualRef={virtualRef} />
      {children(trigger)}
      {open && (
        <PopoverContent
          side={roomy ? placed : "bottom"}
          align={roomy ? alignFor(placed, align) : "center"}
          sideOffset={8}
          collisionPadding={12}
          aria-label={t("person.card")}
          className="w-[min(21rem,calc(100vw-1.5rem))] max-h-[min(var(--radix-popover-content-available-height),36rem)] gap-0 overflow-y-auto overscroll-contain p-0"
          // Sohbet rıhtımı pencerede Escape dinliyor: kartı kapatan Escape rıhtımı da kapatmasın.
          onEscapeKeyDown={(e) => e.stopPropagation()}
          onPointerEnter={intent.cancel}
          onPointerLeave={hoverClose}
          onOpenAutoFocus={(e) => intent.isHover() && e.preventDefault()}
          onInteractOutside={(e) => {
            const target = e.target instanceof Element ? e.target : null
            if (target?.closest(`[data-person-trigger="${CSS.escape(id)}"]`)) {
              e.preventDefault()
              return
            }
            outside.current = true
          }}
          // Tetik bir `PopoverTrigger` değil; Radix'in odağı geri verme işi burada.
          // Dışarıya tıklanarak kapandıysa odak oraya gider, geri çekilmez.
          onCloseAutoFocus={(e) => {
            e.preventDefault()
            const el = returnTo
            const refocus = !outside.current && !intent.isHover()
            if (refocus && el?.isConnected) el.focus({ preventScroll: true })
            outside.current = false
            intent.reset()
          }}
        >
          <PersonCard
            person={person}
            context={context}
            extraAction={
              extraAction && {
                ...extraAction,
                onClick: () => {
                  close()
                  extraAction.onClick()
                },
              }
            }
            onDone={close}
          />
        </PopoverContent>
      )}
    </Popover>
  )
}
