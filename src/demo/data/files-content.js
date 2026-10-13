// Demo dosyalarının İÇERİĞİ — önizleme sayfası, küçük resim, indirme ve arama
// özeti aynı tariften çizilir. TÜMÜ KURGUSAL: rakamlar, müşteriler, kişiler.
//
// Biçimler:
//   sheet   { type: "sheet", sheets: [{ name, cols, rows, fmt?, total? }] }
//           fmt: kolon başına "text" | "money" | "int" | "pct" | "date"
//   doc     { type: "doc", blocks: [[tür, ...]] }   (pdf de aynı biçim, `pdf: true`)
//           ["h1", t] ["h2", t] ["p", t] ["ul", [..]] ["ol", [..]] ["meta", [[k, v]..]]
//           ["table", cols, rows] ["sign", [ad..]] ["note", t]
//   slides  { type: "slides", slides: [{ layout, title, sub?, bullets?, kpis?, chart? }] }
//   image   { type: "image", art }   text { type: "text", text }

import { CUSTOMERS, MANAGER, ME, TEAM } from "../persona"

const ece = TEAM[0]
const mert = TEAM[1]
const selin = TEAM[2]
const burak = TEAM[3]
const zeynep = TEAM[4]

const M = (n) => n // okunurluk: binlik ₺ tutarlar ham sayı olarak

/* ─────────────────────────── kahraman dosyalar ─────────────────────────── */

