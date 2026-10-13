// Demo dosya evreni — OneDrive, SharePoint siteleri, kitaplıklar, ekipler.
// TÜMÜ KURGUSAL: Vega Global'in satış müdürü Deniz Arslan'ın gördüğü dosyalar.
// Adresler `.example` alanında (RFC 2606); hiçbir gerçek kiracıya çözülmez.
//
// Ağaç bir kez kurulur, ama TARİHLER saklanmaz: her öğe "kaç gün önce"
// (`d`, `c`) taşır ve Graph biçimine çevrilirken o anın saatine göre
// hesaplanır — demo hangi gün açılırsa açılsın "2 saat önce" doğru kalır.

import { findPerson, ME } from "../persona"

export const SP_HOST = "vegaglobal.sharepoint.example"
export const MY_HOST = "vegaglobal-my.sharepoint.example"
export const SP_ORIGIN = `https://${SP_HOST}`
export const MY_ORIGIN = `https://${MY_HOST}`

const DAY = 86400000

/** Adres yolunu (çözülmüş) web adresine çevirir: boşluk ve Türkçe harfler kodlanır. */
export function urlOf(origin, decodedPath) {
  return `${origin}${encodeURI(decodedPath)}`
}

/** Kısa, kararlı kimlik: aynı yol her yüklemede aynı kimliği alır. */
function hashId(s) {
  let h = 5381
  for (let i = 0; i < s.length; i += 1) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0
  return h.toString(36).toUpperCase().padStart(7, "0")
}

/* ─────────────────────────── siteler ─────────────────────────── */

const g = (n) => `5c7e${String(n).padStart(4, "0")}-1a2b-4c3d-8e9f-0a1b2c3d4e5f`
const w = (n) => `9d40${String(n).padStart(4, "0")}-6b7c-4d8e-9f0a-1b2c3d4e5f60`
const siteId = (n) => `${SP_HOST},${g(n)},${w(n)}`

/**
 * `followed`: kullanıcının takip ettikleri (Hızlı erişim). `group`: sitenin
 * arkasındaki Microsoft 365 grubu (ekiplerde görünür).
 */
export const SITES = [
  {
    key: "root",
    id: siteId(1),
    name: "intranet",
    displayName: "Vega Global İntranet",
    description: "Şirket duyuruları, şablonlar ve ofis rehberleri",
    path: "",
    root: true,
    created: 1400,
  },
  {
    key: "satis",
    id: siteId(2),
    name: "satis",
    displayName: "Satış Ekibi",
    description: "Satış ekibinin ortak çalışma alanı — fiyatlandırma, raporlar, teklifler",
    path: "/sites/satis",
    followed: true,
    group: "satis",
    created: 900,
  },
  {
    key: "pazarlama",
    id: siteId(3),
    name: "pazarlama",
    displayName: "Pazarlama",
    description: "Kampanyalar, marka varlıkları ve etkinlik planları",
    path: "/sites/pazarlama",
    followed: true,
    group: "pazarlama",
    created: 870,
  },
  {
    key: "urun",
    id: siteId(4),
    name: "urun-katalogu",
    displayName: "Ürün Kataloğu",
    description: "Güncel ürün bilgi formları, katalog ve yol haritası",
    path: "/sites/urun-katalogu",
    followed: true,
    created: 640,
  },
  {
    key: "ik",
    id: siteId(5),
    name: "ik-politikalar",
    displayName: "İK & Politikalar",
    description: "Şirket politikaları, prosedürler ve İK formları",
    path: "/sites/ik-politikalar",
    followed: true,
    created: 1200,
  },
  {
    key: "q4",
    id: siteId(6),
    name: "q4-buyuk-musteriler",
    displayName: "Q4 Büyük Müşteriler Projesi",
    description: "Q4 stratejik müşteri fırsatları için proje alanı",
    path: "/sites/q4-buyuk-musteriler",
    group: "q4",
    created: 40,
  },
  {
    key: "bolge",
    id: siteId(7),
    name: "bolge-satis",
    displayName: "Bölge Satış Yöneticileri",
    description: "Bölge yöneticilerinin aylık hedef ve performans takibi",
    path: "/sites/bolge-satis",
    group: "bolge",
    created: 300,
  },
]

