import { lazy, memo, Suspense, useMemo, useState } from "react"
import { motion } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import Copy01Icon from "@hugeicons/core-free-icons/Copy01Icon"
import Tick01Icon from "@hugeicons/core-free-icons/Tick01Icon"
import File01Icon from "@hugeicons/core-free-icons/File01Icon"
import Refresh01Icon from "@hugeicons/core-free-icons/Refresh01Icon"
import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon"
import ChartColumnIcon from "@hugeicons/core-free-icons/ChartColumnIcon"
import Share03Icon from "@hugeicons/core-free-icons/Share03Icon"
import FireIcon from "@hugeicons/core-free-icons/FireIcon"
import SnowIcon from "@hugeicons/core-free-icons/SnowIcon"
import ArchiveRestoreIcon from "@hugeicons/core-free-icons/ArchiveRestoreIcon"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"
import { cn } from "@/lib/utils"
import { notify } from "@/lib/notify"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { normalizeBotMarkdown } from "@/lib/markdown"
import { attachmentDownloadUrl } from "@/lib/botFiles"
import { BotFileAttachment } from "./BotFileAttachment"
import { getDateTimeFormat } from "@/lib/intl-cache"
import { useLocale } from "@/hooks/useLocale"
import { useMe } from "@/hooks/useMe"
import { UserAvatar } from "@/components/common/UserAvatar"
import { IconOrLogo } from "@/components/common/IconOrLogo"
import { useConfig } from "@/hooks/useConfig"
import { AgentActivity, AgentActivitySummary } from "./AgentActivity"
import { allChartable } from "@/lib/markdownTable"
import { markdownToPlainText } from "@/lib/plainText"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

/**
 * İkisi de KOŞULLU çizilir ve ikisi de ağırdır: grafik recharts'ı (242 KB),
 * uyarlanabilir kart adaptivecards'ı (187 KB) getiriyor. Statik import
 * edildiklerinde bu 429 KB, hiç grafik görmeyecek kullanıcının giriş
 * paketinde duruyordu — sohbeti hiç açmasa bile. Tembel yüklenince maliyet,
 * gerçekten grafik ya da kart taşıyan İLK mesaja iner.
 *
 * `lazy` varsayılan dışa aktarım bekler; ikisi de adlandırılmış, o yüzden
 * söz burada sarmalanır.
 */
const MessageInsights = lazy(() =>
  import("./MessageInsights").then((m) => ({ default: m.MessageInsights })),
)
const AdaptiveCardView = lazy(() =>
  import("./AdaptiveCardView").then((m) => ({ default: m.AdaptiveCardView })),
)

/** Yükleme yer tutucusu: yüksekliği kabaca tutar ki mesaj listesi zıplamasın. */
function LazyBlock({ className }) {
  return <div className={cn("animate-pulse rounded-2xl bg-muted/40", className)} />
}

const TIME_FORMAT_OPTIONS = { hour: "2-digit", minute: "2-digit" }

// Kullanıcının gönderdiği dosya chip'inde gösterilen boyut etiketi.
function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

// Botun cevabındaki linkler YENİ SEKMEDE açılır.
//
// Bu bir SPA: varsayılan <a> davranışı sayfayı linkin üstüne götürüyor, yani
// kullanıcı sohbetten çıkıyor ve geri döndüğünde konuşma gitmiş oluyor. Ajanın
// verdiği linkler ise (fatura/belge görüntüleri) yanına dönülecek şeyler.
// Copilot Studio'nun kendi arayüzü bunu zaten yeni sekmede açıyor; burada da
// aynı davranış.
const MARKDOWN_COMPONENTS = {
  a: (props) => {
    // `node` react-markdown'ın AST düğümü; bir DOM özniteliği değil.
    const { node, ...rest } = props
    void node
    return <a {...rest} target="_blank" rel="noopener noreferrer" />
  },
  img: (props) => {
    const { node, ...rest } = props
    void node
    return <BotMarkdownImage {...rest} />
  },
}

