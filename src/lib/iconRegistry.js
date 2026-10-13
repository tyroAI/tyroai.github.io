/**
 * Katalog ikonları — Dataverse'ten ADIYLA gelen ikonu çizilebilir veriye çevirir.
 *
 * Buradaki tek kural şu: **paketin tamamı bundle'a girmez.** Bu dosya
 * `import * as HugeIcons from "@hugeicons/core-free-icons"` diyordu ve o tek
 * satır 12.920 ikonun tamamını uygulamanın GİRİŞ paketine koyuyordu.
 * Ölçüldü (2026-09-14, `vite build`): ana chunk **6,9 MB**, ön-önbellek
 * 9.247 KB. Katalogda gerçekten geçen ikon sayısı ise 11.
 *
 * Bu yüzden iki kademe var:
 *
 * 1. `REGISTRY` — katalogda BUGÜN geçen adlar, tek tek import edilir. Bir
 *    ikon modülü ~1 KB; on birinin toplamı 11 KB eder, 5 MB değil.
 * 2. Tanınmayan bir ad gelirse (katalogda yeni bir uygulamaya yeni bir ikon
 *    seçilmiştir) yalnız adının PARÇASI iner (`loadIcon`, ilk iki harf, en
 *    büyüğü ~45 KB gz; `scripts/vite/iconShards.mjs`). Tam set (~1,36 MB gz)
 *    yalnız yöneticinin ikon seçicisinde ve dev'de (`loadFullIconSet`).
 *
 * Yeni bir ikon kalıcılaşırsa (katalogda kalacaksa) adını `REGISTRY`'ye ekle;
 * o zaman tembel yükleme hiç tetiklenmez.
 *
 * ⚠️ **ADI GEÇEN HER SABİT İKON BURAYA GİRER.** tyroTrade'de bu kural bir
 * kez atlandı ve sonucu şuydu: ana ekrana giren HERKES, dört ikon kayıtta
 * bulunamadığı için tam seti indirmeye başlıyor ve o gelene kadar kartlarda
 * "?" görüyordu — yani optimizasyon dashboard'a girildiği anda kendini iptal
 * ediyordu. Tembel yedek yalnızca Dataverse'ten gelen ÖNGÖRÜLEMEYEN adlar
 * içindir.
 */
import { iconShardKey } from "./iconShard"
import AiBrain02Icon from "@hugeicons/core-free-icons/AiBrain02Icon"
import AiChipIcon from "@hugeicons/core-free-icons/AiChipIcon"
import CargoShipIcon from "@hugeicons/core-free-icons/CargoShipIcon"
import ChartHistogramIcon from "@hugeicons/core-free-icons/ChartHistogramIcon"
import DocumentValidationIcon from "@hugeicons/core-free-icons/DocumentValidationIcon"
import Office365Icon from "@hugeicons/core-free-icons/Office365Icon"
import Package01Icon from "@hugeicons/core-free-icons/Package01Icon"
import Robot01Icon from "@hugeicons/core-free-icons/Robot01Icon"
import SignatureIcon from "@hugeicons/core-free-icons/SignatureIcon"
import Target02Icon from "@hugeicons/core-free-icons/Target02Icon"
import Telescope02Icon from "@hugeicons/core-free-icons/Telescope02Icon"
// Demo kataloğunun ikonları (asistanlar ve iş uygulamaları).
import AiMailIcon from "@hugeicons/core-free-icons/AiMailIcon"
import BookOpen01Icon from "@hugeicons/core-free-icons/BookOpen01Icon"
import ChartIncreaseIcon from "@hugeicons/core-free-icons/ChartIncreaseIcon"
import CloudIcon from "@hugeicons/core-free-icons/CloudIcon"
import CustomerSupportIcon from "@hugeicons/core-free-icons/CustomerSupportIcon"
import Database01Icon from "@hugeicons/core-free-icons/Database01Icon"
import KanbanIcon from "@hugeicons/core-free-icons/KanbanIcon"
import SlackIcon from "@hugeicons/core-free-icons/SlackIcon"
import UserGroupIcon from "@hugeicons/core-free-icons/UserGroupIcon"
import UserMultiple02Icon from "@hugeicons/core-free-icons/UserMultiple02Icon"

