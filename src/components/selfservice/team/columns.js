/**
 * Ekip listesinin geniş kaptaki sütunları — başlık satırı ve satırlar aynı genişlikte. Bakiye
 * yalnız bana bağlılarda; iki bölüm varken öteki bölümün durum sütunu bakiyenin yerini de alır
 * (`statusWide` = durum + bakiye + aralık), hizmet sütunu iki bölümde hizalı kalır.
 */
export const COL = {
  status: "hidden w-52 shrink-0 @[56rem]/ss:block",
  statusWide: "hidden w-[21.75rem] shrink-0 @[56rem]/ss:block",
  balance: "hidden w-32 shrink-0 @[56rem]/ss:block",
  tenure: "hidden w-16 shrink-0 @[56rem]/ss:block",
}
