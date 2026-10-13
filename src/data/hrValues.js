/**
 * ═══════════════════════════════════════════════════════════════════════
 *  İK DEĞER LİSTELERİ — Akışım'ın "Masraf gir" · "Avans gir" şablonları
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Kaynak: İK asistanının (HR MCP) değer listeleri — masraf kategorileri,
 * şirketler, avans amaçları, ödeme yöntemleri ve para birimleri. Tarayıcı
 * MCP'ye doğrudan soramıyor (araç Copilot Studio'nun arkasında), o yüzden
 * burada DONDURULMUŞ bir kopya duruyor — betikle üretildi, elle yazılmadı.
 *
 * ⚠️ **HR MCP İLE BİRLİKTE DEĞİŞİR.** Oraya bir kategori ya da şirket eklenirse
 * buraya da eklenmeli. Eklenmezse seçici o değeri SUNMAZ, ama kalem düğmesiyle
 * serbest metne geçen kullanıcı yine yazabilir — eksik liste bir ENGEL değil,
 * bir KISAYOL kaybı. Tersi daha pahalı: burada olup MCP'de olmayan bir değer
 * asistandan "tanınmadı" cevabı aldırır.
 *
 * ⚠️ **ADLAR ÇEVRİLMEZ.** Kategori başlıkları ve şirket unvanları ERP'nin kendi
 * yazımı; MCP başlığı BİREBİR eşleyip ERP değerine çeviriyor
 * (`_match_categories`) ve çevrilmiş bir ad o eşleşmeyi kırardı. Arayüzün
 * kendi metinleri (amaç · ödeme · alan etiketleri) dört sözlükte.
 *
 * ⚠️ **ŞİRKET KOD İLE GİDER.** Kod her zaman tektir; unvan iki şirkette aynı
 * olabilir ve adla gönderim "belirsiz" cevabı ve bir tur daha demekti.
 */

/**
 * Masraf kategorileri — `[başlık, ERP değeri]`, MCP'nin sırası (yurtiçi/yurtdışı seyahat başta).
 * Sohbet şablonu BAŞLIĞI gönderir (MCP onu ERP değerine çevirir); ERP'den okunan masraf
 * satırında ise DEĞER gelir (`mserp_costtype`) — Self Servis başlığı bu eşlemeyle bulur.
 * Değerler tyraHR'nin kategori listesiyle (`TYROExpenseEntry` konusu) birebir.
 */