export const siteByKey = (key) => SITES.find((s) => s.key === key) ?? null
export const siteById = (id) => SITES.find((s) => s.id === id) ?? null
export const siteWebUrl = (s) => urlOf(SP_ORIGIN, s.path || "/")
// Kök sitenin adresi alan adının kendisi (sonda eğik çizgi yok).
export const siteUrl = (s) => (s.root ? SP_ORIGIN : siteWebUrl(s))

/* ─────────────────────────── gruplar ─────────────────────────── */

export const GROUPS = [
  {
    key: "satis",
    id: "7b1f2a10-3c4d-4e5f-8a9b-0c1d2e3f4a51",
    displayName: "Satış Ekibi",
    description: "Vega Global satış ekibi",
    mailNickname: "satis-ekibi",
    drive: "drv-sp-satis",
  },
  {
    key: "pazarlama",
    id: "7b1f2a10-3c4d-4e5f-8a9b-0c1d2e3f4a52",
    displayName: "Pazarlama",
    description: "Pazarlama ekibi ve kampanya koordinasyonu",
    mailNickname: "pazarlama",
    drive: "drv-sp-pazarlama",
  },
  {
    key: "q4",
    id: "7b1f2a10-3c4d-4e5f-8a9b-0c1d2e3f4a53",
    displayName: "Q4 Büyük Müşteriler Projesi",
    description: "Altay, Nordis ve Ekinoks fırsatları için çalışma grubu",
    mailNickname: "q4-buyuk-musteriler",
    drive: "drv-sp-q4",
  },
  {
    key: "bolge",
    id: "7b1f2a10-3c4d-4e5f-8a9b-0c1d2e3f4a54",
    displayName: "Bölge Satış Yöneticileri",
    description: "Marmara, Ege ve İç Anadolu bölge yöneticileri",
    mailNickname: "bolge-satis",
    drive: "drv-sp-bolge",
  },
  {
    key: "tum",
    id: "7b1f2a10-3c4d-4e5f-8a9b-0c1d2e3f4a55",
    displayName: "Vega Global Tüm Çalışanlar",
    description: "Şirket geneli duyuru grubu",
    mailNickname: "tum-calisanlar",
    drive: "drv-sp-root",
  },
]

/** `/me/memberOf` gerçekçi olsun: Microsoft 365 grubu olmayan üyelikler de var (süzülüyorlar). */
export const OTHER_MEMBERSHIPS = [
  {
    "@odata.type": "#microsoft.graph.group",
    id: "7b1f2a10-3c4d-4e5f-8a9b-0c1d2e3f4a60",
    displayName: "SG-CRM-Satis-Kullanicilari",
    description: "CRM satış lisansı güvenlik grubu",
    groupTypes: [],
    securityEnabled: true,
    mailEnabled: false,
  },
  {
    "@odata.type": "#microsoft.graph.group",
    id: "7b1f2a10-3c4d-4e5f-8a9b-0c1d2e3f4a61",
    displayName: "DL-Satis-Yoneticileri",
    description: "Satış yöneticileri dağıtım listesi",
    groupTypes: [],
    securityEnabled: false,
    mailEnabled: true,
  },
]

/* ─────────────────────────── sürücüler ─────────────────────────── */

const personal = (local) => `/personal/${local}_vegaglobal_example/Documents`

/**
 * Sürücüler. `owner`: kişi kimliği (OneDrive) ya da site anahtarı (kitaplık).
 * `base`: sürücünün kökünün ÇÖZÜLMÜŞ adres yolu.
 */
