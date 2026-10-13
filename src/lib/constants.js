// Tenant-scoped constants live here so admin/security-gating IDs stay
// co-located with other Azure AD identifiers (CLIENT_ID, TENANT_ID,
// DATAVERSE_URL in src/lib/msal.js) and so future UI surfaces (an
// admin-only sidebar entry, a "request access" CTA, etc.) can import
// the same ID without each component shipping its own copy.
//
// DEMO: bütün kimlikler kurgusaldır; hiçbiri gerçek bir dizine çözülmez.

/**
 * Entra ID security group of the platform admins. Membership in this group
 * gates the admin tabs in /settings (AI Asistanlar / AI Çözümler / İş
 * Uygulamaları). The check lives in src/hooks/useIsInGroup — primary read
 * off `account.idTokenClaims.groups`, fallback to Microsoft Graph
 * `POST /me/checkMemberGroups`.
 */
// Dağıtıma göre değişebilir: VITE_ADMIN_GROUP_ID (bkz. .env.example).
export const ADMIN_GROUP_ID =
  import.meta.env.VITE_ADMIN_GROUP_ID || "0d3e0000-0000-4000-8000-00000000ad01"

/**
 * Agent kilidi yok: KATALOGDA AÇIK OLAN HER AGENT HERKESE AÇIK — tek kapı
 * /settings'teki `active` bayrağı.
 *
 * Aşağıdaki tek kayıt YETKİ İÇİN DEĞİL: sohbetteki saniye sayacı bir teşhis
 * aracı ve yalnız BT zincirine çiziliyor (bkz. AgentActivity). Erişimi
 * kısıtlamıyor — kimse bir şeye erişemez hâle gelmiyor, yalnız bir rakam
 * gösterilmiyor.
 */
const IT_DIRECTOR = {
  label: "Tarık Aydın",
  // Kurgusal BT direktörü (Vega Global).
  id: "u-tarik",
  upn: "tarik.aydin@vegaglobal.example",
}

/**
 * BT yönetim zincirinin anahtarları (küçük harfe normalize objectId + UPN).
 * Modül seviyesinde bir kez hesaplanır → referansı sabit, effect bağımlılığı
 * olarak güvenli (`useIsUnderManager` diziyi bağımlılık olarak kullanıyor).
 *
 * DİKKAT: eşleşme kullanıcının KENDİSİNİ de kapsar — hook zincire kendi
 * kimliğini de ekler, yani BT direktörü sayacı kendi de görür.
 */
export const IT_MANAGER_KEYS = [IT_DIRECTOR].flatMap((m) =>
  [m.id, m.upn].filter(Boolean).map((v) => v.trim().toLowerCase()),
)
