// Demo — küçük bir OData sorgu değerlendiricisi (Dataverse ve İK ortamı ortak).
//
// Uygulamanın gönderdiği `$filter`, `$orderby`, `$top`, `$select` ve `$count`
// parametrelerini bellekteki satırlara uygular. Kapsam, uygulamanın GERÇEKTEN
// yazdığı kalıplarla sınırlı: `and` / `or` / `not`, parantez, `eq ne gt ge lt le`,
// tırnaklı metin, sayı, tarih, `true/false/null` ve `contains/startswith/endswith`.
// Metin karşılaştırması Dataverse gibi büyük/küçük harfe duyarsızdır.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/
export const FV = "@OData.Community.Display.V1.FormattedValue"

function tokenize(src) {
  const tokens = []
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (/\s/.test(c)) {
      i += 1
    } else if (c === "(" || c === ")" || c === ",") {
      tokens.push({ t: c })
      i += 1
    } else if (c === "'") {
      let s = ""
      i += 1
      while (i < src.length) {
        if (src[i] === "'" && src[i + 1] === "'") {
          s += "'"
          i += 2
        } else if (src[i] === "'") {
          i += 1
          break
        } else {
          s += src[i]
          i += 1
        }
      }
      tokens.push({ t: "str", v: s })
    } else {
      const m = /^[A-Za-z0-9_.:+\-/@]+/.exec(src.slice(i))
      if (!m) {
        i += 1
        continue
      }
      tokens.push({ t: "word", v: m[0] })
      i += m[0].length
    }
  }
  return tokens
}

const OPS = new Set(["eq", "ne", "gt", "ge", "lt", "le"])
const FUNCS = new Set(["contains", "startswith", "endswith"])

function literal(word) {
  if (word === "true") return true
  if (word === "false") return false
  if (word === "null") return null
  if (/^-?\d+(\.\d+)?$/.test(word)) return Number(word)
  return word // tarih ya da çıplak değer
}

function parse(tokens) {
  let pos = 0
  const peek = () => tokens[pos]
  const next = () => tokens[pos++]
  const isWord = (w) => peek()?.t === "word" && peek().v.toLowerCase() === w

  function operand() {
    const tok = next()
    if (!tok) return { kind: "lit", value: null }
    if (tok.t === "str") return { kind: "lit", value: tok.v }
    if (tok.t === "word") {
      const lit = literal(tok.v)
      if (typeof lit !== "string" || ISO_DATE.test(lit)) return { kind: "lit", value: lit }
      return { kind: "field", name: tok.v }
    }
    return { kind: "lit", value: null }
  }

  function primary() {
    if (peek()?.t === "(") {
      next()
      const e = orExpr()
      if (peek()?.t === ")") next()
      return e
    }
    if (peek()?.t === "word" && FUNCS.has(peek().v.toLowerCase()) && tokens[pos + 1]?.t === "(") {
      const fn = next().v.toLowerCase()
      next() // (
      const a = operand()
      if (peek()?.t === ",") next()
      const b = operand()
      if (peek()?.t === ")") next()
      return { kind: "fn", fn, a, b }
    }
    const left = operand()
    if (peek()?.t === "word" && OPS.has(peek().v.toLowerCase())) {
      const op = next().v.toLowerCase()
      const right = operand()
      return { kind: "cmp", op, left, right }
    }
    return { kind: "truthy", left }
  }

  function unary() {
    if (isWord("not")) {
      next()
      return { kind: "not", e: unary() }
    }
    return primary()
  }

  function andExpr() {
    let e = unary()
    while (isWord("and")) {
      next()
      e = { kind: "and", a: e, b: unary() }
    }
    return e
  }

  function orExpr() {
    let e = andExpr()
    while (isWord("or")) {
      next()
      e = { kind: "or", a: e, b: andExpr() }
    }
    return e
  }

  return orExpr()
}

function valueOf(node, row) {
  if (node.kind === "lit") return node.value
  if (node.kind === "field") return row?.[node.name]
  return undefined
}

/** İki değeri sıralı karşılaştırır: tarih → gün, sayı → sayı, metin → harf duyarsız. */
export function compareValues(a, b) {
  if (a == null && b == null) return 0
  if (a == null) return -1
  if (b == null) return 1
  if (typeof a === "string" && typeof b === "string" && ISO_DATE.test(a) && ISO_DATE.test(b)) {
    const da = a.slice(0, 10)
    const db = b.slice(0, 10)
    return da < db ? -1 : da > db ? 1 : 0
  }
  if (typeof a === "number" && typeof b === "number") return a - b
  if (typeof a === "boolean" || typeof b === "boolean") return Number(a) - Number(b)
  const sa = String(a).toLowerCase()
  const sb = String(b).toLowerCase()
  return sa < sb ? -1 : sa > sb ? 1 : 0
}

