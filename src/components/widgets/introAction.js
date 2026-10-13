/** Toplantıya bu kadar kala "Toplantıya hazırlan" öne çıkar. */
export const SOON_MS = 60 * 60_000

/**
 * Karşılama'nın tek eylemi — "sıradaki en iyi adım" ("Günün özeti" hazır soru
 * kutucuğunda zaten var; aynı düğme iki yerde boşa düşüyordu): bir saat içinde
 * başlayacak toplantı varsa ona hazırlan; hafta sonu haftaya hazırlan; akşam
 * (18:00 sonrası) yarını, gündüz bugünü planla.
 * `left`: bugünün bitmemiş toplantıları (sıralı) · `now`: ms.
 */
export function introAction({ weekend, part, left = [], now }) {
  const soon =
    !weekend && left.find((m) => m.start.getTime() > now && m.start.getTime() - now <= SOON_MS)
  if (soon) return { kind: "prepare", meeting: soon }
  if (weekend) return { kind: "week" }
  if (part === "evening") return { kind: "tomorrow" }
  return { kind: "today" }
}
