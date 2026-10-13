// Küçük bir OData sorgu motoru — demo uçlarının `$filter`, `$orderby`, `$select`,
// `$top`/`$skip`, `$count` ve `$search` desteği. Uygulamanın gerçekten gönderdiği
// biçimleri karşılar: karşılaştırmalar (eq ne gt ge lt le), and/or/not, parantez,
// contains/startswith/endswith, `cast(x, Edm.T)` ve `koleksiyon/any(v: …)` lambda'sı.
// Çözülemeyen bir süzgeç `ODataError` fırlatır; işleyici bunu 400'e çevirir — uygulamanın
// kendi "400 gelirse daha basit biçimle dene" basamakları da böylece sınanmış olur.

export class ODataError extends Error {}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:\d{2})?)?/

function tokenize(src) {
  const tokens = []
  let i = 0
  while (i < src.length) {
    const ch = src[i]
    if (/\s/.test(ch)) {
      i++
      continue
    }
    if ("(),:".includes(ch)) {
      tokens.push({ t: ch })
      i++
      continue
    }
    if (ch === "'") {
      let s = ""
      i++
      while (i < src.length) {
        if (src[i] === "'" && src[i + 1] === "'") {
          s += "'"
          i += 2
        } else if (src[i] === "'") {
          i++
          break
        } else s += src[i++]
      }
      tokens.push({ t: "lit", v: s })
      continue
    }
    const date = src.slice(i).match(ISO_DATE)
    if (date && /^\d{4}-/.test(date[0])) {
      tokens.push({ t: "lit", v: date[0], date: true })
      i += date[0].length
      continue
    }
    const num = src.slice(i).match(/^-?\d+(\.\d+)?/)
    if (num) {
      tokens.push({ t: "lit", v: Number(num[0]) })
      i += num[0].length
      continue
    }
    const id = src.slice(i).match(/^[A-Za-z_@$][\w./@$]*/)
    if (id) {
      const w = id[0]
      if (w === "true" || w === "false") tokens.push({ t: "lit", v: w === "true" })
      else if (w === "null") tokens.push({ t: "lit", v: null })
      else tokens.push({ t: "id", v: w })
      i += w.length
      continue
    }
    throw new ODataError(`Beklenmeyen karakter: ${ch}`)
  }
  return tokens
}

const COMPARE = new Set(["eq", "ne", "gt", "ge", "lt", "le"])

function parse(src) {
  const tokens = tokenize(src)
  let pos = 0
  const peek = () => tokens[pos]
  const next = () => tokens[pos++]
  const isWord = (w) => peek()?.t === "id" && peek().v.toLowerCase() === w
  const expect = (t) => {
    const tok = next()
    if (tok?.t !== t) throw new ODataError(`'${t}' bekleniyordu`)
    return tok
  }

  function parseOr() {
    let left = parseAnd()
    while (isWord("or")) {
      next()
      left = { op: "or", a: left, b: parseAnd() }
    }
    return left
  }
  function parseAnd() {
    let left = parseUnary()
    while (isWord("and")) {
      next()
      left = { op: "and", a: left, b: parseUnary() }
    }
    return left
  }
  function parseUnary() {
    if (isWord("not")) {
      next()
      return { op: "not", a: parseUnary() }
    }
    return parseComparison()
  }
  function parseComparison() {
    const left = parseOperand()
    if (peek()?.t === "id" && COMPARE.has(peek().v.toLowerCase())) {
      const op = next().v.toLowerCase()
      return { op, a: left, b: parseOperand() }
    }
    return left
  }
  function parseArgs() {
    expect("(")
    const args = []
    if (peek()?.t !== ")") {
      args.push(parseOr())
      while (peek()?.t === ",") {
        next()
        args.push(parseOr())
      }
    }
    expect(")")
    return args
  }
  function parseOperand() {
    const tok = peek()
    if (!tok) throw new ODataError("Eksik ifade")
    if (tok.t === "(") {
      next()
      const e = parseOr()
      expect(")")
      return e
    }
    if (tok.t === "lit") {
      next()
      return { op: "lit", v: tok.v, date: tok.date }
    }
    if (tok.t === "id") {
      next()
      const lambda = tok.v.match(/^(.*)\/(any|all)$/i)
      if (lambda && peek()?.t === "(") {
        next()
        let variable = null
        let body = null
        if (peek()?.t !== ")") {
          variable = expect("id").v
          expect(":")
          body = parseOr()
        }
        expect(")")
        return { op: lambda[2].toLowerCase(), path: lambda[1], variable, body }
      }
      if (peek()?.t === "(") return { op: "fn", name: tok.v.toLowerCase(), args: parseArgs() }
      return { op: "path", path: tok.v }
    }
    throw new ODataError(`Beklenmeyen simge: ${tok.t}`)
  }

  const tree = parseOr()
  if (pos !== tokens.length) throw new ODataError("Süzgecin sonu çözülemedi")
  return tree
}

/** `a/b/c` yolunu nesnede yürür. Lambda değişkeni (`ep/id`) kapsamdan çözülür. */
export function readPath(obj, path, scope = {}) {
  const parts = String(path).split("/")
  let cur = parts[0] in scope ? scope[parts[0]] : obj?.[parts[0]]
  for (const p of parts.slice(1)) cur = cur?.[p]
  return cur
}

function asTime(v) {
  if (v instanceof Date) return v.getTime()
  if (typeof v === "string" && ISO_DATE.test(v)) {
    const t = Date.parse(v)
    return Number.isNaN(t) ? null : t
  }
  return null
}

