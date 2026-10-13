import { dateKql, kqlSafe, personKql, typesKql } from "@/lib/filesKql"
import { activeTypes } from "@/lib/filesTypes"

/** Arama ve klasör listesi isteklerinin gövdesi + yetenek basamağının denemeleri — `lib/filesQuery.js`in parçası. */

/** Sıralama seçenekleri; `relevance` yalnız metin varken anlamlı. */
export const SORTS = ["relevance", "modified", "name", "size"]
const SORT_PROPERTY = {
  modified: { name: "lastModifiedDateTime", isDescending: true },
  name: { name: "name", isDescending: false },
  size: { name: "size", isDescending: true },
}

/**
 * Sıralama özelliği. `caps.sortName === "LastModifiedTime"`: kiracı
 * `lastModifiedDateTime`i reddedip SharePoint'in yönetilen özellik adını kabul
 * ettiyse (basamağın ilk denemesi, `searchTrials`) son değişiklik sıralaması
 * o adla gider.
 */
function sortProperty(sort, caps = {}) {
  const sp = SORT_PROPERTY[sort]
  if (!sp) return null
  if (sort === "modified" && caps.sortName === "LastModifiedTime")
    return { ...sp, name: "LastModifiedTime" }
  return sp
}

/**
 * Arama isteğinin YETENEKLERİ — kiracının şemasına bağlı, CANLI KİRACIDA
 * ÖLÇÜLMEDİ. Sıra SABİT ve basamağın deneme sırası (`searchTrials`): önce
 * vazgeçilmesi en ucuz olan (sayılar), en son anlamı taşıyan (şablon).
 */
export const SEARCH_CAPS = ["aggregations", "sort", "fields", "template"]

export const SEARCH_FIELDS = [
  "id",
  "name",
  "size",
  "webUrl",
  "lastModifiedDateTime",
  "lastModifiedBy",
  "createdDateTime",
  "createdBy",
  "parentReference",
  "file",
  "folder",
]

/**
 * `/search/query` gövdesi (§7.2).
 *
 * ```
 * R = [IsDocument:true -filetype:aspx | IsContainer:true, …scope, tür, tarih, kişi]
 * metin var   → { queryString: kqlSafe(metin), queryTemplate: "({searchTerms}) R" }
 *               (şablon kapalıysa: { queryString: "(terimler) R" })
 * metin yok   → { queryString: "R" }   — ŞABLON YOK, "*" YOK
 * ```
 *
 * ⚠️ **KLASÖR İSTEĞİ (`kind: "folders"`) KİŞİ KISITI TAŞIMAZ** (§12.10) —
 * çağıran `person` verse bile. Klasörü kimin "son değiştirdiği" klasörün
 * içindeki dosyalardan bağımsız bir alan; kişi kısıtı klasör bandını
 * sessizce boşaltıyordu. Tür kısıtı da taşımaz (klasörün türü yok).
 *
 * ⚠️ **SAYILAR YALNIZ TÜR BOŞKEN** (§5): tür süzgeci açıkken istenen
 * `FileType` kovaları o süzgecin kendisiyle sıfırlanmış gelir.
 *
 * @param {object} o
 * @param {string} [o.text]      kutudaki metin (ham)
 * @param {string[]} [o.scope]   hazır KQL kısıtları (ör. `pathKql(url)`)
 * @param {"files"|"folders"} [o.kind]
 * @param {string[]} [o.types] @param {string} [o.date]
 * @param {string} [o.person]    "me" | "others" — `personClause` yoksa `personKql(person, upn)`
 * @param {string} [o.upn]
 * @param {string} [o.personClause]  kimlik basamağından HAZIR kişi kısıtı (`personClauseFor`);
 *   verilirse `person`/`upn` yerine o yazılır ("" → kısıt yok)
 * @param {string} [o.sort] @param {number} [o.from] @param {number} [o.size]
 * @param {Record<string, any>} [o.caps] oturumun yetenekleri: kapalı olan `false`;
 *   `sortName: "LastModifiedTime"` son değişiklik sıralamasının adı
 * @param {boolean} [o.withAggregations]
 */