/**
 * Ajanın metnine gömdüğü görsel.
 *
 * Yüklenemezse HİÇBİR ŞEY çizilmez. Copilot Studio cevaplarında zaman zaman
 * kaynağı bizim sayfadan çekilemeyen bir görsel geliyor (oturuma bağlı bir
 * adres, ya da yalnızca ajanın kendi arayüzünde çözülen göreli bir yol) ve
 * tarayıcının kırık resim ikonu, cevabın ortasında bir hata varmış izlenimi
 * veriyordu — oysa metin eksiksiz. Sessizce düşürmek doğru: görselin taşıdığı
 * bilgi zaten yanındaki metinde.
 */
function BotMarkdownImage({ src, alt, ...rest }) {
  const [failed, setFailed] = useState(false)
  if (failed || !src) return null
  return (
    <img
      {...rest}
      src={src}
      alt={alt ?? ""}
      onError={() => setFailed(true)}
      className="my-2 max-h-80 max-w-full rounded-lg object-contain"
    />
  )
}

// Botun döndürdüğü GÖRSEL ekinden <img src> üretir; görsel değilse null.
//
// Bir MCP aracı görsel döndürdüğünde (ör. tyro-finance-mcp'nin
// `show_attachment`'ı bir faturayı PNG olarak verir) bunun Copilot Studio'dan
// hangi şekilde çıktığı belgelenmiş değil: contentUrl'de http(s) adresi, aynı
// yerde bir data: URI, ya da content içinde çıplak base64 olabilir. Üçü de
// karşılanıyor — biçimi yanlış tahmin etmek görselin sessizce kaybolması
// demek, ki buraya kadarki durum tam olarak buydu: ek ulaşıyordu, onu çizen
// bir dal olmadığı için hiç görünmüyordu.
function attachmentImageSrc(att) {
  const type = att?.contentType || ""
  if (!type.startsWith("image/")) return null
  const asSrc = (s) => {
    if (typeof s !== "string" || !s) return null
    return s.startsWith("data:") || /^https?:/i.test(s) ? s : `data:${type};base64,${s}`
  }
  if (att.contentUrl) return asSrc(att.contentUrl)
  const c = att.content
  if (typeof c === "string") return asSrc(c)
  if (c && typeof c === "object") return asSrc(c.url || c.downloadUrl || c.data || c.base64)
  return null
}

// Botun döndürdüğü görseli baloncuk genişliğinde gösterir; tıklayınca tam
// boyutuyla yeni sekmede açılır — bunlar A4 belge taraması, küçük halde
// okunmuyor.
function BotImage({ src, name }) {
  return (
    <a href={src} target="_blank" rel="noopener noreferrer" className="block max-w-full">
      <img
        src={src}
        alt={name || ""}
        className="max-h-[70vh] w-auto max-w-full rounded-2xl rounded-tl-md border border-border bg-card object-contain"
      />
    </a>
  )
}
function formatTime(date, locale) {
  return getDateTimeFormat(locale, TIME_FORMAT_OPTIONS).format(date)
}

// Bubble width tokens — wider on phones (more reading room when the user
// only sees one bubble at a time), narrower on tablet/desktop where two
// columns of context fit. ch-based caps on md+ keep long replies readable
// (max ~ 65 characters per line, the typographic comfort range).
const BUBBLE_MAX_WIDTH = "max-w-[88%] sm:max-w-[78%] md:max-w-[65ch]"

