// GitHub Pages yayını: `dist/` → `gh-pages` dalı (Pages kaynağı bu dal).
//   npm run deploy
// SPA'nın derin bağlantıları için index.html → 404.html kopyalanır; `.nojekyll`
// Pages'in dosyaları Jekyll'den geçirmesini kapatır.
import { execSync } from "node:child_process"
import { copyFileSync, writeFileSync, rmSync } from "node:fs"

const run = (cmd, opts = {}) => execSync(cmd, { stdio: "inherit", ...opts })
const remote = execSync("git remote get-url origin").toString().trim()
const sha = execSync("git rev-parse --short HEAD").toString().trim()

run("npx vite build")
copyFileSync("dist/index.html", "dist/404.html")
writeFileSync("dist/.nojekyll", "")

rmSync("dist/.git", { recursive: true, force: true })
const inDist = { cwd: "dist" }
run("git init -q -b gh-pages", inDist)
run("git add -A", inDist)
run(`git -c user.name="tyroAI deploy" -c user.email="deploy@tyroai.example" commit -q -m "deploy: ${sha}"`, inDist)
run(`git push -f "${remote}" gh-pages`, inDist)
rmSync("dist/.git", { recursive: true, force: true })
console.log(`Yayınlandı: ${sha} → gh-pages`)
