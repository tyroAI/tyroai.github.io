import { useLayoutEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import ArrowUp02Icon from "@hugeicons/core-free-icons/ArrowUp02Icon"
import Beach02Icon from "@hugeicons/core-free-icons/Beach02Icon"
import BubbleChatIcon from "@hugeicons/core-free-icons/BubbleChatIcon"
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon"
import CalendarAdd01Icon from "@hugeicons/core-free-icons/CalendarAdd01Icon"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import Invoice03Icon from "@hugeicons/core-free-icons/Invoice03Icon"
import MoneyReceive01Icon from "@hugeicons/core-free-icons/MoneyReceive01Icon"
import PencilEdit02Icon from "@hugeicons/core-free-icons/PencilEdit02Icon"
import Sun03Icon from "@hugeicons/core-free-icons/Sun03Icon"
import SunriseIcon from "@hugeicons/core-free-icons/SunriseIcon"
import SunsetIcon from "@hugeicons/core-free-icons/SunsetIcon"
import { useLocale } from "@/hooks/useLocale"
import { usePromptTemplate } from "@/hooks/usePromptTemplate"
import { setPendingAsk, requestOpenChat } from "@/lib/chatBus"
import { cn } from "@/lib/utils"
import { isTemplate } from "@/lib/promptTemplates"
import { PromptTile } from "./PromptTile"
import { TemplatePrompt } from "./TemplatePrompt"

/**
 * Hazır sorular. `agent` bir AD (GUID değil — Dataverse ortamları arasında
 * değişiyor); `ChatScreen` adı normalize edip çözüyor, bulamazsa 5 sn bekleyip
 * mevcut asistana düşüyor.
 *
 * ⚠️ **TOPLANTI ve POSTA ÖZETİ ÇİPİ YOK**: bugünün toplantılarını ve postalarını
 * balonun cümlesi zaten söylüyor — üstüne gelince ilk üçü de açılıyor.
 * ⚠️ **GÜNÜN ÖZETİ ile HAFTALIK ÖZET yan yana**: biri BUGÜNÜ, öteki HAFTAYI
 * anlatıyor. Haftalık özet gün özeti gibi ısıtılmıyor — haftada bir sorulan bir
 * soru için her açılışta bir tur harcamak, gün özetinin bile ölçülerek
 * daraltılan bedeli.
 * ⚠️ İK çipleri İK asistanına gider: "İzin bakiyem" sorusunun Trader'a düşmesi
 * cevapsız bir soru olurdu. Masraf ve avans da oraya — bugün katalogda o
 * süreçleri yürüten başka bir asistan yok.
 */
const OFFICE = "tyro office"
const HR = "tyro hr"
const CHIPS_LEAD = [{ k: "weekSummary", agent: OFFICE, icon: Calendar03Icon }]
const CHIPS_HR = [
  { k: "leaveBalance", agent: HR, icon: Beach02Icon },
  { k: "leaveRequest", agent: HR, icon: CalendarAdd01Icon },
  { k: "expense", agent: HR, icon: Invoice03Icon },
  { k: "advance", agent: HR, icon: MoneyReceive01Icon },
]

/**
 * Anasayfa'nın soru kutusu ve altındaki hazır istem kutucukları.
 *
 * ⚠️ **SORU BURADA CEVAPLANMAZ, SOHBETE PARK EDİLİR.** `setPendingAsk` ile
 * sohbete bırakılıyor ve RIHTIM açılıyor: cevap gerçek asistandan geliyor,
 * sayfa da yerinde kalıyor (header panellerindeki "sor" yolunun aynısı).
 * Rıhtım zaten açıksa da teslim ediliyor — `ChatScreen` her açılma olayında
 * park edilmiş soruya yeniden bakıyor.
 */
export function AskBox({ briefCta, onNewChat }) {
  const { t } = useLocale()
  const [prompt, setPrompt] = useState("")
  // Çipin asistanı. Kutu boşalınca düşer — elle yazılan yeni bir soru çipin
  // asistanına gitmesin.
  const [chipAgent, setChipAgent] = useState(null)
  const inputRef = useRef(null)
  const formRef = useRef(null)
  // DOLDURULAN HAZIR SORU (İzin talebi): metin kutusunun YERİNE alanlı cümle
  // (`TemplatePrompt`). Durum sohbet bestecisiyle ORTAK kancada.
  const draft = usePromptTemplate(formRef)
  const { tpl, setTpl } = draft

  // ⚠️ KUTU İÇERİĞE GÖRE BÜYÜR: boşken TEK satır, metin uzadıkça aşağı doğru en
  // çok beş satıra. `field-sizing: content` Safari'de yok; yükseklik her
  // değişimde `scrollHeight`ten kuruluyor.
  useLayoutEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = "auto"
    const cs = getComputedStyle(el)
    const line = parseFloat(cs.lineHeight) || 20
    const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)
    const borderY = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth)
    const content = el.scrollHeight - padY
    // `border-box` (Tailwind'in temeli): yükseklik dolguyu ve kenarlığı içerir.
    el.style.height = `${Math.min(Math.max(content, line), line * 5) + padY + borderY}px`
    el.style.overflowY = content > line * 5 ? "auto" : "hidden"
  }, [prompt])

  function send(e) {
    e?.preventDefault()
    if (tpl) {
      // Eksik zorunlu alanla gönderilmez: kanca o alanı açar ya da odaklar.
      const question = draft.submit()
      if (!question) return
      setPendingAsk(tpl.agent ? { question, agent: tpl.agent } : { question })
      requestOpenChat({})
      setTpl(null)
      return
    }
    const question = prompt.trim()
    if (!question) return
    setPendingAsk(chipAgent ? { question, agent: chipAgent } : { question })
    requestOpenChat({})
    setPrompt("")
    setChipAgent(null)
  }

  /**
   * ⚠️ **İMLEÇ SONA DEĞİL, İLK `[YER TUTUCUYA]`**: sona konan imleçte uzun bir
   * şablonun başı görünmezdi. Şablon bir `[tutar]` taşıyorsa o parça SEÇİLİ
   * gelir, yazmaya başlayan onun yerine yazar (sohbet bestecisinin
   * `selectPlaceholder` davranışı).
   */
  function suggest(text, agent) {
    setTpl(null)
    setPrompt(text)
    setChipAgent(agent ?? null)
    requestAnimationFrame(() => {
      const el = inputRef.current
      if (!el) return
      el.focus()
      const slot = /\[[^\]]+\]/.exec(text)
      if (slot) el.setSelectionRange(slot.index, slot.index + slot[0].length)
      else el.setSelectionRange(text.length, text.length)
      el.scrollTop = 0
    })
  }

  /** Çip: şablonu olan soru alanlı cümle açar, olmayan metni kutuya koyar. */
  function pick(k, agent) {
    // Açık şablonun çipine tekrar basmak seçilen alanları sıfırlamaz.
    if (tpl?.key === k) return
    if (!isTemplate(k)) {
      suggest(t(`myspace.prompt.${k}`), agent)
      return
    }
    setPrompt("")
    setChipAgent(null)
    draft.start(k, { agent: agent ?? null })
  }

  /** Alanlı cümleyi serbest metne çevirir; seçilenler yerinde, boşlar `[etiket]`. */
  function editTemplateAsText() {
    if (!tpl) return
    suggest(draft.asText(), tpl.agent)
  }

  /** Şablonu kapatır, kutuyu boşaltır ve odağı metin kutusuna verir — şablonun
   *  cümlesi klavyeyle silinemiyor. */
  function clearTemplate() {
    setTpl(null)
    setPrompt("")
    setChipAgent(null)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  return (
    <>
      {/* Soru kutusu — boşken TEK satır, metin SARIYOR ve kutu aşağı doğru
          büyüyor. ⚠️ Metin satırı 36px (`leading-5` + `py-2`) = gönder düğmesi:
          tek satırda ikon, metin ve düğme aynı merkezde. Kutu büyüyünce ikon
          İLK satırda kalır (`self-start`), düğme dibe iner (`items-end`) —
          sohbet bestecilerinin bilinen düzeni. Enter gönderir, Shift+Enter
          satır; IME birleşimi sürerken göndermez. */}
      <form
        ref={formRef}
        onSubmit={send}
        className={cn(
          "ms-surface flex items-end gap-2",
          "mt-5 @[60rem]/myspace:mt-0",
          "rounded-3xl py-2 pl-4 pr-2 transition focus-within:border-brand/40 focus-within:ring-2 focus-within:ring-brand/10",
        )}
      >
        {/* ⚠️ ŞABLONDA ÖNDEKİ YUVA "METİN OLARAK DÜZENLE": cümlenin sonundaki
            bir kalem kendi satırına sarıp kutuyu uzatır, gönderin yanında da
            cümleyi daraltıp dört satıra iterdi (ölçüldü: 107 → 134 px). Süs
            olan sohbet balonunun yerinde genişlik bedeli SIFIR: düğme negatif
            payla balonun 18 px'lik izini tutuyor, merkezi ilk satırın
            merkezinde (26 px). */}
        {tpl ? (
          /* Kalemin ALTINDA temizle (×): şablonu kapatıp kutuyu boşaltır.
             İkisi aynı sütunda — cümle zaten en az iki satır, sütun
             kutuyu uzatmıyor. */
          <div className="-mx-[0.3125rem] mt-1 flex shrink-0 flex-col items-center gap-0.5 self-start [@media(pointer:coarse)]:-mx-[0.5625rem] [@media(pointer:coarse)]:mt-0">
            <button
              type="button"
              onClick={editTemplateAsText}
              aria-label={t("myspace.template.edit")}
              title={t("myspace.template.edit")}
              className="grid size-7 place-items-center rounded-lg text-muted-foreground/70 transition hover:bg-accent hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-foreground/40 [@media(pointer:coarse)]:size-9"
            >
              <HugeiconsIcon
                icon={PencilEdit02Icon}
                className="size-[1.0625rem]"
                strokeWidth={1.8}
              />
            </button>
            <button
              type="button"
              onClick={clearTemplate}
              aria-label={t("myspace.template.clear")}
              title={t("myspace.template.clear")}
              className="grid size-7 place-items-center rounded-lg text-muted-foreground/70 transition hover:bg-destructive/10 hover:text-destructive focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-foreground/40 [@media(pointer:coarse)]:size-9"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-4" strokeWidth={1.9} />
            </button>
          </div>
        ) : (
          <HugeiconsIcon
            icon={BubbleChatIcon}
            className="mt-[0.5625rem] size-[1.125rem] shrink-0 self-start text-muted-foreground/70"
            strokeWidth={1.8}
          />
        )}
        <label htmlFor="myspace-ask" className="sr-only">
          {t("myspace.ask.label")}
        </label>
        {tpl ? (
          <TemplatePrompt
            tkey={tpl.key}
            values={tpl.values}
            onChange={draft.setSlot}
            forcedOpen={tpl.open}
            onForcedClose={draft.closeForced}
            onEditText={editTemplateAsText}
          />
        ) : (
          <textarea
            id="myspace-ask"
            ref={inputRef}
            rows={1}
            maxLength={4000}
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value)
              if (!e.target.value.trim()) setChipAgent(null)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) send(e)
            }}
            placeholder={t("myspace.ask.placeholder")}
            className="block min-w-0 flex-1 resize-none bg-transparent py-2 text-[0.875rem] leading-5 outline-none placeholder:text-muted-foreground/70"
          />
        )}
        <button
          type="submit"
          disabled={!tpl && !prompt.trim()}
          aria-label={t("myspace.ask.send")}
          className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-from via-brand-via to-brand-to text-brand-on-brand shadow-sm transition hover:brightness-110 disabled:opacity-40"
        >
          <HugeiconsIcon icon={ArrowUp02Icon} className="size-[1.125rem]" strokeWidth={2.2} />
        </button>
      </form>

      {/* ── Hazır istemler: EŞİT KUTUCUK IZGARASI — iki (geniş kolonda üç)
          eşit sütun; satırlar ve sütunlar hizalı, her kutucukta önde ikon, göz
          bir sütunda aşağı tarayabiliyor. Sıra niyete göre: önce ÖZETLER
          (gün · hafta), sonra İK işleri. Üstüne gelince motion.dev'in Motion+
          düğmesinin eğik silmesi (`PromptTile`). */}
      <div
        role="group"
        aria-label={t("myspace.chips.aria")}
        className="mt-4 grid grid-cols-2 gap-2 @[34rem]/hero:grid-cols-3 @[60rem]/myspace:flex-1 @[60rem]/myspace:auto-rows-fr"
      >
        {/* ⚠️ "GÜNÜN ÖZETİ" HER ZAMAN İLK KUTUCUK. Pencere AÇIKKEN (06–11 ·
            16–24, yönetici) önceden hazırlanmış özet: marka tonu, sohbeti
            doğrudan açar ve gönderdiği metin dashboard'un düğmesiyle AYNI
            kancadan (`briefCta.ask`) — ısıtılmış cevabı devralmak için AYNI soru
            olmak zorunda. KAPALIYKEN öteki şablonlar gibi istemi kutuya doldurur
            ve "tyro office"e gider; altı kutucuk iki sütuna yetimsiz oturur. */}
        {briefCta.brief ? (
          <PromptTile
            tone="brand"
            icon={
              String(briefCta.brief.windowId ?? "").endsWith("morning") ? SunriseIcon : SunsetIcon
            }
            label={t("myspace.chip.brief")}
            onClick={() => onNewChat(briefCta.ask)}
          />
        ) : (
          <PromptTile
            icon={Sun03Icon}
            label={t("myspace.chip.brief")}
            onClick={() => pick("daySummary", OFFICE)}
          />
        )}
        {[...CHIPS_LEAD, ...CHIPS_HR].map(({ k, agent, icon }) => (
          <PromptTile
            key={k}
            icon={icon}
            label={t(`myspace.chip.${k}`)}
            onClick={() => pick(k, agent)}
          />
        ))}
      </div>
    </>
  )
}