export const DRIVES = [
  {
    id: "b!vg-od-deniz",
    name: "OneDrive",
    driveType: "business",
    origin: MY_ORIGIN,
    base: personal("deniz_arslan"),
    person: "u-deniz",
    quota: { total: 1099511627776, used: 41875931136 },
  },
  {
    id: "b!vg-od-ece",
    name: "OneDrive",
    driveType: "business",
    origin: MY_ORIGIN,
    base: personal("ece_yildiz"),
    person: "u-ece",
  },
  {
    id: "b!vg-od-mert",
    name: "OneDrive",
    driveType: "business",
    origin: MY_ORIGIN,
    base: personal("mert_kaya"),
    person: "u-mert",
  },
  {
    id: "b!vg-od-kerem",
    name: "OneDrive",
    driveType: "business",
    origin: MY_ORIGIN,
    base: personal("kerem_ozturk"),
    person: "u-kerem",
  },
  {
    id: "drv-sp-root",
    name: "Belgeler",
    driveType: "documentLibrary",
    origin: SP_ORIGIN,
    base: "/Shared Documents",
    site: "root",
  },
  {
    id: "drv-sp-satis",
    name: "Belgeler",
    driveType: "documentLibrary",
    origin: SP_ORIGIN,
    base: "/sites/satis/Shared Documents",
    site: "satis",
    description: "Satış ekibinin ortak belgeleri",
  },
  {
    id: "drv-sp-teklif",
    name: "Teklifler ve Sözleşmeler",
    driveType: "documentLibrary",
    origin: SP_ORIGIN,
    base: "/sites/satis/Teklifler",
    site: "satis",
    description: "Müşteri teklifleri ve imzalı sözleşmeler",
  },
  {
    id: "drv-sp-pazarlama",
    name: "Belgeler",
    driveType: "documentLibrary",
    origin: SP_ORIGIN,
    base: "/sites/pazarlama/Shared Documents",
    site: "pazarlama",
  },
  {
    id: "drv-sp-urun",
    name: "Belgeler",
    driveType: "documentLibrary",
    origin: SP_ORIGIN,
    base: "/sites/urun-katalogu/Shared Documents",
    site: "urun",
  },
  {
    id: "drv-sp-ik",
    name: "Belgeler",
    driveType: "documentLibrary",
    origin: SP_ORIGIN,
    base: "/sites/ik-politikalar/Shared Documents",
    site: "ik",
  },
  {
    id: "drv-sp-q4",
    name: "Belgeler",
    driveType: "documentLibrary",
    origin: SP_ORIGIN,
    base: "/sites/q4-buyuk-musteriler/Shared Documents",
    site: "q4",
  },
  {
    id: "drv-sp-bolge",
    name: "Belgeler",
    driveType: "documentLibrary",
    origin: SP_ORIGIN,
    base: "/sites/bolge-satis/Shared Documents",
    site: "bolge",
  },
]

export const MY_DRIVE_ID = "b!vg-od-deniz"
export const driveById = (id) => DRIVES.find((d) => d.id === id) ?? null
export const drivesOfSite = (key) => DRIVES.filter((d) => d.site === key)
export const driveWebUrl = (d) => urlOf(d.origin, d.base)

/* ─────────────────────────── ağaç DSL ─────────────────────────── */

/**
 * Dosya: `F(ad, { d, by, c, cby, size, viewed, k })`
 *   d       son değişiklik — kaç gün önce (0.1 ≈ 2,4 saat)
 *   by      son değiştiren kişi kimliği (varsayılan: Deniz)
 *   c/cby   oluşturulma / oluşturan (varsayılan: d+ birkaç gün, `by`)
 *   size    bayt (verilmezse türüne göre)
 *   viewed  Deniz'in en son açtığı an (gün) — "son kullanılanlar" için
 *   k       içerik anahtarı (`files-content.js`); yoksa addan üretilir
 * Klasör: `D(ad, [çocuklar], { by, c })`
 */
const F = (name, o = {}) => ({ kind: "file", name, ...o })
const D = (name, children = [], o = {}) => ({ kind: "folder", name, children, ...o })

const ME_ID = ME.id

