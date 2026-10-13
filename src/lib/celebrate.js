/** Adın ilk sözcüğü — tebrik mesajında hitap ("İyi ki doğdun Ayşe!"). */
export const firstName = (name) =>
  String(name ?? "")
    .trim()
    .split(/\s+/)[0] ?? ""

/**
 * Teams'in kendi derin bağlantısı: kişiyle (ya da adres dizisiyle grup) sohbet, isteğe
 * bağlı hazır mesaj. Adresler arasındaki virgül kodlanmaz — Teams'in biçimi.
 */
export const teamsChat = (address, message) =>
  `https://teams.microsoft.com/l/chat/0/0?users=${[address].flat().filter(Boolean).map(encodeURIComponent).join(",")}${message ? `&message=${encodeURIComponent(message)}` : ""}`

/** Kutlama türünün hazır tebrik mesajı (`person.msg.*`). */
export const celebrateMessage = (t, { kind, name, years }) =>
  t(`person.msg.${kind}`, { name, years: years ?? "" })

/** Outlook web'de yeni posta: alıcı, konu ve gövde dolu. */
export const outlookMail = (address, subject, body) =>
  `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(address)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

/**
 * WhatsApp'ın uluslararası numarası (yalnız rakam): "+90 532 …" → "90532…",
 * "0532 …" (TR yerel) → "90532…", "0049 …" → "49…". Numara yoksa `null`.
 */
export function waNumber(raw) {
  const text = String(raw ?? "").trim()
  const digits = text.replace(/\D/g, "")
  if (digits.length < 7) return null
  if (text.startsWith("+")) return digits
  if (digits.startsWith("00")) return digits.slice(2)
  if (digits.length === 11 && digits.startsWith("0")) return `90${digits.slice(1)}`
  return digits
}

/** WhatsApp: numara varsa o kişiyle, yoksa kişiyi WhatsApp'ta seçtiren paylaşım. */
export const whatsApp = (phone, text) => {
  const n = waNumber(phone)
  return `https://wa.me/${n ?? ""}?text=${encodeURIComponent(text)}`
}
