/**
 * ═══════════════════════════════════════════════════════════════════════
 *  KEŞFET › DOKÜMANLAR — içerik kataloğu (DEMO: Vega Global, kurgusal)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ⚠️ **NEDEN `strings.*.js` DEĞİL.** Orası ARAYÜZ metnidir; bu bir İÇERİK
 * kataloğu — `promptCatalogue.js` ve `changelog.js` ile aynı sınıf. Buradaki
 * adlar kurumun kendi klasör ve belge adları: ÇEVRİLMEZ.
 *
 * ⚠️ **DEMO.** Görseller uygulamanın kendi kökeninde (`public/demo/brand/`)
 * duruyor, hiçbir CDN'e gidilmez. Politika klasörleri kurgusal
 * `vegaglobal.sharepoint.example` adresinde; Graph uçları demo katmanında
 * (`src/demo/handlers/graph-files.js`) cevaplanıyor.
 */

const BASE = import.meta.env?.BASE_URL || "/"
const ORIGIN = typeof window !== "undefined" ? window.location.origin : ""

/** Kurumsal görsellerin kökü — aynı köken. */
const ASSETS = `${ORIGIN}${BASE.endsWith("/") ? BASE : `${BASE}/`}demo/brand`

/** `"Dosya_Adı.svg"` → `{ id, name, url }`. Ad uzantısız, adres kodlanmış. */
function asset(file) {
  return {
    id: file,
    name: file.replace(/\.[^.]+$/, ""),
    url: `${ASSETS}/${encodeURIComponent(file)}`,
  }
}

/** KURUMSAL DOKÜMANLAR — klasör → görsel. */
export const DOC_FOLDERS = [
  {
    id: "imza-bannerlari",
    name: "E-posta İmza Bannerları",
    files: ["Imza_Banner_Kis_Kampanyasi.svg", "Imza_Banner_Fuar_2026.svg"].map(asset),
  },
  {
    id: "tebrik-kartlari",
    name: "Kurumsal Tebrik Kartları",
    files: ["Bayram_Tebrik_TR_1.svg", "Bayram_Tebrik_TR_2.svg", "Yeni_Yil_Tebrik_2027.svg"].map(
      asset,
    ),
  },
  {
    id: "teams-arka-planlar",
    name: "Teams Arka Planları",
    files: [
      "Vega_Teams_Arkaplan_Gradyan.svg",
      "Vega_Teams_Arkaplan_Ofis.svg",
      "Vega_Teams_Arkaplan_10_Yil.svg",
      "Vega_Teams_Arkaplan_Minimal.svg",
    ].map(asset),
  },
  {
    id: "sunum-kapaklari",
    name: "Sunum Kapak Görselleri",
    files: ["Sunum_Kapak_Mavi.svg", "Sunum_Kapak_Acik.svg"].map(asset),
  },
]

/** ORGANİZASYON ŞEMASI — aynı kökende statik sayfa. */
export const ORG_CHART_URL = `${ORIGIN}${BASE.endsWith("/") ? BASE : `${BASE}/`}demo/org-chart.html`

const POLICY_SITE = "https://vegaglobal.sharepoint.example/sites/ik-politikalar"
const policyUrl = (company) =>
  `${POLICY_SITE}/Shared%20Documents/Forms/AllItems.aspx?id=${encodeURIComponent(
    `/sites/ik-politikalar/Shared Documents/Politika-Prosedurler/${company}`,
  )}`

/**
 * POLİTİKA VE PROSEDÜRLER — İK & Politikalar sitesindeki şirket klasörleri.
 * Adres hem Graph'ın çözdüğü yol (`lib/corporateFiles.js` → `policyTarget`)
 * hem de okuma düşerse gösterilen yedek bağlantı.
 */
export const POLICY_FOLDERS = [
  { id: "genel", name: "Vega Global (Genel)", url: policyUrl("Vega Global (Genel)") },
  { id: "perakende", name: "Vega Perakende Çözümleri", url: policyUrl("Vega Perakende Çözümleri") },
  { id: "lojistik", name: "Vega Lojistik", url: policyUrl("Vega Lojistik") },
  { id: "dijital", name: "Vega Dijital", url: policyUrl("Vega Dijital") },
]
