import { useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import AiScanIcon from "@hugeicons/core-free-icons/AiScanIcon"
import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import Download04Icon from "@hugeicons/core-free-icons/Download04Icon"
import CodeIcon from "@hugeicons/core-free-icons/CodeIcon"
import Shield01Icon from "@hugeicons/core-free-icons/Shield01Icon"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { FileBadge } from "@/components/common/FileBadge"
import { askTyroAboutFile, downloadFallbackUrl, sourceKind, sourceUrl } from "@/lib/fileActions"
import { fileMeta } from "@/lib/fileMeta"
import { cn } from "@/lib/utils"
import { useDriveDownload, useDriveHtml, useDrivePreview } from "@/hooks/useDrivePreview"
import {
  HTML_EXTS,
  HTML_SANDBOX,
  htmlPreviewDoc,
  liveHtmlItems,
  needsScripts,
} from "@/lib/htmlPreview"
import { useDriveThumbnail } from "@/hooks/useDriveThumbnail"
import { useLocale } from "@/hooks/useLocale"

/**
 * Büyük önizleme — hover kartındaki büyütme düğmesinin açtığı pencere.
 *
 * Hover kartı bir KİMLİK doğrulamasıdır ("evet, aradığım dosya bu"); bu
 * pencere OKUMA içindir. O yüzden burada küçük resim değil, Office Online'ın
 * kendi görüntüleyicisi gömülür: sayfa çevirir, yakınlaştırır ve metni
 * gerçekten okunur boyutta gösterir.
 *
 * Panelin İÇİNDE değil, DIŞINDA yaşar (`FilesPopover`'da `Popover`'ın
 * kardeşi). Modal bir diyalog açılınca popover'ın kapanma ihtimali var ve
 * pencere popover'ın içinde olsaydı onunla birlikte sökülürdü — kullanıcı
 * büyüttüğü anda pencere kapanırdı.
 *
 * Önizleme oluşmazsa (arşiv, bilinmeyen tür, erişim sorunu) pencere BOŞ
 * kalmaz: elimizdeki küçük resim — hover'dan zaten önbellekte — büyütülerek
 * gösterilir ve aynı eylemler ortada da durur. Görselde ise bu zaten yeterli
 * bir önizlemedir.
 *
 * ⚠️ **ÜÇ EYLEM** (2026-10-02, istek: *"dokümana tıkladığımızda direkt
 * indirmek yerine geniş önizleme açsa, butonlarda TYRO özetle, indir,
 * kaynakta aç gibi seçenekler olsa"*):
 *   TYRO ile özetle — soru sohbete park edilir, rıhtım açılır, pencere kapanır
 *   İndir           — Graph'ın kısa ömürlü indirme adresi (`useDriveDownload`),
 *                     yoksa SharePoint'in `download=1`i; ikisi de yoksa çizilmez
 *   Word'de aç …    — `sourceUrl` (`web=1`): çıplak dosya yolu Office
 *                     belgelerinde İNDİRİYORDU, artık kendi uygulamasında açar
 * Düğmeler düz `<a>`/`<button>`: tıklama anında ağ turu yok, açılır pencere
 * engelleyicisine takılmaz. Darda yalnız ikon (ad `aria-label`da).
 */
const SOURCE_LABEL = {
  word: "files.openInWord",
  excel: "files.openInExcel",
  powerpoint: "files.openInPowerPoint",
  onedrive: "myfiles.openOneDrive",
  sharepoint: "myfiles.row.openInSharePoint",
  browser: "files.openInBrowser",
}

const ACTION =
  "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-[0.75rem] font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-brand/40 [@media(pointer:coarse)]:h-10 [&_svg]:size-3.5"
const QUIET = "border border-border bg-card text-foreground/85 hover:bg-accent"

/**
 * Pencerenin eylemleri — genişte başlıkta, darda başlığın ALTINDA kendi
 * satırında (üç çıplak ikon dosyanın adını "Bütçe 2…"ye sıkıştırıyordu ve ne
 * yaptıklarını söylemiyordu), önizleme oluşmadığında gövdenin ortasında da.
 * Her yerde etiketli.
 */
function Actions({ item, actions, onClose, t, fill = false }) {
  // Darda (`fill`): özet TAM satır — birincil eylem —, İndir ile kaynak altında yan yana.
  const grow = fill ? "min-w-0" : ""
  return (
    <>
      {actions.ask && (
        <button
          type="button"
          onClick={() => {
            askTyroAboutFile(item, "summarise", t)
            onClose()
          }}
          className={cn(
            ACTION,
            "bg-brand/[0.1] text-brand-ink hover:bg-brand/[0.16]",
            grow,
            fill && "col-span-2",
          )}
        >
          <HugeiconsIcon icon={AiScanIcon} strokeWidth={2} />
          <span className="truncate">{t("files.assistSummarise")}</span>
        </button>
      )}
      {actions.download && (
        // `_blank` + ek başlığı `attachment`: indirme sekmesi kendiliğinden kapanır, uygulama yerinde kalır.
        <a
          href={actions.download}
          target="_blank"
          rel="noopener noreferrer"
          download={item.name}
          className={cn(ACTION, QUIET, grow)}
        >
          <HugeiconsIcon icon={Download04Icon} strokeWidth={2} />
          <span className="truncate">{t("files.download")}</span>
        </a>
      )}
      {actions.source && (
        <a
          href={actions.source}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(ACTION, QUIET, grow)}
        >
          <span className="truncate">{actions.sourceLabel}</span>
          <HugeiconsIcon icon={ArrowUpRight01Icon} strokeWidth={2} />
        </a>
      )}
    </>
  )
}

