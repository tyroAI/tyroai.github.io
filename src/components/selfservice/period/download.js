/**
 * Metni dosya olarak indirir (istemcide üretilen CSV). Bağlantı geçici; adres bir an sonra
 * bırakılır — kişisel veri bellekte asılı kalmasın.
 */
export function downloadText(text, fileName, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  link.rel = "noopener"
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}
