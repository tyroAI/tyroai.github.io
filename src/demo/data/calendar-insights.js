// Biten toplantıların Copilot özetleri ("Meeting AI Insights") — kurgusal.
// Her özet toplantının türünden (`summary`) ve gününden üretilir: aynı oturum
// her açılışta aynı özeti verir, farklı günlerin stand-up'ları farklı konuşur.
import { COLLEAGUES, CUSTOMERS, MANAGER, ME, TEAM, findPerson } from "../persona"
import { MIN, dayKey, pick, seeded } from "./calendar-time"

const name = (id, fallback) => (findPerson(id) ?? fallback)?.displayName ?? ""
const N = {
  me: ME.displayName,
  kerem: MANAGER.displayName,
  ece: name("u-ece", TEAM[0]),
  mert: name("u-mert", TEAM[1]),
  selin: name("u-selin", TEAM[2]),
  burak: name("u-burak", TEAM[3]),
  zeynep: name("u-zeynep", TEAM[4]),
  ayse: name("u-ayse", COLLEAGUES[0]),
  can: name("u-can", COLLEAGUES[1]),
  onur: name("u-onur", COLLEAGUES[3]),
  elif: name("u-elif", COLLEAGUES[4]),
  baris: name("u-baris", COLLEAGUES[5]),
}
const first = (full) => String(full).split(" ")[0]

const money = (rnd, lo, hi) => `${(lo + rnd() * (hi - lo)).toFixed(1).replace(".", ",")} M TL`
const pct = (rnd, lo, hi) => Math.round(lo + rnd() * (hi - lo))

function shuffled(list, rnd) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const note = (title, text, subpoints = []) => ({ title, text, subpoints })
const sub = (title, text) => ({ title, text })
const action = (title, text, owner) => ({ title, text, ownerDisplayName: owner })

/* ─── Türler ──────────────────────────────────────────────────────────── */

function standup(rnd) {
  const [a, b, c, d] = shuffled(CUSTOMERS, rnd).map((x) => x.account)
  const variant = Math.floor(rnd() * 3)
  const notes = [
    note(
      "Pipeline özeti",
      `Açık pipeline ${money(rnd, 16, 24)}; bu hafta kapanması beklenen ${pct(rnd, 3, 6)} fırsat var.`,
      [
        sub(N.ece, `${a} sipariş onayını bekliyor; satın alma bütçe kodunu açtı.`),
        sub(N.mert, `${b} ihalesinde teknik şartname soruları yanıtlandı, fiyat turu perşembe.`),
        sub(N.selin, `${c} ile keşif görüşmesi olumlu geçti, demo talebi geldi.`),
      ],
    ),
    variant === 0
      ? note("Riskler", `${d} karar vericisi bu hafta izinde; kapanış tarihi iki hafta kayabilir.`)
      : variant === 1
        ? note(
            "Riskler",
            `${b} rakip firmadan %8 daha düşük fiyat aldığını iletti; değer anlatımı güçlendirilecek.`,
          )
        : note("Riskler", `${d} tarafında bütçe onayı Kasım'a kaydı; ara teslimat önerilecek.`),
    note(
      "Bugünün öncelikleri",
      `Teklif revizyonları öğleden önce, ${c} demo tarihi gün sonuna kadar netleşecek.`,
    ),
  ]
  const actions = [
    action(
      `${b} fiyat turu için iskonto sınırını netleştir`,
      "Finans onayı gerekiyorsa bugün iletilecek.",
      N.me,
    ),
    action(
      "Kapanış tarihi geçmiş fırsatları CRM'de güncelle",
      "Özellikle 30 günden eski teklif aşamasındakiler.",
      N.burak,
    ),
    action(
      `${c} demo tarihini netleştir`,
      `${N.zeynep} ile ürün ekibinin uygunluğuna bakılacak.`,
      N.selin,
    ),
  ]
  const mentions = [
    {
      speaker: N.mert,
      text: `${first(N.me)}, ${b} tarafında iskonto sınırını bugün netleştirebilirsek perşembeki turda elimiz güçlü olur.`,
      at: 6,
    },
  ]
  return { notes, actions, mentions }
}

