/**
 * The order the catalog is shown in, before anyone has chosen one.
 *
 * The real order lives on the server (`tyro_sortorder`, written from
 * /settings — see ConfigProvider's `reorder`). This module only answers the
 * question "what if nobody has ever set one?", and it answers it at READ
 * time: no seeding write, no version marker, no localStorage. The moment a
 * single row carries a number, this steps aside entirely and the stored order
 * is the only order.
 *
 * Read-time rather than a one-off seed write on purpose. A seed would have to
 * fire from whichever browser happened to load the app first, which for most
 * people is a browser whose account cannot write to `tyro_launcherapp` at
 * all — so it would either fail silently on every load or need a privilege
 * check the client can't make. Sorting on read costs nothing and cannot fail.
 */

import { catalogNameKey } from "./agentName"

/** Normalised for matching: the catalog's names are typed by hand and drift
 *  between spellings ("TYRO Office", "tyroOffice", "Office"). */
const normalise = catalogNameKey

/**
 * Agents that lead the list until someone says otherwise, in this order.
 *
 * Matched by NAME, not id: the catalog row's GUID differs between Dataverse
 * environments (the same reason the pending-ask channel routes by name). Both
 * spellings of each are listed because the catalog contains both.
 */
export const DEFAULT_FIRST_AGENTS = ["tyro office", "tyro trader"]

/**
 * Puts `preferred` first while nothing has an explicit position.
 *
 * Returns the list untouched — same array reference — as soon as ANY item
 * carries a stored `sortOrder`, so this can never fight a deliberate
 * arrangement. Everything not named keeps its catalog order behind the ones
 * that are.
 */
export function applyDefaultOrder(items, preferred = DEFAULT_FIRST_AGENTS) {
  if (!items?.length) return items
  if (items.some((i) => Number.isFinite(i.sortOrder))) return items
  const rank = new Map(preferred.map((name, i) => [normalise(name), i]))
  const at = (item) => rank.get(normalise(item.name)) ?? Number.MAX_SAFE_INTEGER
  // Array.prototype.sort is stable, which is what keeps the unnamed rest in
  // catalog order instead of shuffling it.
  return [...items].sort((a, b) => at(a) - at(b))
}
