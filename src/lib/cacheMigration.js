// One-time client-side cache cleanup.
//
// 2026-08-21: agent avatars stopped being pulled from Copilot Studio's `bot`
// table (see ConfigProvider). Removing the fetch is not enough on its own —
// every icon it ever pulled was written into the `tyro-config-v1` cache as a
// `logo`, and `mergeServerData` deliberately carries a cached logo forward
// onto the fresh server row. So without this, the change would be invisible in
// every browser that had already loaded the app once: the icons would keep
// showing, from localStorage, forever.
//
// Only AGENT logos are cleared, because the bot table only ever fed agents.
// AI-product and business-app logos are untouched.
//
// The cost, stated plainly: a `tyro_logo` is a Dataverse *file* column that the
// entity JSON cannot write, so an admin-uploaded agent logo also lives only in
// that admin's own browser cache — and it is indistinguishable from a
// bot-fetched one (both are data URLs). Anyone who had uploaded a custom agent
// logo will need to upload it again after this runs, once. That is the whole
// price of the icons actually going away.
//
// Bump VERSION only for a NEW cleanup; re-running this one would strip
// re-uploaded logos a second time.
const VERSION_KEY = "tyro-cache-v"
const VERSION = "1"
const CONFIG_KEY = "tyro-config-v1"

export function applyCacheMigration() {
  try {
    if (window.localStorage.getItem(VERSION_KEY) === VERSION) return
    try {
      const raw = window.localStorage.getItem(CONFIG_KEY)
      const parsed = raw ? JSON.parse(raw) : null
      if (Array.isArray(parsed?.agents)) {
        // `logo: null`, not `delete logo`: null is what a server row carries
        // and what IconOrLogo reads as "fall back to the icon name".
        parsed.agents = parsed.agents.map((a) => (a?.logo ? { ...a, logo: null } : a))
        window.localStorage.setItem(CONFIG_KEY, JSON.stringify(parsed))
      }
    } catch {
      // Unparseable cache — nothing to clean, and ConfigProvider will replace
      // it with seed data on this very boot. Still a finished answer, so the
      // marker below is written: retrying every boot would never do more.
    }
    window.localStorage.setItem(VERSION_KEY, VERSION)
  } catch {
    // Storage itself is unavailable (private mode, blocked site data). Nothing
    // was cached, so there is nothing to clean.
  }
}
