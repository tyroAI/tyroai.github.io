// Demo kişisi ve çevresi — TÜMÜ KURGUSAL. Gerçek kişi, şirket ya da adres yok.
// `.example` alan adı (RFC 2606) hiçbir zaman gerçek bir posta kutusuna çözülmez.

export const DEMO_DOMAIN = "vegaglobal.example"

export const COMPANY = {
  name: "Vega Global",
  legalName: "Vega Global Ticaret A.Ş.",
  domain: DEMO_DOMAIN,
  city: "İstanbul",
}

const mail = (local) => `${local}@${DEMO_DOMAIN}`

function person(id, displayName, jobTitle, department, extra = {}) {
  const [givenName, ...rest] = displayName.split(" ")
  const local = displayName
    .toLocaleLowerCase("tr")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/\s+/g, ".")
  return {
    id,
    displayName,
    givenName,
    surname: rest.join(" "),
    jobTitle,
    department,
    mail: mail(local),
    userPrincipalName: mail(local),
    officeLocation: "İstanbul — Levent",
    city: "İstanbul",
    country: "Türkiye",
    companyName: COMPANY.name,
    businessPhones: [],
    mobilePhone: null,
    ...extra,
  }
}

/** Oturumu açan kişi: satış müdürü. */
export const ME = person("u-deniz", "Deniz Arslan", "Sales Manager", "Sales", {
  employeeId: "VG-1042",
  businessPhones: ["+90 212 000 10 42"],
  mobilePhone: "+90 555 010 10 42",
  employeeHireDate: "2019-03-04T00:00:00Z",
  birthday: "1988-11-21T00:00:00Z",
  preferredLanguage: "tr-TR",
})

export const MANAGER = person("u-kerem", "Kerem Öztürk", "Sales Director", "Sales")

/** Doğrudan bağlılar — satış ekibi. */
export const TEAM = [
  person("u-ece", "Ece Yıldız", "Key Account Manager", "Sales", {
    employeeHireDate: "2020-06-15T00:00:00Z",
    birthday: "1992-10-16T00:00:00Z",
  }),
  person("u-mert", "Mert Kaya", "Senior Sales Executive", "Sales", {
    employeeHireDate: "2018-10-14T00:00:00Z",
    birthday: "1990-02-11T00:00:00Z",
  }),
  person("u-selin", "Selin Aksoy", "Sales Executive", "Sales", {
    employeeHireDate: "2023-01-09T00:00:00Z",
    birthday: "1996-10-19T00:00:00Z",
  }),
  person("u-burak", "Burak Demir", "Sales Operations Specialist", "Sales", {
    employeeHireDate: "2021-09-01T00:00:00Z",
    birthday: "1994-07-03T00:00:00Z",
  }),
  person("u-zeynep", "Zeynep Çelik", "Business Development Specialist", "Sales", {
    employeeHireDate: "2022-04-18T00:00:00Z",
    birthday: "1995-12-08T00:00:00Z",
  }),
]

/** Şirket içinden sık yazışılan kişiler. */
export const COLLEAGUES = [
  person("u-ayse", "Ayşe Koç", "Marketing Manager", "Marketing"),
  person("u-can", "Can Şahin", "Finance Business Partner", "Finance"),
  person("u-leyla", "Leyla Erdem", "HR Business Partner", "Human Resources"),
  person("u-onur", "Onur Tekin", "Customer Success Manager", "Customer Success"),
  person("u-elif", "Elif Güneş", "Product Manager", "Product"),
  person("u-baris", "Barış Yalçın", "Legal Counsel", "Legal"),
]

/** Müşteri tarafındaki kişiler (şirket dışı). */
export const CUSTOMERS = [
  {
    account: "Altay Perakende",
    contact: "Murat Ersoy",
    title: "Satın Alma Direktörü",
    mail: "murat.ersoy@altayperakende.example",
  },
  {
    account: "Nordis Lojistik",
    contact: "Hande Polat",
    title: "Operations Director",
    mail: "hande.polat@nordislojistik.example",
  },
  {
    account: "Ekinoks Enerji",
    contact: "Tolga Uysal",
    title: "IT Müdürü",
    mail: "tolga.uysal@ekinoksenerji.example",
  },
  {
    account: "Pera Otelcilik",
    contact: "Sevgi Karaca",
    title: "Genel Müdür Yardımcısı",
    mail: "sevgi.karaca@peraotel.example",
  },
  {
    account: "Toros Tekstil",
    contact: "Emre Bulut",
    title: "CFO",
    mail: "emre.bulut@torostekstil.example",
  },
  {
    account: "Orion Medikal",
    contact: "Dr. Aslı Kurt",
    title: "Satın Alma Müdürü",
    mail: "asli.kurt@orionmedikal.example",
  },
]

export const PEOPLE = [ME, MANAGER, ...TEAM, ...COLLEAGUES]

export function findPerson(idOrMail) {
  const key = String(idOrMail ?? "").toLowerCase()
  return (
    PEOPLE.find(
      (p) => p.id === idOrMail || p.mail === key || p.userPrincipalName.toLowerCase() === key,
    ) ?? null
  )
}

/** Graph `emailAddress` biçimi. */
export const addr = (p) => ({ emailAddress: { name: p.displayName ?? p.contact, address: p.mail } })
