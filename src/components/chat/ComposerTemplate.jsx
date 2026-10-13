import { useEffect, useImperativeHandle, useRef } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import PencilEdit02Icon from "@hugeicons/core-free-icons/PencilEdit02Icon"
import { TemplatePrompt } from "@/components/myspace/TemplatePrompt"
import { useLocale } from "@/hooks/useLocale"
import { usePromptTemplate } from "@/hooks/usePromptTemplate"

const ICON_BTN =
  "grid size-7 place-items-center rounded-lg text-muted-foreground/70 transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-foreground/40 [@media(pointer:coarse)]:size-9"

/**
 * Sohbet bestecisinde ALANLI hazır soru — yazı alanının YERİNE, Anasayfa'nın
 * soru kutusundaki cümlenin aynısı (`TemplatePrompt`): tarih takvimden, izin
 * türü · para birimi · kategori · şirket listeden (HR MCP'nin değerleri).
 * Durum Anasayfa ile ortak kancada (`usePromptTemplate`).
 *
 * Tembel yüklenir (`ChatComposer`): HR listeleri ve takvim yalnız bir alanlı
 * kart seçilince iner. Gönderim bestecinin düğmesinde; cümleyi `ref.submit()`
 * verir, eksik alan varsa o alanı açıp `null` döner.
 *
 * Önde iki düğme (Anasayfa'daki gibi): kalem cümleyi serbest metne çevirir
 * (boş alanlar `[etiket]`), × şablonu kapatıp boş yazı alanına döner.
 */
export default function ComposerTemplate({ ref, request, onClose, onSubmit }) {
  const { t } = useLocale()
  const rootRef = useRef(null)
  const draft = usePromptTemplate(rootRef, request)
  const { tpl } = draft

  useImperativeHandle(ref, () => ({ submit: draft.submit }))

  // Karttan geldiyse odak ilk alana: klavyeyle gezen kişi cümlenin başında
  // başlasın. Dokunmatikte yok — bir yazı alanına düşen odak klavyeyi açardı.
  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches)
      rootRef.current?.querySelector("[data-slot-name]")?.focus({ preventScroll: true })
  }, [])

  if (!tpl) return null

  const sentence = (
    <TemplatePrompt
      tkey={tpl.key}
      values={tpl.values}
      onChange={draft.setSlot}
      forcedOpen={tpl.open}
      onForcedClose={draft.closeForced}
      onEditText={() => onClose(draft.asText())}
    />
  )

  function onKeyDown(e) {
    // Açık bir seçici Escape'le kapandıysa (Radix `preventDefault` eder) olay
    // yukarı gitmesin: sohbet rıhtımı Escape'i window'da dinliyor.
    if (e.key === "Escape" && e.nativeEvent.defaultPrevented) e.stopPropagation()
    // Yazı alanında (tutar · açıklama) Enter gönderir — yazı kutusunun kuralı.
    if (
      e.key === "Enter" &&
      !e.shiftKey &&
      !e.nativeEvent.isComposing &&
      e.target.tagName === "INPUT" &&
      e.target.dataset.slotName
    ) {
      e.preventDefault()
      onSubmit()
    }
  }

  return (
    <div ref={rootRef} onKeyDown={onKeyDown} className="flex items-start gap-1.5">
      <div className="-ml-1.5 flex shrink-0 flex-col items-center gap-0.5 [@media(pointer:coarse)]:-ml-2">
        <button
          type="button"
          onClick={() => onClose(draft.asText())}
          aria-label={t("myspace.template.edit")}
          title={t("myspace.template.edit")}
          className={`${ICON_BTN} hover:bg-accent hover:text-foreground`}
        >
          <HugeiconsIcon icon={PencilEdit02Icon} className="size-[1.0625rem]" strokeWidth={1.8} />
        </button>
        <button
          type="button"
          onClick={() => onClose()}
          aria-label={t("myspace.template.clear")}
          title={t("myspace.template.clear")}
          className={`${ICON_BTN} hover:bg-destructive/10 hover:text-destructive`}
        >
          <HugeiconsIcon icon={Cancel01Icon} className="size-4" strokeWidth={1.9} />
        </button>
      </div>
      {request.prefix ? (
        <div className="min-w-0 flex-1">
          {/* Şablon seçilmeden önce yazılan metin: kaybolmadı, cümlenin önünde gidecek. */}
          <p className="mb-1.5 line-clamp-3 whitespace-pre-wrap text-[0.875rem] text-muted-foreground [overflow-wrap:anywhere]">
            {request.prefix}
          </p>
          {sentence}
        </div>
      ) : (
        sentence
      )}
    </div>
  )
}