function qbr(rnd, ctx) {
  const c = ctx.customer ?? CUSTOMERS[0]
  const notes = [
    note(
      "Q3 performans özeti",
      `Q3'te ${c.account} cirosu hedefin %${pct(rnd, 96, 112)} seviyesinde gerçekleşti; zamanında teslimat oranı %${pct(rnd, 91, 97)}.`,
      [
        sub(
          "Güçlü yanlar",
          "Sipariş portalı kullanımı arttı, iade oranı bir önceki çeyreğe göre düştü.",
        ),
        sub(
          "İyileştirme alanları",
          "Bölge depolarına sevkiyatta iki haftalık gecikme yaşandı; kök neden taşıyıcı kapasitesi.",
        ),
      ],
    ),
    note(
      "Müşteri geri bildirimi",
      `${c.contact} faturalama sürecinin sadeleştirilmesini ve aylık tek konsolide fatura talep etti.`,
    ),
    note(
      "Genişleme fırsatları",
      `2027'de ${pct(rnd, 10, 18)} yeni lokasyon açılışı planlanıyor; ilk dalga Şubat'ta. Ek modül ve yıllık bakım paketi konuşuldu.`,
    ),
    note(
      "Sonraki adımlar",
      "Revize teklif ve SLA raporu iki hafta içinde paylaşılacak; Ocak'ta yerinde yönetim toplantısı.",
    ),
  ]
  const actions = [
    action(
      "Revize teklifi gönder",
      `${c.account} için 2027 hacim iskontolu teklif; konsolide faturalama seçeneği dahil.`,
      N.me,
    ),
    action(
      "Teslimat SLA raporunu hazırla",
      "Q3 bölge bazlı gecikme analizi ve iyileştirme planı.",
      N.onur,
    ),
    action(
      "Yeni lokasyon açılış takvimini al",
      `${c.contact} ekibinden lokasyon listesi ve tarihler.`,
      N.ece,
    ),
    action("Ocak yönetim toplantısı için tarih öner", "", N.me),
  ]
  const mentions = [
    {
      speaker: c.contact,
      text: `${first(N.me)}, konsolide fatura konusunda bir öneriniz olursa bütçe dönemine yetiştirebiliriz.`,
      at: 34,
    },
  ]
  return { notes, actions, mentions }
}

function forecast(rnd) {
  const commit = money(rnd, 38, 46)
  const notes = [
    note(
      "Q4 görünümü",
      `Commit ${commit}, best case ${money(rnd, 52, 60)}; çeyrek hedefinin %${pct(rnd, 82, 91)}'i commit'te.`,
    ),
    note("Risk altındaki fırsatlar", "İki büyük fırsatın kapanışı aralık sonuna sarkabilir.", [
      sub(CUSTOMERS[1].account, "İhalede fiyat baskısı; teknik puan avantajımız korunmalı."),
      sub(CUSTOMERS[2].account, "Bütçe onayı Kasım'daki yönetim kuruluna kaldı."),
    ]),
    note(
      "Finans notları",
      `${first(N.can)}: kur etkisi forecast'a yansıtılacak; vadesi geçmiş alacaklar ${money(rnd, 1.4, 2.4)}.`,
    ),
  ]
  const actions = [
    action(
      "Commit listesini cuma 12:00'ye kadar güncelle",
      "Her fırsat için bir sonraki adım ve tarih.",
      N.me,
    ),
    action("Kapanış tarihi geçmiş fırsatları temizle", "", N.burak),
    action("Kur etkisini forecast tablosuna ekle", "", N.can),
    action("Bölge hedeflerini revize edip paylaş", "", N.kerem),
  ]
  const mentions = [
    {
      speaker: N.kerem,
      text: `${first(N.me)}, ${CUSTOMERS[1].account} ihalesinde fiyatın altına inmeden kazanabileceğimiz senaryoyu cuma görmek istiyorum.`,
      at: 18,
    },
  ]
  return { notes, actions, mentions }
}

