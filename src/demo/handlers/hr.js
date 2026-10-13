// Demo — İK ortamı (`hr.tyro.invalid`): ERP'nin Dataverse sanal tabloları (`mserp_*`).
//
// Self Servis (izin, bakiye, masraf, avans), Ekibim (ekibin izinleri ve bakiyeleri,
// doğum günü ve kıdem tarihleri) ve Anasayfa'nın tebrikleri buradan okunur.
// Satırlar her istekte BUGÜNE göre kurulur; süzgeç, sıralama ve seçim
// `dataverse-odata.js` ile sunucudaki gibi uygulanır.
import { hr } from "@/demo/router"
import { collection } from "@/demo/data/dataverse-odata"
import {
  allRecords,
  hrViewRows,
  mePersonnel,
  recordForAlias,
  workerRow,
} from "@/demo/data/hr-people"
import {
  advanceRows,
  allBalanceRows,
  allLeaveRows,
  employmentRows,
  expenseHeaderRows,
  expenseLineRows,
} from "@/demo/data/hr-records"

/** Süzgeçte `<alan> eq '<değer>'` olarak geçen değerler. */
function literalsFor(query, field) {
  const filter = String(query.get("$filter") ?? "")
  const re = new RegExp(`${field}\\s+eq\\s+'((?:[^']|'')*)'`, "gi")
  return [...filter.matchAll(re)].map((m) => m[1].replace(/''/g, "'"))
}

const PK = (set) => `${set.replace(/ies$/, "y").replace(/s$/, "")}id`

function respond(set, rows, query) {
  return collection(rows, query, { keep: [PK(set)] })
}

// Adres → sicil. Persona dışındaki bir şirket adresi sorulursa kararlı bir kayıt türetilir.
hr("GET", "/mserp_tryaiworkersentities", ({ query }) => {
  const now = new Date()
  for (const alias of literalsFor(query, "mserp_userinfo_networkalias")) recordForAlias(alias, now)
  return respond("mserp_tryaiworkersentities", allRecords(now).map(workerRow), query)
})

hr("GET", "/mserp_tryaiallowancesummaryentities", ({ query }) => {
  const now = new Date()
  for (const alias of literalsFor(query, "mserp_networkalias")) recordForAlias(alias, now)
  return respond("mserp_tryaiallowancesummaryentities", allBalanceRows(now), query)
})

hr("GET", "/mserp_boraxallowancetransselfserviceentities", ({ query }) =>
  respond("mserp_boraxallowancetransselfserviceentities", allLeaveRows(new Date()), query),
)

hr("GET", "/mserp_tryaiemployeexpensetransentities", ({ query }) =>
  respond(
    "mserp_tryaiemployeexpensetransentities",
    expenseLineRows(mePersonnel(), new Date()),
    query,
  ),
)

hr("GET", "/mserp_tryaiemployeexpenseentities", ({ query }) =>
  respond("mserp_tryaiemployeexpenseentities", expenseHeaderRows(new Date()), query),
)

hr("GET", "/mserp_trvcashadvanceentities", ({ query }) =>
  respond("mserp_trvcashadvanceentities", advanceRows(mePersonnel(), new Date()), query),
)

hr("GET", "/mserp_hcmemploymententities", ({ query }) =>
  respond("mserp_hcmemploymententities", employmentRows(new Date()), query),
)

// İK görünümü: tebrikler (doğum günü / kıdem pencereleri) ve Ekibim'in tarihleri (adresle).
hr("GET", "/mserp_tryhcmemploymentdetaildomesticactiveviewentities", ({ query }) => {
  const now = new Date()
  for (const mail of literalsFor(query, "mserp_mail")) recordForAlias(mail, now)
  return respond("mserp_tryhcmemploymentdetaildomesticactiveviewentities", hrViewRows(now), query)
})

// Bilinmeyen sanal tablo: "kayıt yok" (404 değil) — ekran bölümü boş ama sağlam çizer.
hr("GET", /^\/mserp_[a-z0-9_]+$/, () => ({ "@odata.context": "$metadata", value: [] }))