const HERO = {
  q4forecast: {
    type: "sheet",
    sheets: [
      {
        name: "Tahmin",
        cols: ["Bölge", "Ekim", "Kasım", "Aralık", "Q4 Toplam", "Hedef", "Gerçekleşme %"],
        fmt: ["text", "money", "money", "money", "money", "money", "pct"],
        rows: [
          ["Marmara", M(4820000), M(5150000), M(6340000), M(16310000), M(15500000), 1.052],
          ["Ege", M(2140000), M(2280000), M(2710000), M(7130000), M(7400000), 0.964],
          ["İç Anadolu", M(1960000), M(2050000), M(2390000), M(6400000), M(6200000), 1.032],
          ["Akdeniz", M(1420000), M(1510000), M(1880000), M(4810000), M(5100000), 0.943],
          ["Karadeniz", M(780000), M(820000), M(960000), M(2560000), M(2500000), 1.024],
          ["Güneydoğu", M(610000), M(640000), M(790000), M(2040000), M(2300000), 0.887],
          [
            "Kurumsal (Merkez)",
            M(3240000),
            M(3520000),
            M(4410000),
            M(11170000),
            M(10800000),
            1.034,
          ],
        ],
        total: ["Toplam", M(14970000), M(15970000), M(19480000), M(50420000), M(49800000), 1.012],
      },
      {
        name: "Fırsatlar",
        cols: ["Müşteri", "Fırsat", "Aşama", "Tutar", "Olasılık", "Sorumlu"],
        fmt: ["text", "text", "text", "money", "pct", "text"],
        rows: [
          [
            "Altay Perakende",
            "Mağaza analitiği — 120 şube",
            "Teklif",
            M(4200000),
            0.6,
            ece.displayName,
          ],
          ["Nordis Lojistik", "Filo takip yenileme", "Sözleşme", M(3150000), 0.85, ME.displayName],
          [
            "Ekinoks Enerji",
            "Saha ekipleri mobil çözümü",
            "Çözüm tasarımı",
            M(2480000),
            0.4,
            mert.displayName,
          ],
          [
            "Pera Otelcilik",
            "Lisans yenileme + genişleme",
            "Müzakere",
            M(1320000),
            0.7,
            selin.displayName,
          ],
          ["Toros Tekstil", "Üretim planlama modülü", "Teklif", M(1860000), 0.5, ece.displayName],
          ["Orion Medikal", "Depo yönetimi pilot", "Keşif", M(940000), 0.25, zeynep.displayName],
        ],
      },
    ],
  },

  pipeline: {
    type: "sheet",
    sheets: [
      {
        name: "Ekim",
        cols: ["Aşama", "Fırsat Sayısı", "Toplam Tutar", "Ağırlıklı Tutar", "Ort. Gün", "Değişim"],
        fmt: ["text", "int", "money", "money", "int", "pct"],
        rows: [
          ["Keşif", 38, M(18400000), M(2760000), 12, 0.08],
          ["Çözüm tasarımı", 24, M(14100000), M(4230000), 19, 0.05],
          ["Teklif", 17, M(11800000), M(6490000), 14, 0.12],
          ["Müzakere", 9, M(7300000), M(5110000), 21, -0.03],
          ["Sözleşme", 5, M(5900000), M(5015000), 9, 0.21],
        ],
        total: ["Toplam", 93, M(57500000), M(23605000), 15, 0.07],
      },
    ],
  },

  weekly: {
    type: "sheet",
    sheets: [
      {
        name: "Hafta 41",
        cols: ["Temsilci", "Görüşme", "Yeni Fırsat", "Teklif", "Kazanılan", "Ciro", "Hedefe %"],
        fmt: ["text", "int", "int", "int", "int", "money", "pct"],
        rows: [
          [ece.displayName, 14, 4, 3, 1, M(1240000), 1.08],
          [mert.displayName, 11, 3, 2, 1, M(980000), 0.94],
          [selin.displayName, 16, 5, 2, 0, M(410000), 0.72],
          [burak.displayName, 6, 1, 0, 0, M(0), 0],
          [zeynep.displayName, 19, 6, 1, 0, M(260000), 0.81],
        ],
        total: ["Ekip", 66, 19, 8, 2, M(2890000), 0.91],
      },
    ],
  },

  priceList: {
    type: "sheet",
    sheets: [
      {
        name: "Fiyatlar",
        cols: [
          "Ürün Kodu",
          "Ürün",
          "Lisans Tipi",
          "Liste Fiyatı",
          "Bayi Fiyatı",
          "Maks. İndirim",
          "Geçerlilik",
        ],
        fmt: ["text", "text", "text", "money", "money", "pct", "text"],
        rows: [
          ["VF-100", "Midea Flow Standart", "Kullanıcı / yıl", 4800, 4080, 0.15, "31.12.2026"],
          ["VF-200", "Midea Flow Kurumsal", "Kullanıcı / yıl", 7900, 6715, 0.2, "31.12.2026"],
          ["VT-110", "Midea Track Filo", "Araç / yıl", 2150, 1828, 0.12, "31.12.2026"],
          ["VT-210", "Midea Track Saha", "Cihaz / yıl", 1680, 1428, 0.12, "31.12.2026"],
          ["VI-300", "Midea Insight Analitik", "Şube / yıl", 12400, 10540, 0.18, "31.12.2026"],
          ["VI-310", "Midea Insight Premium Pano", "Şube / yıl", 3600, 3060, 0.1, "31.12.2026"],
          ["VS-010", "Kurulum ve Entegrasyon", "Proje", 185000, 166500, 0.1, "31.12.2026"],
          ["VS-020", "Eğitim Paketi", "Gün", 18500, 16650, 0.05, "31.12.2026"],
          ["VS-030", "Premium Destek", "Yıllık", 96000, 86400, 0.1, "31.12.2026"],
        ],
      },
    ],
  },

  leads: {
    type: "sheet",
    csv: true,
    sheets: [
      {
        name: "Kampanya Lead Listesi",
        cols: ["Firma", "İlgili Kişi", "Unvan", "Şehir", "Kaynak", "Skor", "Durum"],
        fmt: ["text", "text", "text", "text", "text", "int", "text"],
        rows: [
          ["Mavi Liman Market", "Okan Aydın", "Operasyon Müdürü", "İzmir", "Webinar", 82, "Sıcak"],
          ["Selvi Gıda", "Nur Başaran", "Satın Alma Uzmanı", "Bursa", "Fuar", 74, "Sıcak"],
          ["Kuzey Yapı Market", "Cem Arıkan", "BT Direktörü", "Ankara", "Web formu", 69, "Ilık"],
          ["Lale Eczaneleri", "Derya Tunç", "Genel Müdür", "Antalya", "Referans", 88, "Sıcak"],
          [
            "Doğa Kozmetik",
            "Bora Ateş",
            "Dijital Dönüşüm Lideri",
            "İstanbul",
            "Webinar",
            61,
            "Ilık",
          ],
          ["Akın Elektronik", "Gizem Yüce", "Mağazalar Müdürü", "Kocaeli", "LinkedIn", 55, "Soğuk"],
          ["Ada Kitabevleri", "Kaan Er", "Kurucu Ortak", "İstanbul", "Fuar", 47, "Soğuk"],
          ["Yıldız Mobilya", "Ece Karan", "Satın Alma Müdürü", "Kayseri", "Web formu", 72, "Ilık"],
          ["Pınar Su Ürünleri", "Hakan Ulu", "Lojistik Müdürü", "Samsun", "Webinar", 66, "Ilık"],
          [
            "Ege Tarım Kooperatifi",
            "Serap Öz",
            "Yönetim Kurulu Üyesi",
            "Manisa",
            "Referans",
            79,
            "Sıcak",
          ],
        ],
      },
    ],
  },

  pipelineSummary: {
    type: "sheet",
    sheets: [
      {
        name: "Özet",
        cols: ["Temsilci", "Açık Fırsat", "Pipeline", "Ağırlıklı", "Bu Ay Kapanacak", "Risk"],
        fmt: ["text", "int", "money", "money", "money", "text"],
        rows: [
          [ece.displayName, 21, M(16200000), M(7940000), M(4200000), "Düşük"],
          [mert.displayName, 18, M(12900000), M(5160000), M(2480000), "Orta"],
          [selin.displayName, 23, M(8100000), M(3480000), M(1320000), "Düşük"],
          [zeynep.displayName, 31, M(6400000), M(1790000), M(940000), "Yüksek"],
          [ME.displayName, 9, M(13900000), M(5235000), M(3150000), "Düşük"],
        ],
        total: ["Toplam", 102, M(57500000), M(23605000), M(12090000), ""],
      },
    ],
  },

  teamTargets: {
    type: "sheet",
    sheets: [
      {
        name: "2026",
        cols: ["Temsilci", "Yıllık Hedef", "Gerçekleşen (YTD)", "Kalan", "Gerçekleşme %", "Durum"],
        fmt: ["text", "money", "money", "money", "pct", "text"],
        rows: [
          [ece.displayName, M(18000000), M(14650000), M(3350000), 0.814, "Hedefte"],
          [mert.displayName, M(15000000), M(11420000), M(3580000), 0.761, "Hedefte"],
          [selin.displayName, M(9000000), M(5980000), M(3020000), 0.664, "Takipte"],
          [zeynep.displayName, M(6000000), M(3840000), M(2160000), 0.64, "Takipte"],
        ],
        total: ["Ekip", M(48000000), M(35890000), M(12110000), 0.748, ""],
      },
    ],
  },

  q4tracker: {
    type: "sheet",
    sheets: [
      {
        name: "Takip",
        cols: ["Müşteri", "Sonraki Adım", "Tarih", "Tutar", "Olasılık", "Sorumlu"],
        fmt: ["text", "text", "text", "money", "pct", "text"],
        rows: [
          [
            "Altay Perakende",
            "Teklif v3 sunumu — satın alma kurulu",
            "Bu hafta",
            M(4200000),
            0.6,
            ece.displayName,
          ],
          [
            "Nordis Lojistik",
            "Sözleşme hukuk onayı",
            "3 gün içinde",
            M(3150000),
            0.85,
            ME.displayName,
          ],
          [
            "Ekinoks Enerji",
            "Saha pilotu kapsamı netleşecek",
            "Gelecek hafta",
            M(2480000),
            0.4,
            mert.displayName,
          ],
        ],
      },
    ],
  },

  scorecard: {
    type: "sheet",
    sheets: [
      {
        name: "Ekim",
        cols: ["Bölge", "Yönetici", "Hedef", "Gerçekleşen", "Gerçekleşme %", "Yeni Müşteri", "NPS"],
        fmt: ["text", "text", "money", "money", "pct", "int", "int"],
        rows: [
          ["Marmara", ME.displayName, M(4500000), M(4820000), 1.071, 6, 54],
          ["Ege", "Tuna Kılıç", M(2300000), M(2140000), 0.93, 3, 49],
          ["İç Anadolu", "Melis Ateş", M(1900000), M(1960000), 1.032, 4, 51],
          ["Akdeniz", "Sinan Oral", M(1600000), M(1420000), 0.888, 2, 46],
        ],
      },
    ],
  },

  competitors: {
    type: "sheet",
    sheets: [
      {
        name: "Karşılaştırma",
        cols: ["Özellik", "Midea Insight", "Rakip A", "Rakip B", "Not"],
        fmt: ["text", "text", "text", "text", "text"],
        rows: [
          ["Gerçek zamanlı şube panosu", "Var", "Var", "Kısmi", "Bizde 5 sn tazeleme"],
          ["Mobil uygulama", "Var", "Var", "Yok", ""],
          ["Türkçe destek 7/24", "Var", "Mesai içi", "Yok", "Güçlü argüman"],
          ["Yerel veri merkezi", "Var", "Yok", "Var", "KVKK sorularında öne çık"],
          ["Ortalama kurulum süresi", "6 hafta", "10 hafta", "8 hafta", ""],
          ["Şube başı yıllık fiyat (₺)", "12.400", "13.900", "10.800", "Rakip B daha ucuz"],
        ],
      },
    ],
  },

  altayOffer: {
    type: "doc",
    blocks: [
      ["kicker", "TİCARİ TEKLİF · VG-TKL-2026-118 · Revizyon 3"],
      ["h1", "Altay Perakende — Mağaza Analitiği Çözüm Teklifi"],
      [
        "meta",
        [
          ["Müşteri", "Altay Perakende A.Ş."],
          ["İlgili", `${CUSTOMERS[0].contact} — ${CUSTOMERS[0].title}`],
          ["Hazırlayan", `${ME.displayName}, ${ece.displayName}`],
          ["Geçerlilik", "30 gün"],
        ],
      ],
      ["h2", "1. Özet"],
      [
        "p",
        "Midea olarak Altay Perakende'nin 120 mağazasında şube bazlı satış, stok ve ziyaretçi verilerini tek panoda birleştiren Midea Insight Analitik çözümünü öneriyoruz. Önerilen kapsam, pilot bölgede 6 hafta içinde canlıya alınacak ve kalan mağazalara iki dalgada yaygınlaştırılacaktır.",
      ],
      ["h2", "2. Kapsam"],
      [
        "ul",
        [
          "120 mağaza için Midea Insight Analitik lisansı (şube / yıl)",
          "ERP ve kasa sistemleriyle entegrasyon (günlük ve anlık veri akışı)",
          "Bölge müdürleri için mobil pano ve haftalık otomatik rapor",
          "Kurulum, veri doğrulama ve 3 günlük kullanıcı eğitimi",
          "İlk yıl premium destek (7/24, Türkçe)",
        ],
      ],
      ["h2", "3. Ticari Koşullar"],
      [
        "table",
        ["Kalem", "Miktar", "Birim Fiyat (₺)", "İndirim", "Tutar (₺)"],
        [
          ["Midea Insight Analitik", "120 şube", "12.400", "%15", "1.264.800"],
          ["Premium Pano", "120 şube", "3.600", "%10", "388.800"],
          ["Kurulum ve Entegrasyon", "1 proje", "185.000", "—", "185.000"],
          ["Eğitim Paketi", "3 gün", "18.500", "—", "55.500"],
          ["Premium Destek", "1 yıl", "96.000", "%10", "86.400"],
          ["Toplam (KDV hariç)", "", "", "", "1.980.500"],
        ],
      ],
      [
        "note",
        "Revizyon 3'te müşteri talebi doğrultusunda premium pano indirimi %10'a çekilmiş, ödeme planı üç taksite bölünmüştür.",
      ],
      ["h2", "4. Uygulama Takvimi"],
      [
        "ol",
        [
          "Hafta 1–2: Keşif, veri eşleştirme ve pilot bölge seçimi (Marmara)",
          "Hafta 3–6: Pilot kurulum ve kullanıcı kabul testleri",
          "Hafta 7–12: İki dalgada tüm mağazalara yaygınlaştırma",
        ],
      ],
      ["sign", [ME.displayName, "Sales Manager, Midea"]],
    ],
  },

  nordisContract: {
    type: "doc",
    blocks: [
      ["kicker", "TASLAK · Hukuk incelemesinde · Gizli"],
      ["h1", "Hizmet Sözleşmesi — Nordis Lojistik A.Ş."],
      [
        "meta",
        [
          ["Taraflar", "Midea Ticaret A.Ş. ve Nordis Lojistik A.Ş."],
          ["Konu", "Midea Track Filo hizmetleri"],
          ["Süre", "36 ay"],
          ["Son düzenleyen", "Barış Yalçın (Hukuk)"],
        ],
      ],
      ["h2", "Madde 1 — Taraflar"],
      [
        "p",
        'İşbu sözleşme, merkezi İstanbul\'da bulunan Midea Ticaret A.Ş. ("Midea") ile merkezi Kocaeli\'de bulunan Nordis Lojistik A.Ş. ("Müşteri") arasında aşağıdaki şartlarla akdedilmiştir.',
      ],
      ["h2", "Madde 2 — Konu ve Kapsam"],
      [
        "p",
        "Sözleşmenin konusu, Müşteri'nin 640 araçlık filosu için Midea Track Filo yazılımının lisanslanması, araç içi cihazların devreye alınması ve rota optimizasyonu modülünün işletilmesidir.",
      ],
      ["h2", "Madde 3 — Hizmet Seviyesi"],
      [
        "ul",
        [
          "Platform erişilebilirliği aylık %99,5",
          "Kritik arızalarda 2 saat içinde müdahale",
          "Aylık hizmet raporu ve çeyreklik iş değerlendirme toplantısı",
        ],
      ],
      ["h2", "Madde 4 — Bedel ve Ödeme"],
      [
        "p",
        "Yıllık hizmet bedeli 1.050.000 ₺ + KDV olup üç aylık dönemler halinde faturalandırılır. Bedel her yıl TÜFE oranında güncellenir; artış oranı %25'i aşamaz.",
      ],
      [
        "note",
        "[Hukuk notu — B. Yalçın] Madde 4'teki artış tavanı müşteri tarafından %20 olarak talep edildi; satış ekibinin görüşü bekleniyor.",
      ],
      ["h2", "Madde 5 — Gizlilik ve Kişisel Veriler"],
      [
        "p",
        "Taraflar, sözleşme kapsamında edindikleri ticari sırları ve kişisel verileri 6698 sayılı Kanun'a uygun olarak korumayı taahhüt eder.",
      ],
      ["sign", ["Midea Ticaret A.Ş.", "Nordis Lojistik A.Ş."]],
    ],
  },

  kickoff: {
    type: "doc",
    pdf: true,
    blocks: [
      ["kicker", "MIDEA · SATIŞ KICK-OFF 2027"],
      ["h1", "Satış Kick-off Ajandası"],
      [
        "meta",
        [
          ["Tarih", "16 Ocak 2027, Cuma"],
          ["Yer", "Levent Ofis — Konferans Salonu"],
          ["Ev sahibi", MANAGER.displayName],
        ],
      ],
      [
        "table",
        ["Saat", "Oturum", "Konuşmacı"],
        [
          ["09:00", "Açılış ve 2026 değerlendirmesi", MANAGER.displayName],
          ["09:45", "2027 hedefleri ve bölge dağılımı", ME.displayName],
          ["10:30", "Kahve arası", ""],
          ["10:45", "Ürün yol haritası: Midea Flow ve Insight", "Elif Güneş"],
          ["11:30", "Müşteri başarı hikâyeleri", "Onur Tekin"],
          ["12:30", "Öğle yemeği", ""],
          ["13:30", "Atölye: Büyük müşteri hesap planlama", ece.displayName],
          ["15:00", "Komisyon modeli ve teşvikler", "Can Şahin"],
          ["16:00", "Ödüller ve kapanış", MANAGER.displayName],
        ],
      ],
      [
        "note",
        "Katılım zorunludur. Bölge sunumlarının 9 Ocak'a kadar Satış Ekibi sitesine yüklenmesi rica olunur.",
      ],
    ],
  },

  oneOnOne: {
    type: "doc",
    blocks: [
      ["h1", "1-1 Notları — Satış Ekibi"],
      ["h2", ece.displayName],
      [
        "ul",
        [
          "Altay teklifinde satın alma kurulu tarihi kesinleşti",
          "Toros Tekstil için revize teklif hazır",
          "Gelişim: müzakere eğitimi (Kasım)",
        ],
      ],
      ["h2", mert.displayName],
      [
        "ul",
        [
          "Ekinoks pilotu için saha ekibiyle teknik toplantı",
          "Nordis rota optimizasyonu sunumunu ekiple paylaşacak",
        ],
      ],
      ["h2", selin.displayName],
      [
        "ul",
        [
          "Pera Otelcilik yenilemesi müzakerede — %8 indirim talebi",
          "Haftalık görüşme hedefi 15'e çıkarıldı",
        ],
      ],
      ["h2", zeynep.displayName],
      [
        "ul",
        [
          "Kış kampanyası lead listesi CRM'e aktarıldı (148 kayıt)",
          "Orion Medikal demosu planlandı",
        ],
      ],
    ],
  },

  policyEthics: {
    type: "doc",
    pdf: true,
    blocks: [
      ["kicker", "MIDEA · POLİTİKA · PL-001 · Sürüm 4.0"],
      ["h1", "Etik ve Davranış Kuralları"],
      [
        "p",
        "Bu politika, Midea ve iştiraklerinde çalışan herkesin iş ilişkilerinde dürüstlük, şeffaflık ve saygı ilkeleriyle hareket etmesini güvence altına alır.",
      ],
      ["h2", "1. Çıkar Çatışması"],
      [
        "p",
        "Çalışanlar kişisel çıkarlarının şirket çıkarlarıyla çatışabileceği durumları yöneticilerine ve Etik Kurulu'na yazılı olarak bildirir.",
      ],
      ["h2", "2. Hediye ve Ağırlama"],
      [
        "ul",
        [
          "Değeri 1.500 ₺'yi aşan hediyeler kabul edilmez",
          "Tüm ağırlama faaliyetleri harcama sistemine kaydedilir",
          "Kamu görevlilerine hediye verilmez",
        ],
      ],
      ["h2", "3. Bildirim Kanalı"],
      [
        "p",
        "Etik ihlaller etik.hat@midea.com adresine ya da anonim bildirim formuna iletilebilir. Bildirimde bulunan çalışana misilleme yapılamaz.",
      ],
    ],
  },

  policyTravel: {
    type: "doc",
    pdf: true,
    blocks: [
      ["kicker", "MIDEA · POLİTİKA · PL-007 · Sürüm 2.3"],
      ["h1", "Seyahat ve Harcama Politikası"],
      ["h2", "Kapsam"],
      ["p", "Yurt içi ve yurt dışı iş seyahatleri ile müşteri ağırlama harcamalarını kapsar."],
      [
        "table",
        ["Kalem", "Yurt içi limit", "Yurt dışı limit"],
        [
          ["Konaklama (gece)", "4.500 ₺", "180 €"],
          ["Günlük harcırah", "900 ₺", "60 €"],
          ["Müşteri yemeği (kişi)", "1.200 ₺", "70 €"],
        ],
      ],
      ["h2", "Onay Akışı"],
      [
        "ol",
        [
          "Seyahat talebi yöneticiye en az 5 iş günü önce iletilir",
          "Rezervasyonlar şirket seyahat acentesi üzerinden yapılır",
          "Harcamalar dönüşten itibaren 10 gün içinde beyan edilir",
        ],
      ],
    ],
  },

  regionDeck: {
    type: "slides",
    slides: [
      {
        layout: "title",
        title: "Bölge Performans Sunumu",
        sub: "Ekim 2026 · Marmara Bölgesi · Doğukan Arslan",
      },
      {
        layout: "kpi",
        title: "Ekim'de bir bakışta",
        kpis: [
          ["Ciro", "4,82 M₺", "+7,1%"],
          ["Hedefe %", "107", "+4 puan"],
          ["Yeni müşteri", "6", "+2"],
          ["Ağırlıklı pipeline", "23,6 M₺", "+12%"],
        ],
      },
      {
        layout: "chart",
        title: "Aylık ciro — hedef ve gerçekleşen (M₺)",
        chart: {
          labels: ["Tem", "Ağu", "Eyl", "Eki"],
          series: [
            { name: "Hedef", values: [4.1, 4.2, 4.4, 4.5] },
            { name: "Gerçekleşen", values: [3.9, 4.4, 4.6, 4.82] },
          ],
        },
      },
      {
        layout: "bullets",
        title: "Öne çıkanlar",
        bullets: [
          "Nordis Lojistik sözleşmesi hukuk onayında — 3,15 M₺",
          "Altay Perakende teklifinin 3. revizyonu satın alma kuruluna sunuldu",
          "Akdeniz ve Güneydoğu'da hedef altı — destek planı Kasım'da devrede",
          "Kış kampanyasından 148 yeni lead CRM'e aktarıldı",
        ],
      },
      {
        layout: "bullets",
        title: "Kasım öncelikleri",
        bullets: [
          "Q4 büyük müşteri fırsatlarında kapanış: Altay, Nordis, Ekinoks",
          "Pera Otelcilik yenilemesini %8 indirim sınırında kapatmak",
          "Ekip içi müzakere eğitimi ve hesap planlama atölyesi",
        ],
      },
    ],
  },

  imgDashboard: { type: "image", art: "dashboard" },
  imgCampaign: { type: "image", art: "campaign" },
  imgStand: { type: "image", art: "stand" },

  notes: {
    type: "text",
    text: "Hızlı notlar\n\n- Nordis: artış tavanı %20 → Barış'tan dönüş bekleniyor\n- Altay: kurul sunumu için yönetici özeti 1 sayfa olsun\n- Kerem'e Q4 tahminini cuma gönder\n- Selin ile Pera indirimi görüşülecek (%8 sınırı)\n- Kick-off bölge sunumu: 9 Ocak'a kadar\n",
  },
}