export function buildSearchRequest({
  text = "",
  scope = [],
  kind = "files",
  types = [],
  date = "",
  person = "",
  upn = "",
  personClause,
  sort = "",
  from = 0,
  size = 25,
  caps = {},
  withAggregations = false,
  now = Date.now(),
} = {}) {
  const on = (c) => caps[c] !== false
  const folders = kind === "folders"
  const terms = kqlSafe(text)
  const restrictions = [
    folders ? "IsContainer:true" : "IsDocument:true",
    // SharePoint sayfaları (.aspx) belge değil; "Son değişenler"i doldurmasın.
    folders ? "" : "-filetype:aspx",
    ...(scope ?? []),
    folders ? "" : typesKql(types),
    dateKql(date, now),
    folders ? "" : personClause !== undefined ? personClause : personKql(person, upn),
  ].filter(Boolean)
  let query
  if (!terms) query = { queryString: restrictions.join(" ") }
  else if (on("template"))
    query = { queryString: terms, queryTemplate: `({searchTerms}) ${restrictions.join(" ")}` }
  else query = { queryString: [`(${terms})`, ...restrictions].join(" ") }
  const req = { entityTypes: ["driveItem"], query, from, size }
  if (on("fields")) req.fields = SEARCH_FIELDS
  const sp = sortProperty(sort, caps)
  if (sp && on("sort")) req.sortProperties = [sp]
  if (withAggregations && on("aggregations") && !folders && !activeTypes(types).length) {
    req.aggregations = [
      {
        field: "FileType",
        size: 30,
        bucketDefinition: { sortBy: "count", isDescending: true, minimumCount: 1 },
      },
    ]
  }
  return { requests: [req] }
}

/**
 * TEK-YETENEK ELEME BASAMAĞININ denemeleri (§7.3, `lib/filesLadder.js`) —
 * yalnız istekte GERÇEKTEN kullanılan yetenekler, SABİT sırayla
 * (`SEARCH_CAPS`). Her deneme tam isteğin YALNIZ bir farkla tekrarı:
 *
 *   aggregations kapalı → sort: `lastModifiedDateTime` yerine `LastModifiedTime`
 *   (yalnız son değişiklik sıralamasında; `variant` — "kapatma" değil ad
 *   değişikliği) → sort kapalı → fields kapalı → template kapalı
 *
 * Basamak bunların hepsi 400 dönerse "hepsi birden kapalı"yı dener; o da
 * düşerse sorgunun KENDİSİ reddediliyordur ve hiçbir yetenek suçlanmaz.
 */
export function searchTrials(body, caps = {}) {
  const r = body?.requests?.[0] ?? {}
  const out = []
  if (r.aggregations) out.push({ cap: "aggregations", patch: { aggregations: false } })
  if (r.sortProperties) {
    if (
      r.sortProperties[0]?.name === "lastModifiedDateTime" &&
      caps.sortName !== "LastModifiedTime"
    ) {
      out.push({
        cap: "sort",
        patch: { sortName: "LastModifiedTime" },
        variant: true,
        label: "sort: lastModifiedDateTime → LastModifiedTime",
      })
    }
    out.push({ cap: "sort", patch: { sort: false } })
  }
  if (r.fields) out.push({ cap: "fields", patch: { fields: false } })
  if (r.query?.queryTemplate) out.push({ cap: "template", patch: { template: false } })
  return out
}

/* ─────────── Klasör listesi isteği (children) ─────────── */

/**
 * Geniş liste `remoteItem`i (OneDrive kısayolu, başka sürücüdeki öğe) ve
 * oluşturanı (`createdBy`, "Sen" kararı) da istiyor; dar liste header
 * panelinin sahada çalışan listesi. Kiracıda ÖLÇÜLMEDİ (P7) — basamaklı.
 */
export const SEL_WIDE =
  "id,name,size,lastModifiedDateTime,lastModifiedBy,createdDateTime,createdBy,webUrl,folder,file,package,parentReference,remoteItem"
export const SEL_NARROW =
  "id,name,size,lastModifiedDateTime,lastModifiedBy,webUrl,folder,file,parentReference"
export const CHILD_ORDERBY = {
  name: "name",
  modified: "lastModifiedDateTime desc",
  size: "size desc",
}

/**
 * `…/children?$top=&$select=[&$orderby=]`. `caps.wideSelect === false` → dar
 * liste; `caps.orderby === false` → sıralama istemcide (`clientSorted`).
 */
export function childrenPath(base, { sort = "name", caps = {}, top = 200 } = {}) {
  const sel = caps.wideSelect === false ? SEL_NARROW : SEL_WIDE
  const ob =
    caps.orderby !== false && CHILD_ORDERBY[sort]
      ? `&$orderby=${encodeURIComponent(CHILD_ORDERBY[sort])}`
      : ""
  return `${base}?$top=${top}&$select=${sel}${ob}`
}

/** Liste isteğinin basamak denemeleri — sıra SABİT: önce `$orderby`, sonra geniş `$select`. */
export function childrenTrials(sort, caps = {}) {
  const out = []
  if (caps.orderby !== false && CHILD_ORDERBY[sort])
    out.push({ cap: "orderby", patch: { orderby: false }, label: "$orderby kapatıldı" })
  if (caps.wideSelect !== false)
    out.push({ cap: "wideSelect", patch: { wideSelect: false }, label: "geniş $select kapatıldı" })
  return out
}
