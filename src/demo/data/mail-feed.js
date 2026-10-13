// Keşfet akışının gönderileri — kurumsal kutulardan gelen iş bildirimleri. Akış bunları
// kullanıcının KENDİ posta kutusundan okur (`/me/messages`, gönderen adresine göre);
// burada bir Outlook kuralıyla "Şirket Duyuruları" klasörüne taşınmış hâlde dururlar.
// TÜMÜ KURGUSAL.
import { FEED_SOURCES } from "@/lib/feedPolicy"
import { DIRECTORY } from "./people-directory"
import { bulletinHtml, shortDate, workdaysAhead } from "./mail-compose"

const NAMES = {
  haberler: "Midea Haberler",
  duyuru: "Midea Duyuru",
  ik: "Midea İnsan Kaynakları",
  egitim: "Midea Eğitim",
  akademi: "Midea Dijital Akademi",
  kulup: "Midea Kulüp",
}

/** Kanalın gönderen kutusu — adres TEK yerden (`feedPolicy.js`). */
export function feedSender(tag) {
  const source = FEED_SOURCES.find((s) => s.tag === tag)
  return { displayName: NAMES[tag] ?? "Midea", mail: source?.address ?? `${tag}@midea.com` }
}

const ALL = { displayName: "Tüm Çalışanlar", mail: "tum.calisanlar@midea.com" }
const SALES = { displayName: "Satış Ekibi", mail: "satis.ekibi@midea.com" }

const ACCENT = {
  haberler: "#1d4ed8",
  duyuru: "#0f766e",
  ik: "#be185d",
  egitim: "#b45309",
  akademi: "#6d28d9",
  kulup: "#c2410c",
}

const PORTAL = "https://portal.midea.com"