export function FilePreviewDialog({ item, onClose }) {
  return (
    <Dialog open={Boolean(item)} onOpenChange={(o) => !o && onClose()}>
      {item && <Body item={item} onClose={onClose} />}
    </Dialog>
  )
}

function Body({ item, onClose }) {
  const { t, locale } = useLocale()
  // ⚠️ HTML Office'in görüntüleyicisinden GEÇMEZ (çizmiyor) — dosyanın
  // kendisi okunup kilitli bir çerçevede çiziliyor (`lib/htmlPreview.js`).
  const isHtml = HTML_EXTS.has(String(item.ext ?? "").toLowerCase())
  const office = useDrivePreview(item.driveId, item.itemId, !isHtml)
  const htmlDoc = useDriveHtml(item.driveId, item.itemId, isHtml)
  const preview = isHtml
    ? htmlDoc.status === "ready"
      ? { status: "html", html: htmlDoc.html }
      : htmlDoc.status === "loading"
        ? { status: "loading" }
        : { status: "unavailable", tooLarge: htmlDoc.status === "tooLarge" }
    : office
  const { url: thumb } = useDriveThumbnail(item.driveId, item.itemId, true)
  const dl = useDriveDownload(item.driveId, item.itemId, true)
  const meta = fileMeta(item, locale)
  const actions = {
    source: sourceUrl(item),
    sourceLabel: t(SOURCE_LABEL[sourceKind(item)]),
    download: dl.url || downloadFallbackUrl(item),
    ask: Boolean(item.webUrl),
  }

  return (
    <DialogContent
      showCloseButton={false}
      data-files-layer=""
      // Sohbet rıhtımı pencerede Escape dinliyor: pencereyi kapatan Escape
      // rıhtımı da kapatmasın (Radix yine kapatıyor — `preventDefault` yok).
      onEscapeKeyDown={(e) => e.stopPropagation()}
      // Taban diyalog `sm:max-w-sm` bir GRID ve içine 4 birim boşluk
      // koyuyor — bir belge görüntüleyicisi için üçü de yanlış. Burada
      // pencere ekranı doldurur, gövde kenardan kenara oturur.
      className="flex h-[min(92dvh,56rem)] w-[min(78rem,calc(100vw-2rem))] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-h-none sm:max-w-none sm:pb-0"
    >
      <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
        <FileBadge item={{ ...item, kind: "file" }} size="md" />
        <div className="min-w-0 flex-1">
          <DialogTitle className="truncate text-[0.875rem] font-semibold leading-tight">
            {item.name}
          </DialogTitle>
          <DialogDescription className="mt-0.5 truncate text-[0.71875rem] leading-tight">
            {meta || t("files.preview")}
          </DialogDescription>
        </div>
        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          <Actions item={item} actions={actions} onClose={onClose} t={t} />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("sheet.close")}
          onClick={onClose}
          className="size-8 shrink-0 rounded-lg [&_svg]:!size-4"
        >
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
        </Button>
      </div>

      {(actions.ask || actions.download || actions.source) && (
        <div className="grid grid-cols-2 gap-2 border-b border-border/60 px-4 py-2.5 sm:hidden">
          <Actions item={item} actions={actions} onClose={onClose} t={t} fill />
        </div>
      )}

      <div className="min-h-0 flex-1 bg-foreground/[0.04]">
        {preview.status === "loading" && (
          <div className="grid h-full place-items-center">
            <span className="size-7 animate-spin rounded-full border-2 border-foreground/15 border-t-brand" />
          </div>
        )}

        {preview.status === "ready" && (
          // Adres ÖNCEDEN kimlik doğrulanmış ve kısa ömürlü; belirteç
          // taşınmıyor. `sandbox` VERİLMEZ: Office görüntüleyicisi kendi
          // betiğini ve çerezini kullanıyor, kısıtlanmış bir çerçevede boş
          // bir sayfa dönüyor.
          <iframe
            title={item.name}
            src={preview.url}
            className="h-full w-full border-0 bg-background"
            allow="fullscreen"
          />
        )}

        {preview.status === "html" && <HtmlFrame item={item} html={preview.html} t={t} />}

        {preview.status === "unavailable" && (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 py-8 text-center">
            {thumb ? (
              <img
                src={thumb}
                alt=""
                className="max-h-[60%] max-w-full rounded-lg object-contain shadow-lg ring-1 ring-foreground/10"
              />
            ) : (
              <FileBadge item={{ ...item, kind: "file" }} size="lg" />
            )}
            <div>
              <p className="text-[0.8125rem] font-medium text-foreground/80">
                {preview.tooLarge ? t("files.html.tooLarge") : t("files.previewUnavailable")}
              </p>
              {(actions.source || actions.download) && (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <Actions item={item} actions={actions} onClose={onClose} t={t} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DialogContent>
  )
}

/**
 * HTML önizlemesi: üstte kipi söyleyen ince şerit, altında kilitli çerçeve.
 * ⚠️ Varsayılan GÜVENLİ (betik yok); etkileşimli kipi KULLANICI açar ve bu
 * oturumda o dosya için hatırlanır. Kip değişince çerçeve YENİDEN DOĞAR
 * (`key`): `sandbox` niteliği yalnız bir sonraki gezinmede uygulanıyor.
 * ⚠️ Çerçeve iki temada da BEYAZ — HTML belgeleri beyaz zemin varsayıyor
 * (okuma penceresinin postayla aynı kuralı).
 */
function HtmlFrame({ item, html, t }) {
  const key = `${item.driveId}::${item.itemId}`
  const [live, setLive] = useState(() => liveHtmlItems.has(key))
  const doc = useMemo(() => htmlPreviewDoc(html, { scripts: live }), [html, live])
  const blank = useMemo(() => !live && needsScripts(html), [html, live])
  const toggle = () => {
    const next = !live
    if (next) liveHtmlItems.add(key)
    else liveHtmlItems.delete(key)
    setLive(next)
  }
  return (
    <div className="flex h-full flex-col">
      <div
        title={t("files.html.note")}
        className={cn(
          "flex shrink-0 items-center gap-2 border-b border-border/60 bg-card px-4 py-1.5 text-[0.71875rem]",
          blank && "bg-amber-50 dark:bg-amber-950/40",
        )}
      >
        <HugeiconsIcon
          icon={live ? CodeIcon : Shield01Icon}
          className={cn(
            "size-3.5 shrink-0",
            live
              ? "text-brand"
              : blank
                ? "text-amber-700 dark:text-amber-400"
                : "text-muted-foreground",
          )}
          strokeWidth={2}
          aria-hidden="true"
        />
        <span
          className={cn(
            "min-w-0 flex-1 leading-snug",
            blank ? "font-medium text-amber-800 dark:text-amber-300" : "text-muted-foreground",
          )}
        >
          {live ? t("files.html.live") : blank ? t("files.html.blank") : t("files.html.safe")}
          <span className="sr-only">. {t("files.html.note")}</span>
        </span>
        <button
          type="button"
          onClick={toggle}
          aria-pressed={live}
          className={cn(
            "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[0.71875rem] font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-brand/40 [@media(pointer:coarse)]:h-10",
            live
              ? "border border-border bg-card text-foreground/85 hover:bg-accent"
              : blank
                ? "bg-brand-fill-deep text-brand-on-brand hover:brightness-110"
                : "bg-brand/[0.1] text-brand-ink hover:bg-brand/[0.16]",
          )}
        >
          <HugeiconsIcon
            icon={live ? Shield01Icon : CodeIcon}
            className="size-3.5"
            strokeWidth={2}
            aria-hidden="true"
          />
          {live ? t("files.html.stop") : t("files.html.run")}
        </button>
      </div>
      <iframe
        key={live ? "live" : "safe"}
        title={item.name}
        sandbox={live ? HTML_SANDBOX.live : HTML_SANDBOX.safe}
        referrerPolicy="no-referrer"
        srcDoc={doc}
        className="min-h-0 w-full flex-1 border-0 bg-white"
      />
    </div>
  )
}
