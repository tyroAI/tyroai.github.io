import { lazy, Suspense, useEffect, useRef } from "react"
import { VoiceBeam } from "voice-glow"
import { HugeiconsIcon } from "@hugeicons/react"
import Attachment01Icon from "@hugeicons/core-free-icons/Attachment01Icon"
import { onFocusComposer } from "@/lib/chatBus"
import { ImageLightbox } from "@/components/common/ImageLightbox"
import { useLocale } from "@/hooks/useLocale"
import { useIsMobile } from "@/hooks/use-mobile"
import { useToastAvoid } from "@/hooks/useToastAvoid"
import { cn } from "@/lib/utils"
import { AttachmentTray } from "./AttachmentTray"
import { ComposerInput } from "./ComposerInput"
import { ComposerToolbar } from "./ComposerToolbar"
import { useComposerAttachments } from "./useComposerAttachments"
import { useComposerDictation } from "./useComposerDictation"
import { useComposerTemplate } from "./useComposerTemplate"
import { useReferencePicker } from "./useReferencePicker"

// Referans seçici TEMBEL: sohbeti açan herkes indirmesin diye. Panelin kendisi
// de içindeki ticaret sekmelerini ayrıca tembel yüklüyor. Alanlı hazır soru da
// (HR listeleri + takvim) yalnız bir alanlı kart seçilince iner.
const ReferencePicker = lazy(() => import("./ReferencePicker"))
const ComposerTemplate = lazy(() => import("./ComposerTemplate"))

/**
 * Sohbetin bestecisi. Parçalar: dikte + ses hüzmesi (`useComposerDictation`),
 * "/" referans seçici (`useReferencePicker`), ekler (`useComposerAttachments`,
 * `AttachmentTray`) ve alt satır (`ComposerToolbar`). Metnin durumu
 * ebeveynde (`value` / `onChange`); gönderimde ekler `onSend`e teslim edilir.
 */
