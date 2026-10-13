import { useEffect, useRef, useState } from "react"
import { onComposerTemplate, requestFocusComposer } from "@/lib/chatBus"
import { isUntouchedPick } from "@/lib/promptMerge"

let seq = 0

const finePointer = () =>
  typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches

const samePreset = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

/**
 * Bestecide hangi alanlı hazır sorunun açık olduğu (`chatBus.requestComposerTemplate`).
 * Alanların durumu tembel `ComposerTemplate`te; bu dosya `promptTemplates`i
 * (HR listeleri) sohbet paketine çekmesin diye ondan bağımsız.
 *
 * ⚠️ YAZILMIŞ METİN SİLİNMEZ: bestecide kullanıcının KENDİ yazısı varsa şablon
 * yine açılır, yazı şablonun üstünde durur (`prefix`) ve gönderimde cümlenin
 * önüne eklenir; × ya da "metin olarak düzenle" yazıyı kutuya geri koyar.
 * Kartın metni "yazı" sayılmaz: içerideki şey son seçilen kartın DOKUNULMAMIŞ
 * metniyse (düz kart ya da "metin olarak düzenle") o metin kalkar.
 */
export function useComposerTemplate({ value, onChange }) {
  const [request, setRequest] = useState(null)
  const latest = useRef({ value, onChange })
  useEffect(() => {
    latest.current = { value, onChange }
  })
  // Bestecideki metni yazan son kart (düz kart ya da "metin olarak düzenle").
  const lastPick = useRef("")

  useEffect(
    () =>
      onComposerTemplate((detail) => {
        if (!detail?.key) {
          // Düz kart seçildi: açık şablon kapanır, metnini `ChatScreen` yazar.
          lastPick.current = detail?.text ?? ""
          setRequest(null)
          return
        }
        const { value: draft, onChange: write } = latest.current
        const own = isUntouchedPick(draft, lastPick.current) ? "" : draft.replace(/\s+$/, "")
        if (draft) write?.("")
        lastPick.current = ""
        seq += 1
        const id = seq
        // Açık şablonun kartına tekrar basmak seçilen alanları sıfırlamaz.
        setRequest((prev) =>
          prev?.key === detail.key && samePreset(prev.preset, detail.preset)
            ? prev
            : { ...detail, id, prefix: own || prev?.prefix || "" },
        )
      }),
    [],
  )

  /** × ya da "metin olarak düzenle": şablon kapanır, `text` verilirse yazı alanına düşer. */
  function close(text) {
    const prefix = request?.prefix || ""
    setRequest(null)
    lastPick.current = prefix ? "" : (text ?? "")
    const back = text != null ? compose(text) : prefix || null
    if (back != null) latest.current.onChange?.(back)
    requestAnimationFrame(() => requestFocusComposer({ selectPlaceholder: text != null }))
  }

  /** Gönderilecek metin: kullanıcının kendi yazısı varsa cümlenin önünde. */
  function compose(text) {
    const prefix = request?.prefix || ""
    return prefix
      ? `${prefix}

${text}`
      : text
  }

  /** Gönderildi: yazı alanı geri gelir; dokunmatikte klavye kendiliğinden açılmasın. */
  function sent() {
    setRequest(null)
    lastPick.current = ""
    if (finePointer()) requestAnimationFrame(() => requestFocusComposer())
  }

  return { request, close, sent, compose }
}
