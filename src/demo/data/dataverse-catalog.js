// Demo — launcher kataloğu (`tyro_launcherapps`), yetki (`tyro_authorizedapps`) ve
// talep (`tyro_requestapps`) tabloları. TÜMÜ KURGUSAL. İş uygulamalarının adresleri
// üreticilerin herkese açık ana sayfalarıdır; AI ürünlerinin adresi yok ("#").
import { COLLEAGUES, MANAGER, ME, TEAM } from "@/demo/persona"
import { stableGuid } from "./dataverse-odata"

export const TYPE_AGENT = 100000000
export const TYPE_AI_APP = 100000001
export const TYPE_BUSINESS_APP = 100000002

/** Asistanların kataloğu — ad ve şema adı sohbet katmanıyla SÖZLEŞMEDİR. */
export const AGENTS = [
  {
    name: "TYRO Office",
    agentId: "tyro_office",
    iconName: "AiMailIcon",
    description:
      "E-posta, takvim ve belgelerinizde yanınızda: toplantı hazırlığı, yazışma özetleri, taslak yanıtlar ve dosya arama.",
  },
  {
    name: "TYRO Sales",
    agentId: "tyro_sales",
    iconName: "ChartIncreaseIcon",
    description:
      "Satış hunisi, tahmin ve teklifler: fırsat durumu, hedefe kalan, müşteri içgörüleri ve teklif taslakları.",
  },
  {
    name: "TYRO HR",
    agentId: "tyro_hr",
    iconName: "UserGroupIcon",
    description:
      "İzin, masraf ve avans işlemleri; şirket politikaları ve yan haklar hakkında sorularınız için İK asistanı.",
  },
]

export const AI_APPS = [
  {
    name: "tyroSign",
    iconName: "SignatureIcon",
    description: "Dijital imza ve onay akışları — teklif ve sözleşmeleri tek ekrandan imzaya gönderin.",
  },
  {
    name: "tyroForecast",
    iconName: "Telescope02Icon",
    description: "Talep ve satış tahminleme — bölge ve ürün bazında çeyreklik projeksiyon.",
  },
  {
    name: "tyroStrategy",
    iconName: "Target02Icon",
    description: "Stratejik hedef ve aksiyon takibi — OKR'lar, sorumlular ve ilerleme.",
  },
  {
    name: "tyroTrade",
    iconName: "CargoShipIcon",
    description: "Sipariş ve sevkiyat operasyonları — müşteri siparişinden teslimata takip.",
  },
  {
    name: "tyroStock",
    iconName: "Package01Icon",
    description: "Stok ve envanter görünürlüğü — depo bazında anlık stok ve rezervasyon.",
  },
  {
    name: "tyroAIOps",
    iconName: "AiChipIcon",
    description: "Merkezi BT operasyon platformu — olay, değişiklik ve kapasite yönetimi.",
  },
]

export const BUSINESS_APPS = [
  {
    name: "Salesforce",
    iconName: "CloudIcon",
    url: "https://www.salesforce.com/",
    description: "CRM — müşteri hesapları, fırsatlar ve satış faaliyetleri",
  },
  {
    name: "SAP S/4HANA",
    iconName: "Database01Icon",
    url: "https://www.sap.com/products/erp/s4hana.html",
    description: "ERP — sipariş, faturalama, stok ve finans süreçleri",
  },
  {
    name: "Power BI",
    iconName: "ChartHistogramIcon",
    url: "https://www.microsoft.com/power-platform/products/power-bi",
    description: "Kurumsal raporlama ve satış panoları",
  },
  {
    name: "Jira",
    iconName: "KanbanIcon",
    url: "https://www.atlassian.com/software/jira",
    description: "BT talepleri, iş takibi ve proje panoları",
  },
  {
    name: "ServiceNow",
    iconName: "CustomerSupportIcon",
    url: "https://www.servicenow.com/",
    description: "Hizmet masası — destek kayıtları ve self servis portalı",
  },
  {
    name: "Workday",
    iconName: "UserMultiple02Icon",
    url: "https://www.workday.com/",
    description: "İnsan kaynakları, bordro ve yetenek yönetimi",
  },
  {
    name: "Confluence",
    iconName: "BookOpen01Icon",
    url: "https://www.atlassian.com/software/confluence",
    description: "Kurumsal wiki — süreç dokümanları ve satış oyun kitapları",
  },
  {
    name: "Slack",
    iconName: "SlackIcon",
    url: "https://slack.com/",
    description: "Ekip mesajlaşması ve müşteri kanalları",
  },
]

