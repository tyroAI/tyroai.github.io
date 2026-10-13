import { Component } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon"
import { Button } from "@/components/ui/button"
import { LocaleContext } from "@/providers/LocaleProvider"
import { cn } from "@/lib/utils"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  HATA SINIRI — iki katman, tek bileşen
 * ═══════════════════════════════════════════════════════════════════════
 *
 *   scope="page" → App.jsx'te `<Routes>`u sarar. Sayfa çökse de sidebar,
 *                  header ve sohbet rıhtımı ayakta kalır; rota değişince
 *                  sınır kendini sıfırlar (`resetKey`).
 *   scope="app"  → main.jsx'te EN DIŞTA: sağlayıcılar dahil her şeyin son
 *                  savunması. Router'ın ve LocaleProvider'ın DIŞINDA — `t`
 *                  yok (Türkçe sabitler), `navigate` yok (tam sayfa geçişi),
 *                  `.dark` sınıfı da hiç yazılmamış olabilir.
 *
 * ⚠️ Bundan önce uygulamada HİÇ sınır yoktu: React 19'da yakalanmayan bir
 * render hatası kök ağacı söküyor ve açılış bekçisi (index.html)
 * `__tyroBootOk()`tan sonra devrede değil — sonuç kalıcı boş ekrandı.
 *
 * Yakalamadıkları (React kuralı): olay işleyicileri, zamanlayıcılar ve
 * reddedilen Promise'ler. Onlar kendi `catch`lerinde kalır.
 */

/** LocaleProvider yokken çizilen metin — `strings.tr.js` ile BİREBİR aynı. */
const TR = {
  "error.boundary.title": "Bu sayfa açılamadı",
  "error.boundary.appTitle": "TYRO AI bir hatayla karşılaştı",
  "error.boundary.body": "Beklenmedik bir hata oluştu. Sayfayı yenilemek çoğu zaman sorunu çözer.",
  "error.boundary.chunkBody":
    "Sayfanın bir parçası yüklenemedi. Yeni bir sürüm yayımlanmış ya da bağlantın kesilmiş olabilir.",
  "error.boundary.reload": "Sayfayı yenile",
  "error.boundary.home": "Anasayfa'ya dön",
  "error.boundary.details": "Teknik ayrıntı",
  "error.boundary.reloading": "Sayfa yenileniyor…",
}

/** main.jsx'in redirect sonrası kullandığı adresle aynı kurgu. */
const HOME_HREF = `${import.meta.env.BASE_URL}myspace`

/** Panelde gösterilen mesajın tavanı: Graph/Dataverse gövdeleri uzun olabiliyor. */
const MAX_MESSAGE = 600

/**
 * Bayat parça imzaları — Chrome/Edge · Firefox · Safari · Vite'ın CSS ön
 * yüklemesi (`Unable to preload CSS`, dist'teki yardımcıda doğrulandı).
 * ⚠️ "Unexpected token '<'" BİLEREK YOK: HTML dönen bir fetch'in JSON.parse
 * hatası da böyle görünür ve yenilemek onu düzeltmez.
 */
const CHUNK_ERROR_RE =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS/i

function isChunkLoadError(error) {
  try {
    return CHUNK_ERROR_RE.test(String(error?.message ?? ""))
  } catch {
    return false
  }
}

/** Sekme başına, SÜRÜM başına tek otomatik yenileme (bkz. reloadOnceForChunkError). */
const CHUNK_RELOAD_KEY = "tyro-chunk-reload"
let reloadScheduled = false

/** Çalışan paketin kimliği: giriş betiğinin hash'li adresi, her deploy'da değişir. */
function currentBuildId() {
  try {
    return document.querySelector('script[type="module"][src]')?.src || "unknown"
  } catch {
    return "unknown"
  }
}

