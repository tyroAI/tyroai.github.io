import { FEED } from "@/lib/feedPolicy"
import { MYSPACE } from "@/lib/myspacePolicy"
import { TODO_PAGE } from "@/lib/todoPolicy"
import { SELF_SERVICE_PAGE } from "@/lib/selfServicePolicy"
import { SOLUTIONS_PAGE } from "@/lib/solutionsPolicy"
import { HOME_EDIT, WIDGETS_PAGE } from "@/lib/widgetsPolicy"
import { audienceAllows, audiencePending } from "@/lib/audience"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  SAYFA ERİŞİMİ — kitlesi daraltılmış sayfalar, TEK kapı
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Üç sayfa bugün kendi kitlesini taşıyor: Keşfet (`/feed`, `FEED`), Akışım
 * (`/myspace`, `MYSPACE`) ve To-Do (`/todo`, `TODO_PAGE`). Gerisi herkese
 * açık; yönetici yüzeyleri (`/security`, katalog sekmesi) kendi kapılarını
 * kendi sayfalarında taşıyor ve buraya girmedi — o kapılar bir LİSTE değil,
 * iki ayrı soru.
 *
 * ⚠️ **NEDEN TEK MODÜL.** Bir sayfaya giden yol bir tane değil: sidebar
 * satırı · header araması · komut paleti · dashboard'daki "Keşfete göz at" ·
 * Akışım'daki Keşfet bağlantısı · sidebar rozeti · Yenilikler kaydının
 * "Yeniliği keşfet" düğmesi · düpedüz adres. Her birine ayrı koşul yazmak,
 * yedincisinde birini unutmak demekti (sohbet kilidinde yaşandı: kilit
 * seçimi süzüyordu, yüzeyi değil). Hepsi `canOpen(path)`a soruyor.
 *
 * ⚠️ **`canOpen` TANIMADIĞI ADRESE "AÇIK" DER.** Soru "bu sayfa kısıtlı mı
 * ve sen dışarıda mısın" — uygulamanın geri kalanını buradan kapatmak
 * mümkün değil, ve olmamalı.
 */

/** `/feed?tag=ik#x` → `/feed`. Yenilikler kayıtlarının `to`su sorgu taşıyor. */
export function pathOf(to) {
  const s = String(to ?? "")
  const cut = s.search(/[?#]/)
  return (cut === -1 ? s : s.slice(0, cut)) || "/"
}

/**
 * Bu kişi için kararlar. `who` = `{ upn, inAdminGroup, isAppAdmin }` — `upn` MSAL
 * `username`i, `inAdminGroup` `useIsInGroup`un, `isAppAdmin` `useIsAppAdmin`in cevabı.
 *
 * Dönen: `{ feed, myspace, todo, selfService, widgets, solutions, homeEdit, home, pending: {…}, canOpen(to) }`.
 * `home`: kapıda kalan kişinin düşeceği sayfa — kendisi kapalı olamaz (yönlendirme döngüsü).
 * `pending` yalnız `"admins"` kitlesinde ve cevap yoldayken doğru: rota o
 * arada yönlendirmez, hiçbir şey çizmez.
 */
export function pageAccessFor(who) {
  const feed = FEED.enabled && audienceAllows(FEED.audience, who)
  const myspace = MYSPACE.enabled && audienceAllows(MYSPACE.audience, who)
  const todo = TODO_PAGE.enabled && audienceAllows(TODO_PAGE.audience, who)
  const selfService = SELF_SERVICE_PAGE.enabled && audienceAllows(SELF_SERVICE_PAGE.audience, who)
  const widgets = WIDGETS_PAGE.enabled && audienceAllows(WIDGETS_PAGE.audience, who)
  const solutions = SOLUTIONS_PAGE.enabled && audienceAllows(SOLUTIONS_PAGE.audience, who)
  // Sayfa değil, Anasayfa'nın düzenlenebilirliği: rota kapısı yok.
  const homeEdit = HOME_EDIT.enabled && audienceAllows(HOME_EDIT.audience, who)
  const pending = {
    feed: FEED.enabled && audiencePending(FEED.audience, who),
    myspace: MYSPACE.enabled && audiencePending(MYSPACE.audience, who),
    todo: TODO_PAGE.enabled && audiencePending(TODO_PAGE.audience, who),
    selfService: SELF_SERVICE_PAGE.enabled && audiencePending(SELF_SERVICE_PAGE.audience, who),
    widgets: WIDGETS_PAGE.enabled && audiencePending(WIDGETS_PAGE.audience, who),
    solutions: SOLUTIONS_PAGE.enabled && audiencePending(SOLUTIONS_PAGE.audience, who),
  }
  const gated = new Map([
    ["/feed", feed],
    ["/myspace", myspace],
    ["/todo", todo],
    ["/self-service", selfService],
    ["/widgets", widgets],
    ["/dashboard", solutions],
  ])
  const canOpen = (to) => gated.get(pathOf(to)) ?? true
  const home = myspace ? "/myspace" : solutions ? "/dashboard" : "/help"
  return { feed, myspace, todo, selfService, widgets, solutions, homeEdit, home, pending, canOpen }
}
