/**
 * Hazır istem İÇERİĞİ. Mantık `src/data/prompts.js`'te.
 *
 * TR ve EN yazılır; RU/AR İngilizceye düşer (freight anahtarlarındaki kararın
 * aynısı — denizcilik/D365 jargonunda makine çevirisi anlamsız çıkıyor).
 *
 * Her istem, o asistanın bağlı olduğu MCP'nin GERÇEKTEN karşılayabildiği bir
 * şey olmalı. Bu katalog araç envanterine bakılarak yazıldı:
 *   • TYRO Office — M365 (posta, takvim, SharePoint dokümanı) VE
 *     tyro-hr-mcp. Bu ikisi aynı asistanda: "İK" konusundaki izin,
 *     masraf, avans ve yetki devri istemleri M365'ten değil HR MCP'sinden
 *     karşılanıyor, "İK dokümanları" ise SharePoint'ten. Bir kez yanlış
 *     okundu ve konu bütünüyle çıkarıldı — bağlı MCP'yi varsaymadan önce
 *     sor.
 *   • TYRO Trader — tyro-project-mcp: sefer, gemi konumu, proje marjı,
 *     bütçe/gerçekleşen, aylık ve segment P&L, bekleyen ödemeler.
 *   • TYRO Sales — tyro-sales-mcp VE tyro-sales365-mcp. İstemler ikisinin
 *     KESİŞİMİNDE tutuldu (hangi agent hangisine bağlıysa çalışsın diye):
 *     revenue/quantity/order_count/avg_price/invoice_revenue metrikleri ve
 *     customer·product·trader·segment·site·origin·incoterms·delivery_mode
 *     kırılımları ikisinde de var. Yalnız birinde olanlara (ay bazlı kırılım,
 *     müşteri grubu, sipariş frekansı analizi) dayanan istem YAZILMADI.
 *   • TYRO HR — tyro-hr-mcp: izin bakiyesi/geçmişi, izin talebi OLUŞTURMA,
 *     masraf ve avans oluşturma, yetki devri, çalışan arama.
 *   • Genel asistanın aracı yok; yazar, çevirir, açıklar, karşılaştırır.
 *
 * Aracı olmayan istem yazmak, kullanıcıya cevaplanamayacak bir soruyu
 * öneren bir kart demek — listedeki en pahalı hata bu.
 *
 * `[köşeli parantez]` doldurulacak yerdir; arayüz ilkini seçili bırakır.
 *
 * `template` (+ isteğe bağlı `preset`) taşıyan istem besteciye düz metin
 * yerine Anasayfa'daki ALANLI cümleyi açar — tarih takvimden, izin türü ·
 * para birimi · kategori · şirket HR MCP'nin listesinden (`lib/promptTemplates.js`).
 * Gönderilen metin o cümledir; karttaki metin yalnız ne yapılacağını anlatır.
 *
 * ⚠️ HIZ SÖZLEŞMESİ (2026-09-18, istek üzerine — "hızlıca yanıt alınabilecek
 * sorular olsun"). Bir kartın maliyeti isteğin sayısı DEĞİL, KONUŞMA TURUdur:
 * ölçüldü (canlı Copilot Studio) — araç çağıran tur medyan 19,6 sn, MCP
 * başlatması o tura düşerse 27,9 sn. Tool içinde 1 istek yerine 3 istek olması
 * saniyenin altında fark eder. Yani:
 *
 *   OKUMA istemi  →  tek soru · tek kaynak · sabit ve küçük kapsam · 0-1 yer
 *                    tutucu. Yasak: "ve" ile ikinci soru (bileşik cümle iki
 *                    tool'a sapar), kişi/öğe başına arama ("katılımcılarıyla",
 *                    "her biri için"), posta × takvim × doküman birleştirmesi,
 *                    açık uçlu pencere ("bu yıl", "son üç ay" — bu araçlarda
 *                    sunucu tarafı tarih filtresi YOK, istemci süzüyor).
 *
 *   YAZMA istemi  →  tool'un ZORUNLU alanlarının HEPSİ istemde olmalı; eksik
 *                    her alan asistanın soracağı bir tur, yani ~20 sn. Bu
 *                    yüzden yazma istemlerinde "en fazla iki yer tutucu"
 *                    kuralı GEÇERSİZ (bugün 3-4 taşıyorlar) — dolu bir kart,
 *                    dört turluk bir diyalogdan iyidir. Okuma istemlerinde
 *                    kural aynen duruyor.
 */