export const EXPENSE_CATEGORY_PAIRS = [
  ["Konaklama (Yurtiçi)", "y.içi konaklama"],
  ["Seyahat yemek (Yurtiçi)", "y.içi seyahat yemek"],
  ["Ulaşım (Yurtiçi)", "y.içi ulaşım"],
  ["Yemek (Yurtiçi)", "y.içi yemek"],
  ["Kargo (Yurtiçi)", "Yurtiçi Kargo Giderleri"],
  ["Götürü giderler (Yurtdışı)", "y.dışı götürü giderler"],
  ["Konaklama (Yurtdışı)", "y.dışı konaklama"],
  ["Ulaşım (Yurtdışı)", "y.dışı ulaşım"],
  ["Yemek (Yurtdışı)", "y.dışı yemek"],
  ["Çıkış ve pasaport harç (Yurtdışı)", "Yurtdışı Çıkış ve Pasaport Harç"],
  ["Kargo (Yurtdışı)", "Yurtdışı Kargo Giderleri"],
  ["Ağırlama ve konaklama", "Ağırlama ve Konaklama Gid."],
  ["Analiz giderleri", "Analiz Giderleri"],
  ["Bağış ve yardım", "Bağış ve Yardım Giderleri"],
  ["Bilgisayar malzemeleri bakım o.", "Bilgisayar Malzemeleri Bakım O."],
  ["Bina ve çevre bakım onarım", "Bina ve Çevre Bakım Onarım Gid"],
  ["Demirbaşlar bakım onarım", "Demirbaşlar Bakım Onarım Gider"],
  ["Departman yemek ekip", "Departman yemek ekip"],
  ["Diğer çeşitli giderler", "Diğer Çeşitli Giderler"],
  ["Diğer haberleşme", "Diğer Haberleşme"],
  ["Diğer işlemler", "Diğer İşlemler"],
  ["Diğer kkeg", "Diğer KKEG"],
  ["Diğer temsil ağırlama", "Diğer Temsil Ağırlama Gid."],
  ["Diğer vergiler", "Diğer Vergiler"],
  ["Dışardan sağlanan pers. gider.", "Dışardan Sağlanan Pers. Gider."],
  ["Eğitim giderleri", "Eğitim Giderleri"],
  ["Fazla mesai ulaşım", "Fazla Mesai Ulaşım Gideri"],
  ["Fazla mesai yemek", "Fazla Mesai Yemek Gideri"],
  ["Gider kaydedilen küçük demirbaşlar", "Gider Kaydedilen Küçük Demirbaşlar"],
  ["Giyim yardımı", "Giyim Yardımı"],
  ["İlaç ve tedavi", "İlaç ve Tedavi Giderleri"],
  ["Kayıt tescil", "Kayıt Tescil Giderleri"],
  ["Kırtasiye", "Kırtasiye Gid."],
  ["Lisans bakım güncelleme", "Lisans Bakım Güncelleme Giderl"],
  ["Matbaa", "Matbaa Giderleri"],
  ["Noter", "Noter Giderleri"],
  ["Oda aidatları", "Oda Aidatları"],
  ["Otel rezervasyon", "OTEL REZERVASYON"],
  ["Sertifika", "Sertifika Giderleri"],
  ["Sosyal aktivite", "Sosyal Aktivite Gd."],
  ["Taşıt akaryakıt", "Taşıt Akaryakıt Gid."],
  ["Taşıt bakım onarım", "Taşıt Bakım Onarım Gid."],
  ["Taşıt hgs/ogs", "Taşıt HGS/OGS Gid."],
  ["Taşıt kira", "Taşıt Kira Giderleri"],
  ["Taşıt otopark", "Taşıt Otopark Gid."],
  ["Temizlik", "Temizlik Giderleri"],
  ["Temizlik malzemesi", "Temizlik Malzemesi Giderleri"],
  ["Temsil ağırlama yemek", "Temsil Ağırlama Yemek Giderler"],
  ["Tesis, makine ve cihazlar bakım", "Tesis, Makine ve Cihazlar Bakım"],
  ["Ticaret odası", "Ticaret Odası Gideri"],
  ["Toplantı ve organizasyon", "Toplantı ve Organizasyon Gider"],
  ["Toplantı, fuar ve organizasyon", "Toplantı, Fuar ve Organizasyon"],
  ["Uçuş rezervasyon", "UÇUŞ REZERVASYON"],
  ["Vergi cezaları", "Vergi Cezaları"],
]

/** Kategori başlıkları — sohbet şablonunun seçicisi. */
export const EXPENSE_CATEGORIES = EXPENSE_CATEGORY_PAIRS.map(([title]) => title)

/** Yansıtma şirketleri — kod → ERP unvanı (DEMO: Midea grubunun kurgusal şirketleri). */
export const COMPANIES = {
  VGTR: "MIDEA TİCARET A.Ş.",
  VGLJ: "MIDEA LOJİSTİK HİZMETLERİ A.Ş.",
  VGTK: "MIDEA TEKNOLOJİ VE DANIŞMANLIK A.Ş.",
  VGPZ: "MIDEA PERAKENDE PAZARLAMA A.Ş.",
  VGEN: "MIDEA ENERJİ ÇÖZÜMLERİ A.Ş.",
  VGAE: "MIDEA TRADING FZE",
  VGDE: "Midea GmbH",
  VGNL: "Midea B.V.",
  VGUK: "Midea Ltd.",
  VGUS: "Midea Inc.",
}

export const COMPANY_CODES = Object.keys(COMPANIES)

/** Para birimleri — `create_cash_advance`in belgelediği dört birim. */
export const CURRENCIES = ["TRY", "USD", "EUR", "GBP"]

/**
 * Avans amacı — anahtar → ERP değeri. Arayüz etiketi sözlükte
 * (`myspace.purpose.<anahtar>`); TR etiketi ERP değerinin BİREBİR aynısı.
 */
export const ADVANCE_PURPOSES = {
  business: "İş",
  fair: "Fuar",
  congress: "Kongre",
  visit: "Müşteri Ziyareti",
  other: "Diğer",
}

/** Ödeme yöntemi — anahtar → MCP'nin kabul ettiği değer (`_PAYMENT_MODES`). */
export const PAYMENT_MODES = { bank: "Bank", cash: "Case" }
