/** Önizleme URL'si bütün blob'u bellekte tutar; kaldırılınca ve unmount'ta bırakılır. */
export function revokePreview(att) {
  if (att?.previewUrl) URL.revokeObjectURL(att.previewUrl)
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

/** Besteciden geçmeyen dosyalar (park edilen soruyla gelen) → bestecinin ek biçimi. */
export function asAttachments(files) {
  return (files ?? []).map((file) => ({
    id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    file,
    name: file.name,
    size: file.size,
    type: file.type,
    previewUrl: null,
  }))
}
