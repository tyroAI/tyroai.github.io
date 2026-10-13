import { execFileSync } from "node:child_process"

// Güncelleme kartının karşılaştırdığı pencere: en yeni bu kadar kayıt.
const NOTES = 12

/** Derlemenin kimliği: CI'da commit SHA'sı, yerelde HEAD, git yoksa "dev". */
function buildSha() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim()
  } catch {
    return "dev"
  }
}

/** Herkese açık, düzeltme olmayan en yeni Yenilikler kayıtları (kartta gösterilebilenler). */
async function releaseNotes() {
  const { CHANGELOG } = await import(new URL("../../src/data/changelog.js", import.meta.url))
  return CHANGELOG.filter((e) => e.audience !== "admins" && e.kind !== "fix")
    .slice(0, NOTES)
    .map(({ id, kind, title, to, route }) => ({ id, kind, title, to, route }))
}

/**
 * Derleme kimliği. HTML'e `<meta name="tyro-build">` (deploy'un duman testi canlıdaki sürümü
 * bununla tanır), kökte `version.json` (sha, zaman, en yeni kayıtlar — "Yeni sürüm hazır"
 * kartı yeni sürümde ne olduğunu buradan okur) ve pakete `import.meta.env.TYRO_BUILD`
 * (çalışan sürümün bildiği kayıtlar: kart yalnız yenilerini gösterir). SHA sır değil.
 */
export function buildInfo() {
  const sha = buildSha()
  const builtAt = new Date().toISOString()
  let notes = []
  return {
    name: "tyro-build-info",
    async config() {
      notes = await releaseNotes()
      const info = { sha: sha.slice(0, 12), builtAt, seen: notes.map((n) => n.id) }
      return { define: { "import.meta.env.TYRO_BUILD": JSON.stringify(info) } }
    },
    transformIndexHtml() {
      return [
        {
          tag: "meta",
          attrs: { name: "tyro-build", content: sha.slice(0, 12) },
          injectTo: "head",
        },
      ]
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({ sha, builtAt, notes }),
      })
    },
  }
}
