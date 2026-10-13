/**
 * To Do'ya YAZAN iki yüzeyin birbirine "değiştim" demesi — Akışım'ın "Bugünün
 * odağı" (`useFocusTasks`) ve To-Do sayfası (`useTodoBoard`).
 *
 * ⚠️ **İKİ ÖNBELLEK, TEK GERÇEK.** İki kanca da Microsoft To Do'yu okuyor ve
 * ikisi de bellekte kendi önbelleğini tutuyor (60 sn tazelik). Sayfada eklenen
 * bugünün işi Akışım'a dönünce ORADA görünmeli (istek, 2026-09-30: *"akışımda
 * günün odağında girdiklerimizi orada görelim"*) — önbellek tazeyken Akışım onu
 * bir dakika boyunca göstermezdi. Yazan taraf `notifyTodoChanged(kaynak)` der,
 * öteki kendi önbelleğini bayat sayar ve bir sonraki açılışta yeniden okur.
 *
 * Yaprak modül: hiçbir şey import etmez — iki kanca birbirini import etseydi
 * döngü olurdu.
 */
const subscribers = new Set()

/** @returns abonelikten çıkış */
export function onTodoChanged(fn) {
  subscribers.add(fn)
  return () => subscribers.delete(fn)
}

/** `source`: "focus" · "board" — abone kendi yazdığını yok sayabilsin. */
export function notifyTodoChanged(source) {
  for (const fn of subscribers) {
    try {
      fn(source)
    } catch {
      // bir abonenin hatası ötekini susturmasın
    }
  }
}