function evaluate(node, row) {
  switch (node.kind) {
    case "and":
      return evaluate(node.a, row) && evaluate(node.b, row)
    case "or":
      return evaluate(node.a, row) || evaluate(node.b, row)
    case "not":
      return !evaluate(node.e, row)
    case "truthy":
      return Boolean(valueOf(node.left, row))
    case "fn": {
      const hay = String(valueOf(node.a, row) ?? "").toLowerCase()
      const needle = String(valueOf(node.b, row) ?? "").toLowerCase()
      if (node.fn === "contains") return hay.includes(needle)
      if (node.fn === "startswith") return hay.startsWith(needle)
      return hay.endsWith(needle)
    }
    case "cmp": {
      const a = valueOf(node.left, row)
      const b = valueOf(node.right, row)
      if (node.op === "eq") return a == null || b == null ? a == b : compareValues(a, b) === 0
      if (node.op === "ne") return a == null || b == null ? a != b : compareValues(a, b) !== 0
      if (a == null || b == null) return false
      const c = compareValues(a, b)
      if (node.op === "gt") return c > 0
      if (node.op === "ge") return c >= 0
      if (node.op === "lt") return c < 0
      return c <= 0
    }
    default:
      return true
  }
}

/** `$filter` metnini bir yükleme dönüştürür; boşsa her satırı geçirir. */
export function compileFilter(text) {
  const src = String(text ?? "").trim()
  if (!src) return () => true
  try {
    const ast = parse(tokenize(src))
    return (row) => evaluate(ast, row)
  } catch {
    return () => true
  }
}

function applyOrder(rows, orderby) {
  const keys = String(orderby ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [field, dir] = s.split(/\s+/)
      return { field, desc: String(dir).toLowerCase() === "desc" }
    })
  if (!keys.length) return rows
  return [...rows].sort((x, y) => {
    for (const k of keys) {
      const c = compareValues(x[k.field], y[k.field])
      if (c) return k.desc ? -c : c
    }
    return 0
  })
}

function applySelect(rows, select, keep = []) {
  const fields = String(select ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  if (!fields.length) return rows
  const wanted = new Set([...fields, ...keep])
  return rows.map((row) => {
    const out = {}
    for (const [k, v] of Object.entries(row)) {
      const base = k.includes("@") ? k.slice(0, k.indexOf("@")) : k
      if (wanted.has(base) || k.startsWith("@odata")) out[k] = v
    }
    return out
  })
}

/**
 * Bir koleksiyon cevabı: süz → sırala → say → kes → seç.
 * @param {object[]} rows
 * @param {URLSearchParams} query
 * @param {{ keep?: string[] }} opts  `$select` dışında da kalacak alanlar (birincil anahtar)
 */
export function collection(rows, query, { keep = [] } = {}) {
  const filtered = rows.filter(compileFilter(query.get("$filter")))
  const ordered = applyOrder(filtered, query.get("$orderby"))
  const top = Number(query.get("$top"))
  const sliced = Number.isFinite(top) && top > 0 ? ordered.slice(0, top) : ordered
  const value = applySelect(sliced, query.get("$select"), keep)
  const body = { "@odata.context": "$metadata", value }
  if (String(query.get("$count")).toLowerCase() === "true") body["@odata.count"] = filtered.length
  return body
}

/** Tek satırı `$select`e göre kırpar (`return=representation` cevapları için). */
export function selectOne(row, query, keep = []) {
  return applySelect([row], query?.get?.("$select"), keep)[0]
}

/** Sabit tohumdan kararlı bir GUID üretir (aynı tohum → aynı kimlik). */
export function stableGuid(seed) {
  let h1 = 0x811c9dc5
  let h2 = 0x01000193
  const s = String(seed)
  for (let i = 0; i < s.length; i += 1) {
    h1 = Math.imul(h1 ^ s.charCodeAt(i), 16777619) >>> 0
    h2 = Math.imul(h2 ^ s.charCodeAt(i), 2246822519) >>> 0
  }
  const hex = (n, len) => n.toString(16).padStart(8, "0").slice(0, len)
  const a = hex(h1, 8)
  const b = hex(h2, 8)
  const c = hex(Math.imul(h1 ^ h2, 2654435761) >>> 0, 8)
  const d = hex(Math.imul(h2 + 0x9e3779b9, 1597334677) >>> 0, 8)
  return `${a}-${b.slice(0, 4)}-4${b.slice(5, 8)}-a${c.slice(1, 4)}-${c.slice(4)}${d}`
}

/** Rastgele (yeni kayıt) GUID. */
export function newGuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  return stableGuid(`${Date.now()}-${Math.random()}`)
}

/** `Prefer: return=representation` istendi mi (başlık adı harf duyarsız). */
export function wantsRepresentation(headers) {
  const entry = Object.entries(headers ?? {}).find(([k]) => k.toLowerCase() === "prefer")
  return /return=representation/i.test(String(entry?.[1] ?? ""))
}
