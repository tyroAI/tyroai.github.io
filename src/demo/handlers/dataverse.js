// Demo — uygulamanın kendi Dataverse ortamı (`dataverse.tyro.invalid`).
//
// Launcher kataloğu, yetki ve talep tabloları, sohbet dosyası hazırlama tablosu.
// Yazmalar (POST/PATCH/DELETE) yalnız bu sekmenin BELLEĞİNDE kalır; sayfa
// yenilenince tablolar tohum hâline döner.
import { dataverse, noContent, notFound, reply } from "@/demo/router"
import { authorizationRows, catalogRows, requestRows } from "@/demo/data/dataverse-catalog"
import {
  collection,
  newGuid,
  selectOne,
  wantsRepresentation,
} from "@/demo/data/dataverse-odata"

// ── Bellekteki tablolar ─────────────────────────────────────────────────
const tables = {
  tyro_launcherapps: { key: "tyro_launcherappid", rows: null, seed: () => catalogRows() },
  tyro_authorizedapps: { key: "tyro_authorizedappid", rows: null, seed: () => authorizationRows() },
  tyro_requestapps: { key: "tyro_requestappid", rows: null, seed: () => requestRows(new Date()) },
  tyro_chatfiles: { key: "tyro_chatfileid", rows: null, seed: () => [] },
}

function rowsOf(set) {
  const table = tables[set]
  if (!table.rows) table.rows = table.seed()
  return table.rows
}

const GUID = "([0-9a-fA-F-]{36})"
const SETS = Object.keys(tables).join("|")

function stamp(row) {
  const now = new Date().toISOString()
  return { createdon: row.createdon ?? now, modifiedon: now, ...row }
}

// ── Koleksiyon okuma ────────────────────────────────────────────────────
dataverse("GET", new RegExp(`^/(${SETS})$`), ({ match, query }) => {
  const set = match[1]
  return collection(rowsOf(set), query, { keep: [tables[set].key] })
})

// ── Tek kayıt okuma ─────────────────────────────────────────────────────
dataverse("GET", new RegExp(`^/(${SETS})\\(${GUID}\\)$`), ({ match, query }) => {
  const [, set, id] = match
  const row = rowsOf(set).find((r) => r[tables[set].key] === id.toLowerCase())
  return row ? selectOne(row, query, [tables[set].key]) : notFound()
})

// ── Oluşturma ───────────────────────────────────────────────────────────
dataverse("POST", new RegExp(`^/(${SETS})$`), ({ match, body, headers, query }) => {
  const set = match[1]
  const { key } = tables[set]
  const rows = rowsOf(set)
  const data = body && typeof body === "object" ? body : {}

  // Yetki tablosunda kullanıcı adresi TEKİLDİR (Dataverse'teki alternate key).
  if (set === "tyro_authorizedapps") {
    const email = String(data.tyro_useremail ?? "").toLowerCase()
    if (rows.some((r) => r.tyro_useremail === email)) {
      return reply(
        { error: { code: "0x80040237", message: "A record with matching key values already exists." } },
        { status: 412 },
      )
    }
    data.tyro_useremail = email
  }

  const row = stamp({ ...data, [key]: newGuid() })
  if (set === "tyro_launcherapps") {
    row.tyro_isactive ??= true
  }
  rows.push(row)
  const wantsBody = wantsRepresentation(headers) || query.has("$select")
  if (!wantsBody) {
    return reply(null, {
      status: 204,
      headers: { "OData-EntityId": `https://dataverse.tyro.invalid/api/data/v9.2/${set}(${row[key]})` },
    })
  }
  return reply(selectOne(row, query, [key]), { status: 201 })
})

// ── Güncelleme ──────────────────────────────────────────────────────────
dataverse("PATCH", new RegExp(`^/(${SETS})\\(${GUID}\\)$`), ({ match, body, headers }) => {
  const [, set, rawId] = match
  const { key } = tables[set]
  const id = rawId.toLowerCase()
  const rows = rowsOf(set)
  const idx = rows.findIndex((r) => r[key] === id)
  if (idx < 0) return notFound()
  const patch = body && typeof body === "object" ? { ...body } : {}
  if (set === "tyro_authorizedapps" && "tyro_useremail" in patch) {
    const email = String(patch.tyro_useremail ?? "").toLowerCase()
    if (rows.some((r, i) => i !== idx && r.tyro_useremail === email)) {
      return reply(
        { error: { code: "0x80040237", message: "A record with matching key values already exists." } },
        { status: 412 },
      )
    }
    patch.tyro_useremail = email
  }
  rows[idx] = { ...rows[idx], ...patch, modifiedon: new Date().toISOString() }
  return wantsRepresentation(headers) ? rows[idx] : noContent()
})

// ── Silme ───────────────────────────────────────────────────────────────
dataverse("DELETE", new RegExp(`^/(${SETS})\\(${GUID}\\)$`), ({ match }) => {
  const [, set, rawId] = match
  const { key } = tables[set]
  const rows = rowsOf(set)
  const idx = rows.findIndex((r) => r[key] === rawId.toLowerCase())
  if (idx >= 0) rows.splice(idx, 1)
  return noContent()
})

// ── Sohbet dosyası: dosya kolonunun yüklenmesi ──────────────────────────
dataverse("PATCH", new RegExp(`^/tyro_chatfiles\\(${GUID}\\)/tyro_file$`), () => noContent())

// ── Kimlik sorusu (bazı istemciler ilk turda sorar) ─────────────────────
dataverse("GET", "/WhoAmI", () => ({
  BusinessUnitId: "5b1f6c2e-0d7a-4e8b-9c41-000000000b01",
  UserId: "5b1f6c2e-0d7a-4e8b-9c41-000000000042",
  OrganizationId: "5b1f6c2e-0d7a-4e8b-9c41-0000000000f0",
}))

// ── Bilinmeyen `tyro_*` tabloları: boş ama geçerli cevap ────────────────
// Şemaya yeni bir tablo eklendiğinde ekran 404 yerine "kayıt yok" görür.
dataverse("GET", /^\/tyro_[a-z0-9_]+$/, () => ({ "@odata.context": "$metadata", value: [] }))
dataverse("POST", /^\/tyro_[a-z0-9_]+$/, ({ body }) =>
  reply({ ...(body && typeof body === "object" ? body : {}), id: newGuid() }, { status: 201 }),
)
dataverse("PATCH", /^\/tyro_[a-z0-9_]+\(.+\)/, () => noContent())
dataverse("DELETE", /^\/tyro_[a-z0-9_]+\(.+\)/, () => noContent())
