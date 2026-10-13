// Teams'in kendi "yer"i yer sayılmaz: harita ve yol tarifi yalnız gerçek bir adrese.
const VIRTUAL = /teams|microsoft|online|çevrim ?içi|zoom|meet/i

/** Etkinliğin fiziksel yeri (yoksa null). */
export const physicalPlace = (event) => {
  const loc = (event.location || "").trim()
  return loc && !VIRTUAL.test(loc) ? loc : null
}
