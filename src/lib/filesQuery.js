/**
 * ═══════════════════════════════════════════════════════════════════════
 *  DOSYALARIM — SORGU VE SÜZGEÇ MANTIĞI (saf: ağ yok, JSX yok)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Keşfet › Dosyalarım'ın bütün "hangi dosyalar" kararı burada, sınanabilir
 * olsun diye bileşenlerin dışında. Ağ `hooks/useFiles*.js`te.
 *
 * ⚠️ **SÜRÜCÜNÜN "SON KULLANILANLAR" UCU KULLANILMAZ** (`/me/drive` altındaki
 * `recent`). Microsoft'un belgesi: *"deprecated and will operate in a degraded
 * state until November, 2026, after which it stops returning data"*.
 * "Benimle paylaşılanlar" ucu ve `/me` altındaki `insights` uçları aynı
 * tarihte susuyor. "Son değişenler" bu yüzden arama ucundan (`/search/query`)
 * kuruluyor — belgelenmiş ve emekliye ayrılmayan tek yol. (Uç adları burada
 * bilerek yazılmıyor: spec §13 G5 bu dosyalarda o adları `grep`liyor.)
 *
 * ⚠️ **KULLANICI METNİ HAM KQL DEĞİL.** Kutuya yazılan "Satış (Q3)" ya da
 * `a:b`, KQL'de söz dizimi — ham gitseydi arama ya 400 döner ya da
 * yazılmayan bir şeyi arardı (`kqlSafe`).
 *
 * ⚠️ **SUNUCU SÜZER, İSTEMCİ YENİDEN SINAR.** Tarih süzgeci KQL'de gün
 * kaba (dizin UTC), sunucu bir türü tanımayabilir; gelen sayfa istemcide
 * aynı kuralla bir kez daha süzülüyor (`matchesFilters`). İkisinin kararı
 * ayrışırsa ekranda görünen İSTEMCİNİNKİ. ⚠️ **İSTİSNA: KİŞİ.** Sunucu kişi
 * kısıtını uyguladıysa (`personApplied`) istemci onu yeniden SINAMAZ: kısıt
 * oluşturanı da soruyor (`AuthorOWSUSER`) ve arama isabetinde kimlik alanları
 * çoğu zaman eksik — yeniden sınama sunucunun doğru döndürdüğü dosyayı atıyordu.
 *
 * ⚠️ **METİNSİZ İSTEKTE ŞABLON YOK, `*` YOK** (§7.2). Kısıtlar doğrudan
 * `queryString`e yazılır; eskiden `queryString: "*"` + şablon gidiyordu ve
 * metinsiz "son değişenler" sorgusu kiracının `*` yorumuna bağlıydı.
 *
 * Parçalar (hepsi saf): `filesTypes` tür aileleri · `filesDates` tarih ve gün
 * bantları · `filesKql` KQL · `filesRequest` istek gövdeleri ve basamak
 * denemeleri · `filesResults` sonuçlar ve konum · `filesFilter` istemci süzgeci,
 * sıralama ve adres · `filesFormat` biçim. Bu dosya yalnız birleştirir; içe
 * aktaranlar `@/lib/filesQuery`ten okumaya devam eder.
 */

export { familyOfExt, KNOWN_EXTS, TYPE_FAMILIES, typeFamily } from "@/lib/filesTypes"
export {
  DATE_PRESETS,
  DAY_BUCKETS,
  dateFloor,
  dayBucket,
  groupByDay,
  matchesDate,
} from "@/lib/filesDates"
export {
  dateKql,
  kqlPhrase,
  kqlSafe,
  pathKql,
  personKql,
  typesKql,
  typesNeedClientFilter,
} from "@/lib/filesKql"
export {
  buildSearchRequest,
  CHILD_ORDERBY,
  childrenPath,
  childrenTrials,
  SEARCH_CAPS,
  SEARCH_FIELDS,
  searchTrials,
  SEL_NARROW,
  SEL_WIDE,
  SORTS,
} from "@/lib/filesRequest"
export {
  facetFolders,
  folderOfUrl,
  joinSegments,
  locationParts,
  normaliseHit,
  parseSummary,
  typeCounts,
} from "@/lib/filesResults"
export {
  activeFilterCount,
  isCreatedByMe,
  isMine,
  isModifiedByMe,
  matchesFilters,
  matchesText,
  parseFilterParams,
  sortByModified,
  sortItems,
  writeFilterParams,
} from "@/lib/filesFilter"
export { formatBytes, formatFileTime, highlightRanges, opensExternally } from "@/lib/filesFormat"