/**
 * BAŞLANGIÇ ROZETİ — "bu cevap hangi konuşmadan geldi?".
 *
 * Kopyala düğmesinin SOLUNDA, aynı satırda, aynı boyutta. Yalnızca o
 * konuşmanın İLK gerçek cevabında çizilir (`ChatScreen`, `startBadgeRef`):
 * konuşmanın nasıl kurulduğu tek bir olaydır, her cevaba basmak onu bir
 * mesaj özelliği gibi okuturdu.
 *
 * ÜÇ DURUM, çünkü hızlı bir cevabın İKİ ayrı sebebi var ve ekranda ayırt
 * edilemiyordu:
 *
 *   warm     ısıtılmış konuşma devralındı — el sıkışma ve MCP başlatması
 *            kullanıcı sohbete basmadan ödendi
 *   resumed  son 24 saatin kayıtlı konuşması sürdürüldü — hiç ağ isteği yok
 *   cold     ikisi de olmadı, konuşma bu turda kuruldu
 *
 * ⚠️ BALON HOVER'A BIRAKILMAZ: `title`/hover dokunmatikte HİÇ açılmaz.
 * Rozet bir DÜĞMEdir ve tıklamak balonu açar; imleçli cihazda üstüne
 * gelmek de açar.
 *
 * ⚠️ SÜRE YOKSA YAZILMAZ. Isıtma turu zaman aşımına uğradıysa `warmTurnMs`
 * null gelir: konuşma canlıdır ama MCP'lerin başlatıldığını BİLMİYORUZ.
 * "0,0s" basmak, araç izinde kaçındığımız yalanın aynısı olurdu. Aynı
 * dürüstlük `resumed` balonunda da yazılı: devam eden konuşmalarda MCP
 * başlatmasının bazen tekrarlandığı ÖLÇÜLDÜ (init 0 da görüldü 3-4 de).
 *
 * ⚠️ YENİ HUE YOK. Ateş, ekranda zaten bulunan amber'i (yarım kalan yanıt
 * uyarısı) kullanır; öteki ikisi kopyala/paylaşın sessiz mürekkebinde.
 */
const START_KINDS = {
  warm: {
    icon: FireIcon,
    tone: "text-amber-600/80 hover:text-amber-600 dark:text-amber-400/80 dark:hover:text-amber-400",
  },
  resumed: { icon: ArchiveRestoreIcon, tone: "text-muted-foreground/60 hover:text-foreground" },
  cold: { icon: SnowIcon, tone: "text-muted-foreground/50 hover:text-foreground" },
}

