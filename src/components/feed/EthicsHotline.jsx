import { useState } from "react"
import { useMsal } from "@azure/msal-react"
import { HugeiconsIcon } from "@hugeicons/react"
import JusticeScale01Icon from "@hugeicons/core-free-icons/JusticeScale01Icon"
import SentIcon from "@hugeicons/core-free-icons/SentIcon"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { useLocale } from "@/hooks/useLocale"
import { useMe } from "@/hooks/useMe"
import { requestGraphScopes } from "@/lib/graph"
import { ETHICS_LINE, ETHICS_MAIL_SCOPES, sendEthicsReport } from "@/lib/ethicsLine"
import { showResultToast } from "@/lib/refreshToast"
import { cn } from "@/lib/utils"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  ETİK HATTI — sağ alttaki hap, üstüne gelince açılan etiket
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Politika ve gönderim `lib/ethicsLine.js`te: alıcı, konu kalıbı ve
 * "anonim değil" gerçeği orada yazılı. Bu dosya yalnız yüzey.
 *
 * ── KONUM: SAYFA KOLONUNA GÖRE, GÖRÜNTÜ ALANINA DEĞİL ──────────────────
 * ⚠️ `position: fixed` DENENMEZ. Sohbet rıhtımı `<main>`in KARDEŞİ
 * (`DashboardLayout`) — açıldığında sayfayı daraltıyor ama GÖRÜNTÜ ALANI
 * aynı kalıyor, yani ekrana çakılı bir hap rıhtım açıkken sohbetin
 * bestecisinin üstüne otururdu. Keşfet'in kolonlarının kapsayıcı
 * sorgularıyla aynı tuzak. Hap bu yüzden sayfanın KENDİ `relative`
 * kabuğuna `absolute` ile bağlı: rıhtım açılınca hap da onunla birlikte
 * sola kayıyor.
 *
 * ⚠️ **SAĞ KENAR ÇENTİĞİYLE ÇAKIŞMIYOR** ve bu ölçülebilir bir gerçek,
 * bir şans değil: çentik dikeyde `max(50% − 4.125rem, 25.25rem)`ten
 * başlayıp 18.625rem sürüyor (`lib/edgeNotchGeometry.js`), yani ekranın
 * ORTA bandında. Hap alt kenardan 1.5rem yukarıda. Çentik bir gün aşağı
 * inerse bu iki sayı birlikte okunmalı.
 *
 * ── ETİKET: HOVER'DA AÇILIR, DOKUNMATİKTE ZATEN AÇIK ───────────────────
 * ⚠️ Deponun kuralı: **hover'a bağlı bilgi YOK** — dokunmatikte hover diye
 * bir şey yok. Etiket `pointer: coarse` altında KALICI olarak açık; imleçli
 * cihazda hap daire olarak duruyor, üstüne gelince (ya da klavye odağında,
 * ya da panel açıkken) genişliyor. Metin her durumda DOM'da: kırpılmış da
 * olsa ekran okuyucunun okuduğu ad odur, o yüzden ayrıca `aria-label`
 * YAZILMAZ — iki ad bir düğmeye iki kez söylenirdi.
 *
 * ⚠️ Genişleme `max-width` ile, `width: auto` ile değil: `auto`ya geçiş
 * animasyonlanmıyor. Dolgu DIŞ kutuda değil İÇTEKİ metinde — dış kutuda
 * olsaydı `max-w-0` bile dolgu kadar bir şerit bırakır ve hap daire
 * olmaktan çıkardı (kenar kutusu dolgunun altına inemiyor).
 *
 * ── RENK: DÜZ DOLGU, GRADYAN DEĞİL (2026-09-23, istek üzerine) ─────────
 * Hap ve "Gönder" `bg-brand-fill-deep` + `text-brand-on-brand` — deponun
 * İŞ UYGULAMALARI karolarında zaten sevk ettiği düz marka dolgusu. Yeni
 * hue YOK, yeni token YOK.
 *
 * ⚠️ `--brand-deep` DEĞİL `--brand-fill-deep`: birincisi aynı zamanda
 * MÜREKKEP ve "black" paletinin koyu temasında beyaza dönüyor; dolgu
 * olarak kullanmak o palette beyaz üstüne beyaz yazardı (`index.css` bu
 * ayrımın gerekçesini taşıyor).
 *
 * ⚠️ `ring-1 ring-foreground/15` SÜS DEĞİL, ÖLÇÜLMÜŞ İHTİYAÇ: dolgunun
 * sayfa zeminine kontrastı KOYU temada dört palette 1,04-1,31e düşüyor
 * (fiery-red · chocolate-delight · ocean-breeze-v2 · black) ve gölge koyu
 * zeminde görünmüyor. Kenarı halka tanımlıyor; açık temada dolgu zaten
 * ayrışık, halka görünmez kalıyor.
 *
 * ⚠️ **BİLİNEN SINIR, YAZILI**: beyaz mürekkebin dolguya kontrastı
 * sky (2,77) · amber (3,19) · navy-koyu (3,68) · violet (4,23) ve
 * sunset (4,31) paletlerinde AA tabanının (4,5) ALTINDA. Bu hapa özgü
 * DEĞİL — aynı çift uygulamanın bütün marka dolgularında kullanılıyor.
 * Yerini aldığı GRADYAN daha kötüydü: mürekkep `--brand-via`nın üstünden
 * de geçiyordu (en kötü 1,88). Düzeltmenin yeri bu bileşen değil, marka
 * dolgusu için ayrı bir mürekkep tokeni.
 *
 * ── PANEL ──────────────────────────────────────────────────────────────
 * Radix `Popover`, `side="top" align="end"` — yani hapın SOL ÇAPRAZ
 * ÜSTÜNE açılıyor. Dışarı tıklama, Escape ve odak yönetimi Radix'in işi;
 * elle kurulan bir kutu bu üçünü de yeniden yazmak demekti (deponun öteki
 * dört paneli de aynı primitifi kullanıyor).
 *
 * ⚠️ **TASLAK KAPANINCA SİLİNMEZ.** "İptal" paneli kapatır, metni TUTAR:
 * dışarı yanlışlıkla tıklayan birinin yazdığı bildirimi çöpe atmak, bu
 * ekranın yapabileceği en pahalı hata. Metin yalnız gönderim BAŞARILI
 * olunca temizlenir; sayfadan ayrılınca zaten bellekte kalmaz.
 */
