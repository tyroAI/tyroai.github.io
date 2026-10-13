import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon"
import { cn } from "@/lib/utils"

/**
 * INLINE ACTION — watermelon kaydının (`registry.watermelon.sh/r/inline-action`)
 * aksiyon hapı, bu deponun diliyle (2026-10-03, istek: *"To-Do ve Keşfet'teki
 * refresh için bunu kullan"*).
 *
 * Basınca hap bir yükleme çubuğuna döner, iş biterse daire olup üstünden ışık
 * geçen bir onay işareti gösterir, 2 sn sonra eski hâline döner. İş başarısızsa
 * (söz `false` döner ya da atar) onaysız geri döner — sonucu çağıranın
 * bildirimi söylüyor.
 *
 * Kaynaktan ayrılan, ZORUNLU olanlar:
 * - ⚠️ **`npx shadcn add` KULLANILMADI, DOSYA ELLE TAŞINDI.** Komut bileşeni
 *   yazmadan önce `utils` dosyamızın üstüne yazmak için onay istedi ve bu arada
 *   `package.json`a `lucide-react` (depoda yasak) ile alakasız bir `cn` npm
 *   paketi ekledi; ikisi de geri alındı.
 * - ⚠️ **DIŞ SATIR YOK.** Kaynak bileşen "ikon + etiket | aksiyon" taşıyan
 *   geniş bir hap (≥ 20rem); To-Do ve Keşfet'te yenile bir ARAÇ ÇUBUĞU düğmesi
 *   ve satıra sığması gereken şey aksiyonun kendisi.
 * - ⚠️ **DÜĞME HİÇ SÖKÜLMEZ.** Kaynakta yükleme ve onay hâli düğmeyi DOM'dan
 *   çıkarıyor: klavyeyle basan kişinin odağı `<body>`ye düşerdi. Burada tek bir
 *   `<button>` var, yalnız İÇİ değişiyor; iş sürerken `aria-disabled` (ikinci
 *   basış yok sayılır, odak kalır) ve `aria-busy`.
 * - Renkler tema tokenlarından (`muted` · `foreground` · `background`), sabit
 *   onaltılık yok; onay işareti hugeicons (`Tick02Icon`).
 * - Genişlik ÖLÇÜLÜR: kaynak sabit 120 px kullanıyordu; burada etiket dört
 *   dilde farklı ("Yenile" · "Обновить"), görünmez bir ikizden okunur ve
 *   yüklenirken aynı kalır, onayda hapın yüksekliğine (daireye) iner.
 * - Hareketi azalt tercihinde kayan çubuk ve ışık yok, durumlar anında değişir.
 * - `busy`: iş başka yerden başladıysa (ör. "Tekrar dene") hap da yükleniyor.
 */
const SPRING = { type: "spring", stiffness: 400, damping: 35, mass: 1 }
const FADE = { initial: { opacity: 0, filter: "blur(4px)" }, animate: { opacity: 1, filter: "blur(0px)" }, exit: { opacity: 0, filter: "blur(4px)" } }