function compare(op, a, b) {
  const ta = asTime(a)
  const tb = asTime(b)
  let x = a
  let y = b
  if (ta != null && tb != null) {
    x = ta
    y = tb
  } else if (typeof a === "string" && typeof b === "string") {
    // Graph posta adreslerinde ve çoğu metin alanında büyük/küçük harfe duyarsız.
    x = a.toLowerCase()
    y = b.toLowerCase()
  }
  switch (op) {
    case "eq":
      return x === y || (x == null && y == null)
    case "ne":
      return !(x === y || (x == null && y == null))
    case "gt":
      return x != null && y != null && x > y
    case "ge":
      return x != null && y != null && x >= y
    case "lt":
      return x != null && y != null && x < y
    case "le":
      return x != null && y != null && x <= y
    default:
      return false
  }
}

function evaluate(node, obj, scope) {
  switch (node.op) {
    case "lit":
      return node.v
    case "path":
      return readPath(obj, node.path, scope)
    case "and":
      return Boolean(evaluate(node.a, obj, scope)) && Boolean(evaluate(node.b, obj, scope))
    case "or":
      return Boolean(evaluate(node.a, obj, scope)) || Boolean(evaluate(node.b, obj, scope))
    case "not":
      return !evaluate(node.a, obj, scope)
    case "any":
    case "all": {
      const list = readPath(obj, node.path, scope)
      if (!Array.isArray(list)) return node.op === "all"
      if (!node.body) return node.op === "any" ? list.length > 0 : true
      const test = (item) => Boolean(evaluate(node.body, obj, { ...scope, [node.variable]: item }))
      return node.op === "any" ? list.some(test) : list.every(test)
    }
    case "fn": {
      const args = node.args.map((a) => evaluate(a, obj, scope))
      const s = (v) => String(v ?? "").toLowerCase()
      switch (node.name) {
        case "contains":
          return s(args[0]).includes(s(args[1]))
        case "startswith":
          return s(args[0]).startsWith(s(args[1]))
        case "endswith":
          return s(args[0]).endsWith(s(args[1]))
        case "tolower":
          return s(args[0])
        case "cast":
          return args[0]
        default:
          throw new ODataError(`Desteklenmeyen işlev: ${node.name}`)
      }
    }
    default:
      return compare(node.op, evaluate(node.a, obj, scope), evaluate(node.b, obj, scope))
  }
}

/** `$filter` → yüklem. Boş süzgeç her şeyi geçirir; çözülemeyen `ODataError` fırlatır. */
export function compileFilter(filter) {
  if (!filter || !String(filter).trim()) return () => true
  const tree = parse(String(filter))
  return (obj) => Boolean(evaluate(tree, obj, {}))
}

/** `$orderby=receivedDateTime desc, subject` → karşılaştırıcı. */
export function compileOrderBy(orderby) {
  const keys = String(orderby ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [path, dir] = s.split(/\s+/)
      return { path, desc: (dir ?? "").toLowerCase() === "desc" }
    })
  if (!keys.length) return null
  return (a, b) => {
    for (const k of keys) {
      const x = readPath(a, k.path)
      const y = readPath(b, k.path)
      const tx = asTime(x)
      const ty = asTime(y)
      const vx = tx ?? (typeof x === "string" ? x.toLocaleLowerCase("tr") : x)
      const vy = ty ?? (typeof y === "string" ? y.toLocaleLowerCase("tr") : y)
      if (vx === vy) continue
      if (vx == null) return 1
      if (vy == null) return -1
      const c = vx < vy ? -1 : 1
      return k.desc ? -c : c
    }
    return 0
  }
}

/**
 * `$expand` dizgesini parçalar: `manager($levels=max;$select=id,mail),x` →
 * `{ manager: { $levels: "max", $select: "id,mail" }, x: {} }`.
 */
export function parseExpand(expand) {
  const out = {}
  const src = String(expand ?? "")
  let depth = 0
  let start = 0
  const parts = []
  for (let i = 0; i <= src.length; i++) {
    const ch = src[i]
    if (ch === "(") depth++
    else if (ch === ")") depth--
    else if ((ch === "," && depth === 0) || i === src.length) {
      parts.push(src.slice(start, i).trim())
      start = i + 1
    }
  }
  for (const part of parts.filter(Boolean)) {
    const m = part.match(/^([^(]+)(?:\((.*)\))?$/s)
    if (!m) continue
    const name = m[1].trim()
    const opts = {}
    let inner = (m[2] ?? "").trim()
    // `manager(id,displayName)` — kısa seçim biçimi.
    if (inner && !inner.includes("=")) inner = `$select=${inner}`
    let d = 0
    let s = 0
    for (let i = 0; i <= inner.length; i++) {
      const ch = inner[i]
      if (ch === "(") d++
      else if (ch === ")") d--
      else if ((ch === ";" && d === 0) || i === inner.length) {
        const seg = inner.slice(s, i).trim()
        s = i + 1
        if (!seg) continue
        const eq = seg.indexOf("=")
        if (eq > 0) opts[seg.slice(0, eq).trim()] = seg.slice(eq + 1).trim()
      }
    }
    out[name] = opts
  }
  return out
}

/** `$select` listesi (boşsa null). */
export function selectList(select) {
  const list = String(select ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  return list.length ? list : null
}

/** `$search="..."` → çıplak arama metni (tırnaklar ve `alan:` öneki atılmış). */
export function searchTerm(search) {
  if (!search) return null
  const raw = String(search).trim().replace(/^"|"$/g, "")
  const m = raw.match(/^([A-Za-z]+):(.*)$/)
  return { field: m ? m[1] : null, text: (m ? m[2] : raw).trim() }
}