/* ─────────────────────────── addan üretilen içerik ─────────────────────────── */

const strip = (name) => name.replace(/\.[^.]+$/, "")

function customerOf(name) {
  return CUSTOMERS.find((c) => name.includes(c.account.split(" ")[0])) ?? null
}

function genericDoc(name, pdf) {
  const title = strip(name)
  const lower = title.toLocaleLowerCase("tr")
  const cust = customerOf(title)
  if (/politika|prosedür|kural|el kitabı|rehber|kılavuz/.test(lower)) {
    return {
      type: "doc",
      pdf,
      blocks: [
        ["kicker", "MIDEA · KURUMSAL BELGE"],
        ["h1", title],
        [
          "p",
          "Bu belge Midea ve iştiraklerinde geçerli kuralları, sorumlulukları ve uygulama adımlarını tanımlar. Sorularınız için İK & Politikalar sitesindeki iletişim kanallarını kullanabilirsiniz.",
        ],
        ["h2", "1. Amaç ve Kapsam"],
        [
          "p",
          "Tüm çalışanlar, yöneticiler ve şirket adına hareket eden iş ortakları bu belgeye uymakla yükümlüdür.",
        ],
        ["h2", "2. Temel İlkeler"],
        [
          "ul",
          [
            "Kurallar tutarlı ve şeffaf biçimde uygulanır",
            "İstisnalar yalnızca yazılı onayla mümkündür",
            "Belge yılda en az bir kez gözden geçirilir",
          ],
        ],
        ["h2", "3. Sorumluluklar"],
        ["p", "Uygulamadan departman yöneticileri, güncellemeden İnsan Kaynakları sorumludur."],
      ],
    }
  }
  if (/teklif/.test(lower)) {
    return {
      type: "doc",
      pdf,
      blocks: [
        ["kicker", "TİCARİ TEKLİF · Midea"],
        ["h1", title],
        [
          "meta",
          [
            ["Müşteri", cust ? `${cust.account} A.Ş.` : "—"],
            ["Hazırlayan", "Satış Ekibi"],
            ["Geçerlilik", "30 gün"],
          ],
        ],
        ["h2", "Önerilen Çözüm"],
        [
          "p",
          `${cust ? cust.account : "Müşterinin"} ihtiyaç analizinde öne çıkan başlıklar doğrultusunda Midea ürün ailesinden uyarlanmış bir çözüm öneriyoruz.`,
        ],
        [
          "table",
          ["Kalem", "Miktar", "Tutar (₺)"],
          [
            ["Lisans", "1 yıl", "640.000"],
            ["Kurulum", "1 proje", "185.000"],
            ["Destek", "1 yıl", "96.000"],
            ["Toplam", "", "921.000"],
          ],
        ],
        ["h2", "Sonraki Adımlar"],
        [
          "ol",
          [
            "Teknik doğrulama toplantısı",
            "Ticari koşulların netleşmesi",
            "Sözleşme taslağının paylaşılması",
          ],
        ],
      ],
    }
  }
  if (/sözleşme/.test(lower)) {
    return {
      type: "doc",
      pdf,
      blocks: [
        ["kicker", "SÖZLEŞME · Gizli"],
        ["h1", title],
        [
          "p",
          "İşbu sözleşme Midea Ticaret A.Ş. ile karşı taraf arasında, aşağıda belirtilen hüküm ve şartlarla imzalanmıştır.",
        ],
        ["h2", "Madde 1 — Konu"],
        ["p", "Sözleşmenin konusu tarafların karşılıklı hak ve yükümlülüklerinin belirlenmesidir."],
        ["h2", "Madde 2 — Gizlilik"],
        [
          "p",
          "Taraflar, sözleşme süresince ve sonrasında edindikleri ticari bilgileri gizli tutar.",
        ],
        ["sign", ["Midea Ticaret A.Ş.", cust ? `${cust.account} A.Ş.` : "Karşı Taraf"]],
      ],
    }
  }
  if (/not|toplantı|tutanak|başlangıç/.test(lower)) {
    return {
      type: "doc",
      pdf,
      blocks: [
        ["h1", title],
        [
          "meta",
          [
            ["Katılımcılar", `${ME.displayName}, ${ece.displayName}, ${mert.displayName}`],
            ["Not alan", ME.displayName],
          ],
        ],
        ["h2", "Gündem"],
        [
          "ol",
          ["Haftalık pipeline gözden geçirme", "Öncelikli müşteri aksiyonları", "Ekip duyuruları"],
        ],
        ["h2", "Kararlar ve Aksiyonlar"],
        [
          "ul",
          [
            "Altay teklifi için yönetici özeti hazırlanacak — Doğukan",
            "Ekinoks pilot kapsamı netleşecek — Mert",
            "CRM kayıtları cuma gününe kadar güncellenecek — Ekip",
          ],
        ],
      ],
    }
  }
  return {
    type: "doc",
    pdf,
    blocks: [
      ["kicker", "MIDEA"],
      ["h1", title],
      [
        "p",
        `${title} belgesi Midea satış ve iş birimlerinin ortak kullanımı için hazırlanmıştır.`,
      ],
      ["h2", "Özet"],
      [
        "p",
        "Belgede öne çıkan başlıklar, ilgili ekiplerin değerlendirmesi ve sonraki adımlar yer almaktadır.",
      ],
      [
        "ul",
        [
          "Mevcut durum ve temel bulgular",
          "Riskler ve fırsatlar",
          "Önerilen aksiyonlar ve sorumlular",
        ],
      ],
      ["h2", "Sonuç"],
      ["p", "Bir sonraki değerlendirme toplantısında güncel rakamlarla yeniden ele alınacaktır."],
    ],
  }
}