/** Katalogda ve uygulamanın kendi ekranlarında geçen adlar. */
const REGISTRY = {
  AiBrain02Icon,
  AiChipIcon,
  AiMailIcon,
  BookOpen01Icon,
  CargoShipIcon,
  ChartHistogramIcon,
  ChartIncreaseIcon,
  CloudIcon,
  CustomerSupportIcon,
  Database01Icon,
  DocumentValidationIcon,
  KanbanIcon,
  Office365Icon,
  Package01Icon,
  Robot01Icon,
  SignatureIcon,
  SlackIcon,
  Target02Icon,
  Telescope02Icon,
  UserGroupIcon,
  UserMultiple02Icon,
}

/** Tembel yüklenen tam set — yalnızca tanınmayan bir ad gelirse. */
let fullSet = null
let fullSetPromise = null
const shardIcons = {}
const shardLoads = {}
// Derlemede `icons/<sürüm>/` (iconShards eklentisi); dev'de ve testte tanımsız → tam set.
const SHARDS = import.meta.env.TYRO_ICON_SHARDS

export function getIconByName(name) {
  if (!name) return null
  return REGISTRY[name] ?? shardIcons[name] ?? fullSet?.[name] ?? null
}

/** Tek bir ikonu yükler: üretimde adının parçası, parça yoksa tam set. Bulunamazsa `null`. */
export function loadIcon(name) {
  if (!name || getIconByName(name)) return Promise.resolve(getIconByName(name))
  if (!SHARDS) return loadFullIconSet().then(() => getIconByName(name))
  const key = iconShardKey(name)
  shardLoads[key] ??= fetch(`${import.meta.env.BASE_URL}${SHARDS}${key}.json`)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    })
    .then((icons) => Object.assign(shardIcons, icons))
    .catch((err) => {
      delete shardLoads[key]
      throw err
    })
  return shardLoads[key].then(() => getIconByName(name))
}

/**
 * Tam seti getirir. Aynı sekmede en fazla BİR kez ağa çıkar: söz nesnesi
 * saklanır, ikinci çağıran aynı indirmeyi bekler.
 */
export function loadFullIconSet() {
  if (fullSet) return Promise.resolve(fullSet)
  // Başarısızlık SAKLANMAZ: reddedilen söz tutulursa bir kerelik ağ hatası,
  // sekme kapanana kadar o ikonun bir daha hiç denenmemesi demek olurdu.
  fullSetPromise ??= import("@hugeicons/core-free-icons")
    .then((mod) => {
      fullSet = mod
      return mod
    })
    .catch((err) => {
      fullSetPromise = null
      throw err
    })
  return fullSetPromise
}

/** Tam set indi mi — ikon seçicisi "yükleniyor" durumunu buradan bilir. */
export function isFullIconSetLoaded() {
  return fullSet !== null
}

/**
 * Ada göre ikon arama — YALNIZCA ikon seçicisi (Ayarlar) kullanıyor.
 *
 * Tam set inmemişse kayıttaki 11 addan arar. Bu bir kısıt değil bir ara
 * durum: seçici açılışta `loadFullIconSet()` çağırıyor ve set gelince
 * yeniden çiziliyor. Boş liste döndürmek yerine elde olanı göstermek,
 * seçicinin bir an "hiç ikon yok" gibi görünmesini engelliyor.
 */
export function searchIcons(query, limit = 150) {
  const source = fullSet
    ? Object.keys(fullSet).filter((name) => name.endsWith("Icon") && Array.isArray(fullSet[name]))
    : Object.keys(REGISTRY)
  const names = source.sort()
  const q = (query || "").trim().toLowerCase().replace(/icon$/, "")
  if (!q) return names.slice(0, limit)
  const results = []
  for (const name of names) {
    if (name.toLowerCase().includes(q)) {
      results.push(name)
      if (results.length >= limit) break
    }
  }
  return results
}
