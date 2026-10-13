/** Talep formlarının ortak görünümü: alan kutusu, etiket, hata. */
export const CONTROL =
  "flex h-10 w-full min-w-0 items-center gap-2 rounded-xl border border-border bg-background px-3 text-start text-[0.875rem] text-foreground shadow-xs transition-[border-color,box-shadow] hover:border-foreground/25 focus-visible:border-brand/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25 aria-invalid:border-destructive/70 aria-invalid:ring-2 aria-invalid:ring-destructive/15 pointer-coarse:h-11"

export const LABEL = "mb-1.5 flex items-center gap-1 text-[0.75rem] font-medium text-foreground/80"

export const ERROR = "mt-1.5 text-[0.75rem] leading-snug text-destructive"

/** Sözlükteki alan ve seçenek adları cümle içi küçük harfle yazılı ("yıllık izin"); formda baş harf büyük. */
export const capFirst = (s, locale) =>
  s ? String(s).charAt(0).toLocaleUpperCase(locale) + String(s).slice(1) : s

/** Alan hatasının metni (`formErrors` türü → sözlük). */
export function errorText(t, slot, error) {
  if (!error) return null
  if (error === "order") return t("selfService.form.err.order")
  if (error === "amount") return t("selfService.form.err.amount")
  if (slot.type === "date") return t("selfService.form.err.date")
  if (slot.type === "choice") return t("selfService.form.err.choice")
  if (slot.type === "amount") return t("selfService.form.err.amountEmpty")
  return t("selfService.form.err.text")
}

/** Geniş alan (iki sütunu kaplar): yazı, aramalı liste, uzun seçenek listesi. */
export const isWide = (slot) =>
  slot.type === "text" || slot.search || (slot.type === "choice" && slot.options.length > 3)

/** Odak bir sonraki çizimde (yeni açılan alan, geri gelen "+ alan" çipi henüz yok). */
export function focusSoon(selector) {
  requestAnimationFrame(() => document.querySelector(selector)?.focus())
}

/** Alanın odaklanacak öğesi: kutu ya da düğme; çiplerde seçili çip. */
export const fieldSelector = (idBase, name) =>
  `#${CSS.escape(`${idBase}-${name}`)}, [aria-labelledby="${idBase}-${name}-label"] [aria-checked="true"]`
