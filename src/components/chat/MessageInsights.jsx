import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon"
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"
import { InsightCard } from "./InsightCard"

/**
 * İÇGÖRÜ KARUSELİ — bir cevaptaki bütün grafikler, tek kartta sayfalı.
 *
 * Referans tasarımdaki "Insights N ‹ ›" kabuğunun uyarlaması. Tek grafik
 * varsa kabuk ÇİZİLMEZ: bir sayfalık karusel, olmayan bir seçimi vaat eder.
 *
 * Kartın kendisi `MessageChart` — burada yeni bir grafik yok, yalnız
 * sayfalama. Sayfa değişimi ajan izinin `.agent-row` belirmesiyle gelir;
 * ikinci bir geçiş tanımı açmak aynı ekranda iki ritim demekti.
 *
 * Sayaç "1 / 3" — referanstaki çıplak sayı ("3") kaç grafik olduğunu
 * söylüyor ama hangisinde olduğunu söylemiyordu.
 */
export function MessageInsights({ analyses }) {
  const { t } = useLocale()
  const [page, setPage] = useState(0)
  const count = analyses.length
  if (count === 0) return null
  if (count === 1) return <InsightCard analysis={analyses[0]} />

  const index = Math.min(page, count - 1)
  const move = (dir) => setPage((p) => (p + dir + count) % count)

  const navButton =
    "grid size-6 place-items-center rounded-md text-muted-foreground transition " +
    "hover:bg-accent/60 hover:text-foreground active:scale-[0.96] " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"

  return (
    /* Genişlik MessageChart'ınkiyle AYNI ifade: başlık satırı kartın
       kenarlarıyla hizalı dursun. */
    <div className="w-full max-w-[min(34rem,92cqw)]">
      <div className="mb-1.5 flex items-center justify-between px-0.5">
        <span className="flex items-baseline gap-1.5">
          <span className="text-[0.78125rem] font-semibold text-foreground">
            {t("chat.insights.title")}
          </span>
          <span className="text-[0.75rem] tabular-nums text-muted-foreground">
            {index + 1} / {count}
          </span>
        </span>
        <span className="flex items-center gap-0.5">
          <button
            type="button"
            aria-label={t("chat.insights.prev")}
            onClick={() => move(-1)}
            className={cn(navButton)}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5" strokeWidth={2.2} />
          </button>
          <button
            type="button"
            aria-label={t("chat.insights.next")}
            onClick={() => move(1)}
            className={cn(navButton)}
          >
            <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" strokeWidth={2.2} />
          </button>
        </span>
      </div>
      {/* `key`: sayfa değişince kart yeniden kurulur ve belirme animasyonu
          bir kez daha oynar — grafik tipi seçimi de o sayfaya ait kalır. */}
      <div key={index} className="agent-row">
        <InsightCard analysis={analyses[index]} />
      </div>
    </div>
  )
}
