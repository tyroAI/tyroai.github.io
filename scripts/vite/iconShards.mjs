import { readFileSync } from "node:fs"
import { iconShardKey } from "../../src/lib/iconShard.js"

const PKG = new URL("../../node_modules/@hugeicons/core-free-icons/package.json", import.meta.url)

/**
 * Katalog ikonları adla çözülüyor (Dataverse'teki `iconName`). Paketteki seçili listede
 * (`lib/iconRegistry`) olmayan bir ad için bütün seti (6758 ikon, ~1,36 MB gz) indirmek yerine
 * yalnız adın ilk iki harfinin parçası iner (en büyüğü ~45 KB gz):
 * `icons/<paket sürümü>/<anahtar>.json`. Yol pakete `import.meta.env.TYRO_ICON_SHARDS` ile
 * yazılır; sürüm yolda olduğu için paket güncellenince eski parça önbellekten okunmaz.
 * Dev'de parça dosyası yok: kayıt defteri orada tam seti kullanır.
 */
export function iconShards() {
  const version = JSON.parse(readFileSync(PKG, "utf8")).version
  const base = `icons/${version}/`
  return {
    name: "tyro-icon-shards",
    config(_, { command }) {
      // Yalnız derlemede: dev sunucusunda parça dosyası yok.
      if (command !== "build") return undefined
      return { define: { "import.meta.env.TYRO_ICON_SHARDS": JSON.stringify(base) } }
    },
    async generateBundle() {
      const icons = await import("@hugeicons/core-free-icons")
      const shards = {}
      for (const [name, data] of Object.entries(icons)) {
        if (!name.endsWith("Icon") || !Array.isArray(data)) continue
        ;(shards[iconShardKey(name)] ??= {})[name] = data
      }
      for (const [key, set] of Object.entries(shards)) {
        this.emitFile({
          type: "asset",
          fileName: `${base}${key}.json`,
          source: JSON.stringify(set),
        })
      }
    },
  }
}
