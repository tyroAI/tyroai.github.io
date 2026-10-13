import { HugeiconsIcon } from "@hugeicons/react"
import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon"
import { useLocale } from "@/hooks/useLocale"
import { PostActions } from "../actions/PostActions"

/**
 * Okuma bölmesinin eylem çubuğu: kartın satırı (Beğen · Paylaş · TYRO ile özetle · Kaydet,
 * durum ortak) ve sağda "Outlook'ta aç" — Outlook yolunun tek yeri burası, kartta yok.
 * Dar bölmede ikisi bir satıra sığmazsa "Outlook'ta aç" alt satıra, ek kartlarının hizasına
 * iner (`flex-wrap`).
 */
export function ReaderActions({ post, onAsk }) {
  const { t } = useLocale()
  const outlook = post.webLink ?? "https://outlook.office.com/mail/"
  return (
    // Telefonda ek şeridinin üst payı sıfırlanıyor (`Attachments`, kaydırma payı): boşluğu bu verir.
    <div className="@container/reader-actions mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 max-sm:mb-2">
      <PostActions post={post} onAsk={onAsk} className="-mx-2.5 flex-1 basis-44" />
      <a
        href={outlook}
        target="_blank"
        rel="noopener noreferrer"
        className="relative inline-flex h-9 shrink-0 @[30rem]/reader-actions:ms-auto items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-border bg-card px-3 text-[0.75rem] font-medium text-foreground/85 outline-none transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-brand/40 pointer-coarse:after:absolute pointer-coarse:after:-inset-1 [&_svg]:size-3.5"
      >
        {t("feed.openOutlook")}
        <HugeiconsIcon icon={ArrowUpRight01Icon} strokeWidth={2} />
      </a>
    </div>
  )
}
