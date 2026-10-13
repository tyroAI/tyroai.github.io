import { HugeiconsIcon } from "@hugeicons/react"
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon"
import Award01Icon from "@hugeicons/core-free-icons/Award01Icon"
import BirthdayCakeIcon from "@hugeicons/core-free-icons/BirthdayCakeIcon"
import { useLocale } from "@/hooks/useLocale"
import { requestOpenChat, setPendingAsk } from "@/lib/chatBus"
import { cn } from "@/lib/utils"
import "./celebration.css"

/**
 * Özet balonunun KUTLAMA bloğu — günün özetinden AYRI (istek: *"özet
 * balonunda diğer bilgilerle doğum günü mesajı ayrı olsun, bitişik olmaz"*).
 * İlk sürüm kutlamayı özet paragrafının ilk cümlesi yapmıştı; artık balonun
 * başında kendi tonlu bloğu, altında ince bir ayraç, sonra her zamanki özet.
 *
 * ⚠️ **SELAMLAMAYI TEKRAR ETMEZ, BİR İŞ ÖNERİR.** "İyi ki doğdun" ve "15. yıl"
 * hava kartında yazıyor (2026-10-03'ten beri; önce panonun üstündeki afişte);
 * burada yalnız asistanın teklifi var: gelen tebriklere teşekkür mesajını
 * hazırlamak. Eskiden başlık "Bugün doğum günün" diyordu — kart onu zaten
 * söylerken blok dar kartta (sağ ızgaranın ilk satırı) iki satır fazladan
 * yiyordu. Düğme soruyu "tyro office"e park edip rıhtımı açar
 * (`setPendingAsk`, header panellerinin yolu) — sayfa yerinde kalır.
 * `compact`: sağ ızgaranın dar kartı — yazı ve kutular bir kademe küçük.
 */
export function CelebrationNote({ celebration, compact = false }) {
  const { t } = useLocale()
  const birthday = !!celebration?.birthday
  const years = celebration?.anniversary?.years ?? null
  const kind = birthday ? "birthday" : "anniversary"

  function draftThanks() {
    setPendingAsk({
      question: birthday
        ? years
          ? t("myspace.cel.note.promptBoth", { n: years })
          : t("myspace.cel.note.promptBirthday")
        : t("myspace.cel.note.promptAnniversary", { n: years }),
      agent: "tyro office",
    })
    requestOpenChat({ focusComposer: true })
  }

  // ⚠️ BLOĞUN TAMAMI TEK DÜĞME (sağda ok): ayrı bir "Hazırla" düğmesi bloğu
  // üç satıra çıkarıyor ve o gün sayfayı ~40 px uzatıyordu.
  return (
    <button
      type="button"
      onClick={draftThanks}
      data-slot="celebration-note"
      data-kind={kind}
      data-compact={compact ? "" : undefined}
      className="cel-note group/note"
    >
      <span aria-hidden="true" className="cel-note-icon">
        <HugeiconsIcon
          icon={birthday ? BirthdayCakeIcon : Award01Icon}
          className={compact ? "size-4" : "size-[1.125rem]"}
          strokeWidth={2}
        />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span
          className={cn(
            "block font-semibold leading-snug tracking-[-0.01em] text-foreground",
            compact ? "text-[0.8125rem]" : "text-[0.9375rem]",
          )}
        >
          {t("myspace.cel.note.title")}
        </span>
        {/* Dar kartta açıklama yalnız ekran okuyucuda: görünür hâli blok
            ~160 px'lik sütunda dört satıra kırılıp satırı 232 → 274 px'e
            çıkarıyordu (ölçüldü). Başlık + ok eylemi zaten söylüyor. */}
        <span
          className={
            compact ? "sr-only" : "mt-0.5 block text-[0.8125rem] leading-snug text-muted-foreground"
          }
        >
          {t("myspace.cel.note.body")}
        </span>
      </span>
      <span aria-hidden="true" className="cel-note-go">
        <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" strokeWidth={2.2} />
      </span>
    </button>
  )
}
