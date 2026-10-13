/**
 * Ad-ikon parçasının anahtarı: adın ilk iki harfi, küçük harfle ("CargoShipIcon" → "ca").
 * Küçük harf şart: "Ai…" ile "AI…" harf duyarsız dosya sisteminde (macOS) aynı dosyaya
 * yazılıp birbirini eziyordu. Derleme eklentisi (`scripts/vite/iconShards.mjs`) parçaları bu
 * anahtarla yazar, `iconRegistry` aynı anahtarla okur.
 */
export function iconShardKey(name) {
  return String(name).slice(0, 2).toLowerCase()
}
