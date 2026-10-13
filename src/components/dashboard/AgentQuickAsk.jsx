import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { HugeiconsIcon } from "@hugeicons/react"
import ArrowUp01Icon from "@hugeicons/core-free-icons/ArrowUp01Icon"
import { requestOpenChat, setPendingAsk } from "@/lib/chatBus"
import { IconOrLogo } from "@/components/common/IconOrLogo"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"

/**
 * Launcher kartına sağ tıklayınca imlecin yanında açılan hazır soru kutusu.
 *
 * Karta SOL tıklamak zaten sohbeti o asistanla açıyor; buradaki kazanç,
 * kullanıcının aklındaki soruyu sohbet açılmasını beklemeden yazabilmesi —
 * soru park edilip asistan seçimiyle birlikte gönderiliyor, kullanıcı açılan
 * panelde doğrudan cevabı buluyor.
 *
 * Soru olay olarak YAYINLANMAZ, park edilir (bkz. lib/chatBus): sohbet henüz
 * mount edilmemiş olabilir — dock onu açılışta kuruyor — ve boş odaya atılan
 * bir olay kaybolur. ChatScreen ekrana gelir gelmez parkı alıp gerçekten
 * gönderiyor.
 *
 * KİLİT: bu kutu yalnızca kilitli OLMAYAN asistan için açılır (bkz.
 * AppLauncher'daki `onContextMenu` koruması). İkinci kademe ChatScreen'in
 * kendisinde: park edilmiş soru adıyla çözülürken kilitli asistana asla
 * yönlendirilmiyor, o durumda mevcut asistana düşüyor. Yani kilit bir şekilde
 * geç otursa bile soru yetkisiz bir asistana gitmez.
 */
export function AgentQuickAsk({ agent, anchor, onClose }) {
  const { t } = useLocale()
  const [question, setQuestion] = useState("")
  const inputRef = useRef(null)
  const popoverRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Dışarı tıklama ve Escape ile kapanır. `capture: true` — kutunun altındaki
  // kart da bir düğme; yakalama aşamasında dinlemezsek kapanış, kartın kendi
  // tıklamasıyla (yani sohbetin açılmasıyla) yarışır.
  useEffect(() => {
    function handlePointerDown(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) onClose()
    }
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("pointerdown", handlePointerDown, { capture: true })
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, { capture: true })
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [onClose])

  // Görünüm alanına sığdır: imleç sağ/alt kenara yakınken kutu ekranın dışına
  // taşıyor ve gönder düğmesi erişilemez hâle geliyordu.
  const [pos, setPos] = useState({ left: anchor.x, top: anchor.y })
  useLayoutEffect(() => {
    const el = popoverRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setPos({
      left: Math.max(12, Math.min(anchor.x, window.innerWidth - rect.width - 12)),
      top: Math.max(12, Math.min(anchor.y, window.innerHeight - rect.height - 12)),
    })
  }, [anchor])

  function handleSubmit() {
    const q = question.trim()
    if (!q) return
    // `agent` AD olarak gider, id olarak değil: katalog satırının GUID'i
    // ortamlar (dev/prod Dataverse) arasında değişiyor, ad ise alternate
    // key'in yarısı olduğu için kararlı. ChatScreen adı görünür ve kilitsiz
    // listeye karşı çözüyor.
    setPendingAsk({ question: q, agent: agent.name })
    requestOpenChat({ focusComposer: true })
    onClose()
  }

  return createPortal(
    <div
      ref={popoverRef}
      role="dialog"
      aria-label={`${agent.name} — ${t("launcher.quickAsk.aria")}`}
      style={{ position: "fixed", left: pos.left, top: pos.top, zIndex: 9999 }}
      className={cn(
        "w-[22rem] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl",
        // Yüzen katman → popover yüzeyi, böylece koyu temada kendiliğinden
        // terse döner.
        "border border-border/50 bg-[color-mix(in_oklab,var(--popover)_95%,transparent)] backdrop-blur-xl backdrop-saturate-150",
        "shadow-[0_16px_48px_-8px_color-mix(in_oklab,var(--foreground)_22%,transparent),0_4px_12px_-4px_color-mix(in_oklab,var(--foreground)_8%,transparent)]",
      )}
      // Kutunun üstünde ikinci bir sağ tık, altındaki kartın menüsünü yeniden
      // açmasın.
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Marka şeridi — kartın ikonuyla aynı gradyan, kutunun nereden geldiğini
          söyler. */}
      <div
        aria-hidden="true"
        className="h-0.5 w-full bg-gradient-to-r from-brand-from via-brand-via to-brand-to"
      />

      <div className="flex items-start gap-2.5 px-4 pb-2 pt-3.5">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-from via-brand-via to-brand-to text-brand-on-brand shadow-sm">
          <IconOrLogo iconName={agent.iconName} logo={agent.logo} className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.8125rem] font-semibold leading-snug text-foreground">
            {agent.name}
          </p>
          {agent.description && (
            <p className="mt-0.5 truncate text-[0.6875rem] leading-tight text-muted-foreground">
              {agent.description}
            </p>
          )}
        </div>
      </div>

      <div className="px-3 pb-3.5">
        <div
          className={cn(
            "flex items-center gap-2 rounded-xl border border-border/50 bg-[color-mix(in_oklab,var(--muted)_80%,transparent)] px-3 py-2",
            "transition-all duration-150 focus-within:border-brand-via/40 focus-within:shadow-[0_0_0_2px_color-mix(in_oklab,var(--brand-via)_10%,transparent)]",
          )}
        >
          <input
            ref={inputRef}
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                handleSubmit()
              }
            }}
            placeholder={t("launcher.quickAsk.placeholder")}
            className="min-w-0 flex-1 bg-transparent text-[0.8125rem] outline-none placeholder:text-muted-foreground/50"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!question.trim()}
            aria-label={t("chat.send")}
            className={cn(
              "grid size-7 shrink-0 place-items-center rounded-lg text-brand-on-brand shadow-sm transition-all",
              "bg-gradient-to-br from-brand-from via-brand-via to-brand-to",
              "hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-30",
            )}
          >
            <HugeiconsIcon icon={ArrowUp01Icon} className="size-3.5" strokeWidth={2.2} />
          </button>
        </div>
        <p className="mt-1.5 px-0.5 text-[0.6875rem] text-muted-foreground/60">
          {t("launcher.quickAsk.hint")}
        </p>
      </div>
    </div>,
    document.body,
  )
}