export function InlineAction({ icon, label, busyLabel, doneLabel, onAction, busy = false, className }) {
  const [status, setStatus] = useState("idle")
  const reduce = useReducedMotion()
  const sizer = useRef(null)
  const button = useRef(null)
  const [size, setSize] = useState(null) // { w, h } — boştaki hâlin ölçüsü
  const shown = status === "idle" && busy ? "loading" : status

  // Ölçü: görünmez ikiz (ikon + etiket) — dil değişince de yeniden okunur.
  useLayoutEffect(() => {
    const el = sizer.current
    const btn = button.current
    if (!el || !btn) return undefined
    // setState GÖZLEMCİNİN geri çağrısında (efektin gövdesinde değil —
    // `react-hooks/set-state-in-effect`); gözlemci ilk ölçüyü kendisi veriyor.
    const read = () => setSize((p) => {
      const w = Math.ceil(el.getBoundingClientRect().width)
      const h = Math.round(btn.getBoundingClientRect().height)
      return p && p.w === w && p.h === h ? p : { w, h }
    })
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [label])

  useEffect(() => {
    if (status !== "success") return undefined
    const id = setTimeout(() => setStatus("idle"), 2000)
    return () => clearTimeout(id)
  }, [status])

  async function trigger() {
    if (status !== "idle" || busy) return
    setStatus("loading")
    try {
      const ok = await onAction()
      setStatus(ok === false ? "idle" : "success")
    } catch {
      setStatus("idle")
    }
  }

  const aria = shown === "loading" ? busyLabel : shown === "success" ? doneLabel : label
  const width = size ? (shown === "success" ? size.h : size.w) : undefined

  return (
    <MotionConfig transition={SPRING} reducedMotion="user">
      {/* ⚠️ YUVA boştaki genişliği TUTAR: hap onayda daireye küçülünce komşusu
          (Keşfet'te arama kutusu, To-Do'da "To Do'da aç") 2 sn boyunca
          genişleyip geri daralıyordu. Daire yuvanın SONUNA yaslı — kaynakta da
          aksiyon satırın sağ ucunda küçülüyor. */}
      <span className={cn("inline-flex shrink-0 justify-end", className)} style={size ? { width: size.w } : undefined}>
        {/* ⚠️ GENİŞLİK CSS GEÇİŞİYLE, `motion`un `animate`iyle DEĞİL: motion
            hedef o anki ölçüye eşitken (boşta 82 → yüklenirken 82) stili hiç
            yazmıyor ve hap yüklenirken içeriğine, ~23 px'e çöküyordu (ölçüldü).
            Eğri hafif taşan bir yay — kaynağın spring'ine yakın. */}
        <button
          ref={button}
          type="button"
          onClick={trigger}
          aria-label={aria}
          title={aria}
          aria-busy={shown === "loading" || undefined}
          aria-disabled={shown !== "idle" || undefined}
          style={width ? { width } : undefined}
          className={cn(
            "relative flex h-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-foreground outline-none transition-[width,background-color] duration-[420ms] ease-[cubic-bezier(0.34,1.32,0.64,1)] focus-visible:ring-2 focus-visible:ring-brand/40 motion-reduce:transition-none [@media(pointer:coarse)]:h-11",
            shown === "idle" && "hover:bg-accent",
            shown !== "idle" && "cursor-default",
            shown === "loading" && "cursor-progress",
          )}
        >
          {/* Görünmez ikiz — boştaki hâlin genişliği buradan okunur. */}
          <span ref={sizer} aria-hidden="true" className="invisible absolute left-0 top-0 flex items-center gap-1.5 whitespace-nowrap px-3.5 text-[0.75rem] font-semibold">
            {icon && <HugeiconsIcon icon={icon} className="size-4 shrink-0" strokeWidth={1.9} />}
            {label}
          </span>
          <AnimatePresence mode="popLayout" initial={false}>
            {shown === "idle" && (
              <motion.span key="idle" {...FADE} className="flex items-center gap-1.5 whitespace-nowrap px-3.5 text-[0.75rem] font-semibold">
                {icon && <HugeiconsIcon icon={icon} className="size-4 shrink-0" strokeWidth={1.9} aria-hidden="true" />}
                {label}
              </motion.span>
            )}
            {shown === "loading" && (
              <motion.span key="loading" {...FADE} aria-hidden="true" className="block w-full px-3">
                <span className="relative block h-1.5 w-full rounded-full bg-foreground/15">
                  {reduce ? (
                    <span className="absolute inset-y-0 left-[35%] w-[30%] rounded-full bg-foreground/80" />
                  ) : (
                    <motion.span
                      className="absolute inset-y-0 w-[30%] rounded-full bg-foreground/80"
                      initial={{ left: "0%" }}
                      animate={{ left: "70%" }}
                      transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                    />
                  )}
                </span>
              </motion.span>
            )}
            {shown === "success" && (
              <motion.span
                key="success"
                {...FADE}
                aria-hidden="true"
                className="absolute inset-0 grid place-items-center overflow-hidden rounded-full bg-foreground text-background"
              >
                {!reduce && (
                  <motion.span
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
                    className="absolute inset-0 -skew-x-[40deg] bg-gradient-to-r from-transparent via-background/45 to-transparent"
                  />
                )}
                <HugeiconsIcon icon={Tick02Icon} className="relative size-5" strokeWidth={2.4} />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </span>
    </MotionConfig>
  )
}
