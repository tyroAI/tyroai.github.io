// Satış müdürünün posta kutusu — gelen kutusu ve gönderilmiş öğeler. TÜMÜ KURGUSAL.
// Tarihler istek anındaki `now`a göredir (`at`), yani demo her gün güncel görünür.
import { COLLEAGUES, CUSTOMERS, MANAGER, ME, TEAM } from "../persona"
import { lookupUser } from "./people-directory"
import { dayName, mailHtml, shortDate, workdaysAhead } from "./mail-compose"

const [ece, mert, selin, burak, zeynep] = TEAM
const [ayse, can, leyla, onur, elif, baris] = COLLEAGUES
const [altay, nordis, ekinoks, pera, toros, orion] = CUSTOMERS.map((c) => ({
  displayName: c.contact,
  mail: c.mail,
  title: c.title,
  company: c.account,
}))

const CRM = { displayName: "Midea CRM", mail: "crm-noreply@midea.com" }

/** İmza: şirket içi kişide telefon dizinden. */
const sig = (p, lang = "tr") => ({
  name: p.displayName,
  title: p.jobTitle ?? p.title,
  company: p.company,
  phone: lookupUser(p.id)?.businessPhones?.[0],
  mail: p.mail,
  lang,
})

/**
 * Gelen kutusu ve gönderilmiş öğeler. Her öğe:
 * `{ key, folder, from, to, cc?, subject, when: [gün, "SS:DD", yedekDakika], isRead,
 *    importance?, flag?, pinned?, html, attachments? }`
 */