/** Katalog satırları — Dataverse'teki biçimiyle (kararlı GUID, sıralı). */
export function catalogRows() {
  const rows = []
  AGENTS.forEach((a, i) =>
    rows.push({
      tyro_launcherappid: stableGuid(`agent:${a.agentId}`),
      tyro_name: a.name,
      tyro_type: TYPE_AGENT,
      tyro_description: a.description,
      tyro_url: null,
      tyro_tenantid: "00000000-0000-0000-0000-000000000000",
      tyro_clientid: "00000000-0000-0000-0000-00000000d3e0",
      tyro_agentid: a.agentId,
      tyro_iconname: a.iconName,
      tyro_sortorder: (i + 1) * 10,
      tyro_isactive: true,
    }),
  )
  AI_APPS.forEach((a, i) =>
    rows.push({
      tyro_launcherappid: stableGuid(`ai:${a.name}`),
      tyro_name: a.name,
      tyro_type: TYPE_AI_APP,
      tyro_description: a.description,
      tyro_url: "#",
      tyro_tenantid: null,
      tyro_clientid: null,
      tyro_agentid: null,
      tyro_iconname: a.iconName,
      tyro_sortorder: (i + 1) * 10,
      tyro_isactive: true,
    }),
  )
  BUSINESS_APPS.forEach((a, i) =>
    rows.push({
      tyro_launcherappid: stableGuid(`biz:${a.name}`),
      tyro_name: a.name,
      tyro_type: TYPE_BUSINESS_APP,
      tyro_description: a.description,
      tyro_url: a.url,
      tyro_tenantid: null,
      tyro_clientid: null,
      tyro_agentid: null,
      tyro_iconname: a.iconName,
      tyro_sortorder: (i + 1) * 10,
      tyro_isactive: true,
    }),
  )
  return rows
}

const upn = (p) => p.userPrincipalName.toLowerCase()
const ALL_AGENTS = AGENTS.map((a) => a.name)

/**
 * Yetki satırları. Demo kişisi üç asistanın HEPSİNE yetkili ve yönetici DEĞİL.
 * AI ürünlerinden ikisi kilitli kalır (biri için bekleyen bir talep var) — talep
 * akışı ekranda görünsün diye.
 */
export function authorizationRows() {
  const row = (person, apps, isAdmin = false) => ({
    tyro_authorizedappid: stableGuid(`auth:${upn(person)}`),
    tyro_useremail: upn(person),
    tyro_apps: apps.join(";"),
    tyro_isadmin: isAdmin,
  })
  const [ece, mert, selin, burak, zeynep] = TEAM
  const [ayse, can, leyla, onur, elif, baris] = COLLEAGUES
  return [
    row(ME, [...ALL_AGENTS, "tyroSign", "tyroForecast", "tyroStrategy", "tyroTrade"]),
    row(MANAGER, [...ALL_AGENTS, "tyroSign", "tyroForecast", "tyroStrategy", "tyroStock"]),
    row(ece, [...ALL_AGENTS, "tyroSign", "tyroForecast"]),
    row(mert, [...ALL_AGENTS, "tyroSign", "tyroForecast", "tyroTrade"]),
    row(selin, ["TYRO Office", "TYRO Sales", "TYRO HR", "tyroSign"]),
    row(burak, [...ALL_AGENTS, "tyroForecast", "tyroStock", "tyroTrade"]),
    row(zeynep, ["TYRO Office", "TYRO Sales", "TYRO HR"]),
    row(ayse, ["TYRO Office", "TYRO HR", "tyroStrategy"]),
    row(can, ["TYRO Office", "TYRO HR", "tyroForecast", "tyroStock"]),
    row(leyla, ["TYRO Office", "TYRO HR", "tyroSign"], true),
    row(onur, [...ALL_AGENTS, "tyroSign"]),
    row(elif, ["TYRO Office", "TYRO HR", "tyroStrategy", "tyroForecast"]),
    row(baris, ["TYRO Office", "TYRO HR", "tyroSign"]),
  ]
}

const daysAgoIso = (now, days, hour = 10) => {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days, hour, 12)
  return d.toISOString()
}

/** Talepler — kişinin kendi bekleyen talebi dahil. */
export function requestRows(now = new Date()) {
  const [ece, mert, , burak, zeynep] = TEAM
  const req = (key, person, app, days, completed, userNote = null, adminNote = null) => ({
    tyro_requestappid: stableGuid(`req:${key}`),
    tyro_useremail: upn(person),
    tyro_requestedapp: app,
    tyro_iscompleted: completed,
    createdon: daysAgoIso(now, days),
    tyro_usernote: userNote,
    tyro_adminnote: adminNote,
  })
  return [
    req(
      "me-stock",
      ME,
      "tyroStock",
      3,
      false,
      "Teklif hazırlarken bölge depolarındaki anlık stoğu görmem gerekiyor; özellikle çeyrek sonu kampanyası için.",
    ),
    req(
      "zeynep-forecast",
      zeynep,
      "tyroForecast",
      1,
      false,
      "Yeni iş geliştirme fırsatlarının tahmin etkisini görmek istiyorum.",
    ),
    req("mert-trade", mert, "tyroTrade", 9, true, null, "Onaylandı — iyi çalışmalar."),
    req(
      "ece-stock",
      ece,
      "tyroStock",
      16,
      false,
      "Kilit müşterilerin sipariş planlaması için stok görünürlüğü.",
    ),
    req("burak-aiops", burak, "tyroAIOps", 24, true, null, "Satış operasyonları için açıldı."),
  ]
}
