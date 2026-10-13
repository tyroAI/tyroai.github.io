import { HugeiconsIcon } from "@hugeicons/react"
import ArrowDown02Icon from "@hugeicons/core-free-icons/ArrowDown02Icon"
import ExclamationMarkIcon from "@hugeicons/core-free-icons/ExclamationMarkIcon"
import Flag02Icon from "@hugeicons/core-free-icons/Flag02Icon"
import PinIcon from "@hugeicons/core-free-icons/PinIcon"
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"

/**
 * Gönderinin Outlook işaretleri — sabitle · bayrak · önem (2026-09-30, istek:
 * *"sabitlenmiş, bayrak eklediğimiz, yüksek önemde gelen maillerin
 * işaretlerini de yanlarında göster, eğer var ise"*). Veri `lib/feed.js`in
 * `toPost`unda (sabitlemenin genişletilmiş özellikten okunma gerekçesi orada).
 *
 * ⚠️ **YALNIZ İKON, KELİME YOK** (2026-09-30, kullanıcının son kararı: *"ikonlara
 * yazı yazma, ikon olsun sadece"*). İlk sürüm ikon + kelimeydi (deponun
 * "hover'a bağlı bilgi yok" kuralı); aynı gün önce bayrak, sonra hepsi ikona
 * indi. Gerekçe: beşi de Outlook'un KENDİ işaretleri (iğne · bayrak · onay ·
 * ünlem · aşağı ok) ve kullanıcı onları gelen kutusundan tanıyor. Adı ekran
 * okuyucu için `sr-only` metinde, farede `title`da duruyor. Bilinen bedel:
 * dokunmatikte ikonun adı okunamıyor.
 *
 * ⚠️ **RENK OUTLOOK'UN DİLİ**: bayrak ve yüksek önem kırmızı (`--destructive`),
 * tamamlanan bayrak yeşil onay, sabitleme markanın tonu, düşük önem nötr.
 * Kırmızı burada bir HATA değil, Outlook'ta aynı işaretin rengi — kullanıcı
 * onu gelen kutusundan tanıyor.
 *
 * İşaret yoksa HİÇBİR ŞEY çizilmez (boş bir kap satıra boşluk bırakırdı).
 * Kart ve okuma penceresi aynı bileşeni çiziyor — ikisi ayrışamaz.
 */
const MARKS = [
  { key: "pinned", when: (p) => p.pinned, icon: PinIcon, tone: "bg-brand/10 text-brand-ink" },
  {
    key: "flagged",
    when: (p) => p.flag === "flagged",
    icon: Flag02Icon,
    tone: "bg-destructive/10 text-destructive",
  },
  {
    key: "complete",
    when: (p) => p.flag === "complete",
    icon: Tick02Icon,
    tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  {
    key: "high",
    when: (p) => p.importance === "high",
    icon: ExclamationMarkIcon,
    tone: "bg-destructive/10 text-destructive",
  },
  {
    key: "low",
    when: (p) => p.importance === "low",
    icon: ArrowDown02Icon,
    tone: "bg-muted text-muted-foreground",
  },
]

export function FeedMarks({ post, className }) {
  const { t } = useLocale()
  const marks = MARKS.filter((m) => m.when(post))
  if (!marks.length) return null
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1", className)}>
      {marks.map((m) => (
        <span
          key={m.key}
          title={t(`feed.mark.${m.key}`)}
          className={cn(
            "inline-flex shrink-0 items-center rounded-md px-1 py-px leading-4",
            m.tone,
          )}
        >
          <HugeiconsIcon icon={m.icon} className="size-3" strokeWidth={2.2} aria-hidden="true" />
          <span className="sr-only">{t(`feed.mark.${m.key}`)}</span>
        </span>
      ))}
    </span>
  )
}
