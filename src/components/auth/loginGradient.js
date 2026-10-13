// The login page's palette is pinned to Insta by PaletteProvider (see
// LOGIN_PALETTE there), so this page can just read the palette tokens like
// every other screen. It used to carry the five brand-logo hex values as
// literals, which is how the logo stayed on-brand while the orb beside it
// followed whatever palette the user had chosen — two halves of one page
// disagreeing. TyroLogo already falls back to the same tokens when it is
// handed no colours, so the literals are simply gone.
//
// The gradient's stops are 1, 2 and 5 rather than 1, 2, 3: those are the hex
// values this page has always used, and this change is about where the
// colours come from, not what they look like.
export const LOGIN_GRADIENT =
  "linear-gradient(135deg, var(--brand-logo-1) 0%, var(--brand-logo-2) 50%, var(--brand-logo-5) 100%)"

// Bağlan'ın dolgusu: logo ve "AI" ile aynı pembe → mor (iki temada da sabit belirteçler).
// Sarı yok: beyaz ok ve yazı sarının üstünde okunmuyor. Ölçüldü: yazı 5,7:1, ok 4,9:1.
export const LOGIN_FILL = "linear-gradient(90deg, var(--brand-logo-2), var(--brand-logo-5))"