/**
 * Deploy sonrası bayat parça → sayfayı BİR KEZ yenile. `true` = yenileme başladı.
 *
 * ⚠️ İşaret zaman değil SÜRÜM tutar. Aynı paketle yenilenip yine düşülürse
 * (HTML önbellekten geldi ya da deploy gerçekten bozuk) ikinci tur YOK →
 * panel; yavaş bir döngü bile kurulamaz. Yeni deploy yeni kimlik demek:
 * sabahtan akşama açık kalan sekme her sürümde bir kez kendini onarır.
 * ⚠️ İşaret yazılamıyorsa hiç denenmez (index.html bekçisinin kuralı):
 * sonsuz yenileme döngüsü panelden beterdir. Çevrimdışıyken de denenmez.
 */
function reloadOnceForChunkError() {
  if (reloadScheduled) return true
  if (typeof navigator !== "undefined" && navigator.onLine === false) return false
  const build = currentBuildId()
  try {
    if (window.sessionStorage.getItem(CHUNK_RELOAD_KEY) === build) return false
    window.sessionStorage.setItem(CHUNK_RELOAD_KEY, build)
  } catch {
    return false
  }
  reloadScheduled = true
  window.location.reload()
  return true
}

/**
 * TELEMETRİ KANCASI — bugün yalnız konsol. Dış bir servis bağlanacaksa
 * değişecek TEK yer burası.
 * ⚠️ Senkron kalmalı (gerekirse `navigator.sendBeacon`): bayat parçada hemen
 * ardından sayfa yenileniyor ve bekleyen bir fetch onunla ölür.
 * Not: React 19 üretimde yakalanan hatayı zaten bir kez `console.error`
 * ile basıyor (`defaultOnCaughtError`); bu satır bağlamı ekliyor.
 */
function reportBoundaryError(error, context) {
  console.error(`[ErrorBoundary:${context.scope}]`, error, context)
}

/** Yalnız mesaj satırı — yığın üretimde gösterilmez. Atılan şey Error olmayabilir. */
function messageOf(error) {
  try {
    const text = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    return text.length > MAX_MESSAGE ? `${text.slice(0, MAX_MESSAGE)}…` : text
  } catch {
    // `String(Object.create(null))` bile fırlatır; panel bunun yüzünden düşmesin.
    return "Unknown error"
  }
}

function isAtHome() {
  try {
    return window.location.pathname.replace(/\/+$/, "") === HOME_HREF.replace(/\/+$/, "")
  } catch {
    return false
  }
}

/**
 * scope="app": ThemeProvider sökülmüş, ilk render'da çöktüyse `.dark` hiç
 * yazılmamış olabilir — açılış panelinin okuduğu yerden okunur.
 */
function prefersDark() {
  try {
    // Seçim yoksa açık: ThemeProvider'ın varsayılanı (sistem tercihi izlenmez).
    return window.localStorage.getItem("tyro-theme") === "dark"
  } catch {
    return false
  }
}

const INITIAL = { didCatch: false, error: null, reloading: false, componentStack: null }

/**
 * Props:
 *   scope     "page" (varsayılan) | "app"
 *   resetKey  değişince hata durumu sıfırlanır — App'te `location.pathname`
 *   onHome    "Anasayfa'ya dön" için SPA geçişi; verilmezse tam sayfa geçişi
 */
export class ErrorBoundary extends Component {
  // `useLocale` sağlayıcı yokken FIRLATIR; bağlamı doğrudan okumak `null` verir.
  static contextType = LocaleContext

  state = INITIAL

  static getDerivedStateFromError(error) {
    // Saf kalmalı — yenileme (yan etki) componentDidCatch'te.
    return { didCatch: true, error, reloading: isChunkLoadError(error) }
  }

  componentDidCatch(error, info) {
    const chunk = isChunkLoadError(error)
    reportBoundaryError(error, {
      scope: this.props.scope ?? "page",
      kind: chunk ? "chunk" : "render",
      path: window.location.pathname,
      componentStack: info?.componentStack ?? null,
    })
    // Yenilenemiyorsa (aynı sürümde denendi / çevrimdışı) panel çizilir.
    // Commit içindeki setState boyamadan önce işlenir: ara hâl görünmez.
    this.setState({
      reloading: chunk && reloadOnceForChunkError(),
      componentStack: import.meta.env.DEV ? (info?.componentStack ?? null) : null,
    })
  }

