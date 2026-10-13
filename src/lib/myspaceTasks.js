import { useSyncExternalStore } from "react"
import { msalInstance } from "@/lib/msal"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  "BUGÜNÜN ODAĞI" — kişinin kendi kısa listesi
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ⚠️ **BİZDE GÖREV KAYNAĞI YOK, VE BU DOSYA ONU UYDURMUYOR.** Referans
 * tasarım (`tyro-myspace 2`) örnek görevlerle geliyordu; onlar ALINMADI —
 * liste BOŞ başlar ve içindeki her satırı kullanıcı kendi yazar. Gösterilen
 * her sayı (3/5, yüzde 60) onun kendi listesinin aritmetiği.
 *
 * ⚠️ **BU ARTIK YEDEK — ASIL KAYNAK MICROSOFT TO DO** (2026-09-29,
 * `lib/todo.js` + `hooks/useFocusTasks.js`). `Tasks.ReadWrite` verildi; kart
 * To Do'nun bugün/gecikmiş görevlerini gösteriyor. Bu dosya iki yerde
 * yaşamaya devam ediyor: izin alınamayan oturumda (kart burayı gösterip "To
 * Do'ya bağlan" diyor) ve ilk bağlanışta — buradaki işler To Do'ya TAŞINIYOR,
 * her biri yazıldıktan sonra buradan silinerek.
 *
 * ⚠️ **BEDELİ AÇIK: LİSTE BU TARAYICIDA.** Telefonda açan kişi masaüstünde
 * yazdığını görmez. Kart bunu KENDİSİ söylüyor (`myspace.tasks.local`) —
 * söylemeyen bir kart, kaybolmuş gibi görünen bir listeyle kullanıcıyı
 * yanıltırdı.
 *
 * ⚠️ **SAHİBİNE BAĞLI.** Kayıt oturum adresinin kısa karmasını taşıyor;
 * ortak bir makinede ikinci kişi birincinin listesini görmez (Tebrikler
 * kaydının `owner` kuralının aynısı). Sahip uymuyorsa kayıt SİLİNMEZ, yok
 * sayılır — asıl sahibi döndüğünde listesini bulsun.
 *
 * ⚠️ **"BUGÜN" GÜNLE YENİLENİR, AMA AÇIK İŞ SİLİNMEZ.** Dün bitirilmiş
 * satırlar ertesi gün düşer (bugünün yüzdesini şişirmesinler); bitmemiş
 * olanlar taşınır. Bir işi yarım bıraktı diye listeden silmek, kullanıcının
 * yazdığını çöpe atmak olurdu.
 */
const KEY = "tyro-myspace-tasks-v1"
const VERSION = 1
/** Liste kısa kalsın: "bugünün odağı" bir yapılacaklar arşivi değil. */
export const MAX_TASKS = 12
export const MAX_TITLE = 120

function ownerHash(identity) {
  let h = 5381
  const s = String(identity || "")
  for (let i = 0; i < s.length; i += 1) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

function currentOwner() {
  try {
    return ownerHash(msalInstance.getActiveAccount()?.username ?? "")
  } catch {
    return ownerHash("")
  }
}

/** Yerel takvim günü — `toISOString()` DEĞİL (UTC'de gün kayar). */
function dayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const EMPTY = Object.freeze([])
let snapshot = null
const listeners = new Set()

function read() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return EMPTY
    const data = JSON.parse(raw)
    if (data?.v !== VERSION || data.owner !== currentOwner() || !Array.isArray(data.tasks)) {
      return EMPTY
    }
    const today = dayKey()
    return (
      data.tasks
        .filter((t) => t && typeof t.id === "string" && typeof t.title === "string")
        // Dün bitenler düşer, bitmeyenler taşınır (gerekçe dosya başında).
        .filter((t) => !t.done || t.doneOn === today)
    )
  } catch {
    return EMPTY
  }
}

function write(tasks) {
  snapshot = tasks
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: VERSION, owner: currentOwner(), tasks }))
  } catch {
    // Depo kapalı/dolu: liste bu sekme boyunca bellekte yaşar.
  }
  for (const l of listeners) l()
}

function getSnapshot() {
  if (snapshot === null) snapshot = read()
  return snapshot
}

function subscribe(cb) {
  listeners.add(cb)
  // İkinci sekmede yazılanı bu sekme de görsün (favorilerin deseni).
  const onStorage = (e) => {
    if (e.key === KEY) {
      snapshot = read()
      cb()
    }
  }
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(cb)
    window.removeEventListener("storage", onStorage)
  }
}

export function useMySpaceTasks() {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY)
}

export function addTask(title) {
  const clean = String(title ?? "")
    .trim()
    .slice(0, MAX_TITLE)
  const list = getSnapshot()
  if (!clean || list.length >= MAX_TASKS) return false
  const id = `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
  write([...list, { id, title: clean, done: false }])
  return true
}

export function toggleTask(id) {
  const today = dayKey()
  write(
    getSnapshot().map((t) =>
      t.id === id ? { ...t, done: !t.done, doneOn: !t.done ? today : undefined } : t,
    ),
  )
}

export function removeTask(id) {
  write(getSnapshot().filter((t) => t.id !== id))
}
