// Çevrim dışı yedek katalog — Dataverse okunamazsa gösterilen liste. Demo
// kataloğuyla (src/demo/data/dataverse-catalog.js) aynı adları ve ikonları taşır;
// kimlikler bilinçli olarak GUID DEĞİL (ConfigProvider sunucu satırlarıyla adla eşler).

export const seedAgents = [
  {
    id: "tyro-office",
    name: "TYRO Office",
    description:
      "E-posta, takvim ve belgelerinizde yanınızda: toplantı hazırlığı, yazışma özetleri, taslak yanıtlar ve dosya arama.",
    tenantId: "",
    clientId: "",
    agentId: "tyro_office",
    iconName: "AiMailIcon",
    sortOrder: 10,
    logo: null,
  },
  {
    id: "tyro-sales",
    name: "TYRO Sales",
    description:
      "Satış hunisi, tahmin ve teklifler: fırsat durumu, hedefe kalan, müşteri içgörüleri ve teklif taslakları.",
    tenantId: "",
    clientId: "",
    agentId: "tyro_sales",
    iconName: "ChartIncreaseIcon",
    sortOrder: 20,
    logo: null,
  },
  {
    id: "tyro-hr",
    name: "TYRO HR",
    description:
      "İzin, masraf ve avans işlemleri; şirket politikaları ve yan haklar hakkında sorularınız için İK asistanı.",
    tenantId: "",
    clientId: "",
    agentId: "tyro_hr",
    iconName: "UserGroupIcon",
    sortOrder: 30,
    logo: null,
  },
]

export const seedAiApps = [
  {
    id: "tyrosign",
    name: "tyroSign",
    description: "Dijital imza ve onay akışları — teklif ve sözleşmeleri tek ekrandan imzaya gönderin.",
    url: "#",
    iconName: "SignatureIcon",
    logo: null,
  },
  {
    id: "tyroforecast",
    name: "tyroForecast",
    description: "Talep ve satış tahminleme — bölge ve ürün bazında çeyreklik projeksiyon.",
    url: "#",
    iconName: "Telescope02Icon",
    logo: null,
  },
  {
    id: "tyrostrategy",
    name: "tyroStrategy",
    description: "Stratejik hedef ve aksiyon takibi — OKR'lar, sorumlular ve ilerleme.",
    url: "#",
    iconName: "Target02Icon",
    logo: null,
  },
  {
    id: "tyrotrade",
    name: "tyroTrade",
    description: "Sipariş ve sevkiyat operasyonları — müşteri siparişinden teslimata takip.",
    url: "#",
    iconName: "CargoShipIcon",
    logo: null,
  },
  {
    id: "tyrostock",
    name: "tyroStock",
    description: "Stok ve envanter görünürlüğü — depo bazında anlık stok ve rezervasyon.",
    url: "#",
    iconName: "Package01Icon",
    logo: null,
  },
  {
    id: "tyro-aiops",
    name: "tyroAIOps",
    description: "Merkezi BT operasyon platformu — olay, değişiklik ve kapasite yönetimi.",
    url: "#",
    iconName: "AiChipIcon",
    logo: null,
  },
]

export const seedBusinessApps = [
  {
    id: "salesforce",
    name: "Salesforce",
    description: "CRM — müşteri hesapları, fırsatlar ve satış faaliyetleri",
    url: "https://www.salesforce.com/",
    iconName: "CloudIcon",
    logo: null,
  },
  {
    id: "sap-s4hana",
    name: "SAP S/4HANA",
    description: "ERP — sipariş, faturalama, stok ve finans süreçleri",
    url: "https://www.sap.com/products/erp/s4hana.html",
    iconName: "Database01Icon",
    logo: null,
  },
  {
    id: "power-bi",
    name: "Power BI",
    description: "Kurumsal raporlama ve satış panoları",
    url: "https://www.microsoft.com/power-platform/products/power-bi",
    iconName: "ChartHistogramIcon",
    logo: null,
  },
  {
    id: "jira",
    name: "Jira",
    description: "BT talepleri, iş takibi ve proje panoları",
    url: "https://www.atlassian.com/software/jira",
    iconName: "KanbanIcon",
    logo: null,
  },
  {
    id: "servicenow",
    name: "ServiceNow",
    description: "Hizmet masası — destek kayıtları ve self servis portalı",
    url: "https://www.servicenow.com/",
    iconName: "CustomerSupportIcon",
    logo: null,
  },
  {
    id: "workday",
    name: "Workday",
    description: "İnsan kaynakları, bordro ve yetenek yönetimi",
    url: "https://www.workday.com/",
    iconName: "UserMultiple02Icon",
    logo: null,
  },
  {
    id: "confluence",
    name: "Confluence",
    description: "Kurumsal wiki — süreç dokümanları ve satış oyun kitapları",
    url: "https://www.atlassian.com/software/confluence",
    iconName: "BookOpen01Icon",
    logo: null,
  },
  {
    id: "slack",
    name: "Slack",
    description: "Ekip mesajlaşması ve müşteri kanalları",
    url: "https://slack.com/",
    iconName: "SlackIcon",
    logo: null,
  },
]
