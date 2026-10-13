/**
 * Self Servis — OData süzgeç parçaları (saf; istek ve belirteç `selfServiceHttp.js`te). Sorgu
 * kurucuları bunları MSAL'e dokunmadan kullanır: birim testi yalnız metni denetler.
 */

/** `or` öbeğinin boyu: uzun süzgeç adresi aşmasın, istek sayısı az kalsın. */
export const CHUNK = 20

export const quote = (v) => `'${String(v).replace(/'/g, "''")}'`

/** `field eq 'a' or field eq 'b' …` */
export const anyOf = (field, values) => values.map((v) => `${field} eq ${quote(v)}`).join(" or ")

/** Diziyi `size`lık öbeklere böler. */
export function chunks(list, size = CHUNK) {
  const out = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}