export function inboxSpecs(now) {
  const deadline = workdaysAhead(now, 3)
  const forecastDue = workdaysAhead(now, 1)
  const securityDue = new Date(now.getFullYear(), now.getMonth(), Math.min(now.getDate() + 11, 28))
  const regionMeeting = workdaysAhead(now, 2)

  return [
    // ── Bugün ────────────────────────────────────────────────────────────
    {
      key: "inb-01",
      folder: "inbox",
      from: altay,
      to: [ME],
      cc: [ece],
      subject: "RE: 2027 mağaza yenileme projesi — revize teklif talebi",
      when: [0, "09:12", 18],
      isRead: false,
      importance: "high",
      attachments: [
        {
          name: "Altay_Perakende_RFQ_Revize_v2.pdf",
          kind: "pdf",
          doc: {
            title: "Teklif Talebi (RFQ) — Mağaza Enerji İzleme, Revize v2",
            color: "#9a3412",
            badge: "Altay Perakende",
            meta: ["Kapsam: 180 mağaza · 3 bölge deposu", "Talep eden: Satın Alma Direktörlüğü"],
            table: [
              ["Kalem", "Adet", "Hedef birim (₺)"],
              ["Midea Sense enerji sensörü", "1.440", "2.150"],
              ["Ağ geçidi (mağaza başına)", "180", "6.900"],
              ["Midea Cloud abonelik (yıllık)", "180", "4.200"],
              ["Kurulum ve eğitim", "1", "Paket"],
            ],
            paragraphs: [
              "Toplam bütçe tavanı yıllık 4,1 milyon ₺ olarak güncellenmiştir. Teklifin 36 ay vadeli ödeme seçeneği ile sunulması rica olunur.",
              "Teklifin son teslim tarihi bu talebin gönderildiği haftanın cuma günüdür.",
            ],
            footer: "Altay Perakende A.Ş. — Satın Alma",
          },
        },
      ],
      html: mailHtml({
        greeting: "Merhaba Doğukan Bey,",
        parts: [
          "Geçen haftaki toplantımız için tekrar teşekkürler. Yönetim kurulumuz projeyi 180 mağaza ile başlatma kararı aldı; revize talebimizi ekte bulabilirsiniz.",
          "Özetle beklentilerimiz:",
          [
            "Toplam fiyatta <b>%12 iskonto</b> (ilk teklif üzerinden)",
            "Kurulumun iki dalga hâlinde yapılması — ilk dalga Ocak sonuna kadar 60 mağaza",
            "36 ay vadeli ödeme seçeneği",
          ],
          `Teklifinizi <b>${shortDate(deadline)} ${dayName(deadline)}</b> gününe kadar iletebilirseniz satın alma komitemize aynı hafta sunabiliriz.`,
        ],
        closing: "Saygılarımla,",
        sign: { name: altay.displayName, title: altay.title, company: altay.company, mail: altay.mail },
      }),
    },
    {
      key: "inb-02",
      folder: "inbox",
      from: MANAGER,
      to: [ME],
      subject: "Toros Tekstil teklifi — %18 iskonto onaylandı (şartlı)",
      when: [0, "08:47", 34],
      isRead: false,
      flag: "flagged",
      html: mailHtml({
        greeting: "Doğukan,",
        parts: [
          "Toros Tekstil için talep ettiğin %18 iskontoyu onaylıyorum, ancak iki şartla:",
          [
            "Sözleşme süresi en az <b>36 ay</b> olmalı",
            "Peşinat %30'un altına düşmemeli; kalan tutar 12 eşit taksit",
          ],
          "Bu çerçevede teklifi bugün içinde gönderebilirsin. Emre Bey farklı bir ödeme yapısı isterse bana dönmeden önce Can'la marj etkisine bakın lütfen.",
          "Eline sağlık, iyi iş çıkardınız.",
        ],
        closing: "Kerem",
        sign: sig(MANAGER),
      }),
    },
    {
      key: "inb-03",
      folder: "inbox",
      from: burak,
      to: [ME],
      cc: [MANAGER],
      subject: `Hatırlatma: Q4 forecast güncellemesi ${dayName(forecastDue)} 12:00'ye kadar`,
      when: [0, "08:05", 52],
      isRead: false,
      importance: "high",
      html: mailHtml({
        greeting: "Merhaba Doğukan,",
        parts: [
          `Q4 forecast dosyasının bölge kırılımlı güncellemesini <b>${dayName(forecastDue)} 12:00</b>'ye kadar CRM'de tamamlamanı rica ediyorum. Konsolide rakamlar aynı gün yönetime gidiyor.`,
          "Ekibindeki açık kalemler:",
          {
            table: [
              ["Fırsat", "Aşama", "Tutar (₺)"],
              ["Altay Perakende — Enerji İzleme", "Teklif", "4.100.000"],
              ["Toros Tekstil — Üretim IoT", "Pazarlık", "2.350.000"],
              ["Orion Medikal — Soğuk Zincir", "İhale", "1.780.000"],
              ["Pera Otelcilik — Ek bina", "Keşif", "640.000"],
            ],
          },
          "Kapanış olasılıklarını özellikle Altay ve Orion için gözden geçirirsen çok iyi olur.",
        ],
        closing: "Teşekkürler,",
        sign: sig(burak),
      }),
    },
    {
      key: "inb-04",
      folder: "inbox",
      from: CRM,
      to: [ME],
      subject: "Günlük fırsat özeti — 3 fırsat aşama değiştirdi",
      when: [0, "07:30", 70],
      isRead: true,
      html: mailHtml({
        greeting: "Günaydın Doğukan Arslan,",
        parts: [
          "Son 24 saatte ekibinizin fırsatlarında gerçekleşen değişiklikler:",
          {
            table: [
              ["Fırsat", "Değişiklik", "Sahibi"],
              ["Toros Tekstil — Üretim IoT", "Teklif → Pazarlık", "Mert Kaya"],
              ["Nordis Lojistik — Filo Pilot", "Pazarlık → Kazanıldı", "Doğukan Arslan"],
              ["Ekinoks Enerji — Saha İzleme", "Keşif → Teklif", "Ece Yıldız"],
            ],
          },
          "Kapanış tarihi geçmiş 2 fırsatınız var. CRM'de güncellemek için panonuzu açın.",
        ],
        closing: "Midea CRM · Bu ileti otomatik gönderilmiştir.",
      }),
    },
    // ── Dün ─────────────────────────────────────────────────────────────
    {
      key: "inb-05",
      folder: "inbox",
      from: nordis,
      to: [ME],
      cc: [ece],
      subject: "Re: Fleet telematics pilot — next steps",
      when: [1, "17:40"],
      isRead: true,
      html: mailHtml({
        greeting: "Hi Doğukan,",
        parts: [
          "Thanks for the great collaboration over the pilot. Our board signed off on the 3-year agreement this morning — congratulations to the whole Midea team.",
          "Next steps from our side:",
          [
            "Rollout to 420 vehicles starting with the Gebze hub",
            "Driver app training for our dispatch team (two sessions)",
            "Monthly KPI review with your customer success team",
          ],
          "Could you share the onboarding plan and the contact person from your CS team by end of the week?",
        ],
        closing: "Best regards,",
        sign: { name: nordis.displayName, title: nordis.title, company: nordis.company, mail: nordis.mail, lang: "en" },
      }),
    },
    {
      key: "inb-06",
      folder: "inbox",
      from: can,
      to: [ME],
      subject: "Vadesi geçen faturalar — Pera Otelcilik (2 fatura)",
      when: [1, "15:20"],
      isRead: true,
      flag: "flagged",
      html: mailHtml({
        greeting: "Selam Doğukan,",
        parts: [
          "Pera Otelcilik'in iki faturası vadesini geçti, toplam açık bakiye <b>186.400 ₺</b>:",
          {
            table: [
              ["Fatura", "Vade", "Tutar (₺)"],
              ["VG-2026-08814", "45 gün gecikme", "112.900"],
              ["VG-2026-09207", "18 gün gecikme", "73.500"],
            ],
          },
          "Hesap 60 gün eşiğini geçerse ek bina teklifinde kredi limiti onayı gerekecek. Sevgi Hanım'la bir ödeme planı konuşabilirsen finans tarafını ben hazırlarım.",
        ],
        closing: "Teşekkürler,",
        sign: sig(can),
      }),
    },
    {
      key: "inb-07",
      folder: "inbox",
      from: ayse,
      to: [ME],
      cc: [zeynep],
      subject: "Kampanya leadleri: Akıllı Filo webinarı — 42 yeni lead",
      when: [1, "11:05"],
      isRead: true,
      attachments: [
        {
          name: "Akilli_Filo_Webinar_Leadleri.csv",
          kind: "csv",
          rows: [
            ["Şirket", "Kişi", "Unvan", "Şehir", "Skor"],
            ["Marmara Gıda Dağıtım", "Ozan Er", "Lojistik Müdürü", "Bursa", "82"],
            ["Kuzey Yapı Malzemeleri", "Gizem Tan", "Operasyon Direktörü", "İstanbul", "77"],
            ["Atlas Soğuk Hava", "Hakan Kılıç", "Genel Müdür", "Kocaeli", "74"],
            ["Doğukan Kargo", "Melis Yaman", "Filo Yöneticisi", "İzmir", "69"],
            ["Anka Turizm", "Burcu Şen", "Satın Alma Uzmanı", "Antalya", "61"],
          ],
        },
      ],
      html: mailHtml({
        greeting: "Merhaba Doğukan,",
        parts: [
          "Akıllı Filo webinarına 186 kişi katıldı, bunlardan <b>42'si</b> satış görüşmesi talep etti. Skoru 60 üzerindeki leadleri bölgelere göre ekte paylaşıyorum.",
          "İlk temasın 48 saat içinde yapılmasını öneriyoruz; dönüşüm oranı bu sürede iki katına çıkıyor. Zeynep'le bölge dağılımını konuşmuştuk, onun listesi Ege ağırlıklı.",
        ],
        closing: "Kolay gelsin,",
        sign: sig(ayse),
      }),
    },
    // ── 2 gün önce ───────────────────────────────────────────────────────
    {
      key: "inb-08",
      folder: "inbox",
      from: leyla,
      to: [ME],
      subject: "Zorunlu eğitim: Bilgi Güvenliği 2026 — ekibinizde 2 kişi tamamlamadı",
      when: [2, "14:30"],
      isRead: true,
      html: mailHtml({
        greeting: "Merhaba Doğukan,",
        parts: [
          `Yıllık Bilgi Güvenliği eğitiminin son tamamlama tarihi <b>${shortDate(securityDue)}</b>. Ekibinizde henüz tamamlamamış iki kişi görünüyor: <b>Selin Aksoy</b> ve <b>Zeynep Çelik</b>.`,
          "Eğitim yaklaşık 35 dakika sürüyor ve öğrenme portalından mobil cihazdan da tamamlanabiliyor. Hatırlatmayı ekibine iletirsen sevinirim.",
        ],
        closing: "Teşekkürler,",
        sign: sig(leyla),
      }),
    },
    {
      key: "inb-09",
      folder: "inbox",
      from: ece,
      to: [ME],
      cc: [elif],
      subject: "Ekinoks Enerji demo notları + aksiyonlar",
      when: [2, "11:48"],
      isRead: true,
      html: mailHtml({
        greeting: "Doğukan merhaba,",
        parts: [
          "Ekinoks demosu çok iyi geçti, Tolga Bey özellikle saha ekipmanı alarm panosundan etkilendi. Notlarım:",
          [
            "12 rüzgâr sahası, toplam ~900 ekipman noktası",
            "Mevcut SCADA ile entegrasyon şart — API dokümanını istediler",
            "SSO (Entra ID) ve verinin Türkiye'de saklanması kritik",
            "Bütçe Q1'de netleşecek, pilot için 2 saha öneriyorlar",
          ],
          "Aksiyonlar: teknik soruları Elif'le cevaplıyoruz, pilot teklifini ben hazırlıyorum.",
        ],
        closing: "Ece",
        sign: sig(ece),
      }),
    },
    {
      key: "inb-10",
      folder: "inbox",
      from: ekinoks,
      to: [ME, ece],
      subject: "Teknik şartname soruları — SSO ve veri saklama",
      when: [2, "09:15"],
      isRead: true,
      flag: "flagged",
      html: mailHtml({
        greeting: "Merhaba Doğukan Bey, Ece Hanım,",
        parts: [
          "Demo için tekrar teşekkürler. Bilgi güvenliği ekibimizin birkaç sorusu var:",
          [
            "Platform Entra ID ile SAML/OIDC tabanlı SSO destekliyor mu?",
            "Veriler hangi veri merkezinde saklanıyor, yedekler yurt dışına çıkıyor mu?",
            "Rol bazlı yetkilendirme saha bazında kırılabiliyor mu?",
            "Son sızma testi raporunun özetini paylaşabilir misiniz?",
          ],
          "Cevaplarınızı aldıktan sonra pilot kapsamını netleştirebiliriz.",
        ],
        closing: "İyi çalışmalar,",
        sign: { name: ekinoks.displayName, title: ekinoks.title, company: ekinoks.company, mail: ekinoks.mail },
      }),
    },
    // ── 3 gün önce ───────────────────────────────────────────────────────
    {
      key: "inb-11",
      folder: "inbox",
      from: mert,
      to: [ME],
      subject: "Orion Medikal ihale dosyası — son kontrol",
      when: [3, "16:22"],
      isRead: true,
      attachments: [
        {
          name: "Orion_Medikal_Ihale_Teklif_Dosyasi.pdf",
          kind: "pdf",
          doc: {
            title: "Orion Medikal — Soğuk Zincir İzleme Teklif Dosyası",
            color: "#0f766e",
            meta: ["Hazırlayan: Mert Kaya", "Durum: Son kontrol"],
            table: [
              ["Bölüm", "Sorumlu", "Durum"],
              ["Teknik şartname uyumu", "Elif Güneş", "Tamam"],
              ["Fiyat tablosu", "Mert Kaya", "Tamam"],
              ["Referans mektupları", "Onur Tekin", "Tamam"],
              ["İmza sirküleri", "Barış Yalçın", "Bekliyor"],
            ],
            paragraphs: [
              "Teklif 6 depo ve 14 soğutuculu araç için sıcaklık ve nem izleme, alarm yönetimi ve denetim raporlamasını kapsamaktadır.",
            ],
          },
        },
      ],
      html: mailHtml({
        greeting: "Doğukan Bey,",
        parts: [
          "Orion ihale dosyasının son hâli ekte. Fiyat tablosunu Burak'la kontrol ettik; imza sirküleri Barış Bey'den bekleniyor.",
          "Bir göz atıp onay verirsen dosyayı yarın kargoya veriyorum.",
        ],
        closing: "Teşekkürler,",
        sign: sig(mert),
      }),
    },
    {
      key: "inb-12",
      folder: "inbox",
      from: pera,
      to: [ME],
      subject: "Ödeme planı hakkında",
      when: [3, "10:05"],
      isRead: true,
      html: mailHtml({
        greeting: "Doğukan Bey merhaba,",
        parts: [
          "Sezon kapanışı nedeniyle nakit akışımızda kısa süreli bir sıkışma yaşıyoruz. Açık faturalarımız için iki taksitli bir ödeme planı mümkün olur mu?",
          "Ek bina projesi için görüşmelerimize de devam etmek isteriz; mimari çizimler gelecek hafta elimizde olacak.",
        ],
        closing: "Saygılarımla,",
        sign: { name: pera.displayName, title: pera.title, company: pera.company, mail: pera.mail },
      }),
    },
    // ── 4 gün önce ───────────────────────────────────────────────────────
    {
      key: "inb-13",
      folder: "inbox",
      from: MANAGER,
      to: [ME],
      subject: "Q4 bölge hedefleri ve prim tablosu",
      when: [4, "18:10"],
      isRead: true,
      pinned: true,
      flag: "flagged",
      attachments: [
        {
          name: "Q4_Bolge_Hedefleri_Prim_Tablosu.pdf",
          kind: "pdf",
          doc: {
            title: "Q4 Satış Hedefleri ve Prim Tablosu — İstanbul Bölgesi",
            meta: ["Dönem: Ekim – Aralık", "Onaylayan: Kerem Öztürk, Satış Direktörü"],
            table: [
              ["Temsilci", "Q4 hedef (₺)", "Prim eşiği"],
              ["Ece Yıldız", "6.200.000", "%90"],
              ["Mert Kaya", "5.400.000", "%90"],
              ["Selin Aksoy", "2.800.000", "%85"],
              ["Zeynep Çelik", "1.900.000", "%85"],
              ["Bölge toplamı", "16.300.000", "—"],
            ],
            paragraphs: [
              "Hedefin %110 üzerindeki gerçekleşmeler için hızlandırıcı katsayı 1,5 olarak uygulanır. Yeni müşteri kazanımı ayrıca ödüllendirilir.",
            ],
          },
        },
      ],
      html: mailHtml({
        greeting: "Doğukan,",
        parts: [
          "Q4 hedef dağılımı ve prim tablosu ekte. Bölgenin toplam hedefi <b>16,3 milyon ₺</b>; geçen çeyreğe göre %9 artış.",
          `Ekibinle paylaşmadan önce ${dayName(regionMeeting)} günkü bölge toplantısında birlikte üzerinden geçelim.`,
        ],
        closing: "Kerem",
        sign: sig(MANAGER),
      }),
    },
    {
      key: "inb-14",
      folder: "inbox",
      from: onur,
      to: [ME],
      subject: "Altay Perakende NPS sonucu: 71 — yenileme riski düşük",
      when: [4, "13:40"],
      isRead: true,
      html: mailHtml({
        greeting: "Merhaba Doğukan,",
        parts: [
          "Altay Perakende'nin çeyreklik memnuniyet anketi sonuçlandı: <b>NPS 71</b> (önceki çeyrek 64).",
          "Öne çıkan yorumlar: hızlı destek dönüşü ve mağaza müdürlerinin paneli kolay kullanması. Geliştirme alanı olarak raporların Excel'e aktarımı istendi — ürün ekibine ilettim.",
          "Yeni teklif sürecinde referans olarak kullanabilirsin.",
        ],
        closing: "Onur",
        sign: sig(onur),
      }),
    },
    // ── 5 gün önce ───────────────────────────────────────────────────────
    {
      key: "inb-15",
      folder: "inbox",
      from: baris,
      to: [ME],
      cc: [ece],
      subject: "Nordis çerçeve sözleşmesi — redline v3",
      when: [5, "17:55"],
      isRead: true,
      attachments: [
        {
          name: "Nordis_Cerceve_Sozlesme_Redline_v3.pdf",
          kind: "pdf",
          doc: {
            title: "Çerçeve Hizmet Sözleşmesi — Nordis Lojistik (Redline v3)",
            color: "#334155",
            badge: "Hukuk — Taslak",
            meta: ["Taraflar: Midea Ticaret A.Ş. · Nordis Lojistik A.Ş.", "Süre: 36 ay"],
            paragraphs: [
              "Madde 7.2 — Hizmet seviyesi: Platform erişilebilirliği aylık %99,5 olarak taahhüt edilir. Taahhüdün altında kalınan her %0,5 için aylık abonelik bedelinden %5 indirim uygulanır.",
              "Madde 9.1 — Sorumluluğun sınırı: Tarafların toplam sorumluluğu son 12 ayda ödenen bedellerle sınırlıdır.",
              "Madde 12 — Kişisel verilerin korunması: Araç ve sürücü verileri yalnız Türkiye'deki veri merkezlerinde işlenir.",
            ],
          },
        },
      ],
      html: mailHtml({
        greeting: "Doğukan merhaba,",
        parts: [
          "Nordis hukuk ekibinin yorumlarını işledim, v3 ekte. Kabul ettiğimiz değişiklikler:",
          [
            "SLA indirim kademesi %5 (onların talebi %10'du)",
            "Veri yerelleştirme maddesi aynen kabul",
            "Sorumluluk sınırı 12 aylık bedel — değişmedi",
          ],
          "İmza öncesi ticari şartlarda bir değişiklik yoksa sözleşme imzaya hazır.",
        ],
        closing: "Saygılarımla,",
        sign: sig(baris),
      }),
    },
    {
      key: "inb-16",
      folder: "inbox",
      from: elif,
      to: [ME, ece, mert],
      subject: "Midea Track 4.2 — satış ekibi için önizleme",
      when: [5, "10:30"],
      isRead: true,
      html: mailHtml({
        greeting: "Merhaba,",
        parts: [
          "Midea Track 4.2 ay sonunda yayında. Müşteri görüşmelerinde öne çıkarabileceğiniz yenilikler:",
          [
            "Yakıt tüketimi anomali uyarıları (sürücü bazında)",
            "Rota sapması ve geç teslimat tahmini",
            "Excel'e tek tıkla rapor aktarımı — Altay'ın talebiydi",
          ],
          "Demo ortamı güncellendi; sorularınız için Perşembe 15:00'te 30 dakikalık bir oturum açtım.",
        ],
        closing: "Elif",
        sign: sig(elif),
      }),
    },
    // ── 6 gün önce ───────────────────────────────────────────────────────
    {
      key: "inb-17",
      folder: "inbox",
      from: toros,
      to: [ME],
      cc: [mert],
      subject: "Bütçe onayı ve sözleşme süresi",
      when: [6, "15:12"],
      isRead: true,
      html: mailHtml({
        greeting: "Doğukan Bey,",
        parts: [
          "Yönetim kurulumuz üretim hattı IoT projesi için bütçeyi onayladı. Teklifinizde iki noktayı netleştirmemiz gerekiyor:",
          [
            "36 aylık taahhüt karşılığında ek iskonto imkânı",
            "Peşinat oranının %30'a çekilmesi",
          ],
          "Bu hafta içinde dönüş yapabilirseniz Kasım başında kuruluma başlayabiliriz.",
        ],
        closing: "İyi çalışmalar,",
        sign: { name: toros.displayName, title: toros.title, company: toros.company, mail: toros.mail },
      }),
    },
    {
      key: "inb-18",
      folder: "inbox",
      from: selin,
      to: [ME],
      subject: "Pera Otelcilik saha ziyareti raporu",
      when: [6, "12:20"],
      isRead: true,
      html: mailHtml({
        greeting: "Doğukan Bey merhaba,",
        parts: [
          "Pera Otelcilik'in ek binasını gezdik. Kısa notlar:",
          [
            "142 oda, 3 mutfak, 1 çamaşırhane — enerji izleme için ~220 nokta",
            "Mevcut binadaki panelden memnunlar; aynı yapıyı istiyorlar",
            "Karar mercii Sevgi Hanım, bütçe Ocak'ta açılacak",
          ],
          "Keşif tutanağını CRM'e ekledim. Teklif taslağını cuma günü paylaşabilirim.",
        ],
        closing: "Selin",
        sign: sig(selin),
      }),
    },
    // ── 7 gün önce ───────────────────────────────────────────────────────
    {
      key: "inb-19",
      folder: "inbox",
      from: zeynep,
      to: [ME],
      subject: "Yeni potansiyel müşteri listesi — Ege bölgesi",
      when: [7, "16:45"],
      isRead: true,
      html: mailHtml({
        greeting: "Merhaba Doğukan,",
        parts: [
          "Ege bölgesinde filo büyüklüğü 50 aracın üzerindeki 18 şirketi listeledim. İlk 5 öncelikli hedef:",
          {
            table: [
              ["Şirket", "Sektör", "Filo"],
              ["Ege Taze Lojistik", "Gıda dağıtımı", "140"],
              ["Kordon Yapı", "İnşaat", "95"],
              ["Gediz Tarım", "Tarım ürünleri", "80"],
              ["Mavi Liman Hizmetleri", "Liman", "72"],
              ["Bornova Medikal Dağıtım", "Medikal", "60"],
            ],
          },
          "Serkan Bey'in kanal ortaklarıyla çakışma olmaması için listeyi onunla da paylaştım.",
        ],
        closing: "Zeynep",
        sign: sig(zeynep),
      }),
    },
    {
      key: "inb-20",
      folder: "inbox",
      from: orion,
      to: [ME],
      cc: [mert],
      subject: "İhale takvimi güncellendi",
      when: [7, "11:02"],
      isRead: true,
      importance: "high",
      html: mailHtml({
        greeting: "Sayın Doğukan Arslan,",
        parts: [
          "Soğuk zincir izleme ihalemizin takvimi aşağıdaki şekilde güncellenmiştir:",
          [
            "Teklif teslimi: 5 iş günü uzatıldı",
            "Teknik değerlendirme sunumları: teslimden sonraki hafta",
            "Sonuç bildirimi: ay sonu",
          ],
          "Teknik sunum için 45 dakikalık bir slot ayıracağız; tercih ettiğiniz günü bildirmenizi rica ederiz.",
        ],
        closing: "Saygılarımla,",
        sign: { name: orion.displayName, title: orion.title, company: orion.company, mail: orion.mail },
      }),
    },
    {
      key: "inb-21",
      folder: "inbox",
      from: CRM,
      to: [ME],
      subject: "Haftalık pipeline raporu — İstanbul bölgesi",
      when: [7, "07:30"],
      isRead: true,
      html: mailHtml({
        greeting: "Merhaba Doğukan Arslan,",
        parts: [
          "Bölgenizin haftalık pipeline özeti:",
          {
            table: [
              ["Aşama", "Fırsat", "Tutar (₺)"],
              ["Keşif", "7", "3.900.000"],
              ["Teklif", "5", "8.450.000"],
              ["Pazarlık", "3", "4.120.000"],
              ["Kazanıldı (çeyrek)", "4", "5.730.000"],
            ],
          },
          "Q4 hedefinin %35'i gerçekleşti; ağırlıklı pipeline hedefin 1,4 katı.",
        ],
        closing: "Midea CRM · Bu ileti otomatik gönderilmiştir.",
      }),
    },
    // ── 8–10 gün önce ────────────────────────────────────────────────────
    {
      key: "inb-22",
      folder: "inbox",
      from: burak,
      to: [ME],
      subject: "CRM'de güncellenmemiş 6 fırsat",
      when: [8, "09:35"],
      isRead: true,
      html: mailHtml({
        greeting: "Selam Doğukan,",
        parts: [
          "Ekibinde 30 gündür aktivite girilmemiş 6 fırsat var. Forecast kalitesi için kapanış tarihlerini ve aşamaları güncelleyebilir misiniz?",
          [
            "Selin Aksoy — 2 fırsat",
            "Zeynep Çelik — 3 fırsat",
            "Mert Kaya — 1 fırsat",
          ],
        ],
        closing: "Teşekkürler,",
        sign: sig(burak),
      }),
    },
    {
      key: "inb-23",
      folder: "inbox",
      from: MANAGER,
      to: [ME, lookupUser("u-volkan"), lookupUser("u-pelin"), lookupUser("u-serkan")],
      subject: `Bölge toplantısı gündemi — ${dayName(regionMeeting)}`,
      when: [1, "17:20"],
      isRead: true,
      html: mailHtml({
        greeting: "Merhaba arkadaşlar,",
        parts: [
          `${dayName(regionMeeting)} 10:00'daki bölge toplantısının gündemi:`,
          [
            "Q4 hedef dağılımı ve prim tablosu",
            "Büyük fırsatlar: Altay, Nordis, Orion",
            "Fiyat listesi 2027 geçişi ve iskonto onay politikası",
            "Kanal ortaklarıyla çakışan fırsatlar",
          ],
          "Her bölgeden en kritik 3 fırsatı 5'er dakikada anlatmanızı rica ediyorum.",
        ],
        closing: "Kerem",
        sign: sig(MANAGER),
      }),
    },
    {
      key: "inb-24",
      folder: "inbox",
      from: altay,
      to: [ME],
      subject: "Toplantı için teşekkürler",
      when: [9, "18:02"],
      isRead: true,
      html: mailHtml({
        greeting: "Doğukan Bey merhaba,",
        parts: [
          "Bugünkü sunum için siz ve Ece Hanım'a teşekkür ederim. Mağaza bazlı enerji karşılaştırma ekranı yönetim kurulumuzun da ilgisini çekti.",
          "Revize talebimizi önümüzdeki hafta ileteceğim.",
        ],
        closing: "Saygılarımla,",
        sign: { name: altay.displayName, title: altay.title, company: altay.company, mail: altay.mail },
      }),
    },
    {
      key: "inb-25",
      folder: "inbox",
      from: can,
      to: [ME],
      subject: "Ekim kapanış takvimi",
      when: [10, "10:15"],
      isRead: true,
      html: mailHtml({
        greeting: "Merhaba,",
        parts: [
          "Ekim ayı kapanışı için satış tarafında son tarihler:",
          [
            "Faturalanacak siparişlerin ERP'ye girişi: ayın son iş gününden 2 gün önce",
            "İskonto ve kampanya onaylarının tamamlanması: aynı gün 17:00",
            "Komisyon raporu: kapanıştan sonraki 5. iş günü",
          ],
        ],
        closing: "Teşekkürler,",
        sign: sig(can),
      }),
    },
    {
      key: "inb-26",
      folder: "inbox",
      from: leyla,
      to: [ME],
      subject: "Performans değerlendirme dönemi başlıyor",
      when: [10, "09:00"],
      isRead: true,
      html: mailHtml({
        greeting: "Merhaba Doğukan,",
        parts: [
          "Yıl sonu performans değerlendirme dönemi gelecek ay başlıyor. Yönetici olarak ekibinin hedef gerçekleşmelerini ve gelişim notlarını portal üzerinden gireceksin.",
          "Yöneticilere özel 45 dakikalık bilgilendirme oturumuna takviminden katılabilirsin.",
        ],
        closing: "Sevgiler,",
        sign: sig(leyla),
      }),
    },

    // ── Gönderilmiş öğeler ───────────────────────────────────────────────
    {
      key: "snt-01",
      folder: "sentitems",
      from: ME,
      to: [MANAGER],
      subject: "Altay Perakende revize teklif — %12 iskonto onayı",
      when: [0, "09:40", 6],
      isRead: true,
      html: mailHtml({
        greeting: "Kerem merhaba,",
        parts: [
          "Altay Perakende 180 mağaza ile başlamaya karar verdi ve %12 iskonto istiyor. 36 ay vadeyle marj etkisini Can'la hesapladık; brüt marj %41'den %36'ya iniyor.",
          "Kurulumu iki dalgaya bölerek nakit akışını dengeleyebiliriz. Onaylarsan teklifi cuma günü gönderiyorum.",
        ],
        closing: "Doğukan",
        sign: sig(ME),
      }),
    },
    {
      key: "snt-02",
      folder: "sentitems",
      from: ME,
      to: [nordis],
      cc: [onur],
      subject: "Re: Fleet telematics pilot — next steps",
      when: [1, "18:05"],
      isRead: true,
      html: mailHtml({
        greeting: "Hi Hande,",
        parts: [
          "Wonderful news — thank you for your trust. I'm copying Onur Tekin, who will be your customer success manager; he'll share the onboarding plan by Friday.",
          "Looking forward to a great partnership.",
        ],
        closing: "Best regards,",
        sign: sig(ME, "en"),
      }),
    },
    {
      key: "snt-03",
      folder: "sentitems",
      from: ME,
      to: [ece],
      cc: [elif],
      subject: "RE: Teknik şartname soruları — SSO ve veri saklama",
      when: [1, "10:20"],
      isRead: true,
      html: mailHtml({
        greeting: "Ece,",
        parts: [
          "Tolga Bey'in sorularını Elif'le yarın 30 dakikada toparlayalım; sızma testi özetini Barış'tan isteyeceğim. Cevabı perşembeye kadar iletelim.",
        ],
        closing: "Doğukan",
      }),
    },
    {
      key: "snt-04",
      folder: "sentitems",
      from: ME,
      to: [can],
      subject: "RE: Vadesi geçen faturalar — Pera Otelcilik (2 fatura)",
      when: [1, "16:02"],
      isRead: true,
      html: mailHtml({
        greeting: "Can,",
        parts: [
          "Sevgi Hanım iki taksit önerdi: ilk taksit ay sonu, ikincisi bir sonraki ayın 15'i. Uygun görürsen ödeme planı yazısını hazırlayabilir misin?",
        ],
        closing: "Teşekkürler,<br>Doğukan",
      }),
    },
    {
      key: "snt-05",
      folder: "sentitems",
      from: ME,
      to: [pera],
      subject: "RE: Ödeme planı hakkında",
      when: [3, "11:30"],
      isRead: true,
      html: mailHtml({
        greeting: "Sevgi Hanım merhaba,",
        parts: [
          "Talebinizi finans ekibimizle paylaştım; iki taksitli ödeme planını olumlu karşılıyoruz. Detayları bu hafta içinde yazılı olarak ileteceğiz.",
          "Ek bina için Selin Hanım keşif notlarını tamamladı, çizimler geldiğinde teklif çalışmasına başlayabiliriz.",
        ],
        closing: "Saygılarımla,",
        sign: sig(ME),
      }),
    },
    {
      key: "snt-06",
      folder: "sentitems",
      from: ME,
      to: [ece, mert, selin, zeynep],
      cc: [burak],
      subject: "Q4 hedef dağılımı ve haftalık ritim",
      when: [4, "18:40"],
      isRead: true,
      html: mailHtml({
        greeting: "Merhaba ekip,",
        parts: [
          "Q4 hedeflerimiz netleşti; kişisel hedefleri birebir görüşmelerimizde paylaşacağım. Çeyrek boyunca ritmimiz:",
          [
            "Pazartesi 09:30 — pipeline gözden geçirme (30 dk)",
            "Çarşamba — müşteri ziyaret günü",
            "Cuma 16:00 — haftanın kazanımları ve forecast güncellemesi",
          ],
          "CRM'deki fırsatları her cuma güncel tutalım; Burak haftalık raporu buradan alıyor.",
        ],
        closing: "Kolay gelsin,<br>Doğukan",
      }),
    },
    {
      key: "snt-07",
      folder: "sentitems",
      from: ME,
      to: [baris],
      subject: "RE: Nordis çerçeve sözleşmesi — redline v3",
      when: [5, "19:05"],
      isRead: true,
      html: mailHtml({
        greeting: "Barış Bey,",
        parts: ["Ticari şartlarda değişiklik yok, v3 ile imzaya geçebiliriz. Emeğiniz için teşekkürler."],
        closing: "Doğukan",
      }),
    },
    {
      key: "snt-08",
      folder: "sentitems",
      from: ME,
      to: [toros],
      cc: [mert],
      subject: "RE: Bütçe onayı ve sözleşme süresi",
      when: [6, "17:30"],
      isRead: true,
      html: mailHtml({
        greeting: "Emre Bey merhaba,",
        parts: [
          "Onay haberiniz için teşekkürler. 36 aylık taahhüt ve %30 peşinat yapısı için güncel teklifimizi en geç iki gün içinde iletiyoruz.",
        ],
        closing: "Saygılarımla,",
        sign: sig(ME),
      }),
    },
    {
      key: "snt-09",
      folder: "sentitems",
      from: ME,
      to: [orion],
      cc: [mert],
      subject: "RE: İhale takvimi güncellendi",
      when: [7, "13:15"],
      isRead: true,
      html: mailHtml({
        greeting: "Aslı Hanım merhaba,",
        parts: [
          "Bilgilendirme için teşekkürler. Teknik sunum için salı öğleden sonrası bizim için uygun olur; ekibimizden Mert Kaya ve ürün yöneticimiz Elif Güneş katılacak.",
        ],
        closing: "Saygılarımla,",
        sign: sig(ME),
      }),
    },
    {
      key: "snt-10",
      folder: "sentitems",
      from: ME,
      to: [ekinoks],
      cc: [ece],
      subject: "Demo sonrası özet ve sonraki adımlar",
      when: [8, "16:50"],
      isRead: true,
      html: mailHtml({
        greeting: "Tolga Bey merhaba,",
        parts: [
          "Bugünkü demo için zaman ayırdığınız için teşekkür ederiz. Konuştuğumuz pilot kapsamını (2 saha, 90 gün) ve entegrasyon dokümanlarını Ece Hanım bu hafta iletecek.",
        ],
        closing: "Saygılarımla,",
        sign: sig(ME),
      }),
    },
  ]
}