  componentDidUpdate(prevProps, prevState) {
    // ⚠️ `key` DEĞİL `resetKey`: sağlıklı ağaç her rota değişiminde yeniden
    // kurulmasın. `prevState.didCatch` şartı: hatayı doğuran render anahtarı
    // da değiştirdiyse ilk güncellemede sıfırlayıp aynı hatayı yeniden
    // fırlatmasın.
    if (
      this.state.didCatch &&
      prevState.didCatch &&
      !Object.is(prevProps.resetKey, this.props.resetKey)
    ) {
      this.setState(INITIAL)
    }
  }

  /** `t` varsa onu, yoksa Türkçe sabiti kullanır; çeviri hatası paneli düşürmez. */
  text(key) {
    const fallback = TR[key]
    try {
      const t = this.context?.t
      return typeof t === "function" ? t(key, fallback) : fallback
    } catch {
      return fallback
    }
  }

  reload = () => {
    window.location.reload()
  }

  goHome = () => {
    // Sayfa sınırı SPA ile gider: kabuk ve akan sohbet cevabı ölmez, rota
    // değişince sınır kendini sıfırlar. Kök sınırda router yok → tam geçiş.
    if (typeof this.props.onHome === "function") this.props.onHome()
    else window.location.assign(HOME_HREF)
  }

  render() {
    const { didCatch, error, reloading, componentStack } = this.state
    if (!didCatch) return this.props.children

    const isApp = this.props.scope === "app"
    const shell = cn(
      "flex flex-col items-center justify-center px-4 py-10",
      isApp
        ? "min-h-[100dvh] w-full bg-background text-foreground"
        : "notch-gutter min-h-0 flex-1 overflow-y-auto",
      isApp && prefersDark() && "dark",
    )

    if (reloading) {
      return (
        <div role="status" className={shell}>
          <p className="text-[0.8125rem] text-muted-foreground">
            {this.text("error.boundary.reloading")}
          </p>
        </div>
      )
    }

    const chunk = isChunkLoadError(error)
    // Yığın yalnız geliştirmede; üretimde panel yalnız mesaj satırını taşır.
    const stack = import.meta.env.DEV
      ? [error?.stack, componentStack].filter(Boolean).join("\n\n")
      : ""

    return (
      <div className={shell}>
        <div
          role="alert"
          className="w-full max-w-md rounded-2xl border border-border bg-card px-6 py-10 text-center"
        >
          <HugeiconsIcon
            icon={Alert02Icon}
            className="mx-auto mb-3 size-8 text-muted-foreground/40"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <h2 className="text-[0.9375rem] font-medium text-foreground">
            {this.text(isApp ? "error.boundary.appTitle" : "error.boundary.title")}
          </h2>
          <p className="mx-auto mt-1.5 max-w-sm text-[0.8125rem] leading-relaxed text-muted-foreground">
            {this.text(chunk ? "error.boundary.chunkBody" : "error.boundary.body")}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Button
              type="button"
              onClick={this.reload}
              className="h-9 rounded-lg bg-brand-fill-deep px-4 text-[0.8125rem] font-semibold text-brand-on-brand hover:bg-brand-fill-deep hover:brightness-110 [@media(pointer:coarse)]:min-h-11"
            >
              {this.text("error.boundary.reload")}
            </Button>
            {/* Zaten Anasayfa'daysa ikinci bir "yenile" olurdu — gizli. */}
            {!isAtHome() && (
              <Button
                type="button"
                variant="outline"
                onClick={this.goHome}
                className="h-9 rounded-lg px-4 text-[0.8125rem] [@media(pointer:coarse)]:min-h-11"
              >
                {this.text("error.boundary.home")}
              </Button>
            )}
          </div>
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-center text-[0.75rem] text-muted-foreground transition-colors hover:text-foreground">
              {this.text("error.boundary.details")}
            </summary>
            <p className="mt-2 rounded-lg bg-muted/50 px-3 py-2 font-mono text-[0.6875rem] leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
              {messageOf(error)}
            </p>
            {stack && (
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/50 px-3 py-2 font-mono text-[0.625rem] leading-relaxed text-muted-foreground">
                {stack}
              </pre>
            )}
          </details>
        </div>
      </div>
    )
  }
}
