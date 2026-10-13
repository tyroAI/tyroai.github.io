import { isAbsence } from "@/lib/selfServiceNames"
import { countsInTotals } from "@/lib/selfServiceStatus"
import { isReport } from "@/lib/teamCircle"

/**
 * Ekibim'in GİZLİLİK KURALI — tek yer ve VERİ katmanında (yalnız ekranda gizlemek yetmez).
 *
 * - Bana bağlı olan ("report"): bugünkü gibi — izin türü, saat, bakiye, türe göre dağılım.
 * - Yöneticim ve ekip arkadaşım ("manager" · "peer"): YALNIZ izin GÜNLERİ, türsüz ("İzinde").
 *   Bakiye hiç sorulmaz (`balanceQueries`); izin satırı eşlenirken tür, kod, saat ve açıklama
 *   düşer, yalnız tam günlük gerçek devamsızlık kalır (Evden Çalışma, Dış Görev, Kart Unutuldu
 *   ve gün altı kayıt — saatlik ya da yarım gün — çıkar). İzin türü sağlık verisini ele
 *   verebilir ("Rapor"): KVKK'da özel nitelikli kişisel veri. Tür kolonu sorguda kalır
 *   (devamsızlık ayrımı için); önbelleğe ve ekrana türsüz kayıt gider.
 */

/** Saatlik kayıt (gün < 1, saat > 0): bana bağlıda çizelgede nokta, "izinde" sayılmaz. */
export const isPartial = (r) => (r?.days ?? 0) < 1 && (r?.hours ?? 0) > 0

/**
 * Tam günlük mü: gün sayısı varsa en az 1 (yarım ve sıfır gün değil); gün yoksa saatsiz kayıt.
 * `isPartial`ın tersi değil: saatsiz yarım gün (0,5 gün, 0 saat) saatlik değil, tam günlük de değil.
 */
export const isFullDay = (r) => (r?.days == null ? !((r?.hours ?? 0) > 0) : r.days >= 1)

/** Ekip arkadaşına gösterilebilir mi: toplama giren, tam günlük, gerçek devamsızlık. */
export const shareable = (r) =>
  Boolean(r?.start) && countsInTotals(r) && isAbsence(r) && isFullDay(r)

const time = (d) => (d instanceof Date ? d.getTime() : 0)

/**
 * Türsüz izin: yalnız tarih aralığı ve gün sayısı. Kimlik de tarihlerden — ERP satırının yedek
 * kimliği tür kodunu taşıyabiliyor.
 */
export function neutralLeave(r) {
  const end = r.end ?? r.start
  return {
    kind: "leave",
    id: `away-${time(r.start)}-${time(end)}`,
    neutral: true,
    start: r.start,
    end,
    days: r.days ?? null,
    date: r.start,
  }
}

/** Kayıtlar → türsüz izinler: gösterilebilenler, aynı aralık bir kez, başlangıca göre. */
export function neutralLeaves(list) {
  const byRange = new Map()
  for (const r of list ?? []) {
    if (!shareable(r)) continue
    const n = neutralLeave(r)
    const hit = byRange.get(n.id)
    if (!hit || (n.days ?? 0) > (hit.days ?? 0)) byRange.set(n.id, n)
  }
  return [...byRange.values()].sort((a, b) => a.start - b.start)
}

/** Üyenin önbelleğe ve ekrana gidebilecek izinleri: bana bağlıysa olduğu gibi, değilse türsüz. */
export const visibleLeaves = (member, list) =>
  isReport(member) ? [...(list ?? [])] : neutralLeaves(list)