const TREES = {
  "b!vg-od-deniz": [
    D("Satış Planlama", [
      F("Q4 Satış Tahmini.xlsx", { d: 0.09, k: "q4forecast", size: 186204, c: 21, viewed: 0.05 }),
      F("Pipeline Analizi - Ekim.xlsx", { d: 1.1, k: "pipeline", size: 142380, c: 12 }),
      F("2027 Bütçe Taslağı - Satış.xlsx", { d: 3.2, size: 98812, c: 9 }),
      F("Bölge Hedefleri 2026.xlsx", { d: 18, size: 64210, c: 260 }),
      F("Komisyon Hesaplama Modeli.xlsx", {
        d: 9.4,
        by: "u-burak",
        cby: ME_ID,
        size: 77105,
        c: 120,
      }),
    ]),
    D("Müşteriler", [
      D("Altay Perakende", [
        F("Altay Perakende - Teklif v3.docx", {
          d: 0.32,
          k: "altayOffer",
          size: 254771,
          c: 14,
          viewed: 0.3,
        }),
        F("Altay Perakende - Teklif v2.docx", { d: 6.3, size: 241205, c: 15 }),
        F("Altay - Toplantı Notları.docx", { d: 2.1, size: 38411, c: 2.1 }),
        F("Altay Perakende - Fiyat Karşılaştırma.xlsx", {
          d: 4.2,
          by: "u-ece",
          cby: "u-ece",
          size: 58710,
        }),
      ]),
      D("Nordis Lojistik", [
        F("Nordis Lojistik Sözleşme Taslağı.docx", {
          d: 0.95,
          by: "u-baris",
          cby: ME_ID,
          k: "nordisContract",
          size: 312406,
          c: 11,
          viewed: 0.6,
        }),
        F("Nordis - Hizmet Seviyesi Ekleri.pdf", {
          d: 5.1,
          by: "u-baris",
          cby: "u-baris",
          size: 488120,
        }),
        F("Nordis Lojistik - Rota Optimizasyonu Sunumu.pptx", {
          d: 12.3,
          by: "u-mert",
          cby: "u-mert",
          size: 4120944,
        }),
      ]),
      D("Ekinoks Enerji", [
        F("Ekinoks Enerji - İhtiyaç Analizi.docx", {
          d: 8.2,
          by: "u-mert",
          cby: ME_ID,
          size: 66320,
        }),
        F("Ekinoks - Teknik Şartname.pdf", { d: 16, by: "u-mert", cby: "u-mert", size: 1288004 }),
      ]),
      D("Pera Otelcilik", [
        F("Pera Otelcilik - Yenileme Teklifi.docx", {
          d: 15.2,
          by: "u-selin",
          cby: ME_ID,
          size: 118400,
        }),
      ]),
      D("Toros Tekstil", [
        F("Toros Tekstil - Ödeme Planı.xlsx", { d: 10.4, by: "u-can", cby: ME_ID, size: 41522 }),
      ]),
      D("Orion Medikal", [
        F("Orion Medikal - Demo Ajandası.docx", {
          d: 7.3,
          by: "u-zeynep",
          cby: "u-zeynep",
          size: 29876,
        }),
      ]),
    ]),
    D("Sunumlar", [
      F("Bölge Performans Sunumu - Ekim.pptx", {
        d: 0.78,
        k: "regionDeck",
        size: 6820144,
        c: 6,
        viewed: 0.7,
      }),
      F("Satış Kick-off 2027 - Taslak.pptx", { d: 4.1, size: 9402213, c: 8 }),
      F("Yönetim Kurulu Satış Özeti - Q3.pptx", { d: 25, size: 5544120, c: 31 }),
      F("Müşteri Sunumu Şablonu.pptx", { d: 41, by: "u-ayse", cby: "u-ayse", size: 3140221 }),
    ]),
    D("Raporlar", [
      F("Haftalık Satış Raporu - Hafta 41.xlsx", { d: 0.55, k: "weekly", size: 88120, c: 0.6 }),
      F("Haftalık Satış Raporu - Hafta 40.xlsx", { d: 7.5, size: 86034, c: 7.6 }),
      F("Haftalık Satış Raporu - Hafta 39.xlsx", { d: 14.5, size: 85710, c: 14.6 }),
      F("CRM Veri Kalitesi Raporu.xlsx", { d: 11.2, by: "u-burak", cby: "u-burak", size: 133906 }),
      F("Müşteri Memnuniyeti Anketi - Q3.pdf", {
        d: 20.1,
        by: "u-onur",
        cby: "u-onur",
        size: 942330,
      }),
    ]),
    D("Kampanyalar", [
      F("Kampanya Lead Listesi.csv", {
        d: 1.45,
        by: "u-zeynep",
        cby: ME_ID,
        k: "leads",
        size: 24890,
        c: 5,
      }),
      F("Kış Kampanyası - Brief.docx", { d: 9.1, by: "u-ayse", cby: ME_ID, size: 52108 }),
      F("Webinar Katılımcıları - Eylül.csv", {
        d: 22.4,
        by: "u-zeynep",
        cby: "u-zeynep",
        size: 11240,
      }),
    ]),
    D("Toplantı Notları", [
      F("1-1 Notları - Ekip.docx", { d: 2.2, k: "oneOnOne", size: 44120, c: 90 }),
      F("Satış Toplantısı Notları - 6 Ekim.docx", { d: 7.1, size: 31002 }),
      F("Satış Kick-off Ajandası.pdf", {
        d: 5.2,
        by: "u-kerem",
        cby: "u-kerem",
        k: "kickoff",
        size: 412880,
        viewed: 1.3,
      }),
    ]),
    D("Kişisel", [
      F("İzin Planı 2026.xlsx", { d: 30, size: 18210 }),
      F("Eğitim Sertifikası - Müzakere Teknikleri.pdf", { d: 63, size: 356100 }),
    ]),
    F("Ekran Görüntüsü - CRM Paneli.png", { d: 3.4, k: "imgDashboard", size: 412004 }),
    F("Hızlı Notlar.txt", { d: 0.9, k: "notes", size: 2104 }),
  ],

  "b!vg-od-ece": [
    D("Paylaşılan", [
      F("Altay Perakende - Ziyaret Raporu.docx", { d: 1.6, by: "u-ece", size: 47720, viewed: 1.5 }),
      F("Anahtar Müşteri Planı - Altay.xlsx", { d: 6.2, by: "u-ece", size: 71400 }),
    ]),
  ],
  "b!vg-od-mert": [
    D("Paylaşılan", [
      F("Ekinoks Enerji - Rakip Analizi.pptx", {
        d: 3.6,
        by: "u-mert",
        size: 2840112,
        viewed: 3.4,
      }),
    ]),
  ],
  "b!vg-od-kerem": [
    D("Paylaşılan", [
      F("Satış Organizasyonu 2027 - Öneri.pptx", {
        d: 2.8,
        by: "u-kerem",
        size: 1940210,
        viewed: 2.5,
      }),
      F("Q4 Hedef Dağılımı.xlsx", { d: 13.1, by: "u-kerem", size: 52020 }),
    ]),
  ],

  "drv-sp-root": [
    D(
      "Şablonlar",
      [
        F("Vega Sunum Şablonu.pptx", { d: 52, by: "u-ayse", size: 2640112 }),
        F("Antetli Kağıt.docx", { d: 120, by: "u-ayse", size: 82011 }),
        F("Toplantı Tutanağı Şablonu.docx", { d: 95, by: "u-leyla", size: 30410 }),
      ],
      { by: "u-ayse" },
    ),
    D(
      "Duyurular",
      [
        F("Ekim Bülteni.pdf", { d: 9.5, by: "u-leyla", size: 1820440 }),
        F("Yeni Ofis Kat Planı - Levent.pdf", { d: 34, by: "u-leyla", size: 2290144 }),
      ],
      { by: "u-leyla" },
    ),
    F("Ofis Rehberi - Levent.pdf", { d: 70, by: "u-leyla", size: 1040220 }),
  ],

  "drv-sp-satis": [
    D(
      "Fiyatlandırma",
      [
        F("2026 Fiyat Listesi.xlsx", {
          d: 2.05,
          by: ME_ID,
          cby: "u-elif",
          k: "priceList",
          size: 221040,
          c: 280,
          viewed: 2,
        }),
        F("Kampanya İndirim Kuralları.docx", { d: 19, by: "u-kerem", cby: "u-kerem", size: 40220 }),
        F("İndirim Onay Matrisi.xlsx", { d: 44, by: "u-kerem", cby: "u-kerem", size: 28400 }),
      ],
      { by: "u-elif" },
    ),
    D(
      "Ekip Raporları",
      [
        F("Pipeline Özeti - Ekim.xlsx", {
          d: 0.62,
          by: "u-burak",
          cby: "u-burak",
          k: "pipelineSummary",
          size: 104220,
          viewed: 0.5,
        }),
        F("Ekip Hedef Takibi.xlsx", {
          d: 1.25,
          by: ME_ID,
          cby: ME_ID,
          k: "teamTargets",
          size: 66804,
          c: 270,
        }),
        F("Kazanılan-Kaybedilen Analizi Q3.pptx", {
          d: 17,
          by: "u-mert",
          cby: "u-mert",
          size: 3304120,
        }),
      ],
      { by: "u-burak" },
    ),
    D(
      "Satış Politikaları",
      [
        F("Satış Süreci El Kitabı.pdf", { d: 58, by: "u-kerem", size: 2290010 }),
        F("Müşteri Segmentasyon Kılavuzu.docx", { d: 75, by: "u-burak", size: 61840 }),
      ],
      { by: "u-kerem" },
    ),
    D(
      "Eğitim",
      [
        F("Müzakere Eğitimi - Sunum.pptx", { d: 47, by: "u-leyla", size: 7120004 }),
        F("Yeni Başlayanlar İçin Satış Rehberi.docx", {
          d: 88,
          by: ME_ID,
          cby: ME_ID,
          size: 92410,
          c: 300,
        }),
      ],
      { by: "u-leyla" },
    ),
  ],

  "drv-sp-teklif": [
    D(
      "2026 Teklifler",
      [
        F("Ekinoks Enerji - Teklif v1.docx", { d: 4.6, by: "u-mert", cby: "u-mert", size: 174220 }),
        F("Pera Otelcilik - Teklif v2.docx", {
          d: 12.1,
          by: "u-selin",
          cby: "u-selin",
          size: 158300,
        }),
        F("Orion Medikal - Teklif Taslağı.docx", {
          d: 3.1,
          by: "u-zeynep",
          cby: "u-zeynep",
          size: 131780,
        }),
        F("Toros Tekstil - Revize Teklif.docx", {
          d: 8.8,
          by: "u-ece",
          cby: "u-ece",
          size: 149006,
        }),
      ],
      { by: "u-mert" },
    ),
    D(
      "Sözleşmeler",
      [
        F("Nordis Lojistik - Çerçeve Sözleşme (İmzalı).pdf", {
          d: 36,
          by: "u-baris",
          size: 1640220,
        }),
        F("Altay Perakende - Gizlilik Sözleşmesi.pdf", { d: 29, by: "u-baris", size: 704110 }),
      ],
      { by: "u-baris" },
    ),
    F("Teklif Şablonu 2026.docx", { d: 64, by: ME_ID, cby: ME_ID, size: 88210, c: 300 }),
  ],

  "drv-sp-pazarlama": [
    D(
      "Kampanyalar",
      [
        F("Kış Kampanyası 2026 - Medya Planı.xlsx", { d: 5.4, by: "u-ayse", size: 77400 }),
        F("Kampanya Görseli - Kış.png", { d: 6.1, by: "u-ayse", k: "imgCampaign", size: 1840220 }),
        F("Lead Skorlama Modeli.xlsx", { d: 23, by: "u-zeynep", size: 49210 }),
      ],
      { by: "u-ayse" },
    ),
    D(
      "Marka",
      [
        F("Vega Global Marka Kılavuzu.pdf", { d: 140, by: "u-ayse", size: 8840210 }),
        F("Logo Paketi.zip", { d: 140, by: "u-ayse", size: 14220110 }),
      ],
      { by: "u-ayse" },
    ),
    D(
      "Etkinlikler",
      [
        F("Perakende Teknolojileri Fuarı - Stand Planı.pptx", {
          d: 11.5,
          by: "u-ayse",
          size: 5320004,
        }),
        F("Webinar Takvimi Q4.xlsx", { d: 16.2, by: "u-zeynep", size: 22010 }),
        F("Stand Tasarımı - Fuar 2026.png", {
          d: 11.6,
          by: "u-ayse",
          k: "imgStand",
          size: 2210440,
        }),
      ],
      { by: "u-ayse" },
    ),
    F("Pazar Araştırması - Perakende Sektörü 2026.pdf", { d: 27, by: "u-ayse", size: 3120884 }),
  ],

  "drv-sp-urun": [
    F("Vega Ürün Kataloğu 2026.pdf", { d: 33, by: "u-elif", size: 12440210 }),
    F("Rakip Karşılaştırma Tablosu.xlsx", {
      d: 6.8,
      by: "u-elif",
      k: "competitors",
      size: 61220,
      viewed: 6,
    }),
    D(
      "Ürün Bilgi Formları",
      [
        F("Vega Flow - Teknik Özellikler.pdf", { d: 21, by: "u-elif", size: 940220 }),
        F("Vega Track - Ürün Sayfası.docx", { d: 26, by: "u-elif", size: 120400 }),
        F("Vega Insight Analitik - Özellik Listesi.xlsx", { d: 14, by: "u-elif", size: 35880 }),
      ],
      { by: "u-elif" },
    ),
    D("Yol Haritası", [F("Ürün Yol Haritası 2027.pptx", { d: 8.4, by: "u-elif", size: 4410332 })], {
      by: "u-elif",
    }),
  ],

  "drv-sp-ik": [
    D(
      "Politika-Prosedurler",
      [
        D(
          "Vega Global (Genel)",
          [
            F("Etik ve Davranış Kuralları.pdf", {
              d: 210,
              by: "u-leyla",
              k: "policyEthics",
              size: 744210,
            }),
            F("Seyahat ve Harcama Politikası.pdf", {
              d: 96,
              by: "u-leyla",
              k: "policyTravel",
              size: 512330,
            }),
            F("Bilgi Güvenliği Politikası.pdf", { d: 130, by: "u-leyla", size: 640118 }),
            F("Uzaktan ve Hibrit Çalışma Politikası.docx", { d: 61, by: "u-leyla", size: 72400 }),
          ],
          { by: "u-leyla" },
        ),
        D(
          "Vega Perakende Çözümleri",
          [
            F("Satış Komisyon Prosedürü.pdf", { d: 45, by: "u-leyla", size: 402210 }),
            F("Müşteri Hediye ve Ağırlama Prosedürü.pdf", { d: 150, by: "u-baris", size: 288410 }),
          ],
          { by: "u-leyla" },
        ),
        D(
          "Vega Lojistik",
          [
            F("İş Sağlığı ve Güvenliği Prosedürü.pdf", { d: 180, by: "u-leyla", size: 910226 }),
            F("Araç Kullanım Politikası.pdf", { d: 110, by: "u-leyla", size: 352008 }),
          ],
          { by: "u-leyla" },
        ),
        D(
          "Vega Dijital",
          [
            F("Yazılım Lisans Politikası.pdf", { d: 160, by: "u-leyla", size: 302210 }),
            F("Açık Kaynak Kullanım Prosedürü.docx", { d: 72, by: "u-elif", size: 58420 }),
          ],
          { by: "u-leyla" },
        ),
      ],
      { by: "u-leyla" },
    ),
    D(
      "İK Formları",
      [
        F("İzin Talep Formu.docx", { d: 85, by: "u-leyla", size: 26410 }),
        F("Masraf Beyan Formu.xlsx", { d: 85, by: "u-leyla", size: 21980 }),
      ],
      { by: "u-leyla" },
    ),
    F("Çalışan El Kitabı 2026.pdf", { d: 100, by: "u-leyla", size: 2410332 }),
    F("Yan Haklar Rehberi.pdf", { d: 55, by: "u-leyla", size: 840102 }),
  ],

  "drv-sp-q4": [
    F("Q4 Fırsat Takip Tablosu.xlsx", {
      d: 0.41,
      by: "u-ece",
      cby: ME_ID,
      k: "q4tracker",
      size: 58402,
      viewed: 0.4,
    }),
    F("Proje Başlangıç Toplantısı.docx", { d: 38, by: ME_ID, cby: ME_ID, size: 34220, c: 39 }),
    D(
      "Müşteri Sunumları",
      [
        F("Altay Perakende - Yönetici Sunumu.pptx", {
          d: 2.4,
          by: ME_ID,
          cby: "u-ece",
          size: 5904112,
        }),
        F("Ekinoks Enerji - Çözüm Önerisi.pptx", {
          d: 5.6,
          by: "u-mert",
          cby: "u-mert",
          size: 4602210,
        }),
      ],
      { by: "u-ece" },
    ),
  ],

  "drv-sp-bolge": [
    F("Bölge Hedef Karnesi - Ekim.xlsx", {
      d: 1.9,
      by: "u-kerem",
      cby: "u-kerem",
      k: "scorecard",
      size: 72210,
      viewed: 1.8,
    }),
    F("Marmara Bölgesi - Aylık Değerlendirme.pptx", {
      d: 3.9,
      by: ME_ID,
      cby: ME_ID,
      size: 4120334,
      c: 4,
    }),
    F("Bölge Ziyaret Planı - Kasım.xlsx", { d: 2.6, by: ME_ID, cby: ME_ID, size: 30440, c: 2.7 }),
  ],
}