function genericSheet(name, csv) {
  const title = strip(name)
  const lower = title.toLocaleLowerCase("tr")
  if (/haftalık satış raporu/.test(lower)) {
    const base = HERO.weekly.sheets[0]
    const k = Number(title.match(/\d+/)?.[0] ?? 40)
    const f = 0.9 + ((k * 7) % 13) / 100
    return {
      type: "sheet",
      sheets: [
        {
          ...base,
          name: `Hafta ${k}`,
          rows: base.rows.map((r) =>
            r.map((v, i) => (i === 5 ? Math.round((v * f) / 1000) * 1000 : v)),
          ),
          total: base.total.map((v, i) => (i === 5 ? Math.round((v * f) / 1000) * 1000 : v)),
        },
      ],
    }
  }
  if (/izin/.test(lower)) {
    return {
      type: "sheet",
      sheets: [
        {
          name: "Plan",
          cols: ["Dönem", "Başlangıç", "Bitiş", "Gün", "Durum"],
          fmt: ["text", "text", "text", "int", "text"],
          rows: [
            ["Kış", "02.02.2026", "06.02.2026", 5, "Kullanıldı"],
            ["Bayram", "30.03.2026", "03.04.2026", 3, "Kullanıldı"],
            ["Yaz", "10.08.2026", "21.08.2026", 10, "Kullanıldı"],
            ["Yılbaşı", "28.12.2026", "31.12.2026", 4, "Planlandı"],
          ],
        },
      ],
    }
  }
  if (/masraf/.test(lower)) {
    return {
      type: "sheet",
      sheets: [
        {
          name: "Beyan",
          cols: ["Tarih", "Açıklama", "Kategori", "Tutar (₺)", "Proje / Müşteri"],
          fmt: ["text", "text", "text", "money", "text"],
          rows: [
            ["", "", "", "", ""],
            ["", "", "", "", ""],
            ["", "", "", "", ""],
          ],
        },
      ],
    }
  }
  if (/katılımcı|lead|webinar/.test(lower)) {
    const base = HERO.leads.sheets[0]
    return { type: "sheet", csv, sheets: [{ ...base, name: title, rows: base.rows.slice(2, 9) }] }
  }
  if (/bütçe|hedef|dağılım|plan/.test(lower)) {
    return {
      type: "sheet",
      sheets: [
        {
          name: "Özet",
          cols: ["Kalem", "Q1", "Q2", "Q3", "Q4", "Yıl Toplamı"],
          fmt: ["text", "money", "money", "money", "money", "money"],
          rows: [
            ["Lisans gelirleri", 11200000, 12400000, 12900000, 15800000, 52300000],
            ["Hizmet gelirleri", 2100000, 2350000, 2420000, 2900000, 9770000],
            ["Yeni müşteri hedefi (adet)", 12, 14, 14, 18, 58],
            ["Satış giderleri", -1850000, -1920000, -1960000, -2240000, -7970000],
          ],
        },
      ],
    }
  }
  const cust = customerOf(title)
  return {
    type: "sheet",
    csv,
    sheets: [
      {
        name: "Sayfa1",
        cols: ["Başlık", "Değer", "Önceki Dönem", "Değişim", "Açıklama"],
        fmt: ["text", "money", "money", "pct", "text"],
        rows: [
          [cust ? `${cust.account} — yıllık hacim` : "Toplam hacim", 2840000, 2510000, 0.131, ""],
          ["Ortalama sipariş tutarı", 48200, 45100, 0.069, ""],
          ["Aktif sözleşme", 14, 12, 0.167, "Adet"],
          ["Açık fırsat", 6, 7, -0.143, "Adet"],
          ["Tahsilat süresi (gün)", 42, 47, -0.106, "İyileşme"],
        ],
      },
    ],
  }
}

