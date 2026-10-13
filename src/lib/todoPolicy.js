/**
 * ═══════════════════════════════════════════════════════════════════════
 *  To-Do (`/todo`) — Microsoft To Do sayfası (POLİTİKA, 2026-09-30)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * İstek: *"sidebar'da To-Do ismiyle, İngilizce-Türkçe aynı, sayfa olsun."*
 * Mekanizma `lib/todoBoard.js`, sayfa `components/todo/TodoPage.jsx`.
 *
 * **Geri almak tek satır:** `enabled: false` — sidebar satırı, arama girdisi,
 * komut paleti ve rota birlikte kapanır (rota `/dashboard`a yönlendirir).
 *
 * ⚠️ **KİTLE ANASAYFA'YLA AYNI — TYRO'DA HERKES** (2026-10-04, istek:
 * *"herkese aç… tyro da kapamıştık ama tyro da açacağız"*). Sayfa
 * Anasayfa'nın "Bugünün odağı" ile aynı görevleri anlatıyor; birini gören ama
 * ötekini göremeyen biri olmasın. `Tasks.ReadWrite` kiracının tamamı için
 * verili. Tyro'da (UAT/dev) kitle önizleme ekibiydi; daraltmak tek satır:
 * `audience: MYSPACE_UPNS` (`lib/audience.js`).
 */
export const TODO_PAGE = {
  enabled: true,
  /** `"*"` herkese · `"admins"` yalnız yönetici grubuna · `["upn", …]` bu kişilere. */
  audience: "*",
}