function StartBadge({ start }) {
  const { t, locale } = useLocale()
  const [open, setOpen] = useState(false)
  const secs = useMemo(
    () =>
      new Intl.NumberFormat(locale || "tr", { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    [locale],
  )
  const spec = start ? START_KINDS[start.kind] : null
  if (!spec) return null
  const row = (label, ms, unknown) => (
    <span className="flex w-full items-baseline justify-between gap-4">
      <span className="opacity-70">{label}</span>
      {/* Birim çıplak "s" — sohbette saniye zaten öyle yazılıyor
          (AgentActivity sayacı); ikinci bir birim yazımı aynı ekranda iki
          dil demekti. */}
      <span className="tabular-nums">{ms == null ? unknown : `${secs.format(ms / 1000)}s`}</span>
    </span>
  )
  return (
    <TooltipProvider>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={t(`chat.message.start.${start.kind}.label`)}
            className={cn(
              "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition hover:bg-muted",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
              spec.tone,
            )}
          >
            <HugeiconsIcon icon={spec.icon} className="size-3.5" strokeWidth={1.8} />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          sideOffset={6}
          className="max-w-[18rem] flex-col items-start gap-1 py-2"
        >
          <span className="font-semibold">{t(`chat.message.start.${start.kind}.title`)}</span>
          <span className="opacity-80">{t(`chat.message.start.${start.kind}.body`)}</span>
          {/* Kayıtlı oturumda ölçülecek bir şey YOK: `resumeConversation`
              hiç ağ isteği yapmıyor, "0,0s" yazmak ölçüm gibi görünen bir
              sıfır basmak olurdu. Gerekçe balonun gövdesinde yazılı. */}
          {start.kind !== "resumed" && (
            <span className="mt-1 flex w-full flex-col gap-0.5">
              {row(t("chat.message.start.handshake"), start.handshakeMs, "—")}
              {start.kind === "warm" &&
                row(
                  t("chat.message.start.turn"),
                  start.warmTurnMs,
                  t("chat.message.start.turnUnknown"),
                )}
            </span>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Paylaş / WhatsApp — kopyala düğmesinin sağında, aynı boyutta.
 *
 * `navigator.share` sistemin KENDİ paylaşım sayfasını açar: hedefi (WhatsApp,
 * Mail, Mesajlar, Notlar…) kullanıcı seçer, kişi seçimini de sistem yapar.
 *
 * ⚠️ Metin MARKDOWN OLARAK GÖNDERİLMEZ. Ekranda `**` bir vurgu, WhatsApp'a
 * yapıştırıldığında iki yıldız. `markdownToPlainText` bunu sadeleştirir;
 * hedefin kendi söz dizimine ÇEVİRMEZ, çünkü bu düğmeye basarken hedefi
 * henüz kimse bilmiyor (bkz. plainText.js).
 *
 * ⚠️ `AbortError` HATA DEĞİLDİR: kullanıcı paylaşım sayfasını kapattığında
 * atılır ve ona "paylaşılamadı" demek yalan olurdu.
 */
const SHARE_URL_MAX = 3000

/**
 * WhatsApp'ın KENDİ markası, satır içi SVG.
 *
 * Hugeicons'ın genel çizgi yorumu 14px'te "baloncuğun içinde ahize"ye
 * benziyor; bir MARKA kısayolunun tek işi tanınmak, o yüzden resmî glif.
 *
 * ⚠️ `currentColor` ile DOLU çizilir, marka yeşiliyle değil: eylem
 * satırında kopyala ve paylaş nötr mürekkepte ve tek düğmeyi boyamak hem
 * satırı dengesiz gösterir hem ekrana yeni bir hue sokardı. Glif zaten
 * şekliyle tanınıyor.
 */
function WhatsAppGlyph({ className }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  )
}

/**
 * WHATSAPP — paylaş düğmesinin sağında, doğrudan kısayol.
 *
 * Genel paylaş düğmesi DURUYOR ve bu onun ikamesi değil: Mail, Notlar,
 * Teams'e gitmek isteyen onu kullanır. Bu düğmenin tek işi, baskın kanala
 * giden yolu iki dokunuştan bire indirmek.
 *
 * ⚠️ **UZUN MESAJ SESSİZCE KESİLMEZ.** `wa.me` metni ADRESİN İÇİNE koyuyor
 * ve pratikte ~3000 karakterde tıkanıyor; tablo taşıyan bir cevap bunu
 * rahat aşar. Kırpıp `…` eklemek, kullanıcının yarısı kesilmiş bir raporu
 * farkına varmadan göndermesi demekti. Üç yol, iyiden kötüye:
 *
 *   1. Metin sığıyorsa → `wa.me/?text=…`, tek dokunuş, hazır metin.
 *   2. Sığmıyor ama `navigator.share` VARSA (iPad/iPhone) → sistem
 *      paylaşım sayfası: uzunluk sınırı yok, yapıştırma adımı da yok.
 *   3. Sığmıyor ve paylaşım sayfası da yoksa (masaüstü Firefox, bazı
 *      Chrome sürümleri) → tam metin panoya, WhatsApp boş açılır, toast
 *      yapıştırmayı söyler. Son çare; yalnız burada kullanıcıya iş düşer.
 *
 * ⚠️ Panoya yazma TIKLAMA JESTİNİN İÇİNDE olmak zorunda: `await`ten sonra
 * `window.open` çağırmak, tarayıcının pencereyi "kullanıcı istemedi" sayıp
 * engellemesine yol açıyor. Bu yüzden önce pano sözü başlatılır, hemen
 * ardından pencere açılır.
 */
function WhatsAppButton({ content }) {
  const { t } = useLocale()
  const text = useMemo(() => markdownToPlainText(content), [content])
  if (!text) return null

  async function handleWhatsApp() {
    if (text.length <= SHARE_URL_MAX) {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener")
      return
    }
    if (navigator.share) {
      try {
        await navigator.share({ text })
      } catch (err) {
        // `AbortError` kullanıcının vazgeçmesidir, hata değil.
        if (err?.name !== "AbortError") notify.error(t("chat.message.shareFailed"))
      }
      return
    }
    navigator.clipboard
      ?.writeText(text)
      .then(() => notify.success(t("chat.message.whatsapp.copied")))
      .catch(() => notify.error(t("chat.message.copyFailed")))
    window.open("https://wa.me/", "_blank", "noopener")
  }

  return (
    <button
      type="button"
      onClick={handleWhatsApp}
      aria-label={t("chat.message.whatsapp")}
      title={t("chat.message.whatsapp")}
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground/60",
        "transition hover:bg-muted hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
      )}
    >
      <WhatsAppGlyph className="size-3.5" />
    </button>
  )
}

function ShareButton({ content }) {
  const { t } = useLocale()
  const text = useMemo(() => markdownToPlainText(content), [content])
  if (!text) return null

  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({ text })
        return
      }
      const short = text.length > SHARE_URL_MAX ? `${text.slice(0, SHARE_URL_MAX)}…` : text
      window.open(`https://wa.me/?text=${encodeURIComponent(short)}`, "_blank", "noopener")
    } catch (err) {
      if (err?.name === "AbortError") return
      notify.error(t("chat.message.shareFailed"))
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label={t("chat.message.share")}
      title={t("chat.message.share")}
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground/60",
        "transition hover:bg-muted hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
      )}
    >
      <HugeiconsIcon icon={Share03Icon} className="size-3.5" strokeWidth={1.8} />
    </button>
  )
}

