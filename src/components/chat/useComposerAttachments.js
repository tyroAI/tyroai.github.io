import { useEffect, useRef, useState } from "react"
import { MAX_ATTACHMENT_BYTES, MAX_IMAGE_BYTES, isCompressibleImage } from "@/lib/copilot"
import { notify } from "@/lib/notify"
import { formatFileSize, revokePreview } from "./composerFiles"

/**
 * Bestecinin ekleri: ataç, yapıştırma ve bırakma tek kapıdan (`addFiles`)
 * girer. `rootRef` pencere düzeyindeki yapıştırmanın "besteci görünüyor mu"
 * sorusu için; `taRef`in kendi yapıştırması zaten işlenmiş olur.
 */
export function useComposerAttachments({ t, rootRef, taRef }) {
  const fileInputRef = useRef(null)
  const [attachments, setAttachments] = useState([])
  const [dragging, setDragging] = useState(false)
  // The picture being previewed, addressed by attachment id — see ImageLightbox
  // for why an index would be the wrong handle.
  const [viewerId, setViewerId] = useState(null)
  // Ids whose thumbnail failed to decode. Held here rather than in the chip so
  // the tray and the viewer's list agree on what counts as an image.
  const [brokenPreviews, setBrokenPreviews] = useState(() => new Set())

  // Kept in a ref as well as state so the unmount sweep below sees the final
  // list — a cleanup that closes over state would revoke a stale snapshot.
  const liveAttachments = useRef(attachments)
  useEffect(() => {
    liveAttachments.current = attachments
  }, [attachments])
  useEffect(() => () => liveAttachments.current.forEach(revokePreview), [])

  function openFilePicker() {
    fileInputRef.current?.click()
  }

  /**
   * The single intake for every way a file can arrive — the paperclip, a
   * paste, a drop. An intake bound to the picker's change handler alone made
   * pasting a screenshot do nothing at all.
   */
  function addFiles(picked) {
    if (!picked || picked.length === 0) return
    // Dosyalar activity'ye inline base64 olarak gömülür. Görseller gönderimden
    // önce otomatik küçültülür (bkz. compressImageFile) — o yüzden ham tavanları
    // yüksek (MAX_IMAGE_BYTES). Görsel-olmayan dosyalar sıkıştırılamaz, daha düşük
    // tavana (MAX_ATTACHMENT_BYTES) takılır. Aşan dosyayı ele ve bildir.
    const accepted = picked.filter((file) => {
      const cap = isCompressibleImage(file) ? MAX_IMAGE_BYTES : MAX_ATTACHMENT_BYTES
      if (file.size > cap) {
        notify.error(
          t("chat.attach.tooLarge")
            .replace("{name}", file.name)
            .replace("{size}", formatFileSize(cap)),
        )
        return false
      }
      return true
    })
    if (accepted.length > 0) {
      setAttachments((prev) => [
        ...prev,
        ...accepted.map((file) => ({
          id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          // Revoked on removal and on unmount; an object URL pins the whole
          // blob in memory until it is.
          previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
        })),
      ])
    }
  }

  function handleFiles(e) {
    addFiles(Array.from(e.target.files || []))
    e.target.value = ""
  }

  // Read by the window paste listener, which is registered once and must not
  // close over a stale viewer state.
  const viewerOpenRef = useRef(false)
  useEffect(() => {
    viewerOpenRef.current = viewerId != null
  }, [viewerId])

  /**
   * Paste an image straight into the conversation.
   *
   * A screenshot on the clipboard arrives as a File in `clipboardData.files`,
   * named "image.png" by the browser — every paste would otherwise produce a
   * tray full of identically-named rows, so each gets a timestamp.
   *
   * `preventDefault` fires ONLY when files were actually taken. Copying from a
   * web page puts both HTML and an image on the clipboard, and a blanket
   * preventDefault there would swallow the text the user meant to paste.
   */
  function handlePaste(e) {
    const files = Array.from(e.clipboardData?.files ?? [])
    if (files.length === 0) return
    // The preview covers the composer, so a row added now would be a silent
    // nothing. Guarded here rather than in the window listener so it holds
    // whichever way the event arrives.
    if (viewerOpenRef.current) return
    const stamped = files.map((file) => {
      if (!isCompressibleImage(file)) return file
      const ext = (file.type.split("/")[1] || "png").replace("jpeg", "jpg")
      // Time only, no date: the tray truncates long names to a prefix, and a
      // full timestamp pushed the extension off the end of every chip. These
      // live for seconds, so HHMMSS separates them fine.
      const now = new Date()
      const label = [now.getHours(), now.getMinutes(), now.getSeconds()]
        .map((n) => String(n).padStart(2, "0"))
        .join("")
      // A new File rather than a rename: File.name is read-only.
      return new File([file], `${t("chat.attach.pastedImage")}-${label}.${ext}`, {
        type: file.type,
        lastModified: file.lastModified,
      })
    })
    e.preventDefault()
    addFiles(stamped)
  }

  /**
   * Cmd+V from anywhere on the chat surface, not only inside the text box.
   *
   * Copying a picture in Excel, Finder or a browser leaves the focus wherever
   * the user last clicked, so a handler bound to the textarea alone silently
   * does nothing. The window listener is deliberately narrow: it acts only when
   * the clipboard actually carries files, never when another field is focused,
   * and never when the composer is off screen (one ChatScreen stays mounted for
   * the whole session, so a closed dock must not quietly eat the image).
   */
  const pasteRef = useRef(handlePaste)
  useEffect(() => {
    pasteRef.current = handlePaste
  })
  useEffect(() => {
    function onWindowPaste(e) {
      if (!e.clipboardData?.files?.length) return
      // The textarea's own handler already ran; this is the same event bubbling.
      if (e.target === taRef.current) return
      const el = document.activeElement
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable))
        return
      const root = rootRef.current
      if (!root) return
      // checkVisibility covers display:none, visibility:hidden and empty
      // subtrees in one call; the rect fallback stands in for older engines.
      // offsetParent is NOT usable here — the dock is position:fixed, where it
      // is null even while perfectly visible.
      const shown = root.checkVisibility
        ? root.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
        : root.getBoundingClientRect().height > 0
      if (!shown) return
      pasteRef.current(e)
    }
    window.addEventListener("paste", onWindowPaste)
    return () => window.removeEventListener("paste", onWindowPaste)
  }, [rootRef, taRef])

  // Drop counter, not a boolean: dragging across a child element fires
  // dragleave on the parent, and a boolean would flicker the overlay off
  // halfway through the drag.
  const dragDepth = useRef(0)

  function handleDragEnter(e) {
    if (!e.dataTransfer?.types?.includes("Files")) return
    e.preventDefault()
    dragDepth.current += 1
    setDragging(true)
  }

  function handleDragOver(e) {
    if (!e.dataTransfer?.types?.includes("Files")) return
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
  }

  function handleDragLeave() {
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setDragging(false)
  }

  function handleDrop(e) {
    if (!e.dataTransfer?.types?.includes("Files")) return
    e.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    addFiles(Array.from(e.dataTransfer.files || []))
  }

  function removeAttachment(id) {
    setAttachments((prev) => {
      prev.filter((a) => a.id === id).forEach(revokePreview)
      return prev.filter((a) => a.id !== id)
    })
  }

  // Gönderimden sonra: dosyalar çağırana gitti (o File'ları okur, önizleme
  // URL'lerini değil), önizlemeler artık ölü.
  function clear() {
    attachments.forEach(revokePreview)
    setAttachments([])
  }

  // Only images, in tray order: the viewer's arrow keys step between pictures,
  // and a PDF in the middle of that sequence would be a dead frame.
  const imageAttachments = attachments
    .filter((a) => a.previewUrl && !brokenPreviews.has(a.id))
    .map((a) => ({ id: a.id, url: a.previewUrl, name: a.name, meta: formatFileSize(a.size) }))

  return {
    attachments,
    brokenPreviews,
    markBroken: (id) => setBrokenPreviews((prev) => new Set(prev).add(id)),
    dragging,
    dragHandlers: {
      onDragEnter: handleDragEnter,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
    viewerId,
    setViewerId,
    imageAttachments,
    fileInputRef,
    openFilePicker,
    handleFiles,
    handlePaste,
    removeAttachment,
    clear,
  }
}
