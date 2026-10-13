/**
 * Self Servis (`/self-service`) — kişinin ERP'deki izin, izin bakiyesi, masraf ve iş avansı
 * kayıtları; sohbette oluşturulan talepler buraya bağlanır (`?tab=…&ref=…`). Mekanizma
 * `lib/selfServiceApi.js`, sayfa `components/selfservice/SelfServicePage.jsx`.
 *
 * Kapatmak: `enabled: false` — sidebar satırı, arama girdisi ve rota birlikte kapanır.
 */
export const SELF_SERVICE_PAGE = {
  enabled: true,
  /** `"*"` herkese · `"admins"` · `"appAdmins"` · `["upn", …]`. */
  audience: "*",
}