export function ChatComposer({
  value,
  onChange,
  onSend,
  agent,
  agentName,
  onAgentChange,
  onMicToggle,
  onOpenPromptLab,
  promptLabOpen,
  disabled,
  className,
}) {
  const { t, locale } = useLocale()
  // Composer her yerde tek satır başlar; büyüme mobilde 2, masaüstünde 6
  // satırla sınırlı (geniş ekranda daha uzun mesaj görünür kalsın).
  const isMobile = useIsMobile()
  const taRef = useRef(null)
  const rootRef = useRef(null)
  // Sağ alttaki bildirim yığını besteciye binmesin ("Gönder" kapanmasın).
  useToastAvoid(rootRef, "bottom")
  const tplRef = useRef(null)
  // Alanlı hazır soru (İzin talebi · Masraf · Avans): açıkken yazı alanının yerinde.
  const tpl = useComposerTemplate({ value, onChange })

  // Bildirimdeki "Yanıtla" düğmesi buraya iner: kullanıcı okumak için değil
  // yazmak için döndü, imleç hazır beklesin. Textarea ref'i bu bileşenin
  // içinde yaşadığı için dışarıdan prop yerine olayla isteniyor.
  useEffect(() => {
    return onFocusComposer((e) => {
      const ta = taRef.current
      if (!ta) return
      ta.focus()
      // Hazır istem yazıldıysa ilk yer tutucu SEÇİLİ gelir: kullanıcı
      // "[proje no]"yu silmek zorunda kalmadan üzerine yazar.
      const hit = e?.detail?.selectPlaceholder ? ta.value.match(/\[[^\]]+\]/) : null
      const start = hit ? hit.index : ta.value.length
      const end = hit ? hit.index + hit[0].length : ta.value.length
      try {
        ta.setSelectionRange(start, end)
      } catch {
        // number/date gibi seçim desteklemeyen tiplerde atlanır
      }
    })
  }, [])

  const dictation = useComposerDictation({
    t,
    locale,
    value,
    onChange,
    taRef,
    disabled,
    onMicToggle,
  })
  const { speech } = dictation
  const picker = useReferencePicker({
    value,
    onChange,
    taRef,
    disabled,
    listening: speech.isListening,
  })
  const files = useComposerAttachments({ t, rootRef, taRef })

  function handleMicClick() {
    // Dikte metni `value`ya parça parça ekliyor: seçici yalnızca GİZLENSEYDİ
    // (türetilmiş `pickerOpen`) dikte bitince eski "/" konumuyla geri açılır
    // ve söylenen cümlenin tamamı sorgu sanılırdı. Burada gerçekten kapanır.
    picker.closePicker()
    dictation.toggle()
  }

  // auto-resize
  //
  // Observes the element, not just `value`. The chat mounts while the dock is
  // closed — a zero-width box, where even an empty textarea reports a
  // scrollHeight past the cap — so a value-only effect would measure once,
  // latch the 6-line maximum and never correct itself when the panel opened.
  // Re-measuring on resize also covers dragging the dock wider or narrower.
  useEffect(() => {
    const el = taRef.current
    if (!el) return
    const max = (isMobile ? 2 : 6) * 24 // ~6 lines of 24px line-height (2 on mobile)
    function fit() {
      // Zero width can't be measured meaningfully; keeping the last good
      // height beats writing a garbage one.
      if (!el.clientWidth) return
      el.style.height = "auto"
      el.style.height = Math.min(el.scrollHeight, max) + "px"
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [value, isMobile, tpl.request])

  // Focus on mount, but ONLY on hover-capable pointer devices. On mobile,
  // programmatic focus pops the soft keyboard (Android) or jumps the
  // viewport (iOS) the moment the user lands on the page — both ruin the
  // welcome experience. The user can always tap to focus.
  useEffect(() => {
    if (typeof window === "undefined") return
    const isTouch = "ontouchstart" in window || !window.matchMedia("(pointer: fine)").matches
    if (!isTouch) taRef.current?.focus()
  }, [])

  function handleKeyDown(e) {
    // IME muhafızı: Japonca/Çince/Korece aday penceresi açıkken Enter adayı
    // ONAYLAR, satır seçmez ve mesajı göndermez.
    if (e.nativeEvent?.isComposing || e.keyCode === 229) return

    if (picker.pickerOpen) {
      // Komut paleti kabarcık fazında dinleniyor: seçici açıkken mod+k'yi
      // yutmazsak palet sohbetin üstüne açılır.
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        // stopPropagation komut paletini susturuyor ama tuş tarayıcıya
        // iniyordu: Chrome/Firefox'ta odak adres/arama çubuğuna sıçrıyor ve
        // kullanıcı yazdığı cümleyi kaybediyordu.
        e.preventDefault()
        e.stopPropagation()
        return
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault()
        picker.pickerRef.current?.move(e.key === "ArrowDown" ? 1 : -1)
        return
      }
      // Sekme geçişi Alt + ← →; çıplak oklar imlecin ve satır gezinmesinin.
      if (e.altKey && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
        e.preventDefault()
        if (e.key === "ArrowRight") picker.pickerRef.current?.nextTab()
        else picker.pickerRef.current?.prevTab()
        return
      }
      // Shift+Enter SATIR ATLAR: seçici açık diye kullanıcının alt satıra
      // geçme niyetini çalmak, mesajı yazarken en can sıkıcı sürpriz olurdu.
      if (e.key === "Enter" && e.shiftKey) {
        picker.closePicker()
        return
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault()
        // Seçilecek satır yoksa menü kapanır ve tuş bir sonraki basışta
        // normal işini yapar — yarım cümle GÖNDERİLMEZ.
        if (!picker.pickerRef.current?.pick()) picker.closePicker()
        return
      }
      if (e.key === "Escape") {
        e.preventDefault()
        // Sohbet dock'u Escape'i window'da dinliyor: durdurulmazsa tek basış
        // TÜM paneli kapatırdı.
        e.stopPropagation()
        picker.closePicker()
        return
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (!disabled && (value.trim() || files.attachments.length > 0)) {
        handleSendClick()
      }
      return
    }
    // Hazır istemlerin `[köşeli parantez]` alanları arasında Tab ile gezinme.
    // Metinde alan KALDIĞI sürece Tab sıradakini seçer; alan yoksa Tab kendi
    // işini yapar (odak dışarı çıkar), yani klavyeyle gezinen kullanıcı
    // besteciye kilitlenmez.
    if (e.key === "Tab" && !e.altKey && !e.metaKey && !e.ctrlKey) {
      const ta = taRef.current
      if (!ta) return
      const fields = [...ta.value.matchAll(/\[[^\]\n]{1,40}\]/g)]
      if (fields.length === 0) return
      e.preventDefault()
      const caret = ta.selectionStart ?? 0
      const next = e.shiftKey
        ? ([...fields].reverse().find((m) => m.index < caret) ?? fields[fields.length - 1])
        : (fields.find((m) => m.index >= caret + 1) ?? fields[0])
      try {
        ta.setSelectionRange(next.index, next.index + next[0].length)
      } catch {
        /* seçim desteklemeyen tipler */
      }
    }
  }

  function handleSendClick() {
    // Yanıt akarken gönderim kilitli — alanlı şablonun Enter'ı da bu yoldan geçer.
    if (disabled) return
    if (tpl.request) {
      // Eksik alan varsa şablon o alanı açar ve cümle dönmez.
      const text = tplRef.current?.submit()
      if (!text) return
      const message = tpl.compose(text)
      tpl.sent()
      onSend?.(files.attachments, message)
      files.clear()
      return
    }
    picker.reset()
    dictation.endForSend()
    // Seçilen dosyaları parent'a teslim et — gönderim/base64 dönüşümü orada
    // (ChatScreen) yapılır. Tepsi hemen temizlenir.
    onSend?.(files.attachments)
    files.clear()
  }

  const hasContent = !!tpl.request || value.trim().length > 0 || files.attachments.length > 0

  return (
    /**
     * SES HÜZMESİ kabuğu.
     *
     * ⚠️ `idle={0}`: paketin varsayılanı sessizken bile "yumuşak bir nefes"
     * çiziyor. Bu besteci her ekranda ve her zaman görünür — sürekli yanan
     * bir ışık, birkaç dakika sonra kimsenin görmediği bir dekor olurdu.
     * Hüzme YALNIZ dikte sürerken ve sesli turun cevabı gelirken var.
     */
    <VoiceBeam
      /**
       * ⚠️ **EBEVEYNİN SINIFI BURAYA, İÇ `div`E DEĞİL.** En dış eleman bu: boş
       * durumda ChatScreen besteciye `w-full max-w-3xl` veriyor ve kapsayıcı
       * `max-w-4xl items-center`. Sınıf içeride kalınca sarmalayıcı 4xl kadar
       * genişler, besteci onun içinde SOLA yaslı kalır (öneri kartlarıyla
       * hizası kayar) ve hüzme bestecinin değil o geniş kutunun üstüne çizilir.
       * `w-full`: genişliği taşımazsa besteci daralır.
       */
      className={cn("w-full", className)}
      stream={dictation.beamStream}
      processing={dictation.beamProcessing}
      idle={0}
      {...dictation.beamColors}
    >
      {/* OUTER beam host. Must NOT have overflow:hidden — the focus ring's
          ::before sits at inset:-2px (OUTSIDE the inner border), so any
          overflow clip here would slice it off. The outer wrapper is also
          where the brand-halo box-shadow lives. */}
      <div
        ref={rootRef}
        // Dikte sürerken odak halkası susuyor (bkz. styles/composer.css): ikisi
        // de bestecinin AYNI kenarında yanan ışık ve üst üste binince ikisi de
        // okunmuyor. Hüzme o anın göstergesi, halka yazmanın.
        data-listening={speech.isListening ? "" : undefined}
        className="composer-beam relative w-full rounded-2xl"
        {...files.dragHandlers}
      >
        {/* Drop target covers the whole composer, not just the text area: the
          paperclip and the tray are part of the same affordance, and a drop
          that lands two pixels off should not be a miss.
          pointer-events-none so it never intercepts the drop it announces. */}
        {files.dragging && (
          <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center rounded-2xl bg-brand/10 backdrop-blur-[2px]">
            {/* Ring inset by a few pixels rather than drawn on the composer's own
              edge — flush against the border it reads as a rendering glitch. */}
            <span className="absolute inset-[0.1875rem] rounded-[0.875rem] border-2 border-dashed border-brand/55" />
            {/* card/foreground, not brand-soft/brand-deep: the brand pair is a
              light-theme duo, and in dark it put navy text on a near-black
              pill. The paired tokens are legible in both themes by
              definition, and the brand colour stays on the icon. */}
            <span className="relative flex items-center gap-2 rounded-full border border-brand/30 bg-card px-3.5 py-1.5 text-[0.78125rem] font-semibold text-foreground shadow-sm">
              <HugeiconsIcon
                icon={Attachment01Icon}
                className="size-4 text-brand"
                strokeWidth={2}
              />
              {t("chat.attach.dropHere")}
            </span>
          </div>
        )}
        {/* Portalled to <body> by Radix, so it clears the composer's own
          overflow:hidden and the dock's stacking context alike. */}
        <ImageLightbox
          items={files.imageAttachments}
          activeId={files.viewerId}
          onActiveIdChange={files.setViewerId}
          onClose={() => files.setViewerId(null)}
        />
        {/* Referans seçici — o da portalda: iç kabuk overflow'u kesiyor ve dış
          kabuğa taşma verilemiyor (composer-beam çerçevesi iki piksel
          dışarıda). Suspense yedeği YOK: parça inene kadar hiçbir şey
          çizilmemesi, bir kare boyunca boş bir kutu göstermekten iyi. */}
        {picker.pickerOpen && (
          <Suspense fallback={null}>
            <ReferencePicker
              ref={picker.pickerRef}
              anchorRef={rootRef}
              agentName={agentName}
              query={picker.refQuery}
              onPick={picker.insertReference}
              autoFocusSearch={picker.refFromButton}
              onActiveOptionChange={picker.setActiveOption}
              onClose={() => picker.closePicker()}
            />
          </Suspense>
        )}
        {/* INNER chrome — keeps overflow:hidden so the attachments tray's
          AnimatePresence height tween doesn't jut out of the rounded corners. */}
        <div className="w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <AttachmentTray
            attachments={files.attachments}
            brokenPreviews={files.brokenPreviews}
            onPreview={files.setViewerId}
            onPreviewBroken={files.markBroken}
            onRemove={files.removeAttachment}
          />

          {/* Yazı alanı ya da — alanlı bir hazır soru seçildiyse — onun yerinde
              alanlı cümle (`ComposerTemplate`). */}
          <div className="relative px-4 pt-3 sm:px-6 sm:pt-4 @max-3xl/chat:px-3.5 @max-3xl/chat:pt-2.5">
            {tpl.request ? (
              <Suspense fallback={<div className="min-h-6" />}>
                <ComposerTemplate
                  key={tpl.request.id}
                  ref={tplRef}
                  request={tpl.request}
                  onClose={tpl.close}
                  onSubmit={handleSendClick}
                />
              </Suspense>
            ) : (
              <ComposerInput
                ref={taRef}
                value={value}
                onChange={onChange}
                picker={picker}
                speech={speech}
                onKeyDown={handleKeyDown}
                onPaste={files.handlePaste}
              />
            )}
          </div>

          <ComposerToolbar
            agent={agent}
            onAgentChange={onAgentChange}
            disabled={disabled}
            onAttach={files.openFilePicker}
            refOpen={picker.pickerOpen}
            onRefToggle={picker.toggleFromButton}
            // Referans seçici AÇIKSA önce o kapanır: ikisi de bestecinin
            // üstünde açılan yüzeyler ve üst üste bindiklerinde hangisinin
            // klavyeyi dinlediği belirsiz kalır (Escape ikisini birden
            // ilgilendiriyor).
            onOpenPromptLab={
              onOpenPromptLab
                ? () => {
                    picker.closePicker()
                    onOpenPromptLab()
                  }
                : undefined
            }
            promptLabOpen={promptLabOpen}
            micUsable={dictation.micUsable}
            listening={speech.isListening}
            onMic={handleMicClick}
            canSend={hasContent}
            onSend={handleSendClick}
            locked={!!tpl.request}
          />

          <input
            ref={files.fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={files.handleFiles}
          />
        </div>
      </div>
    </VoiceBeam>
  )
}
