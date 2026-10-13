import { Skeleton } from "@/components/ui/skeleton"
import { useLocale } from "@/hooks/useLocale"

/**
 * Okuma bölmesinin gövdesi — kalan yüksekliğin tamamı: bekleme iskeleti, HTML çerçevesi,
 * düz metin ya da "metin yok / çok büyük / getirilemedi" kartı. Beyaz zemin yalnız
 * ÇERÇEVEDE (postanın kendi tasarımı); kabuk tema tokenlarında kalır, koyu temada kâğıt
 * kenar boşluklu.
 */
export function ReaderBody({ post, body, html, waiting, failed, title }) {
  const { t } = useLocale()
  return (
    <div className="min-h-0 flex-1 overflow-hidden border-t border-border/70 bg-card dark:bg-muted/30 dark:p-3">
      {waiting && (
        <div className="space-y-3 px-5 py-5 sm:px-6">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}
      {!waiting && html && (
        <iframe
          title={title}
          /* ⚠️ `allow-popups` + `allow-popups-to-escape-sandbox`: bağlantılar
             yeni sekmede açılsın. Script, form ve same-origin KAPALI —
             gerekçe `feedFrame.js`te. */
          sandbox="allow-popups allow-popups-to-escape-sandbox"
          className="size-full border-0 bg-white dark:rounded-xl"
          srcDoc={html}
        />
      )}
      {/* Düz metin gövde de gösterilir: `useFeedBody` HTML olmayan postayı `text`e yazar. */}
      {!waiting && !html && body?.text && (
        <div className="h-full overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
          <p className="whitespace-pre-line text-[0.875rem] leading-relaxed text-foreground/85">
            {body.text}
          </p>
        </div>
      )}
      {!waiting && !html && !body?.text && (
        <div className="grid h-full place-items-center px-6 text-center">
          <div className="max-w-sm">
            <p className="text-[0.875rem] font-medium text-foreground/80">
              {body?.oversize
                ? t("feed.oversize")
                : failed
                  ? t("feed.bodyError")
                  : t("feed.noBody")}
            </p>
            <p className="mt-1 text-[0.75rem] leading-relaxed text-muted-foreground">
              {body?.oversize ? t("feed.oversizeBody") : t("feed.noBodyHint")}
            </p>
            {post.preview && (
              <p className="mt-3 rounded-lg bg-muted/40 p-3 text-left text-[0.75rem] leading-relaxed text-foreground/75">
                {post.preview}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