function genericSlides(name) {
  const title = strip(name)
  const cust = customerOf(title)
  return {
    type: "slides",
    slides: [
      {
        layout: "title",
        title,
        sub: cust ? `${cust.account} · Midea` : "Midea · 2026",
      },
      {
        layout: "bullets",
        title: "Gündem",
        bullets: [
          "Mevcut durum",
          "Hedefler ve öncelikler",
          "Önerilen yol haritası",
          "Sonraki adımlar",
        ],
      },
      {
        layout: "kpi",
        title: "Temel göstergeler",
        kpis: [
          ["Hedef", "15,5 M₺", ""],
          ["Gerçekleşen", "12,1 M₺", "+8%"],
          ["Müşteri", "42", "+5"],
          ["NPS", "52", "+3"],
        ],
      },
      {
        layout: "bullets",
        title: "Sonraki adımlar",
        bullets: ["Sorumlu ve tarihlerin netleşmesi", "Paydaş onayları", "Aylık takip toplantısı"],
      },
    ],
  }
}

/** Bir düğümün içeriği — kahraman tarifi ya da addan türetilmiş olanı. */
export function contentFor(node) {
  if (node.k && HERO[node.k]) return HERO[node.k]
  switch (node.ext) {
    case "xlsx":
    case "xls":
      return genericSheet(node.name, false)
    case "csv":
      return genericSheet(node.name, true)
    case "docx":
    case "doc":
      return genericDoc(node.name, false)
    case "pdf":
      return genericDoc(node.name, true)
    case "pptx":
    case "ppt":
      return genericSlides(node.name)
    case "png":
    case "jpg":
    case "jpeg":
      return { type: "image", art: "campaign" }
    case "txt":
      return { type: "text", text: strip(node.name) }
    default:
      return null
  }
}

/** Arama için düz metin (özet satırı ve içerikte eşleşme). */
export function plainTextOf(content) {
  if (!content) return ""
  const out = []
  if (content.type === "sheet") {
    for (const s of content.sheets) {
      out.push(s.name, ...s.cols)
      for (const r of s.rows) out.push(...r.filter((v) => typeof v === "string"))
    }
  } else if (content.type === "doc") {
    for (const b of content.blocks) {
      if (typeof b[1] === "string") out.push(b[1])
      else if (b[0] === "meta") out.push(...b[1].map((kv) => kv.join(" ")))
      else if (Array.isArray(b[1])) out.push(...b[1].map(String))
      if (b[0] === "table") out.push(...b[2].flat().map(String))
    }
  } else if (content.type === "slides") {
    for (const s of content.slides) {
      out.push(
        s.title,
        s.sub ?? "",
        ...(s.bullets ?? []),
        ...(s.kpis ?? []).map((k) => k.join(" ")),
      )
    }
  } else if (content.type === "text") out.push(content.text)
  return out.filter(Boolean).join(" · ")
}
