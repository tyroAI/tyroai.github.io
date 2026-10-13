import { HugeiconsIcon } from "@hugeicons/react"
import AiScanIcon from "@hugeicons/core-free-icons/AiScanIcon"
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon"
import Message01Icon from "@hugeicons/core-free-icons/Message01Icon"
import Robot01Icon from "@hugeicons/core-free-icons/Robot01Icon"
import SentIcon from "@hugeicons/core-free-icons/SentIcon"
import SparklesIcon from "@hugeicons/core-free-icons/SparklesIcon"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"

/**
 * DOSYAYI TYRO'YA DEVRET — satırın sağındaki tarama ikonu ve menüsü.
 *
 * Header'ın dosya paneli ve Keşfet › Dosyalarım AYNI bileşeni çiziyor
 * (2026-09-30'da panelin içinden çıkarıldı): iki kopya zamanla iki farklı
 * menü olurdu.
 *
 * Satırdaki tetikleyici tarama ikonu; menünün BAŞLIĞINDAKİ robot duruyor.
 * İkisi farklı işler: buradaki "bu dosyayı incele" davetidir, oradaki
 * TYRO'nun kimliğidir ve header'daki hapla aynı markı taşır. Tetikleyici
 * HER ZAMAN görünür, üstüne gelince değil: dokunmatikte hover yok, ama daha
 * önemlisi bu satırın asıl teklifi ve gizlenmiş bir teklif keşfedilmiyor.
 *
 * `text-brand-ink!`: menü öğesinin taban sınıfı odaklanınca
 * `focus:**:text-accent-foreground` ile TÜM alt öğeleri boyuyor; işaret
 * olmadan rozet tam seçilmek üzereyken marka rengini kaybediyordu.
 * `brand-ink`, `brand-deep` DEĞİL: ikincisi koyu temada açık temanın mürekkebi.
 */
function AssistMenuItem({ icon, title, desc, onSelect }) {
  return (
    <DropdownMenuItem onSelect={onSelect} className="gap-2.5 rounded-lg px-2 py-2 focus:bg-brand/8">
      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand/12 text-brand-ink! transition-colors group-focus/dropdown-menu-item:bg-brand/20">
        <HugeiconsIcon icon={icon} className="size-4" strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.78125rem] font-semibold leading-tight">{title}</span>
        <span className="mt-0.5 block text-[0.65625rem] leading-snug text-muted-foreground">
          {desc}
        </span>
      </span>
      <HugeiconsIcon
        icon={ArrowRight01Icon}
        className="size-3.5 shrink-0 opacity-0 transition-opacity group-focus/dropdown-menu-item:opacity-50"
        strokeWidth={2}
      />
    </DropdownMenuItem>
  )
}

/**
 * @param {object} p
 * @param {object} p.item      dosya satırı (ad gösterilir)
 * @param {(item, mode: "summarise"|"work") => void} p.onAsk
 * @param {((item) => void)|null} p.onMail  `null` → posta satırı çizilmez (adresi olmayan öğe)
 * @param {string} [p.triggerClassName]
 * @param {(e: KeyboardEvent) => void} [p.onEscapeKeyDown]  rıhtım açıkken Escape'in pencereye kaçmaması için
 */
export function FileAssistMenu({ item, onAsk, onMail, triggerClassName, onEscapeKeyDown }) {
  const { t } = useLocale()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("files.assist")}
          title={t("files.assist")}
          className={cn("size-7 shrink-0 rounded-lg text-brand [&_svg]:!size-4", triggerClassName)}
        >
          <HugeiconsIcon icon={AiScanIcon} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[17rem] p-1.5"
        onEscapeKeyDown={onEscapeKeyDown}
      >
        {/* Başlık, hangi dosyayı devrettiğini TEYİT eder. Marka gradyanı
            yalnızca burada — TYRO hapı ve asistan avatarlarıyla aynı dolgu,
            yani "bu, asistanın alanı". */}
        <div className="mb-1 flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-from/15 via-brand-via/10 to-transparent px-2 py-1.5">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand-from via-brand-via to-brand-to text-white shadow-sm">
            <HugeiconsIcon icon={Robot01Icon} className="size-4" strokeWidth={1.9} />
          </span>
          <span className="min-w-0">
            <span className="block text-[0.71875rem] font-semibold leading-tight">
              {t("files.assistHeader")}
            </span>
            <span className="block truncate text-[0.625rem] leading-tight text-muted-foreground">
              {item.name}
            </span>
          </span>
        </div>
        <AssistMenuItem
          icon={SparklesIcon}
          title={t("files.assistSummarise")}
          desc={t("files.summariseDesc")}
          onSelect={() => onAsk(item, "summarise")}
        />
        <AssistMenuItem
          icon={Message01Icon}
          title={t("files.assistWork")}
          desc={t("files.workDesc")}
          onSelect={() => onAsk(item, "work")}
        />
        {onMail && (
          <AssistMenuItem
            icon={SentIcon}
            title={t("files.assistMail")}
            desc={t("files.mailDesc")}
            onSelect={() => onMail(item)}
          />
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