export const PROMPT_CATALOGUE = {
  office: {
    // Sıra Anasayfa'nın hazır istem kutucuklarıyla aynı (gün · hafta · İK):
    // iki yüzey aynı altı soruyu aynı sırada sunar. Haftalık özet posta ×
    // takvim birleştirmesi yasağının bilinçli istisnası — Anasayfa'daki
    // kutucuğun birebir sorusu.
    starters: [
      {
        iconHint: "mail",
        titleTr: "Sabah özeti",
        titleEn: "Morning brief",
        textTr: "Sabah özetimi ver.",
        textEn: "Give me my morning brief.",
      },
      {
        iconHint: "calendar",
        titleTr: "Haftalık özet",
        titleEn: "Weekly summary",
        textTr:
          "Haftalık özetimi hazırla: bu haftaki toplantılarım, öne çıkan postalarım ve takip etmem gereken işler.",
        textEn:
          "Prepare my weekly summary: this week's meetings, the emails that stand out and what I need to follow up on.",
      },
      {
        iconHint: "people",
        titleTr: "İzin bakiyem",
        titleEn: "Leave balance",
        textTr: "Yıllık izin bakiyemi göster.",
        textEn: "Show my annual leave balance.",
      },
      {
        iconHint: "calendar",
        titleTr: "İzin talebi",
        titleEn: "Request leave",
        textTr: "[başlangıç] – [bitiş] yıllık izin talebi oluştur; onay devri istemiyorum.",
        textEn: "Create an annual leave request for [start] – [end]; no approval delegation.",
        template: "leaveRequest",
      },
      {
        iconHint: "people",
        titleTr: "Masraf oluştur",
        titleEn: "New expense claim",
        textTr: "Kendim için [tarih] tarihli [tutar] TRY [kategori] masrafı kaydet.",
        textEn: "File a [category] expense of [amount] TRY dated [date] for myself.",
        template: "expense",
      },
      {
        iconHint: "people",
        titleTr: "Avans talebi",
        titleEn: "Request an advance",
        textTr: "[tarih] tarihli [tutar] TRY iş avansı: [şehir] seyahati, yansıtma [şirket].",
        textEn:
          "Business advance of [amount] TRY dated [date]: trip to [city], charged to [company].",
        template: "advance",
      },
    ],
    topics: [
      {
        id: "posta-toplanti",
        iconHint: "mail",
        labelTr: "Posta & Toplantı",
        labelEn: "Mail & Meetings",
        blurbTr: "Gelen kutusu ve bugünün takvimi — tek bakışta.",
        blurbEn: "Inbox and today's calendar — at a glance.",
        prompts: [
          {
            titleTr: "Sabah özeti",
            titleEn: "Morning brief",
            textTr: "Sabah özetimi ver.",
            textEn: "Give me my morning brief.",
          },
          {
            titleTr: "Bugünkü ajanda",
            titleEn: "Today's agenda",
            textTr: "Bugünkü toplantılarımı saatleriyle sırala.",
            textEn: "List today's meetings with their times.",
          },
          {
            titleTr: "Sıradaki toplantım",
            titleEn: "My next meeting",
            textTr: "Sıradaki toplantım ne zaman ve kimler katılıyor?",
            textEn: "When is my next meeting and who is attending?",
          },
          {
            titleTr: "Bugün ne geldi",
            titleEn: "Today's inbox",
            textTr: "Bugün gelen postaları gönderen ve konu başlığıyla listele.",
            textEn: "List today's incoming mail with sender and subject.",
          },
          {
            titleTr: "Kişiden gelen son posta",
            titleEn: "Latest from a person",
            textTr: "[kişi] kişisinden gelen son postayı özetle.",
            textEn: "Summarise the latest mail from [person].",
          },
          {
            titleTr: "Okunmamış kutusu",
            titleEn: "Unread count",
            textTr: "Kaç okunmamış postam var, en yenisi kimden?",
            textEn: "How many unread mails do I have, and who is the newest one from?",
          },
        ],
      },
      {
        id: "ik",
        iconHint: "people",
        labelTr: "İK",
        labelEn: "HR",
        blurbTr: "İzin, masraf, avans ve onay devri.",
        blurbEn: "Leave, expenses, advances and approval delegation.",
        prompts: [
          {
            titleTr: "İzin bakiyem",
            titleEn: "Leave balance",
            textTr: "Yıllık izin bakiyemi göster.",
            textEn: "Show my annual leave balance.",
          },
          {
            titleTr: "Son izinlerim",
            titleEn: "Recent leave",
            textTr: "Son 5 iznimi tarih ve gün sayısıyla listele.",
            textEn: "List my last 5 leave records with date and number of days.",
          },
          {
            titleTr: "İzin formu çıktısı",
            titleEn: "Leave form printout",
            textTr: "Son iznimin izin formunu hazırla.",
            textEn: "Prepare the leave form for my latest leave.",
          },
          {
            titleTr: "Masraflarım",
            titleEn: "My expenses",
            textTr: "Son masraflarımı onay durumuyla göster.",
            textEn: "Show my recent expenses with their approval status.",
          },
          {
            titleTr: "Masraf formu çıktısı",
            titleEn: "Expense form printout",
            textTr: "Son masrafımın masraf formunu hazırla.",
            textEn: "Prepare the expense form for my latest expense.",
          },
          {
            titleTr: "Açık avanslarım",
            titleEn: "Open advances",
            textTr: "Açık avansım var mı?",
            textEn: "Do I have any open advances?",
          },
          {
            titleTr: "Kimin adına girebilirim",
            titleEn: "Whose expenses can I file",
            textTr: "Kimin adına masraf girebiliyorum?",
            textEn: "Whose expenses am I allowed to file?",
          },
          {
            titleTr: "Devirlerim",
            titleEn: "My delegations",
            textTr: "Bana devredilen ve benim devrettiğim yetkileri listele.",
            textEn: "List the approvals delegated to me and the ones I delegated.",
          },
          {
            titleTr: "İzin talebi",
            titleEn: "Request leave",
            textTr: "[başlangıç] – [bitiş] yıllık izin talebi oluştur; onay devri istemiyorum.",
            textEn: "Create an annual leave request for [start] – [end]; no approval delegation.",
            template: "leaveRequest",
          },
          {
            titleTr: "Masraf oluştur",
            titleEn: "New expense claim",
            textTr: "Kendim için [tarih] tarihli [tutar] TRY [kategori] masrafı kaydet.",
            textEn: "File a [category] expense of [amount] TRY dated [date] for myself.",
            template: "expense",
          },
          {
            titleTr: "Avans talebi",
            titleEn: "Request an advance",
            textTr: "[tarih] tarihli [tutar] TRY iş avansı: [şehir] seyahati, yansıtma [şirket].",
            textEn:
              "Business advance of [amount] TRY dated [date]: trip to [city], charged to [company].",
            template: "advance",
          },
          {
            titleTr: "Onay temsilcisi",
            titleEn: "Delegate approvals",
            textTr: "[başlangıç] – [bitiş] arası onaylarımı [kişi maili] adresine devret.",
            textEn: "Delegate my approvals to [recipient mail] between [start] and [end].",
          },
        ],
      },
      {
        id: "dokuman",
        labOnly: true,
        iconHint: "document",
        labelTr: "Doküman",
        labelEn: "Documents",
        blurbTr: "Tek doküman, tek soru.",
        blurbEn: "One document, one question.",
        prompts: [
          {
            titleTr: "Taraflar ve tutar",
            titleEn: "Parties and amount",
            textTr: "Şu sözleşmenin taraflarını, miktarını ve fiyatını yaz: [doküman bağlantısı]",
            textEn: "Give me the parties, quantity and price of this contract: [document link]",
          },
          {
            titleTr: "Demuraj maddesi",
            titleEn: "Demurrage clause",
            textTr:
              "Bu sözleşmedeki demuraj maddesini bul ve sade dille açıkla: [doküman bağlantısı]",
            textEn:
              "Find the demurrage clause in this contract and explain it in plain language: [document link]",
          },
          {
            titleTr: "Vade ve teslim",
            titleEn: "Payment and delivery",
            textTr: "Bu sözleşmede vade ve teslim şekli ne? [doküman bağlantısı]",
            textEn:
              "What are the payment term and delivery terms in this contract? [document link]",
          },
          {
            titleTr: "Ekteki dosyayı özetle",
            titleEn: "Summarise the attachment",
            textTr: "[tedarikçi] firmasından gelen son postanın ekini yarım sayfada özetle.",
            textEn: "Summarise the attachment on the latest mail from [supplier] in half a page.",
          },
          {
            titleTr: "Evrak listesi",
            titleEn: "Paperwork list",
            textTr: "[gemi adı] için postayla gelen evrakları listele.",
            textEn: "List the paperwork that arrived by mail for [vessel name].",
          },
        ],
      },
      {
        id: "yazisma",
        labOnly: true,
        iconHint: "note",
        labelTr: "Yazışma",
        labelEn: "Writing",
        blurbTr: "Yanıt, hatırlatma ve duyuru yaz.",
        blurbEn: "Replies, chasers and announcements.",
        prompts: [
          {
            titleTr: "Yanıt taslağı",
            titleEn: "Reply draft",
            textTr: "[gönderen] kişisinin son postasına kısa bir yanıt taslağı yaz.",
            textEn: "Draft a short reply to the latest mail from [sender].",
          },
          {
            titleTr: "İngilizce teyit",
            titleEn: "Confirmation in English",
            textTr:
              "[tedarikçi] firmasına İngilizce yaz: [gemi adı] yükleme tarihini teyit etsinler.",
            textEn:
              "Write to [supplier] in English asking them to confirm the loading date for [vessel name].",
          },
          {
            titleTr: "Nazik hatırlatma",
            titleEn: "Polite chaser",
            textTr: "[firma] firmasına [konu] için nazik bir hatırlatma yaz.",
            textEn: "Write a polite chaser to [company] about [subject].",
          },
          {
            titleTr: "Doküman gönder",
            titleEn: "Send a document",
            textTr: "Şu dokümanı [kişi maili] adresine ek olarak gönder: [doküman bağlantısı]",
            textEn: "Send this document as an attachment to [recipient mail]: [document link]",
          },
          {
            titleTr: "Ekibe duyuru",
            titleEn: "Tell the team",
            textTr: "[gemi adı] tahliye programını duyuran kısa bir mail yaz: [program]",
            textEn:
              "Write a short mail announcing the discharge schedule for [vessel name]: [schedule]",
          },
        ],
      },
      {
        id: "toparlanma",
        iconHint: "task",
        labelTr: "Gün & Hafta",
        labelEn: "Day & Week",
        blurbTr: "Dün ne geldi, yarın ne var, hafta nasıl görünüyor.",
        blurbEn: "What came yesterday, what is tomorrow, how the week looks.",
        prompts: [
          {
            titleTr: "Dün ne geldi",
            titleEn: "Yesterday's mail",
            textTr: "Dün gelen postaları gönderen ve konu başlığıyla listele.",
            textEn: "List yesterday's incoming mail with sender and subject.",
          },
          {
            titleTr: "Yarının ajandası",
            titleEn: "Tomorrow's agenda",
            textTr: "Yarınki toplantılarımı saatleriyle yaz.",
            textEn: "List tomorrow's meetings with their times.",
          },
          {
            titleTr: "Bu haftaki toplantılar",
            titleEn: "This week's meetings",
            textTr: "Bu haftaki toplantılarımı güne göre listele.",
            textEn: "List this week's meetings by day.",
          },
          {
            titleTr: "Son gönderdiğim",
            titleEn: "My last sent mail",
            textTr: "Son gönderdiğim postayı ve kime gittiğini göster.",
            textEn: "Show the last mail I sent and who it went to.",
          },
          {
            titleTr: "Kimlerle toplantım var",
            titleEn: "Who am I meeting",
            textTr: "Bu hafta kimlerle toplantım var?",
            textEn: "Who am I meeting with this week?",
          },
          {
            titleTr: "Yöneticiye durum notu",
            titleEn: "Note to my manager",
            textTr:
              "Yöneticime haftalık durum notu yaz: üç başlık, her başlıkta en fazla üç madde.",
            textEn:
              "Write my manager a weekly status note: three headings, at most three bullets each.",
          },
        ],
      },
    ],
  },
  trader: {
    starters: [
      {
        iconHint: "ship",
        titleTr: "Yoldaki gemiler",
        titleEn: "Vessels at sea",
        textTr: "Şu an yolda olan seferleri ve tahliye tarihlerini özetle.",
        textEn: "Summarise the voyages currently at sea and their discharge dates.",
      },
      {
        iconHint: "alert",
        titleTr: "Bekleyen ödemeler",
        titleEn: "Pending payments",
        textTr: "Ödemesi bekleyen seferleri bakiyesi en yüksekten listele.",
        textEn: "List the voyages with pending payments, largest balance first.",
      },
      {
        iconHint: "money",
        titleTr: "Proje marjı",
        titleEn: "Project margin",
        textTr: "[proje no] projesinin tahmini ve gerçekleşen kârını karşılaştır.",
        textEn: "Compare estimated and realised profit on project [project no].",
      },
      {
        iconHint: "file",
        titleTr: "Proje giderleri",
        titleEn: "Project expenses",
        textTr:
          "[proje no] projesinin gerçekleşen giderlerini kalem kalem, tahminle karşılaştırarak listele.",
        textEn:
          "List the realised expenses of project [project no] item by item, against the estimate.",
      },
    ],
    topics: [
      {
        id: "sefer-takibi",
        iconHint: "ship",
        labelTr: "Sefer Takibi",
        labelEn: "Voyages",
        blurbTr: "Gemiler, milestone tarihleri ve sefer durumu.",
        blurbEn: "Vessels, milestone dates and voyage status.",
        prompts: [
          {
            titleTr: "Gemi nerede",
            titleEn: "Where is the vessel",
            textTr:
              "[proje no] projesinin gemisi şu an hangi aşamada? Son girilen milestone tarihini de yaz.",
            textEn:
              "What stage is the vessel on project [project no] at right now? Include the last milestone date entered.",
          },
          {
            titleTr: "Yaklaşan tahliyeler",
            titleEn: "Upcoming discharges",
            textTr:
              "Önümüzdeki 15 gün içinde tahliye limanına varması beklenen seferleri DP-ETA'ya göre sırala.",
            textEn: "Sort the voyages due at the discharge port in the next 15 days by DP-ETA.",
          },
          {
            titleTr: "Eksik tarihler",
            titleEn: "Missing dates",
            textTr:
              "[proje no] seferinde LP-ETA'dan DP-ED'ye kadar hangi milestone tarihleri boş kalmış?",
            textEn:
              "On voyage [project no], which milestone dates between LP-ETA and DP-ED are still empty?",
          },
          {
            titleTr: "Yüklemedeki gemiler",
            titleEn: "Loading now",
            textTr:
              "Şu an yüklemede olan seferleri göster: gemi, liman, tonaj ve yükleme başlangıç tarihi.",
            textEn:
              "Show the voyages currently loading: vessel, port, tonnage and loading start date.",
          },
          {
            titleTr: "Demuraj notları",
            titleEn: "Demurrage notes",
            textTr:
              "Bu ay tahliyesi biten seferlerden demuraj notu girilmiş olanları çıkar, notları da yaz.",
            textEn:
              "List the voyages that finished discharging this month with demurrage notes, and quote the notes.",
          },
        ],
      },
      {
        id: "proje-marj",
        iconHint: "money",
        labelTr: "Proje & Marj",
        labelEn: "Project Margin",
        blurbTr: "Proje marjı, satış-alış fiyatı ve tonaj.",
        blurbEn: "Project margin, sales vs purchase price, tonnage.",
        prompts: [
          {
            titleTr: "Proje özeti",
            titleEn: "Project summary",
            textTr:
              "[proje no] projesini özetle: ürün, tonaj, satış ve alış birim fiyatı, tahmini kâr.",
            textEn:
              "Summarise project [project no]: product, tonnage, sales and purchase unit price, estimated profit.",
          },
          {
            titleTr: "Tahmini marj",
            titleEn: "Estimated margin",
            textTr:
              "[proje no] için tahmini satış, alım ve giderden marjı hesapla; ton başına kârı da yaz.",
            textEn:
              "Work out the margin on [project no] from estimated sales, purchase and expense, and give profit per ton.",
          },
          {
            titleTr: "Tahmini × gerçekleşen",
            titleEn: "Estimate vs actual",
            textTr:
              "[proje no] projesinde tahmini kâr/zarar ile gerçekleşeni karşılaştır, farkı hangi kalemin yarattığını söyle.",
            textEn:
              "Compare estimated and realised P&L on project [project no] and tell me which line created the gap.",
          },
          {
            titleTr: "Zarardaki projeler",
            titleEn: "Loss-making projects",
            textTr:
              "[mali yıl] döneminde gerçekleşen kâr/zararı eksi olan projeleri en büyük zarardan başlayarak listele.",
            textEn:
              "List the projects with negative realised P&L in [fiscal year], biggest loss first.",
          },
          {
            titleTr: "Segment tonajı",
            titleEn: "Segment tonnage",
            textTr:
              "[segment] segmentindeki açık projelerin toplam tonajını ve tahmini kârını ver.",
            textEn:
              "Give the total tonnage and estimated profit of the open projects in the [segment] segment.",
          },
        ],
      },
      {
        id: "odeme-takibi",
        iconHint: "alert",
        labelTr: "Ödeme",
        labelEn: "Payments",
        blurbTr: "Bekleyen ödemeler, kalan bakiye ve evrak tarihi.",
        blurbEn: "Pending payments, outstanding balance and document dates.",
        prompts: [
          {
            titleTr: "Bekleyen ödemeler",
            titleEn: "Pending payments",
            textTr: "Ödemesi bekleyen seferleri kalan bakiyesi en yüksekten başlayarak listele.",
            textEn: "List the voyages with a pending payment, largest outstanding balance first.",
          },
          {
            titleTr: "Bakiye girilmemiş",
            titleEn: "No balance entered",
            textTr:
              "Ödeme durumu bekliyor görünen ama kalan bakiyesi hiç girilmemiş seferleri çıkar.",
            textEn:
              "Pull the voyages marked pending where no outstanding balance has been entered.",
          },
          {
            titleTr: "Evrak tarihi geçmiş",
            titleEn: "Overdue document date",
            textTr: "Ödeme evrak tarihi bugünü geçmiş ve hâlâ bekleyen seferleri göster.",
            textEn: "Show the voyages still pending whose payment document date is already past.",
          },
          {
            titleTr: "Toplam açık bakiye",
            titleEn: "Total outstanding",
            textTr: "Şu an bekleyen ödemelerin toplam bakiyesi ne kadar, kaç sefere yayılmış?",
            textEn:
              "How much is outstanding across pending payments right now, and over how many voyages?",
          },
          {
            titleTr: "Projenin ödemesi",
            titleEn: "Payment on a project",
            textTr: "[proje no] projesinin ödeme durumu, kalan bakiyesi ve evrak tarihi ne?",
            textEn:
              "What is the payment status, outstanding balance and document date on project [project no]?",
          },
        ],
      },
      {
        id: "gider-karsilastirma",
        iconHint: "chart",
        labelTr: "Gider Karşılaştırma",
        labelEn: "Cost Variance",
        blurbTr: "Tahmini gideri gerçekleşenin yanına koy.",
        blurbEn: "Estimated expense next to what actually landed.",
        prompts: [
          {
            titleTr: "Kalem kalem fark",
            titleEn: "Line-by-line variance",
            textTr:
              "[proje no] projesinde tahmini gider ile gerçekleşeni kalem kalem karşılaştır, sapması en büyük üç kalemi işaretle.",
            textEn:
              "Compare estimated and realised expense line by line on project [project no] and flag the three biggest gaps.",
          },
          {
            titleTr: "Bütçeyi aşanlar",
            titleEn: "Over budget",
            textTr: "Gerçekleşen gideri tahmini gideri %20'den fazla aşan projeleri listele.",
            textEn:
              "List the projects whose realised expense exceeds the estimate by more than 20%.",
          },
          {
            titleTr: "Navlun kontrolü",
            titleEn: "Freight check",
            textTr:
              "[proje no] için ton başına tahmini navlunu ver ve gerçekleşen navlun kayıtlarıyla karşılaştır.",
            textEn:
              "Give the estimated freight per ton on [project no] and compare it with the realised freight records.",
          },
          {
            titleTr: "Gider kırılımı",
            titleEn: "Expense breakdown",
            textTr: "[proje no] tahmini giderini navlun, sigorta, gümrük ve diğer olarak ayır.",
            textEn:
              "Split the estimated expense of [project no] into freight, insurance, duties and other.",
          },
          {
            titleTr: "Tahmin girilmemiş",
            titleEn: "No estimate entered",
            textTr: "Gemi planı olan ama hiç tahmini gider kalemi girilmemiş projeleri çıkar.",
            textEn:
              "Pull the projects that have a ship plan but no estimated expense lines at all.",
          },
        ],
      },
      {
        id: "p-l-butce",
        iconHint: "document",
        labelTr: "P&L & Bütçe",
        labelEn: "P&L & Budget",
        blurbTr: "Mali yıl bazında gerçekleşen ve bütçe.",
        blurbEn: "Realised and budget P&L by fiscal year.",
        prompts: [
          {
            titleTr: "Yılın seyri",
            titleEn: "How the year ran",
            textTr:
              "[mali yıl] mali yılının gerçekleşen P&L'ini ay ay özetle; en iyi ve en kötü ayı söyle.",
            textEn:
              "Summarise realised P&L month by month for fiscal year [fiscal year], and name the best and worst month.",
          },
          {
            titleTr: "Bütçe farkı",
            titleEn: "Budget variance",
            textTr:
              "[mali yıl] bütçelenen net P&L ile gerçekleşeni ay ay karşılaştır, sapmanın en büyük olduğu ayı yaz.",
            textEn:
              "Compare budgeted net P&L with realised month by month for [fiscal year] and name the month with the biggest gap.",
          },
          {
            titleTr: "Ciro ve miktar",
            titleEn: "Revenue and volume",
            textTr: "[mali yıl] döneminde aylık ciro ve miktarı ver, ton başına ciroyu da hesapla.",
            textEn:
              "Give monthly revenue and volume for [fiscal year], and work out revenue per ton.",
          },
          {
            titleTr: "Trader performansı",
            titleEn: "Trader performance",
            textTr:
              "[trader] için bu mali yılın proje sayısını, tonajını ve tahmini × gerçekleşen P&L'ini ver.",
            textEn:
              "Give [trader]'s project count, tonnage and estimated vs realised P&L for this financial year.",
          },
          {
            titleTr: "İki yılı karşılaştır",
            titleEn: "Compare two years",
            textTr: "24-25 ile 25-26 mali yıllarını P&L, ciro ve miktar olarak karşılaştır.",
            textEn: "Compare fiscal years 24-25 and 25-26 on P&L, revenue and volume.",
          },
        ],
      },
    ],
  },
  /* ── TYRO Sales ────────────────────────────────────────────────────────
     İki MCP birden kullanılıyor (tyro-sales-mcp ve tyro-sales365-mcp), o
     yüzden buradaki her istem İKİSİNİN DE karşıladığı bir çağrıya denk
     gelir: `revenue | quantity | order_count | avg_price | invoice_revenue`
     metrikleri, `customer · product · trader · segment · site · origin ·
     incoterms · delivery_mode · currency · company` kırılımları, sipariş
     başlığı/satırı, tek sipariş detayı ve fatura satırları.

     Bilerek YAZILMAYANLAR — yalnızca bir tarafta var:
       · ay bazlı kırılım (sales365'in `get_sales_summary`'si),
       · müşteri grubu kırılımı (yalnız sales365),
       · sipariş frekansı segmentasyonu (yalnız sales-mcp).
     Dönem karşılaştırması bunların yerine iki tarih aralığıyla soruluyor;
     o ikisinde de çalışıyor.

     Para birimi ve birim ASLA toplanmıyor (ikisinin de kuralı) — istemler
     "para birimi kırılımıyla" diyerek bunu baştan söylüyor, kullanıcı tek
     bir toplam bekleyip şaşırmasın. */
  sales: {
    starters: [
      {
        iconHint: "money",
        titleTr: "Bu yılın cirosu",
        titleEn: "This year's revenue",
        textTr: "Bu yılın satış cirosunu para birimi kırılımıyla ver.",
        textEn: "Give me this year's sales revenue, split by currency.",
      },
      {
        iconHint: "chart",
        titleTr: "En çok satan ürünler",
        titleEn: "Best-selling products",
        textTr: "Bu yıl en çok satılan 10 ürünü miktar ve tutarıyla sırala.",
        textEn: "Rank this year's top 10 products by quantity and amount.",
      },
      {
        iconHint: "people",
        titleTr: "En büyük müşteriler",
        titleEn: "Biggest customers",
        textTr: "Bu yıl en yüksek ciroyu yapan 10 müşteriyi listele.",
        textEn: "List the 10 customers with the highest revenue this year.",
      },
      {
        iconHint: "task",
        titleTr: "Sipariş detayı",
        titleEn: "Order detail",
        textTr: "[sipariş no] siparişinin başlığını ve tüm satırlarını göster.",
        textEn: "Show the header and every line of order [order no].",
      },
    ],
    topics: [
      {
        id: "ciro-kirilim",
        iconHint: "chart",
        labelTr: "Ciro & Kırılım",
        labelEn: "Revenue & Breakdown",
        blurbTr: "Toplamlar ve boyutlar: kim, ne, hangi segment, hangi para birimi.",
        blurbEn: "Totals and dimensions — who, what, which segment, which currency.",
        prompts: [
          {
            titleTr: "Yılın cirosu",
            titleEn: "Revenue this year",
            textTr: "Bu yılın toplam satış cirosunu para birimi kırılımıyla ver.",
            textEn: "Give me total sales revenue for this year, split by currency.",
          },
          {
            titleTr: "Segment kırılımı",
            titleEn: "By segment",
            textTr: "Bu yılın cirosunu segment bazında kır ve en büyük üç segmenti öne çıkar.",
            textEn: "Break this year's revenue down by segment and highlight the top three.",
          },
          {
            titleTr: "Trader sıralaması",
            titleEn: "Traders ranked",
            textTr: "Bu yıl trader bazında ciroyu yüksekten düşüğe sırala.",
            textEn: "Rank this year's revenue by trader, highest first.",
          },
          {
            titleTr: "İki dönemi karşılaştır",
            titleEn: "Compare two periods",
            textTr: "[dönem 1] ile [dönem 2] cirosunu karşılaştır, farkı yüzde olarak ver.",
            textEn:
              "Compare revenue for [period 1] and [period 2], and give the difference as a percentage.",
          },
          {
            titleTr: "Şirket kırılımı",
            titleEn: "By company",
            textTr: "Bu yılın satış cirosunu şirket bazında kır.",
            textEn: "Break this year's sales revenue down by company.",
          },
          {
            titleTr: "Menşe kırılımı",
            titleEn: "By origin",
            textTr: "Bu yılın satışlarını menşe bazında kır, miktar ve tutarı birlikte ver.",
            textEn: "Break this year's sales down by origin, with quantity and amount together.",
          },
        ],
      },
      {
        id: "urun-fiyat",
        iconHint: "task",
        labelTr: "Ürün & Fiyat",
        labelEn: "Product & Price",
        blurbTr: "Ne satıldı, ne kadara: ürün bazında miktar, tutar ve ortalama fiyat.",
        blurbEn: "What sold and for how much — quantity, amount and average price per product.",
        prompts: [
          {
            titleTr: "En çok satanlar",
            titleEn: "Best sellers",
            textTr: "Bu yıl en çok satılan 10 ürünü miktar ve tutarıyla sırala.",
            textEn: "Rank this year's top 10 products by quantity and amount.",
          },
          {
            titleTr: "Bir ürünün satışı",
            titleEn: "One product's sales",
            textTr: "[ürün adı] ürününün bu yılki satış miktarını ve tutarını ver.",
            textEn: "Give me the quantity and amount sold of [product name] this year.",
          },
          {
            titleTr: "Ortalama fiyat",
            titleEn: "Average price",
            textTr: "[ürün adı] için bu yılki ortalama birim satış fiyatını hesapla.",
            textEn: "Work out the average unit selling price of [product name] this year.",
          },
          {
            titleTr: "Ürün × müşteri",
            titleEn: "Product by customer",
            textTr: "[ürün adı] ürününü bu yıl hangi müşteriler aldı? Tutara göre sırala.",
            textEn: "Which customers bought [product name] this year? Rank them by amount.",
          },
          {
            titleTr: "Teslim şekli",
            titleEn: "By delivery terms",
            textTr: "Bu yılın satışlarını incoterm ve teslim şekli bazında kır.",
            textEn: "Break this year's sales down by incoterm and delivery mode.",
          },
        ],
      },
      {
        id: "siparis",
        iconHint: "note",
        labelTr: "Sipariş",
        labelEn: "Orders",
        blurbTr: "Sipariş başlıkları ve satırları: açık, teslim, iptal.",
        blurbEn: "Order headers and lines — open, delivered, cancelled.",
        prompts: [
          {
            titleTr: "Sipariş detayı",
            titleEn: "Order detail",
            textTr: "[sipariş no] siparişinin başlığını ve tüm satırlarını göster.",
            textEn: "Show the header and every line of order [order no].",
          },
          {
            titleTr: "Açık siparişler",
            titleEn: "Open orders",
            textTr: "Henüz faturalanmamış açık siparişleri müşteri ve tutarıyla listele.",
            textEn: "List open orders that aren't invoiced yet, with customer and amount.",
          },
          {
            titleTr: "Müşterinin siparişleri",
            titleEn: "A customer's orders",
            textTr: "[müşteri adı] müşterisinin son siparişlerini tarih sırasıyla listele.",
            textEn: "List [customer name]'s recent orders in date order.",
          },
          {
            titleTr: "Sipariş adedi",
            titleEn: "Order count",
            textTr: "Bu yıl kaç satış siparişi açıldı? Müşteri bazında sırala.",
            textEn: "How many sales orders were opened this year? Rank them by customer.",
          },
          {
            titleTr: "İptal edilenler",
            titleEn: "Cancelled orders",
            textTr: "Bu yıl iptal edilen siparişleri müşteri ve tutarıyla listele.",
            textEn: "List this year's cancelled orders with customer and amount.",
          },
        ],
      },
      {
        id: "fatura",
        iconHint: "money",
        labelTr: "Fatura",
        labelEn: "Invoicing",
        blurbTr: "Fiilen faturalanan: sipariş edilenle arasındaki farkı görürsün.",
        blurbEn: "What was actually invoiced — and how it differs from what was ordered.",
        prompts: [
          {
            titleTr: "Faturalanan ciro",
            titleEn: "Invoiced revenue",
            textTr: "Bu ayın faturalanan satış tutarını müşteri bazında ver.",
            textEn: "Give me this month's invoiced sales amount by customer.",
          },
          {
            titleTr: "Müşterinin faturaları",
            titleEn: "A customer's invoices",
            textTr: "[müşteri adı] müşterisine bu yıl kesilen fatura satırlarını listele.",
            textEn: "List the invoice lines issued to [customer name] this year.",
          },
          {
            titleTr: "Sipariş × fatura",
            titleEn: "Ordered vs invoiced",
            textTr: "Bu yıl sipariş edilen miktar ile faturalanan miktarı karşılaştır.",
            textEn: "Compare the quantity ordered with the quantity invoiced this year.",
          },
          {
            titleTr: "Tek fatura",
            titleEn: "One invoice",
            textTr: "[fatura no] numaralı faturanın satırlarını göster.",
            textEn: "Show the lines of invoice [invoice no].",
          },
          {
            titleTr: "Ürün bazında fatura",
            titleEn: "Invoiced by product",
            textTr: "Bu yıl faturalanan tutarı ürün bazında kır ve ilk 10'u ver.",
            textEn: "Break this year's invoiced amount down by product and give me the top 10.",
          },
        ],
      },
      {
        id: "musteri",
        iconHint: "people",
        labelTr: "Müşteri",
        labelEn: "Customers",
        blurbTr: "Kim ne kadar alıyor, nereden ve hangi şartla.",
        blurbEn: "Who buys how much, from where, and on what terms.",
        prompts: [
          {
            titleTr: "En büyük müşteriler",
            titleEn: "Biggest customers",
            textTr: "Bu yıl en yüksek ciroyu yapan 10 müşteriyi listele.",
            textEn: "List the 10 customers with the highest revenue this year.",
          },
          {
            titleTr: "Müşteri özeti",
            titleEn: "Customer summary",
            textTr: "[müşteri adı] müşterisinin bu yılki satışlarını ürün kırılımıyla özetle.",
            textEn: "Summarise [customer name]'s sales this year, broken down by product.",
          },
          {
            titleTr: "Müşteri × dönem",
            titleEn: "Customer over time",
            textTr: "[müşteri adı] müşterisinin bu yıl ve geçen yılki cirosunu karşılaştır.",
            textEn: "Compare [customer name]'s revenue this year and last year.",
          },
          {
            titleTr: "Lokasyon kırılımı",
            titleEn: "By site",
            textTr: "Bu yılın satışlarını site (lokasyon) bazında kır.",
            textEn: "Break this year's sales down by site.",
          },
          {
            titleTr: "Trader × ürün",
            titleEn: "Trader by product",
            textTr: "[trader] trader'ının bu yıl hangi üründen ne kadar sattığını tutarıyla ver.",
            textEn: "Show what [trader] sold this year by product, with amounts.",
          },
        ],
      },
    ],
  },
  /* ── TYRO HR ───────────────────────────────────────────────────────────
     tyro-hr-mcp. Bu katalogda KAYIT OLUŞTURAN istemler var (izin talebi,
     masraf, avans, yetki devri) — araçlar gerçekten yazıyor ve onay akışını
     başlatıyor. O yüzden hepsi tarih/tutar gibi bir yer tutucuyla geliyor:
     kullanıcı ne kaydedeceğini görmeden göndermesin.

     Eskiden bu konu TYRO Office kataloğunun içindeydi ve orada karşılığı
     yoktu: Office M365'e bağlı, İK araçları başka bir MCP'de. */
  hr: {
    starters: [
      {
        iconHint: "calendar",
        titleTr: "İzin bakiyem",
        titleEn: "My leave balance",
        textTr: "Yıllık izin bakiyemi göster: hak ediş, kullanılan ve kalan gün.",
        textEn: "Show my annual leave balance: entitled, used and remaining days.",
      },
      {
        iconHint: "calendar",
        titleTr: "İzin talebi",
        titleEn: "Request leave",
        textTr: "[başlangıç] – [bitiş] tarihleri arasında yıllık izin talebi oluştur.",
        textEn: "Create an annual leave request for [start] – [end].",
        template: "leaveRequest",
      },
      {
        iconHint: "money",
        titleTr: "Masraflarım",
        titleEn: "My expenses",
        textTr: "Bu yıl girdiğim masraf kayıtlarını tarih ve tutarıyla listele.",
        textEn: "List the expense records I've entered this year, with date and amount.",
      },
      {
        iconHint: "money",
        titleTr: "Avans talebi",
        titleEn: "Request an advance",
        textTr: "[tutar] tutarında, [amaç] için iş avansı talebi oluştur.",
        textEn: "Create a cash advance request for [amount], for [purpose].",
        template: "advance",
      },
    ],
    topics: [
      {
        id: "izin",
        iconHint: "calendar",
        labelTr: "İzin",
        labelEn: "Leave",
        blurbTr: "Bakiye, geçmiş ve yeni talep — talep gerçekten oluşturulur.",
        blurbEn: "Balance, history and a new request — the request is really created.",
        prompts: [
          {
            titleTr: "İzin bakiyem",
            titleEn: "My balance",
            textTr: "Yıllık izin bakiyemi göster: hak ediş, kullanılan ve kalan gün.",
            textEn: "Show my annual leave balance: entitled, used and remaining days.",
          },
          {
            titleTr: "İzin talebi",
            titleEn: "Request leave",
            textTr: "[başlangıç] – [bitiş] tarihleri arasında yıllık izin talebi oluştur.",
            textEn: "Create an annual leave request for [start] – [end].",
            template: "leaveRequest",
          },
          {
            titleTr: "İzin geçmişim",
            titleEn: "My leave history",
            textTr: "Bu yıl kullandığım izinleri tarih ve gün sayısıyla listele.",
            textEn: "List the leave I've taken this year, with dates and number of days.",
          },
          {
            titleTr: "Başkasının bakiyesi",
            titleEn: "Someone else's balance",
            textTr: "[kişi adı] adlı çalışanın yıllık izin bakiyesini göster.",
            textEn: "Show the annual leave balance of [person name].",
          },
          {
            titleTr: "Mazeret izni",
            titleEn: "Other leave type",
            textTr: "[başlangıç] – [bitiş] için [izin türü] talebi oluştur.",
            textEn: "Create a [leave type] request for [start] – [end].",
            template: "leaveRequest",
            preset: { kind: "excuse" },
          },
        ],
      },
      {
        id: "masraf-avans",
        iconHint: "money",
        labelTr: "Masraf & Avans",
        labelEn: "Expenses & Advances",
        blurbTr: "Kendi masrafın ve avansın: gör, oluştur, takip et.",
        blurbEn: "Your own expenses and advances — see them, create them, track them.",
        prompts: [
          {
            titleTr: "Masraflarım",
            titleEn: "My expenses",
            textTr: "Bu yıl girdiğim masraf kayıtlarını tarih ve tutarıyla listele.",
            textEn: "List the expense records I've entered this year, with date and amount.",
          },
          {
            titleTr: "Masraf oluştur",
            titleEn: "Create an expense",
            textTr: "[tarih] tarihli, [tutar] tutarında [açıklama] masrafını kaydet.",
            textEn: "Record an expense of [amount] on [date] for [description].",
            template: "expense",
          },
          {
            titleTr: "Avans talebi",
            titleEn: "Request an advance",
            textTr: "[tutar] tutarında, [amaç] için iş avansı talebi oluştur.",
            textEn: "Create a cash advance request for [amount], for [purpose].",
            template: "advance",
          },
          {
            titleTr: "Açık avanslarım",
            titleEn: "My open advances",
            textTr: "Kapanmamış iş avanslarımı tutar ve tarihiyle listele.",
            textEn: "List my open cash advances with amount and date.",
          },
          {
            titleTr: "Kimin adına girebilirim",
            titleEn: "Who I can file for",
            textTr: "Kimin adına masraf girebiliyorum? Yetki verenleri listele.",
            textEn: "Whose expenses can I file? List the people who delegated to me.",
          },
        ],
      },
      {
        id: "yetki-kisi",
        iconHint: "people",
        labelTr: "Yetki & Kişi",
        labelEn: "Delegation & People",
        blurbTr: "İzne çıkarken onayları devret, kişileri bul.",
        blurbEn: "Hand your approvals over before you go, and look people up.",
        prompts: [
          {
            titleTr: "Onay temsilcisi",
            titleEn: "Delegate approvals",
            textTr: "[başlangıç] – [bitiş] arası onaylarımı [kişi adı] kişisine devret.",
            textEn: "Delegate my approvals to [person name] for [start] – [end].",
          },
          {
            titleTr: "Devirlerim",
            titleEn: "My delegations",
            textTr: "Bana devredilen ve benim devrettiğim yetkileri listele.",
            textEn: "List the delegations made to me and the ones I've made.",
          },
          {
            titleTr: "Çalışan bul",
            titleEn: "Find a colleague",
            textTr: "[isim] adlı çalışanın mail adresini ve personel numarasını bul.",
            textEn: "Find the email address and personnel number of [name].",
          },
          {
            titleTr: "Ekip bakiyesi",
            titleEn: "A colleague's leave",
            textTr: "[kişi adı] adlı çalışanın bu yıl kullandığı izinleri listele.",
            textEn: "List the leave [person name] has taken this year.",
          },
        ],
      },
    ],
  },
  general: {
    starters: [
      {
        iconHint: "mail",
        titleTr: "Tedarikçiye mail",
        titleEn: "Mail to supplier",
        textTr: "Tedarikçiye [ürün] yüklemesinin geciktiğini bildiren kısa bir İngilizce mail yaz.",
        textEn:
          "Write a short English mail telling the supplier the [product] shipment is delayed.",
      },
      {
        iconHint: "document",
        titleTr: "Maddeyi çevir",
        titleEn: "Translate a clause",
        textTr: "Şu charter party maddesini Türkçeye çevir ve riskli kısmını işaretle: [madde]",
        textEn:
          "Translate this charter party clause into Turkish and flag the risky part: [clause]",
      },
      {
        iconHint: "search",
        titleTr: "FOB mu CIF mi",
        titleEn: "FOB or CIF",
        textTr: "FOB ile CIF farkını navlun, sigorta ve risk devri üzerinden anlat.",
        textEn:
          "Explain the difference between FOB and CIF in terms of freight, insurance and risk transfer.",
      },
      {
        iconHint: "people",
        titleTr: "Notları aksiyona",
        titleEn: "Notes to actions",
        textTr: "Şu toplantı notlarını karar ve aksiyon listesine çevir: [notlar]",
        textEn: "Turn these meeting notes into a decisions and actions list: [notes]",
      },
    ],
    topics: [
      {
        id: "yazisma",
        iconHint: "mail",
        labelTr: "Yazışma",
        labelEn: "Correspondence",
        blurbTr: "Tedarikçi, armatör, acente ve alıcıya giden mailleri yazdır.",
        blurbEn: "Draft the mails that go to suppliers, owners, agents and buyers.",
        prompts: [
          {
            titleTr: "Gecikme bildirimi",
            titleEn: "Delay notice",
            textTr:
              "Tedarikçiye [ürün] yüklemesinin [gün] gün geciktiğini bildiren kısa bir İngilizce mail yaz; ilişkiyi germeden yeni yükleme tarihi iste.",
            textEn:
              "Write a short English mail telling the supplier the [product] loading is [days] days late; ask for a new loading date without straining the relationship.",
          },
          {
            titleTr: "Acenteye talimat",
            titleEn: "Instructions to agent",
            textTr:
              "Gemi acentesine [gemi adı] için yükleme talimatı maili yaz: liman, ürün, miktar ve bizden istenecek evrak listesi.",
            textEn:
              "Write a loading instruction mail to the agent for [vessel]: port, product, quantity and the list of documents they need from us.",
          },
          {
            titleTr: "Varış bildirimi",
            titleEn: "Arrival notice",
            textTr:
              "Alıcıya [gemi adı] geminin [tarih] tahliye limanına varacağını bildiren, tahliye hazırlığını ve evrak durumunu soran bir mail yaz.",
            textEn:
              "Write a mail telling the buyer that [vessel] arrives at the discharge port on [date], asking about discharge readiness and document status.",
          },
          {
            titleTr: "Teklif maili",
            titleEn: "Offer mail",
            textTr:
              "[ürün] için [ton] tonluk CIF teklifimizi ileten kısa bir mail yaz: fiyat, teslim dönemi, ödeme şekli ve teklifin geçerlilik süresi.",
            textEn:
              "Write a short mail conveying our CIF offer for [tonnes] mt of [product]: price, shipment period, payment terms and offer validity.",
          },
        ],
      },
      {
        id: "ceviri",
        iconHint: "document",
        labelTr: "Çeviri",
        labelEn: "Translation",
        blurbTr: "Sözleşme, akreditif ve yazışma metinlerini diller arasında çevir.",
        blurbEn: "Move contract, LC and correspondence text between languages.",
        prompts: [
          {
            titleTr: "Charter party maddesi",
            titleEn: "Charter party clause",
            textTr:
              "Şu charter party maddesini Türkçeye çevir, altına bizim için riskli olan kısmı iki cümleyle yaz: [madde]",
            textEn:
              "Translate this charter party clause into Turkish, then add two sentences on what is risky for us: [clause]",
          },
          {
            titleTr: "Akreditif şartı",
            titleEn: "LC condition",
            textTr:
              "Bu akreditif şartını Türkçeye çevir ve hangi evrakın kimden isteneceğini madde madde çıkar: [metin]",
            textEn:
              "Translate this letter of credit condition into Turkish and list, item by item, which document is required from whom: [text]",
          },
          {
            titleTr: "Sözleşme TR→EN",
            titleEn: "Contract TR→EN",
            textTr:
              "Şu Türkçe sözleşme maddesini ticari İngilizceye çevir, anlamını ve bağlayıcılığını değiştirme: [madde]",
            textEn:
              "Translate this Turkish contract clause into commercial English without changing its meaning or its binding force: [clause]",
          },
          {
            titleTr: "Maili İngilizceye",
            titleEn: "Mail into English",
            textTr: "Bu maili İngilizceye çevir; ton resmi kalsın ama cümleler kısa olsun: [mail]",
            textEn:
              "Translate this mail into English; keep the tone formal but the sentences short: [mail]",
          },
        ],
      },
      {
        id: "ticaret-terimleri",
        iconHint: "search",
        labelTr: "Ticaret Terimleri",
        labelEn: "Trade Terms",
        blurbTr: "Incoterm, laytime, akreditif — terimi işimizin diliyle açıklat.",
        blurbEn: "Incoterms, laytime, LCs — explained in the language of our business.",
        prompts: [
          {
            titleTr: "FOB mu CIF mi",
            titleEn: "FOB or CIF",
            textTr:
              "FOB ile CIF farkını navlun, sigorta ve risk devri açısından anlat; [ürün] yüklememizde hangisi bizim lehimize olur?",
            textEn:
              "Explain the difference between FOB and CIF in terms of freight, insurance and risk transfer; which one works in our favour on a [product] shipment?",
          },
          {
            titleTr: "Laytime ve demuraj",
            titleEn: "Laytime and demurrage",
            textTr:
              "Laytime, demuraj ve despatch nasıl hesaplanır? [gün] günlük laytime üzerinden basit bir örnekle anlat.",
            textEn:
              "How are laytime, demurrage and despatch calculated? Walk through a simple example based on [days] days of laytime.",
          },
          {
            titleTr: "NOR ne zaman",
            titleEn: "When NOR counts",
            textTr:
              "NOR ne zaman verilir, ne zaman kabul edilmiş sayılır? Kabul edilmezse laytime işlemeye başlar mı?",
            textEn:
              "When is NOR tendered and when is it deemed accepted? Does laytime start running if it is not accepted?",
          },
          {
            titleTr: "CAD mi akreditif mi",
            titleEn: "CAD or LC",
            textTr:
              "CAD ile akreditifi ödeme riski açısından karşılaştır; [ülke] alıcısı için hangisini önerirsin?",
            textEn:
              "Compare CAD and a letter of credit in terms of payment risk; which would you recommend for a buyer in [country]?",
          },
        ],
      },
      {
        id: "sozlesme-evrak",
        iconHint: "file",
        labelTr: "Sözleşme & Evrak",
        labelEn: "Contracts & Docs",
        blurbTr: "Sözleşme metni yazdır, taslağı okut, evrak listesi çıkart.",
        blurbEn: "Draft clauses, read a draft critically, list the paperwork.",
        prompts: [
          {
            titleTr: "Evrak listesi",
            titleEn: "Document list",
            textTr:
              "[ülke]'ye [ürün] yüklemesinde alıcıya gitmesi gereken evrak listesini çıkar; her evrakın kimden alındığını da yaz.",
            textEn:
              "List the documents the buyer needs for a [product] shipment to [country], noting who each one comes from.",
          },
          {
            titleTr: "Taslağı denetle",
            titleEn: "Review the draft",
            textTr:
              "Şu satış sözleşmesi taslağını oku ve bizim aleyhimize olabilecek maddeleri gerekçesiyle listele: [metin]",
            textEn:
              "Read this sales contract draft and list the clauses that could work against us, with the reason for each: [text]",
          },
          {
            titleTr: "Mücbir sebep maddesi",
            titleEn: "Force majeure clause",
            textTr:
              "[ürün] satış sözleşmesi için mücbir sebep maddesi yaz; liman grevini ve ihracat yasağını da kapsasın.",
            textEn:
              "Write a force majeure clause for a [product] sales contract that also covers port strikes and export bans.",
          },
          {
            titleTr: "Akreditif kontrolü",
            titleEn: "LC checklist",
            textTr:
              "Akreditif metnini bankaya göndermeden önce kontrol edeceğimiz maddelerden bir kontrol listesi hazırla.",
            textEn:
              "Build a checklist of what to verify in an LC text before we send it to the bank.",
          },
        ],
      },
      {
        id: "rapor-ozet",
        iconHint: "chart",
        labelTr: "Rapor & Özet",
        labelEn: "Reports & Summaries",
        blurbTr: "Notu, mail zincirini ve rakamı yönetimin okuyacağı hâle getir.",
        blurbEn: "Turn notes, mail threads and figures into something management reads.",
        prompts: [
          {
            titleTr: "Yönetim özeti",
            titleEn: "Management summary",
            textTr: "Şu notlardan yönetime gidecek yarım sayfalık bir durum özeti yaz: [notlar]",
            textEn: "Write a half-page status summary for management from these notes: [notes]",
          },
          {
            titleTr: "Rapor iskeleti",
            titleEn: "Report skeleton",
            textTr:
              "Haftalık gemi operasyon raporu için başlık ve bölüm iskeleti çıkar; her bölümde hangi rakamın duracağını yaz.",
            textEn:
              "Draw up the headings and section skeleton for a weekly vessel operations report, noting which figure belongs in each section.",
          },
          {
            titleTr: "Rakamları yorumla",
            titleEn: "Read the figures",
            textTr: "Şu rakamları operasyon diliyle üç maddede yorumla, tahmin yürütme: [rakamlar]",
            textEn:
              "Interpret these figures in operational language in three points; do not speculate: [figures]",
          },
          {
            titleTr: "Mail zincirini özetle",
            titleEn: "Summarise the thread",
            textTr:
              "Bu mail zincirini kimin ne söylediği belli olacak şekilde kronolojik bir özete çevir: [zincir]",
            textEn:
              "Turn this mail thread into a chronological summary that makes clear who said what: [thread]",
          },
        ],
      },
    ],
  },
}