function demo(rnd, ctx) {
  const c = ctx.customer ?? CUSTOMERS[5]
  const notes = [
    note(
      "Gösterilen modüller",
      "Sipariş yönetimi, stok takibi ve tedarikçi portalı demo ortamında gösterildi.",
    ),
    note("Müşteri soruları", `${c.account} ekibinin öne çıkan soruları:`, [
      sub("Entegrasyon", "Mevcut ERP ile entegrasyon süresi ve API dokümantasyonu."),
      sub("Güvenlik", "Verilerin saklandığı bölge ve KVKK uyumu."),
      sub("Fiyatlandırma", "Kullanıcı başı lisans ile kurum lisansının karşılaştırması."),
    ]),
    note(
      "Sonraki adımlar",
      `${pct(rnd, 2, 3)} lokasyonda ${pct(rnd, 6, 8)} haftalık pilot önerildi; karar Kasım ortasında.`,
    ),
  ]
  const actions = [
    action("Entegrasyon dokümanını ve API örneklerini paylaş", "", N.elif),
    action("Pilot teklifini hazırla", "Kapsam, süre ve başarı kriterleriyle.", N.zeynep),
    action("Benzer ölçekte bir referans müşteri görüşmesi ayarla", "", N.me),
    action("KVKK uyum özetini gönder", "Hukuk onaylı tek sayfalık özet.", N.me),
  ]
  return { notes, actions, mentions: [] }
}

function pipeline(rnd) {
  const [a, b] = shuffled(CUSTOMERS, rnd).map((x) => x.account)
  return {
    notes: [
      note(
        "Aşama dağılımı",
        `Teklif aşamasında ${pct(rnd, 9, 14)} fırsat (${money(rnd, 7, 11)}), müzakerede ${pct(rnd, 3, 6)} fırsat.`,
      ),
      note(
        "Bu hafta odak",
        `${a} ve ${b} kapanış için öncelikli; ikisi için de karar verici görüşmesi planlanacak.`,
      ),
      note("Eski fırsatlar", "90 günden eski 6 fırsat kapatılacak ya da yeniden nitelendirilecek."),
    ],
    actions: [
      action(`${a} için karar verici görüşmesi ayarla`, "", N.ece),
      action(`${b} müzakere stratejisini hazırla`, "", N.mert),
      action("90 günden eski fırsatları gözden geçir", "", N.burak),
    ],
    mentions: [],
  }
}

function customerMeeting(rnd, ctx) {
  const c = ctx.customer ?? pick(CUSTOMERS, rnd)
  const member = ctx.member?.displayName ?? N.ece
  return {
    notes: [
      note(
        "Görüşme özeti",
        `${c.contact} (${c.title}) mevcut süreçlerini ve 2027 önceliklerini paylaştı.`,
      ),
      note("Beklentiler", "Hızlı devreye alma, yerinde eğitim ve esnek ödeme planı öne çıktı.", [
        sub("Bütçe", `Ön bütçe ${money(rnd, 1.2, 3.8)}; onay Aralık'ta.`),
        sub("Zaman çizelgesi", "Ocak sonunda canlıya geçiş hedefleniyor."),
      ]),
      note("Sonraki adım", "Revize teklif ve uygulama planı bir hafta içinde paylaşılacak."),
    ],
    actions: [
      action("Revize teklifi ve uygulama planını gönder", `${c.account} için.`, member),
      action("Ödeme planı seçeneklerini Finans ile netleştir", "", N.me),
    ],
    mentions: [],
  }
}

function campaign() {
  return {
    notes: [
      note(
        "Kampanya kapsamı",
        "Q4 kurumsal paketleri: 3 yıllık sözleşmede ilk yıl bakım ücretsiz.",
      ),
      note("Hedef segment", "Perakende ve lojistik; mevcut müşterilerde çapraz satış öncelikli."),
      note(
        "Materyaller",
        "Satış sunumu, e-posta şablonları ve itiraz karşılama rehberi Cuma'ya kadar hazır.",
      ),
    ],
    actions: [
      action(
        "Kampanya hedef müşteri listesini paylaş",
        "Her satış temsilcisi için 10 hesap.",
        N.me,
      ),
      action("Satış sunumunu ve e-posta şablonlarını yayınla", "", N.ayse),
    ],
    mentions: [],
  }
}