/* ─────────────────────────── ağacı kur ─────────────────────────── */

const TYPICAL_SIZE = { xlsx: 64000, docx: 52000, pptx: 3200000, pdf: 640000, csv: 12000 }

export function extOf(name) {
  const i = name.lastIndexOf(".")
  return i > 0 ? name.slice(i + 1).toLowerCase() : ""
}

/** id → düğüm (dosya, klasör ve her sürücünün kök öğesi). */
export const ITEMS = new Map()

function build() {
  for (const drive of DRIVES) {
    const rootId = `${drive.id.replace(/[^A-Za-z0-9]/g, "")}ROOT`
    const owner = drive.person ?? null
    const root = {
      id: rootId,
      driveId: drive.id,
      kind: "folder",
      isRoot: true,
      name: "root",
      rel: "",
      parentId: null,
      by: owner ?? "u-leyla",
      cby: owner ?? "u-leyla",
      d: 0.5,
      c: 1400,
      children: [],
    }
    ITEMS.set(rootId, root)
    const walk = (nodes, parent, inherited) => {
      for (const n of nodes) {
        const rel = `${parent.rel}/${n.name}`
        const id = `${drive.id.startsWith("b!") ? "01VG" : "01SP"}${hashId(`${drive.id}${rel}`)}`
        const by = n.by ?? inherited ?? owner ?? ME_ID
        const node = {
          id,
          driveId: drive.id,
          kind: n.kind,
          name: n.name,
          ext: n.kind === "file" ? extOf(n.name) : "",
          rel,
          parentId: parent.id,
          by,
          cby: n.cby ?? by,
          d: n.d ?? 30,
          c: n.c ?? (n.d ?? 30) + 6,
          size: n.size,
          viewed: n.viewed ?? null,
          k: n.k ?? null,
          children: [],
        }
        if (node.kind === "file" && node.size == null) node.size = TYPICAL_SIZE[node.ext] ?? 40000
        ITEMS.set(id, node)
        parent.children.push(id)
        if (n.kind === "folder") walk(n.children ?? [], node, n.by ?? inherited)
      }
    }
    walk(TREES[drive.id] ?? [], root, null)
    // Klasör tarihleri ve boyutları çocuklarından: en yeni değişiklik, toplam boyut.
    const settle = (node) => {
      if (node.kind !== "folder") return { d: node.d, size: node.size ?? 0 }
      let newest = node.children.length ? Infinity : node.d
      let size = 0
      for (const cid of node.children) {
        const r = settle(ITEMS.get(cid))
        newest = Math.min(newest, r.d)
        size += r.size
      }
      node.d = Math.min(node.d ?? Infinity, newest)
      node.size = size
      return { d: node.d, size }
    }
    settle(root)
    drive.rootId = rootId
  }
}
build()

export const rootOf = (driveId) => ITEMS.get(driveById(driveId)?.rootId) ?? null

export function itemWebUrl(node) {
  const drive = driveById(node.driveId)
  return urlOf(drive.origin, `${drive.base}${node.rel}`)
}

/** Sürücü içi yol → düğüm (`/A/B` çözülmüş; büyük/küçük harf duyarsız). */
export function itemByPath(driveId, rel) {
  const root = rootOf(driveId)
  if (!root) return null
  const parts = String(rel ?? "")
    .split("/")
    .filter(Boolean)
  let cur = root
  for (const p of parts) {
    const want = p.toLocaleLowerCase("tr")
    const next = cur.children
      .map((id) => ITEMS.get(id))
      .find((n) => n.name.toLocaleLowerCase("tr") === want)
    if (!next) return null
    cur = next
  }
  return cur
}

export const allFiles = () => [...ITEMS.values()].filter((n) => n.kind === "file")
export const isoAgo = (days, now = Date.now()) => new Date(now - days * DAY).toISOString()
export const personOf = (id) => findPerson(id) ?? ME
