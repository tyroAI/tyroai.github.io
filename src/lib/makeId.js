/** Mesaj kimliği: tarayıcı destekliyorsa UUID, değilse zaman + rastgele ek. */
export function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  return String(Date.now()) + Math.random().toString(36).slice(2, 8)
}