function roadmap() {
  return {
    notes: [
      note(
        "Q1 2027 öne çıkanlar",
        "Mobil sipariş uygulaması, gelişmiş raporlama ve yeni tedarikçi portalı.",
      ),
      note(
        "Sahadan gelen talepler",
        "Toplu fiyat güncelleme ve çoklu para birimi en çok istenen iki özellik.",
      ),
      note("Müşteriye anlatım", "Kesin tarih verilmeyecek; 'Q1 içinde' ifadesi kullanılacak."),
    ],
    actions: [
      action("Müşteri taleplerini ürün portalına gir", "", N.zeynep),
      action("Yol haritası sunumunun müşteri versiyonunu paylaş", "", N.elif),
    ],
    mentions: [],
  }
}

function contract(rnd, ctx) {
  const c = ctx.customer ?? pick(CUSTOMERS, rnd)
  return {
    notes: [
      note(
        "Revizyon talepleri",
        `${c.account} sorumluluk sınırının sözleşme bedelinin 2 katına çıkarılmasını istiyor.`,
      ),
      note("Hukuk görüşü", `${first(N.baris)}: 1,5 kat makul; ceza maddesi için üst sınır şart.`),
    ],
    actions: [
      action("Karşı öneri metnini hazırla", "", N.baris),
      action("Müşteriye revize maddeleri ilet", "", N.ece),
    ],
    mentions: [],
  }
}

function handover(rnd, ctx) {
  const c = ctx.customer ?? pick(CUSTOMERS, rnd)
  return {
    notes: [
      note(
        "Devir kapsamı",
        `${c.account}: 3 lokasyon, ${pct(rnd, 40, 120)} kullanıcı; ilk 90 gün yoğun destek.`,
      ),
      note("Kilit kişiler", `${c.contact} (${c.title}) birincil irtibat.`),
    ],
    actions: [
      action("Onboarding planını müşteriyle paylaş", "", N.onur),
      action("Satış sırasında verilen taahhütleri yazılı ilet", "", N.mert),
    ],
    mentions: [],
  }
}

function weekly(rnd) {
  return {
    notes: [
      note(
        "Haftanın sonucu",
        `Sipariş girişi ${money(rnd, 3, 7)}; aylık hedefin %${pct(rnd, 55, 80)}'i tamamlandı.`,
      ),
      note("Gelecek hafta", "İki büyük fırsatta karar bekleniyor; fiyat komitesi gündemi yoğun."),
    ],
    actions: [
      action("Gelecek haftanın kritik fırsat listesini paylaş", "", N.me),
      action("Sipariş girişlerini ERP ile mutabık kıl", "", N.burak),
    ],
    mentions: [],
  }
}

const KINDS = {
  standup,
  qbr,
  forecast,
  demo,
  pipeline,
  customer: customerMeeting,
  campaign,
  roadmap,
  contract,
  handover,
  weekly,
}

/**
 * Graph `callAiInsight` gövdesi. `startMs` anılmaların zamanı için.
 * Türü bilinmeyen toplantının özeti yok (`null`).
 */
export function insightBody(t, day, startMs) {
  const make = KINDS[t.summary]
  if (!make) return null
  const rnd = seeded(`insight-${t.slug}-${dayKey(day)}`)
  const { notes, actions, mentions } = make(rnd, t.ctx ?? {})
  return {
    meetingNotes: notes,
    actionItems: actions,
    viewpoint: {
      mentionEvents: mentions.map((m) => ({
        eventDateTime: new Date(startMs + (m.at ?? 5) * MIN).toISOString(),
        transcriptUtterance: m.text,
        speaker: { user: { displayName: m.speaker } },
      })),
    },
  }
}
