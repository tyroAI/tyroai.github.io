import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import Archive02Icon from "@hugeicons/core-free-icons/Archive02Icon"
import CalendarAdd01Icon from "@hugeicons/core-free-icons/CalendarAdd01Icon"
import Mail01Icon from "@hugeicons/core-free-icons/Mail01Icon"
import { CalendarPopover } from "@/components/common/CalendarPopover"
import { FilesPopover } from "@/components/common/FilesPopover"
import { MailPopover } from "@/components/common/MailPopover"
import { Archive02Icon as AnimatedArchiveIcon } from "@/components/ui/archive-02"
import { CalendarAdd01Icon as AnimatedCalendarIcon } from "@/components/ui/calendar-add-01"
import { Mail01Icon as AnimatedMailIcon } from "@/components/ui/mail-01"
import { useEdgeNotchDesign } from "@/hooks/useEdgeNotchDesign"
import { useLocale } from "@/hooks/useLocale"
import { useWhatsNewCardStyle } from "@/hooks/useWhatsNewCardStyle"
import { EDGE_NOTCH_DESIGN_ATTR } from "@/lib/edgeNotchDesign"
import { onPanelRequest } from "@/lib/panelBus"
import { RailButton } from "./EdgeNotch"
import { HangingNotchShell } from "./HangingNotchShell"
import { useNotchCounts } from "./useNotchCounts"

// Kabuğun gövde ölçüleri (px): şerit üç ray düğmesi + tutamak; sekme yalnız tutamak. Omuzlar
// gövdenin iki yanına taşar (`HangingNotchShell`).
const BAR = { width: 236, height: 104, shoulder: 40 }
const TAB = { width: 72, height: 22, shoulder: 22 }

/** Aç/kapa çizgisi: yan raydaki tutamağın yatayı — paletin renginde, kapalıyken de seçilir. */
function Handle({ label, expanded, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-expanded={expanded}
      className="relative grid h-5 w-16 place-items-center rounded-full outline-none after:absolute after:-inset-x-2 after:-inset-y-3 focus-visible:ring-2 focus-visible:ring-[var(--notch-focus)]"
    >
      <span
        aria-hidden="true"
        className="h-[0.1875rem] w-8 rounded-full bg-[linear-gradient(to_right,var(--notch-hot-1),var(--notch-hot-2),var(--notch-hot-3))] shadow-[0_0_6px_color-mix(in_oklch,var(--notch-hot-2)_45%,transparent)]"
      />
    </button>
  )
}

/**
 * Telefon ve tablet çentiği (< 1024 px): header çizgisinin ortasında asılı, yan rayın kıvrımlı
 * silüetiyle (`HangingNotchShell`). Kapalıyken küçük bir sekme; açılınca YATAY şerit — Posta · Takvim · Dosyalar, yan rayın aynı düğmeleri
 * (halka, sayı rozeti) ve aynı paneller. Çentik varken header'da bu üç düğme yok (masaüstüyle
 * aynı). Açık/kapalı oturumluk, varsayılan kapalı: açık şerit içeriğin sağ üstünü örter.
 */
export function MobileNotch() {
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const [panel, setPanel] = useState(null)
  const counts = useNotchCounts()
  const design = useEdgeNotchDesign()
  const cardStyle = useWhatsNewCardStyle()
  const shell = {
    design,
    designAttr: EDGE_NOTCH_DESIGN_ATTR[design] ?? "palette",
    cardVariant: cardStyle === "speakinglight" ? "light" : "gravity",
  }

  // Sayfadan gelen panel isteği (`lib/panelBus`): dar ekranda paneller burada açılır.
  useEffect(() => {
    const claim = (name) => () => {
      if (window.matchMedia("(min-width: 1024px)").matches) return false
      setOpen(true)
      setPanel(name)
      return true
    }
    const offMail = onPanelRequest("mail", claim("mail"))
    const offCalendar = onPanelRequest("calendar", claim("calendar"))
    return () => {
      offMail()
      offCalendar()
    }
  }, [])

  const toggle = (name) => (o) => setPanel(o ? name : null)

  return (
    <nav
      data-slot="mobile-notch"
      aria-label={t("notch.aria")}
      className="absolute left-1/2 top-0 z-30 -translate-x-1/2"
    >
      <AnimatePresence initial={false} mode="wait">
        {open ? (
          <motion.div
            key="bar"
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          >
            <HangingNotchShell
              {...shell}
              {...BAR}
              className="flex flex-col items-center justify-between pt-1"
            >
              <div className="flex items-center gap-0.5">
                <MailPopover
                  side="bottom"
                  align="center"
                  open={panel === "mail"}
                  onOpenChange={toggle("mail")}
                  trigger={
                    <RailButton
                      icon={Mail01Icon}
                      animatedIcon={AnimatedMailIcon}
                      label={t("notch.mail")}
                      count={counts.mail}
                      accent="var(--notch-hot-1)"
                      delay={0.1}
                    />
                  }
                />
                <CalendarPopover
                  side="bottom"
                  align="center"
                  open={panel === "calendar"}
                  onOpenChange={toggle("calendar")}
                  trigger={
                    <RailButton
                      icon={CalendarAdd01Icon}
                      animatedIcon={AnimatedCalendarIcon}
                      label={t("notch.calendar")}
                      count={counts.calendar}
                      accent="var(--notch-hot-2)"
                      delay={0.18}
                    />
                  }
                />
                <FilesPopover
                  side="bottom"
                  align="center"
                  trigger={
                    <RailButton
                      icon={Archive02Icon}
                      animatedIcon={AnimatedArchiveIcon}
                      label={t("notch.files")}
                      count={counts.files}
                      accent="var(--notch-hot-3)"
                      delay={0.26}
                    />
                  }
                />
              </div>
              <Handle label={t("notch.collapse")} expanded onClick={() => setOpen(false)} />
            </HangingNotchShell>
          </motion.div>
        ) : (
          <motion.div
            key="tab"
            initial={{ y: -6, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -6, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <HangingNotchShell {...shell} {...TAB} className="grid place-items-center">
              <Handle label={t("notch.expand")} expanded={false} onClick={() => setOpen(true)} />
            </HangingNotchShell>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