/** Önümüzdeki 7 günde doğum günü olanlar (dizindeki doğum günü alanından). */
function birthdaysThisWeek(now) {
  const out = []
  for (const p of DIRECTORY) {
    if (!p.birthday) continue
    const b = new Date(p.birthday)
    const next = new Date(now.getFullYear(), b.getUTCMonth(), b.getUTCDate())
    const diff = Math.round((next - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000)
    if (diff >= 0 && diff <= 7) out.push({ p, date: next })
  }
  return out.sort((a, b) => a.date - b.date)
}

const upper = (s) => s.toLocaleUpperCase("tr")

/** Akış gönderileri: `{ key, tag, subject, when, isRead, poster?, html, attachments?, … }`. */
export function feedSpecs(now) {
  const workshop = workdaysAhead(now, 6)
  const webinar = workdaysAhead(now, 3)
  const security = workdaysAhead(now, 8)
  const birthdays = birthdaysThisWeek(now)

  const post = (spec) => ({
    folder: "duyurular",
    from: feedSender(spec.tag),
    to: [spec.audience ?? ALL],
    ...spec,
  })

  const list = [
    post({
      key: "feed-01",
      tag: "haberler",
      audience: SALES,
      subject: "Büyük kazanım: Nordis Lojistik ile 3 yıllık filo telematik anlaşması",
      when: [1, "09:05"],
      isRead: false,
      poster: {
        colors: ["#1e3a8a", "#0ea5e9"],
        eyebrow: "KAZANILAN FIRSAT",
        title: "Nordis Lojistik ile 3 yıllık anlaşma",
        subtitle: "420 araçta Midea Track filo telematik",
        motif: "handshake",
        data: { left: "VG", right: "NL", ink: "#1e3a8a" },
      },
      parts: [
        "İstanbul satış ekibimiz, Nordis Lojistik ile <b>36 ay süreli</b> filo telematik anlaşmasını imzaladı. Anlaşma 420 aracı kapsıyor ve ilk yıl yaklaşık <b>1,9 milyon €</b> yıllık tekrarlayan gelir anlamına geliyor.",
        "Pilot süreci boyunca yakıt tüketiminde %11 tasarruf ve teslimat sürelerinde %8 iyileşme ölçüldü — müşterinin karar gerekçesi tam olarak bu sonuçlar oldu.",
        "Emeği geçen herkese teşekkürler:",
        [
          "<b>Doğukan Arslan</b> ve <b>Ece Yıldız</b> — satış ve müşteri yönetimi",
          "<b>Elif Güneş</b> — pilot teknik kurgusu",
          "<b>Barış Yalçın</b> — sözleşme süreci",
          "<b>Onur Tekin</b> — devreye alma planı",
        ],
      ],
      cta: { label: "Başarı hikâyesini oku", href: `${PORTAL}/haberler/nordis` },
    }),
    post({
      key: "feed-02",
      tag: "egitim",
      audience: SALES,
      subject: "Satış Akademisi: İleri Müzakere Teknikleri atölyesi — kayıtlar açıldı",
      when: [1, "14:10"],
      isRead: false,
      poster: {
        colors: ["#92400e", "#f59e0b"],
        eyebrow: "SATIŞ AKADEMİSİ",
        title: "İleri Müzakere Teknikleri",
        subtitle: "Yarım günlük uygulamalı atölye · 16 kişilik kontenjan",
        motif: "calendar",
        data: {
          month: upper(new Intl.DateTimeFormat("tr-TR", { month: "long" }).format(workshop)),
          day: String(workshop.getDate()),
          label: "09:30 – 13:00",
          ink: "#b45309",
        },
      },
      parts: [
        `Satış Akademisi'nin bu dönemki atölyesi <b>${shortDate(workshop)}</b> tarihinde Levent ofisinde. Gerçek vakalar üzerinden çalışacağız:`,
        [
          "İskonto talebine değer odaklı yanıt verme",
          "Satın alma komitesiyle çok paydaşlı müzakere",
          "Uzun vadeli sözleşmede fiyat koruma maddeleri",
        ],
        "Kontenjan 16 kişi; öncelik müşteri yöneticilerinde. Kayıt için portalı kullanabilirsiniz.",
      ],
      cta: { label: "Kayıt ol", href: `${PORTAL}/akademi/muzakere` },
    }),
    post({
      key: "feed-03",
      tag: "duyuru",
      subject: "2027 fiyat listesi yayınlandı — 1 Kasım'dan itibaren geçerli",
      when: [2, "10:00"],
      isRead: false,
      importance: "high",
      audience: SALES,
      poster: {
        colors: ["#134e4a", "#14b8a6"],
        eyebrow: "FİYAT LİSTESİ",
        title: "2027 fiyat listesi yayında",
        subtitle: "1 Kasım'dan itibaren tüm yeni tekliflerde geçerli",
        motif: "tag",
        data: { text: "2027", sub: "FİYAT LİSTESİ", ink: "#0f766e" },
      },
      attachments: [
        {
          name: "Midea_2027_Fiyat_Listesi.pdf",
          kind: "pdf",
          doc: {
            title: "Midea 2027 Fiyat Listesi (Özet)",
            color: "#0f766e",
            meta: ["Geçerlilik: 1 Kasım itibarıyla", "Para birimi: ₺ (KDV hariç)"],
            table: [
              ["Ürün", "2026 (₺)", "2027 (₺)"],
              ["Midea Sense enerji sensörü", "2.290", "2.450"],
              ["Midea Track araç ünitesi", "7.800", "8.250"],
              ["Ağ geçidi", "7.400", "7.650"],
              ["Midea Cloud — kullanıcı/yıl", "4.400", "4.700"],
              ["Kurulum (gün)", "18.000", "19.500"],
            ],
            paragraphs: [
              "31 Ekim'e kadar müşteriye iletilmiş teklifler 60 gün boyunca 2026 fiyatlarıyla geçerlidir.",
            ],
          },
        },
      ],
      parts: [
        "2027 fiyat listesi CRM'e ve teklif şablonlarına yüklendi. Ortalama fiyat artışı <b>%6,4</b>; abonelik ürünlerinde 36 aylık taahhüde ek %4 avantaj korunuyor.",
        "Geçiş kuralları:",
        [
          "31 Ekim'e kadar iletilen teklifler 60 gün eski fiyatla geçerli",
          "1 Kasım'dan sonra oluşturulan her teklif yeni listeden fiyatlanır",
          "Kanal ortağı fiyatları ayrıca duyurulacak",
        ],
        "Özet liste ektedir; ayrıntılı liste CRM'deki ürün kataloğunda.",
      ],
    }),
    post({
      key: "feed-04",
      tag: "ik",
      subject: "İyi ki aramıza katıldınız - Welcome aboard // IRMAK SEZER // TUNA KOCAMAN // DERYA ÖNAL",
      when: [3, "11:00"],
      isRead: false,
      poster: {
        colors: ["#9d174d", "#f472b6"],
        eyebrow: "ARAMIZA HOŞ GELDİNİZ",
        title: "Yeni ekip arkadaşlarımız",
        subtitle: "Irmak, Tuna ve Derya'ya hoş geldin diyelim!",
        motif: "avatars",
        data: { people: ["IS", "TK", "DÖ"] },
      },
      parts: [
        "Bu ay aramıza katılan ekip arkadaşlarımıza hoş geldin diyoruz:",
        [
          "<b>Irmak Sezer</b> — Sales Executive, Ankara bölgesi",
          "<b>Tuna Kocaman</b> — Digital Marketing Specialist, Pazarlama",
          "<b>Derya Önal</b> — Inside Sales Representative, İhracat Satış",
        ],
        "Kendilerine başarılar diliyor, ilk haftalarında yardımcı olacak herkese teşekkür ediyoruz.",
        "<i>We are so glad you've joined us — welcome to Midea!</i>",
      ],
    }),
    post({
      key: "feed-05",
      tag: "akademi",
      subject: "TYRO ile 15 dakikada teklif taslağı — canlı webinar",
      when: [3, "15:30"],
      isRead: true,
      poster: {
        colors: ["#4c1d95", "#a78bfa"],
        eyebrow: "DİJİTAL AKADEMİ · WEBINAR",
        title: "TYRO ile 15 dakikada teklif taslağı",
        subtitle: `${shortDate(webinar)} · 12:30 · Çevrim içi`,
        motif: "play",
      },
      parts: [
        "TYRO asistanının satış ekipleri için en çok kullanılan senaryosunu canlı gösteriyoruz: müşteri postasından ihtiyaçları çıkarmak, fiyat listesinden kalemleri seçmek ve onaya hazır bir teklif taslağı oluşturmak.",
        [
          "Teklif şablonunun müşteri sektörüne göre uyarlanması",
          "İskonto politikasının otomatik kontrolü",
          "Taslağın CRM fırsatına eklenmesi",
        ],
        "Kayıt olmayanlar için oturum kaydı Dijital Akademi kütüphanesine eklenecek.",
      ],
      cta: { label: "Takvimime ekle", href: `${PORTAL}/akademi/tyro-teklif` },
    }),
    post({
      key: "feed-06",
      tag: "duyuru",
      subject: "Midea CRM 5.3 sürüm notları: fırsat skorlama ve TYRO entegrasyonu",
      when: [4, "09:30"],
      isRead: true,
      poster: {
        colors: ["#312e81", "#6366f1"],
        eyebrow: "SÜRÜM NOTLARI",
        title: "Midea CRM 5.3 yayında",
        subtitle: "Fırsat skorlama · TYRO entegrasyonu · yeni pipeline panosu",
        motif: "window",
        data: { badge: "v5.3", ink: "#4f46e5" },
      },
      parts: [
        "Midea CRM 5.3 bu sabah tüm kullanıcılara açıldı. Satış ekiplerini ilgilendiren yenilikler:",
        [
          "<b>Fırsat skorlama:</b> geçmiş kazanımlara göre 0–100 arası kapanış olasılığı",
          "<b>TYRO entegrasyonu:</b> fırsat kartından tek tıkla özet ve sonraki adım önerisi",
          "<b>Pipeline panosu:</b> aşama bazlı sürükle-bırak ve bölge filtresi",
          "Mobil uygulamada ziyaret notunu sesle girme",
        ],
        "Bilinen sorun: eski tarayıcı sürümlerinde panonun ilk yüklemesi yavaş olabilir; güncel bir tarayıcı önerilir.",
      ],
      cta: { label: "Tüm sürüm notları", href: `${PORTAL}/crm/surum-notlari` },
    }),
    post({
      key: "feed-08",
      tag: "haberler",
      subject: "3. çeyrek satış sonuçları: hedefin %108'i — teşekkürler ekip!",
      when: [6, "10:00"],
      isRead: true,
      poster: {
        colors: ["#0c4a6e", "#22d3ee"],
        eyebrow: "ÇEYREK SONUÇLARI",
        title: "3. çeyrekte hedefin %108'i",
        subtitle: "Yıllık tekrarlayan gelir %21 büyüdü",
        motif: "bars",
        data: { values: [86, 94, 101, 108], labels: ["Oca", "Nis", "Tem", "Eyl"], badge: "%108" },
      },
      parts: [
        "Üçüncü çeyreği satış hedefinin <b>%108</b>'i ile kapattık. Öne çıkanlar:",
        {
          table: [
            ["Bölge", "Gerçekleşme", "Hedefe oran"],
            ["İstanbul", "14,9 Mn ₺", "%112"],
            ["Ankara", "8,2 Mn ₺", "%104"],
            ["İzmir & Kanal", "6,7 Mn ₺", "%101"],
            ["İhracat", "3,1 Mn €", "%109"],
          ],
        },
        "Yeni müşteri sayısı 23'e ulaştı; abonelik gelirlerinin toplam satıştaki payı ilk kez %40'ı geçti.",
      ],
    }),
    post({
      key: "feed-10",
      tag: "haberler",
      subject: "'Akıllı Filo' kampanyası başladı — ilk yıl %15 avantaj",
      when: [5, "09:00"],
      isRead: true,
      audience: SALES,
      poster: {
        colors: ["#7c2d12", "#fb923c"],
        eyebrow: "KAMPANYA",
        title: "Akıllı Filo kampanyası başladı",
        subtitle: "Yeni filo müşterilerine ilk yıl %15 avantaj · yıl sonuna kadar",
        motif: "broadcast",
      },
      parts: [
        "Pazarlama ekibimizin hazırladığı 'Akıllı Filo' kampanyası yayında. 50 ve üzeri araçlı yeni müşterilere ilk yıl abonelik bedelinde %15 avantaj sunuluyor.",
        [
          "Dijital reklam ve sektörel e-bülten ile 12.000 karar vericiye ulaşım",
          "Webinar leadleri skorlanarak bölgelere dağıtıldı",
          "Kampanya kodu CRM'de: <b>AKILLIFILO27</b>",
        ],
        "Kampanya materyallerine satış portalının 'Pazarlama Kiti' bölümünden erişebilirsiniz.",
      ],
      cta: { label: "Pazarlama kitini aç", href: `${PORTAL}/pazarlama/akilli-filo` },
    }),
    post({
      key: "feed-09",
      tag: "kulup",
      subject: "Midea Koşu Takımı İstanbul Maratonu'na hazırlanıyor",
      when: [6, "12:30"],
      isRead: true,
      poster: {
        colors: ["#9a3412", "#fdba74"],
        eyebrow: "MIDEA KULÜP",
        title: "Koşu takımımız maratona hazırlanıyor",
        subtitle: "Cumartesi sabahları Belgrad Ormanı'nda ortak antrenman",
        motif: "route",
      },
      parts: [
        "Midea Koşu Takımı bu yıl 27 kişiyle İstanbul Maratonu'nda! 15 km ve 42 km parkurlarında koşacak arkadaşlarımız için cumartesi sabahları ortak antrenman yapıyoruz.",
        "Koşuya katılmasan da destek ekibine katılabilirsin — bitiş çizgisinde Midea standı kuruyoruz.",
      ],
      cta: { label: "Takıma katıl", href: `${PORTAL}/kulup/kosu` },
    }),
    post({
      key: "feed-11",
      tag: "egitim",
      subject: "Bilgi Güvenliği farkındalık eğitimi: son tarih yaklaşıyor",
      when: [8, "10:00"],
      isRead: true,
      poster: {
        colors: ["#115e59", "#2dd4bf"],
        eyebrow: "ZORUNLU EĞİTİM",
        title: "Bilgi Güvenliği 2026",
        subtitle: `Son tamamlama tarihi: ${shortDate(security)}`,
        motif: "shield",
      },
      parts: [
        `Yıllık Bilgi Güvenliği farkındalık eğitiminin son tamamlama tarihi <b>${shortDate(security)}</b>. Eğitim 35 dakika sürüyor ve mobil cihazdan da tamamlanabiliyor.`,
        [
          "Oltalama (phishing) postalarını tanıma",
          "Müşteri verisinin paylaşım kuralları",
          "Yapay zekâ asistanlarıyla güvenli çalışma",
        ],
      ],
      cta: { label: "Eğitimi başlat", href: `${PORTAL}/ogrenme/bilgi-guvenligi` },
    }),
    post({
      key: "feed-12",
      tag: "duyuru",
      subject: "Hatırlatma: güncellenen iskonto onay politikası",
      when: [9, "16:00"],
      isRead: true,
      audience: SALES,
      parts: [
        "Ekim başında güncellenen iskonto onay politikasını hatırlatırız. Teklif üzerindeki toplam iskonto oranına göre onay mercileri:",
        {
          table: [
            ["İskonto", "Onaylayan", "Süre"],
            ["%0 – %10", "Satış Müdürü", "Aynı gün"],
            ["%10 – %20", "Satış Direktörü", "1 iş günü"],
            ["%20 üzeri", "Ticari Direktör + Finans", "3 iş günü"],
          ],
        },
        "36 ay ve üzeri sözleşmelerde peşinat oranı %30'un altına düşürülemez. Onaylar CRM'deki teklif akışı üzerinden alınmalıdır; e-posta onayı tek başına geçerli değildir.",
      ],
    }),
    post({
      key: "feed-13",
      tag: "haberler",
      subject: "Müşteri memnuniyeti 3. çeyrek sonuçları: NPS 62",
      when: [12, "11:00"],
      isRead: true,
      poster: {
        colors: ["#14532d", "#4ade80"],
        eyebrow: "MÜŞTERİ DENEYİMİ",
        title: "Müşteri memnuniyetinde NPS 62",
        subtitle: "Önceki çeyreğe göre +7 puan · 214 yanıt",
        motif: "gauge",
        data: { value: 62, label: "NPS" },
      },
      parts: [
        "3. çeyrek müşteri memnuniyeti anketine 214 müşteri yanıt verdi. Net Tavsiye Skorumuz <b>62</b> (önceki çeyrek 55).",
        [
          "En çok takdir edilen: destek ekibinin hızı ve kurulum kalitesi",
          "Geliştirme alanı: raporların dışa aktarımı ve mobil uygulama",
          "Perakende segmenti NPS 71 ile en yüksek skor",
        ],
        "Detaylı sonuçlar Müşteri Başarısı ekibinin panosunda.",
      ],
    }),
    post({
      key: "feed-14",
      tag: "akademi",
      subject: "Midea CRM'de pipeline panosunu verimli kullanmanın 5 yolu",
      when: [13, "14:00"],
      isRead: true,
      poster: {
        colors: ["#5b21b6", "#c084fc"],
        eyebrow: "DİJİTAL AKADEMİ · İPUÇLARI",
        title: "Pipeline panosunda 5 ipucu",
        subtitle: "Forecast'i dakikalar içinde güncel tutun",
        motif: "line",
      },
      parts: [
        "Yeni pipeline panosuyla forecast güncellemesi artık dakikalar sürüyor. Öne çıkan beş ipucu:",
        [
          "Kayıtlı görünümler: bölge ve aşama filtrelerini kaydedin",
          "Sürükle-bırak ile aşama değiştirme",
          "Kapanış tarihi geçmiş fırsatlar için akıllı uyarı",
          "Fırsat kartında TYRO özeti",
          "Haftalık özet postasını kendinize göre ayarlama",
        ],
      ],
      cta: { label: "Kısa videoyu izle", href: `${PORTAL}/akademi/pipeline-ipuclari` },
    }),
    post({
      key: "feed-15",
      tag: "duyuru",
      subject: "Q4 satış hedefleri bölgelere dağıtıldı",
      when: [15, "09:00"],
      isRead: true,
      audience: SALES,
      parts: [
        "4. çeyrek satış hedefleri yönetim tarafından onaylandı ve bölgelere dağıtıldı. Şirket geneli Q4 hedefi <b>41,5 milyon ₺</b> ve <b>3,4 milyon €</b> ihracat.",
        "Bölge müdürleri kişisel hedefleri bu hafta içinde ekipleriyle paylaşacak. Prim ve hızlandırıcı kuralları önceki çeyrekle aynıdır.",
      ],
    }),
    post({
      key: "feed-16",
      tag: "ik",
      subject: "Yan haklar portalı yenilendi: esnek yan hak seçimi başladı",
      when: [18, "10:00"],
      isRead: true,
      parts: [
        "Yenilenen yan haklar portalında 2027 dönemi için esnek yan hak seçimleri başladı. Bu yıl ilk kez:",
        [
          "Özel sağlık sigortasına aile bireyi ekleme",
          "Yemek kartı ile ulaşım desteği arasında bütçe aktarımı",
          "Eğitim ve sertifika bütçesi",
        ],
        "Seçimlerin ay sonuna kadar tamamlanması gerekiyor.",
      ],
      cta: { label: "Portala git", href: `${PORTAL}/yan-haklar` },
    }),
    post({
      key: "feed-17",
      tag: "kulup",
      subject: "Kulüp Akşamı: masa tenisi turnuvası kayıtları açıldı",
      when: [20, "17:45"],
      isRead: true,
      poster: {
        colors: ["#7c2d12", "#f97316"],
        eyebrow: "MIDEA KULÜP",
        title: "Masa tenisi turnuvası",
        subtitle: "Ay sonu Kulüp Akşamı · Levent ofisi teras katı",
        motif: "trophy",
      },
      parts: [
        "Ay sonundaki Kulüp Akşamı'nda masa tenisi turnuvası düzenliyoruz. Tekler ve çiftler kategorileri var; kayıtlar hafta sonuna kadar açık.",
        "Yarışmasan da gel — ikram ve müzik bizden!",
      ],
      cta: { label: "Kayıt formu", href: `${PORTAL}/kulup/masa-tenisi` },
    }),
  ]

  // Doğum günü duyurusu: dizinde bu hafta doğum günü olan varsa adlarıyla.
  if (birthdays.length) {
    list.push(
      post({
        key: "feed-07",
        tag: "ik",
        subject: `Bu haftanın doğum günleri — iyi ki doğdunuz // ${birthdays
          .slice(0, 3)
          .map(({ p }) => upper(p.displayName))
          .join(" // ")}`,
        when: [2, "09:15"],
        isRead: true,
        poster: {
          colors: ["#831843", "#fb7185"],
          eyebrow: "İYİ Kİ DOĞDUNUZ",
          title: "Bu haftanın doğum günleri",
          subtitle: birthdays
            .slice(0, 3)
            .map(({ p }) => p.givenName)
            .join(", "),
          motif: "avatars",
          data: {
            people: birthdays.slice(0, 3).map(({ p }) => `${p.givenName[0]}${p.surname[0] ?? ""}`),
          },
        },
        parts: [
          "Bu hafta doğum günü olan ekip arkadaşlarımızı kutluyoruz:",
          birthdays
            .slice(0, 3)
            .map(({ p, date }) => `<b>${p.displayName}</b> — ${p.jobTitle} · ${shortDate(date)}`),
          "Nice mutlu, sağlıklı yıllara!",
        ],
      }),
    )
  }

  return list.map(({ parts, cta, poster, ...rest }) => {
    const cid = poster ? `${rest.key}-kapak@midea.com` : null
    const attachments = [...(rest.attachments ?? [])]
    if (poster) attachments.unshift({ name: `${rest.key}-kapak.jpg`, kind: "image", inline: true, cid, poster })
    return {
      ...rest,
      attachments,
      html: bulletinHtml({
        cid,
        eyebrow: NAMES[rest.tag],
        title: rest.subject.split(" // ")[0],
        parts,
        cta,
        accent: ACCENT[rest.tag],
      }),
    }
  })
}
