/**
 * Keşfet › Dosyalarım — POLİTİKA (tek kumanda noktası, spec §11).
 *
 * Geri almak tek satır: `enabled: false` → sekme eski Dokümanlar bento'sunu
 * (`FeedDocs`) çizer. Dosyalarım'ın Graph uçları (arama, `path:` kapsamı,
 * `remoteItem`, politika klasörünün yol adreslemesi, ekipler) CANLI
 * KİRACIDA ÖLÇÜLMEDİ; her biri kendi basamağıyla düşüyor ama sahada
 * beklenmedik bir şey çıkarsa bu anahtar sekmeyi anında eski hâline döndürür.
 *
 * Sayılar kancaların ve görünümlerin OKUDUĞU değerler — kopyası başka yerde
 * yazılmaz (bir sayfa boyunu iki yerde tutmak, ikisinin sessizce ayrışması):
 *
 *   pageFirst · pageNext · maxResults   arama: ilk sayfa 25, "daha fazla" +50, tavan 500
 *   childrenTop                         klasör listesinin sayfa boyu ($top)
 *   debounceMs · minQuery               kutu: 350 ms bekleme, en az 2 karakter
 *   folderBand                          aramada "Klasörler" bandı (klasör sorgusu boyu)
 *   homeFolders · resultFolders         "sık kullandığın" / "sonuçların bulunduğu" klasör çipi tavanı
 *   quickSites                          Hızlı erişimdeki takip edilen site hapı sayısı
 *   teamsVisible                        SharePoint kökünde ilk açılışta görünen ekip sayısı
 *   teams                               ekipler (`/me/memberOf`) — `false` → hiç sorulmaz
 */
export const FILES_PAGE = Object.freeze({
  enabled: true,
  teams: true,
  pageFirst: 25,
  pageNext: 50,
  maxResults: 500,
  childrenTop: 200,
  debounceMs: 350,
  minQuery: 2,
  folderBand: 6,
  homeFolders: 6,
  resultFolders: 8,
  quickSites: 4,
  teamsVisible: 12,
})

/** Eski ad — `FeedPage` bugün bunu okuyor; ikisi AYNI nesne (kapatınca ikisi birden kapanır). */
export const FILES_TAB = FILES_PAGE
