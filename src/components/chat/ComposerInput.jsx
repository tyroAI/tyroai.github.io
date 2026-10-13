import { Textarea } from "@/components/ui/textarea"
import { useLocale } from "@/hooks/useLocale"

/**
 * Bestecinin yazı alanı + canlı dikte katmanı (`ChatComposer`'dan bölündü).
 *
 * Katman `aria-hidden`, `pointer-events-none` ve yazı alanıyla aynı tipografide;
 * görünmez bir ikiz, onaylanmış `value` kadar yer tutup ara metni tam imlecin
 * durduğu yere iter — kelimeler `isFinal`de yerinde "katılaşır". Ara metni
 * yazı alanına yazmak her olayda seçimi sıfırlar ve Android IME'yi bozardı.
 */
export function ComposerInput({ ref, value, onChange, picker, speech, onKeyDown, onPaste }) {
  const { t } = useLocale()
  return (
    <>
      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => {
          onChange?.(e.target.value)
          picker.syncPicker(e.target.value, e.target.selectionStart ?? e.target.value.length)
        }}
        // İmleç tuş ya da tıklamayla da taşınıyor: seçici açıkken sorgu
        // aralığından çıkan imleç menüyü kapatmalı.
        onKeyUp={(e) => picker.syncPicker(e.target.value, e.target.selectionStart ?? 0)}
        onClick={(e) => picker.syncPicker(e.target.value, e.target.selectionStart ?? 0)}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        placeholder={
          // While listening: show a dedicated hint UNTIL the interim
          // overlay starts rendering words, then clear it so the
          // overlay's transcript has the field to itself (the muted
          // placeholder + muted interim clash).
          speech.isListening
            ? speech.interim
              ? ""
              : t("chat.mic.listeningPlaceholder")
            : t("chat.placeholder")
        }
        rows={1}
        inputMode="text"
        enterKeyHint="send"
        autoCapitalize="sentences"
        autoCorrect="on"
        spellCheck
        aria-multiline="true"
        aria-label={t("chat.placeholder")}
        // Roller YALNIZCA seçici açıkken: `role="combobox"` kalıcı
        // olduğunda `aria-multiline` düşüyor ve ekran okuyucu sıradan bir
        // sohbet kutusunu "combobox, collapsed" diye okuyordu.
        role={picker.pickerOpen ? "combobox" : undefined}
        aria-expanded={picker.pickerOpen ? true : undefined}
        aria-controls={picker.pickerOpen ? "ref-list" : undefined}
        aria-activedescendant={picker.pickerOpen ? (picker.activeOption ?? undefined) : undefined}
        className="composer-input relative z-[1] min-h-[24px] resize-none border-0 bg-transparent dark:bg-transparent px-0 py-0 text-[1rem] sm:text-base leading-6 shadow-none focus-visible:ring-0 focus-visible:border-0"
      />
      {speech.isListening && speech.interim && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-4 top-3 select-none whitespace-pre-wrap break-words text-[1rem] leading-6 text-foreground/55 sm:inset-x-6 sm:top-4 sm:text-base @max-3xl/chat:inset-x-3.5 @max-3xl/chat:top-2.5"
        >
          <span className="invisible">{value ? value + (/\s$/.test(value) ? "" : " ") : ""}</span>
          <span>{speech.interim}</span>
        </div>
      )}
    </>
  )
}