// Copy-to-clipboard button rendered next to the timestamp on assistant
// messages. Always visible on touch (no hover-reveal trap). Shows a brief
// "copied" tick on success.
function CopyButton({ content }) {
  const { t } = useLocale()
  const [copied, setCopied] = useState(false)
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content ?? "")
      setCopied(true)
      notify.success(t("chat.message.copied"))
      setTimeout(() => setCopied(false), 1600)
    } catch {
      notify.error(t("chat.message.copyFailed"))
    }
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={t("chat.message.copy")}
      title={t("chat.message.copy")}
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground/60",
        "transition hover:bg-muted hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
      )}
    >
      <HugeiconsIcon
        icon={copied ? Tick01Icon : Copy01Icon}
        className={cn("size-3.5", copied && "text-brand-via")}
        strokeWidth={1.8}
      />
    </button>
  )
}

// Yarıda kesilmiş yanıtlarda kopyala butonunun yanında görünür. Tıklayınca
// onay popup'ı açar; onaylanınca aynı tur yeniden gönderilir (onRetry).
// Sessiz otomatik retry yerine onaya bağladık: agent'lar yan etkili işlem
// (mail/ticket) yapabildiği için aynı tur habersiz iki kez tetiklenmesin.
function RetryButton({ message, onRetry }) {
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("chat.message.retry")}
        title={t("chat.message.retry")}
        className={cn(
          "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground/60",
          "transition hover:bg-muted hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
        )}
      >
        <HugeiconsIcon icon={Refresh01Icon} className="size-3.5" strokeWidth={1.8} />
      </button>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t("chat.retry.title")}</DialogTitle>
          <DialogDescription>{t("chat.retry.desc")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm">
              {t("chat.retry.cancel")}
            </Button>
          </DialogClose>
          <Button
            size="sm"
            onClick={() => {
              setOpen(false)
              onRetry?.(message)
            }}
          >
            {t("chat.retry.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ChatMessageInner({ message, onCardAction, onSuggestedAction, onRetry }) {
  const { t, locale } = useLocale()
  const { getAgent } = useConfig()
  const me = useMe()
  const isUser = message.role === "user"
  const time = message.time instanceof Date ? message.time : new Date(message.time)
  const [showChart, setShowChart] = useState(false)
  // Re-read only when the text changes, which during streaming is every chunk
  // — cheap enough (a regex over the reply) and it means the button appears
  // the moment the table finishes arriving rather than after the turn ends.
  // Cevaptaki BÜTÜN çizilebilir tablolar: kart bir karuselle sayfalıyor.
  // Eskiden yalnız ilki çiziliyordu ve ajan iki-üç tablo döndürdüğünde
  // ikincisinin grafiği hiçbir yerden ulaşılamıyordu.
  const charts = useMemo(
    () => (isUser ? [] : allChartable(message.content)),
    [isUser, message.content],
  )
  const chart = charts.length > 0

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-start justify-end gap-2"
      >
        {/* `min-w-0`: flex öğesinin varsayılan `min-width:auto`'su, çocuğun
            min-content genişliğinin ALTINA inmesini engelliyor. Kırılamayan
            uzun bir belirteç (bir SharePoint bağlantısı) o min-content'i
            balonun üst sınırından büyük yapıyor ve balon panelin dışına
            taşıyordu — sağa hizalı olduğu için taşma SOLDAN oluyor ve metnin
            başı kırpılıyordu (ölçüldü 2026-08-19: 492px'lik panelde balon
            588px, 156px dışarıda). */}
        <div className={cn("flex min-w-0 flex-col items-end gap-1.5", BUBBLE_MAX_WIDTH)}>
          {/* `anywhere`, `break-word` DEĞİL: ikisi de uzun kelimeyi kırar ama
              yalnızca `anywhere` min-content genişliğini de küçültür — kutunun
              daralmasını sağlayan şey o. `break-word` ile metin kırılır, balon
              yine taşardı. */}
          {message.content && (
            <div className="rounded-2xl rounded-tr-md border border-brand-via/30 bg-brand-soft/40 px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-foreground [overflow-wrap:anywhere] @max-3xl/chat:px-3 @max-3xl/chat:py-2 @max-3xl/chat:text-[0.8125rem]">
              {message.content}
            </div>
          )}
          {message.attachments?.length > 0 && (
            <div className="flex flex-wrap justify-end gap-1.5">
              {message.attachments.map((att, i) => (
                <div
                  key={i}
                  className="inline-flex max-w-full items-center gap-2 rounded-lg border border-brand-via/30 bg-card px-2 py-1 text-xs"
                >
                  <HugeiconsIcon
                    icon={File01Icon}
                    className="size-3.5 shrink-0 text-brand-deep"
                    strokeWidth={1.6}
                  />
                  <span className="max-w-[10rem] truncate font-medium" title={att.name}>
                    {att.name}
                  </span>
                  {att.size != null && (
                    <span className="tabular-nums text-muted-foreground">
                      {formatFileSize(att.size)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          <span className="text-[0.625rem] tabular-nums text-muted-foreground/70">
            {formatTime(time, locale)}
          </span>
        </div>
        {/* User avatar — Microsoft Graph profile photo when available
            (cached per account in localStorage), pastel orb fallback. */}
        <UserAvatar photoUrl={me.photoUrl} label={me.fullName} className="size-7 shrink-0" />
      </motion.div>
    )
  }

  const agent = getAgent(message.agent)
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-start gap-2"
    >
      <div className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-brand-from via-brand-via to-brand-to text-brand-on-brand">
        <IconOrLogo iconName={agent?.iconName} logo={agent?.logo} className="size-3.5" />
      </div>
      <div className={cn("flex min-w-0 flex-col items-start", BUBBLE_MAX_WIDTH)}>
        <div className="mb-1 flex items-center gap-1.5">
          <span className="text-[0.6875rem] font-semibold text-foreground/80">{agent?.name}</span>
        </div>
        <div className="flex flex-col gap-2">
          {message.content && <AgentActivitySummary steps={message.activity?.steps} />}
          {message.content && (
            <div
              className={cn(
                "rounded-2xl rounded-tl-md border border-border bg-card px-4 py-2.5",
                "text-sm leading-relaxed text-foreground @max-3xl/chat:text-[0.8125rem]",
                "prose prose-sm max-w-none dark:prose-invert",
                "prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0",
                // Başlık ölçeği sohbete göre KISILIR. `prose-sm`in kendi ölçeği
                // doküman için: h1 2.14em, yani 14px gövdenin yanında ~30px.
                // Ajan cevabına `# Başlık` ile başladığında balonun yarısını
                // tek satır kaplıyordu. Sohbette başlık gövdeden bir tık büyük
                // olmalı, bir başlık sayfası gibi değil.
                "prose-headings:font-semibold prose-headings:leading-snug",
                "prose-h1:text-[1rem] prose-h2:text-[0.9375rem] prose-h3:text-[0.875rem] prose-h4:text-[0.8125rem]",
                "prose-strong:font-semibold prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5",
                "prose-hr:my-3 prose-blockquote:my-2",
                "prose-a:text-brand-via prose-a:no-underline hover:prose-a:underline",
                // Uzun bağlantılar balonu taşırmasın. Kapsam bilinçli olarak
                // dar: tablolar `overflow-x-auto` ile KAYAR, hücrelerinde
                // kırma açmak o kararı bozar; `pre` zaten kendi kaydırmasını
                // yapıyor.
                "prose-p:[overflow-wrap:anywhere] prose-li:[overflow-wrap:anywhere] prose-a:[overflow-wrap:anywhere]",
                // GFM tabloları: yatay kaydırma + ince kenarlık + başlık vurgusu.
                "prose-table:my-2 prose-table:block prose-table:w-full prose-table:overflow-x-auto",
                "prose-th:border prose-th:border-border prose-th:bg-muted/60 prose-th:px-2 prose-th:py-1 prose-th:text-left prose-th:font-semibold",
                "prose-td:border prose-td:border-border prose-td:px-2 prose-td:py-1 prose-td:align-top",
              )}
            >
              {/* ⚠️ `remarkBreaks` ŞART. CommonMark'ta TEK satır sonu satır
                  kırmaz, aynı paragrafa katılır — ajan alanları alt alta
                  yazdığı hâlde ekranda yan yana çıkıyordu ("Hak edilen: 14
                  gün ✅ Kullanılan: 10 gün 🟢 Kalan: 4 gün"). Model
                  talimatı doğru izliyordu; birleştiren biz idik.

                  Tutarlılık da bunu istiyor: `AdaptiveCardView` zaten
                  markdown-it'i `breaks: true` ile kuruyor, yani AYNI metin
                  kartta alt alta, baloncukta yan yana çiziliyordu.

                  Sohbet metni ELLE sarılmış düzyazı değil, üretilmiş
                  çıktıdır: oradaki her satır sonu kasıtlıdır. */}
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
                components={MARKDOWN_COMPONENTS}
              >
                {normalizeBotMarkdown(message.content)}
              </ReactMarkdown>
            </div>
          )}
          {chart && showChart && (
            <Suspense fallback={<LazyBlock className="h-56 w-full" />}>
              <MessageInsights analyses={charts} />
            </Suspense>
          )}
          {message.attachments?.map((att, i) =>
            att.contentType === "application/vnd.microsoft.card.adaptive" ? (
              <div
                key={i}
                className="rounded-2xl rounded-tl-md border border-border bg-card px-4 py-3"
              >
                <Suspense fallback={<LazyBlock className="h-20 w-full" />}>
                  <AdaptiveCardView card={att.content} onAction={onCardAction} />
                </Suspense>
              </div>
            ) : attachmentImageSrc(att) ? (
              // İndirme çipinden ÖNCE: bir görselin contentUrl'i de vardır, o
              // dala düşerse fatura resmi yerine dosya çipi görünür.
              <BotImage key={i} src={attachmentImageSrc(att)} name={att.name} />
            ) : attachmentDownloadUrl(att) || att.name ? (
              <BotFileAttachment key={i} att={att} />
            ) : null,
          )}
          {!message.content &&
            !message.attachments?.length &&
            !message.suggestedActions?.length &&
            !message.incomplete && (
              <div className="rounded-2xl rounded-tl-md border border-border bg-card px-4 py-2.5">
                <AgentActivity activity={message.activity} />
              </div>
            )}
          {message.suggestedActions?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {message.suggestedActions.map((action, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSuggestedAction?.(action)}
                  className={cn(
                    "rounded-full border border-brand-via/40 bg-brand-soft/30 px-3.5 py-1.5",
                    "text-xs font-medium text-foreground transition hover:bg-brand-soft/60",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
                  )}
                >
                  {action.title || action.value}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Timestamp + copy action row. Copy button always visible on touch
            (no hover-reveal) — matches ChatGPT/Claude mobile pattern. */}
        <div className="mt-0.5 flex items-center gap-1 text-muted-foreground/70">
          <span className="text-[0.625rem] tabular-nums">{formatTime(time, locale)}</span>
          {message.incomplete && (
            <span className="inline-flex items-center gap-1 text-[0.625rem] font-medium text-amber-600 dark:text-amber-400">
              <HugeiconsIcon icon={Alert02Icon} className="size-3" strokeWidth={1.8} />
              {t("chat.message.incomplete")}
            </span>
          )}
          <StartBadge start={message.start} />
          <CopyButton content={message.content} />
          <ShareButton content={message.content} />
          <WhatsAppButton content={message.content} />
          {/* Only rendered when the reply actually contains a table with
              numbers in it. A "Visualise" button that is present on every
              message and does nothing on most of them teaches people to stop
              looking at it. */}
          {chart && (
            <button
              type="button"
              onClick={() => setShowChart((v) => !v)}
              aria-pressed={showChart}
              title={t(showChart ? "chat.chart.hide" : "chat.chart.show")}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.625rem] font-medium transition",
                showChart
                  ? "bg-brand-soft/60 text-brand-deep"
                  : "text-muted-foreground/70 hover:bg-accent/60 hover:text-foreground",
              )}
            >
              <HugeiconsIcon icon={ChartColumnIcon} className="size-3" strokeWidth={2} />
              {t(showChart ? "chat.chart.hide" : "chat.chart.show")}
              {/* Birden çok grafik varsa sayısı: düğme neyi açacağını söylesin. */}
              {!showChart && charts.length > 1 && (
                <span className="ml-1 tabular-nums text-muted-foreground/60">
                  · {charts.length}
                </span>
              )}
            </button>
          )}
          {message.incomplete && message.retry && (
            <RetryButton message={message} onRetry={onRetry} />
          )}
        </div>
      </div>
    </motion.div>
  )
}

// React.memo with shallow prop compare — message objects are immutable
// (new objects on every append), so default referential equality is
// enough to skip re-renders for older bubbles when a new message arrives.
// Big win on long conversations: previously every assistant token-stream
// update re-rendered the entire list (N motion.divs); now only the last
// bubble re-renders.
export const ChatMessage = memo(
  ChatMessageInner,
  (prev, next) =>
    prev.message === next.message &&
    prev.onCardAction === next.onCardAction &&
    prev.onSuggestedAction === next.onSuggestedAction &&
    prev.onRetry === next.onRetry,
)