export function EthicsHotline() {
  const { t, locale } = useLocale()
  const { instance, accounts } = useMsal()
  const me = useMe()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  const text = message.trim()
  const canSend = text.length > 0 && !sending
  const remaining = ETHICS_LINE.maxChars - message.length

  async function send() {
    if (!canSend) return
    setError(null)
    setSending(true)
    const payload = { reporter: me.fullName, message: text }
    let res = await sendEthicsReport(instance, accounts[0], payload)
    // Kapsam giriş listesinde (`msal.js` › loginRequest) ama ondan ÖNCE
    // açılmış bir oturum onu taşımıyor olabilir; sessiz yenileme gizli
    // iframe'e düşüp üçüncü taraf çerez kurallarına takılıyor. Tıklamayla
    // açılan onay bundan muaf — `FileMailDialog`in aynı kurtarma yolu.
    if (!res.ok && res.reason === "denied") {
      const granted = await requestGraphScopes(instance, accounts[0], ETHICS_MAIL_SCOPES)
      if (granted) res = await sendEthicsReport(instance, accounts[0], payload)
    }
    setSending(false)
    if (res.ok) {
      showResultToast({ title: t("ethics.sentTitle"), detail: t("ethics.sentDetail") })
      setMessage("")
      setOpen(false)
      return
    }
    setError(
      res.reason === "denied"
        ? t("ethics.denied")
        : res.reason === "unauthenticated"
          ? t("ethics.signedOut")
          : t("ethics.failed", { detail: res.detail || "" }),
    )
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setError(null)
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "group/eth flex h-13 items-center rounded-full px-4",
            "bg-brand-fill-deep text-brand-on-brand ring-1 ring-foreground/15",
            "shadow-lg transition hover:brightness-110",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
        >
          <HugeiconsIcon icon={JusticeScale01Icon} className="size-5 shrink-0" strokeWidth={1.9} />
          <span
            className={cn(
              "max-w-0 overflow-hidden transition-[max-width] duration-200 ease-out motion-reduce:transition-none",
              "group-hover/eth:max-w-44 group-focus-visible/eth:max-w-44",
              "group-data-[state=open]/eth:max-w-44 [@media(pointer:coarse)]:max-w-44",
            )}
          >
            <span
              lang={locale}
              className="block whitespace-nowrap pl-2 pr-0.5 text-[0.8125rem] font-semibold"
            >
              {t("ethics.fab")}
            </span>
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="end"
        /* Radix bu kutuya `role="dialog"` veriyor; adını başlıktaki
           metin DEĞİL bu öznitelik taşır — başlık `PopoverTitle`in içinde
           sıradan bir `div` ve kutuyla ilişkilendirilmiş değil. */
        aria-label={t("ethics.title")}
        sideOffset={12}
        collisionPadding={16}
        className="w-[min(21rem,calc(100vw-2rem))] gap-3 p-3"
      >
        <div className="flex items-start gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-on-soft">
            <HugeiconsIcon icon={JusticeScale01Icon} className="size-4" strokeWidth={1.9} />
          </span>
          <div className="min-w-0">
            <PopoverTitle className="text-[0.8125rem] font-semibold leading-tight">
              {t("ethics.title")}
            </PopoverTitle>
            <PopoverDescription className="mt-1 text-[0.71875rem] leading-snug">
              {t("ethics.subtitle")}
            </PopoverDescription>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="ethics-message" className="sr-only">
            {t("ethics.label")}
          </label>
          <Textarea
            id="ethics-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={ETHICS_LINE.maxChars}
            rows={4}
            placeholder={t("ethics.placeholder")}
            className="max-h-44 min-h-22 text-[0.78125rem] leading-relaxed"
          />
          {/* Sayaç yalnız SON 200 karakterde çıkar: kalıcı bir sayaç, kısa
              bir cümle yazan herkese olmayan bir sınırı hatırlatırdı; hiç
              olmaması ise tavanı sessiz bir duvara çevirirdi. */}
          {remaining <= 200 && (
            <p className="text-right text-[0.65625rem] text-muted-foreground">
              {t("ethics.remaining", { count: remaining })}
            </p>
          )}
        </div>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-2.5 py-2 text-[0.71875rem] leading-snug text-destructive">
            {error}
          </p>
        )}

        {/* Hattın ANONİM OLMADIĞINI söyleyen tek satır. Gerekçesi
            `lib/ethicsLine.js`te: vermediğimiz bir sözü vermiş olmamak. */}
        <p className="text-[0.65625rem] leading-snug text-muted-foreground">{t("ethics.note")}</p>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="h-9 rounded-lg border border-border bg-background px-3 text-[0.78125rem] font-medium text-foreground/85 transition hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [@media(pointer:coarse)]:min-h-11"
          >
            {t("ethics.cancel")}
          </button>
          {/* ⚠️ `disabled` DEĞİL `aria-disabled`: gönderim sürerken odağı
              kaybeden bir düğme klavyeyle yazan kişiyi panelin başına
              atardı (deponun "korumalı eylemler disabled değil" kuralı).
              Tekrar tıklama `send`in ilk satırında zaten engelleniyor. */}
          <button
            type="button"
            onClick={send}
            aria-disabled={!canSend}
            className={cn(
              "flex h-9 items-center gap-1.5 rounded-lg px-3 text-[0.78125rem] font-semibold [@media(pointer:coarse)]:min-h-11",
              "bg-brand-fill-deep text-brand-on-brand ring-1 ring-foreground/15",
              "shadow-sm transition hover:brightness-110",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              !canSend && "cursor-not-allowed opacity-60 hover:brightness-100",
            )}
          >
            <HugeiconsIcon icon={SentIcon} className="size-4" strokeWidth={1.9} />
            {sending ? t("ethics.sending") : t("ethics.send")}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
