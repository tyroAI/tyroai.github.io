import { EventType } from "@azure/msal-browser"
import { demoMsalInstance } from "@/demo/fakeMsal"

// DEMO: Microsoft girişi YOK. `msalInstance` src/demo/fakeMsal.js'teki sahte
// örnektir; belirteçler sabit dizedir ve yalnız demo ağ katmanında geçerlidir.
// Kapsam adları uygulamanın çağrı biçimini korumak için duruyor.

export const msalConfig = {
  auth: { clientId: "demo", authority: "https://login.demo.invalid" },
}

export const COPILOT_STUDIO_SCOPE = "demo/copilot"

export const loginRequest = {
  scopes: ["User.Read"],
  prompt: "select_account",
}

export const copilotStudioRequest = {
  scopes: [COPILOT_STUDIO_SCOPE],
}

// `.invalid` alan adı (RFC 2606) hiçbir zaman çözülmez: demo katmanı bir
// isteği kaçırsa bile dışarıya ulaşamaz.
export const DATAVERSE_URL = "https://dataverse.tyro.invalid"
export const dataverseRequest = {
  scopes: [`${DATAVERSE_URL}/user_impersonation`],
}

export const HR_DATAVERSE_URL = "https://hr.tyro.invalid"
export const hrRequest = {
  scopes: [`${HR_DATAVERSE_URL}/user_impersonation`],
}

export const isMsalConfigured = true

export const MOCK_LOGGED_IN_KEY = "tyro-logged-in"

export const msalInstance = demoMsalInstance

// Initialize the instance and pick up the active account if one exists in cache.
// Must be awaited before any login/account calls.
let initPromise = null
export function ensureMsalInitialized() {
  if (!initPromise) {
    initPromise = msalInstance.initialize().then(() => {
      const accounts = msalInstance.getAllAccounts()
      if (accounts.length > 0 && !msalInstance.getActiveAccount()) {
        msalInstance.setActiveAccount(accounts[0])
      }
    })
  }
  return initPromise
}

// Keep active account in sync with login / logout events
msalInstance.addEventCallback((event) => {
  if (event.eventType === EventType.LOGIN_SUCCESS && event.payload?.account) {
    msalInstance.setActiveAccount(event.payload.account)
  }
  if (event.eventType === EventType.LOGOUT_SUCCESS) {
    msalInstance.setActiveAccount(null)
    // Wipe the in-memory group-membership AND manager-chain caches so a
    // different user signing into the same browser doesn't inherit the
    // previous user's "is admin" / "reports to X" verdict. Dynamic imports
    // avoid a cyclic module init (both hooks import ensureMsalInitialized
    // from THIS file).
    import("@/hooks/useIsInGroup")
      .then((m) => m.clearGroupMembershipCache())
      .catch(() => {
        // best effort — if the hook isn't reachable, the cache is gone
        // when the SPA re-mounts anyway
      })
    import("@/hooks/useIsUnderManager")
      .then((m) => m.clearManagerChainCache())
      .catch(() => {
        // best effort — see above
      })
    // Profilim sayfasının Graph /me kaydı (görev, departman, telefon) —
    // kendi PII'sı da PII, aynı tarayıcıda başka biri devralmasın.
    import("@/hooks/useMyProfileDetails")
      .then((m) => m.clearMyProfileCache())
      .catch(() => {
        // best effort — see above
      })
    // Başkalarının adı ve ünvanı (Keşfet'in kişi panelleri): bir sonraki
    // kullanıcıya devredilemez.
    import("@/hooks/usePeopleTitles")
      .then((m) => m.clearPeopleTitleCache())
      .catch(() => {
        // best effort — see above
      })
    // Yetki sayfasının yönetici kararı (tyro_authorizedapp.tyro_isadmin) —
    // aynı tarayıcıya giren ikinci kullanıcı birincinin "yöneticiyim"
    // verdiktini devralmamalı.
    import("@/hooks/useAuthorizations")
      .then((m) => m.clearAdminCache())
      .catch(() => {
        // best effort — see above
      })
    // Microsoft To Do görevleri (Akışım › Bugünün odağı) — kişinin kendi
    // iş başlıkları, aynı tarayıcıya giren bir sonraki kullanıcıya geçmez.
    import("@/hooks/useFocusTasks").then((m) => m.clearTodoCache()).catch(() => {})
    // To-Do sayfasının tablosu — aynı kural (görev başlıkları ve notları).
    import("@/hooks/useTodoBoard").then((m) => m.clearTodoBoardCache()).catch(() => {})
    // Header panels hold calendar entries and mail subjects in memory; a
    // different user signing into the same browser must not inherit them.
    import("@/hooks/useCalendarEvents").then((m) => m.clearCalendarCache()).catch(() => {})
    // Davet gövdesinden okunan katılma linkleri (kişinin toplantıları).
    import("@/lib/meetingJoin").then((m) => m.clearJoinUrlCache()).catch(() => {})
    // Pano (widget'lar): posta konuları, belge adları, ekip durumu, Planner işleri.
    import("@/lib/widgetCache").then((m) => m.clearWidgetCache()).catch(() => {})
    import("@/hooks/useMailMessages").then((m) => m.clearMailCache()).catch(() => {})
    // Gündem Akışı: gönderi listesi, gövde HTML'i ve kapak görselleri de
    // başka insanların işi ve aynı kural altında — yalnız bellekte, çıkışta
    // düşer. Rozetin sayacı da (ayrı önbellek) burada temizlenir.
    import("@/hooks/useFeedPosts").then((m) => m.clearFeedCache()).catch(() => {})
    import("@/hooks/useFeedUnread").then((m) => m.clearFeedUnreadCache()).catch(() => {})
    // Beğeni ve "Kaydet" kayıtlarının bellekteki görüntüsü; kalıcı kayıt kullanıcıya
    // özel anahtarda kalır (tercih), sonraki kullanıcı onu okumaz.
    import("@/lib/feedReactions").then((m) => m.resetFeedReactions()).catch(() => {})
    // Tebrikler listesi başka insanların doğum tarihi ve ünvanı — aynı kural.
    import("@/hooks/useCelebrations").then((m) => m.clearCelebrationsCache()).catch(() => {})
    // Self Servis: kişinin izin, masraf ve iş avansı kayıtları (ERP) ve profil başlığının
    // ERP istihdam cevabı; yöneticinin, doğrudan bağlıların ve yöneticinin bağlılarının (ekip
    // arkadaşları) dizin kayıtları (Graph).
    import("@/hooks/useSelfService").then((m) => m.clearSelfServiceCache()).catch(() => {})
    // Kapatılan akıllı uyarılar sessionStorage'da: aynı sekmede çıkıştan sonra kalmasın.
    import("@/lib/selfServiceDismissed").then((m) => m.clearDismissedAlerts()).catch(() => {})
    import("@/hooks/useSelfServiceProfile")
      .then((m) => m.clearSelfServiceProfileCache())
      .catch(() => {})
    import("@/hooks/useMyManager").then((m) => m.clearMyManagerCache()).catch(() => {})
    import("@/lib/directReports").then((m) => m.clearDirectReportsCache()).catch(() => {})
    // Ekibim: ekibin izin bakiyesi ve izinleri (ERP).
    import("@/hooks/useSelfServiceTeam").then((m) => m.clearSelfServiceTeamCache()).catch(() => {})
    // Ekibim: ekibin doğum günü (gün-ay) ve kıdem tarihleri (İK görünümü).
    import("@/hooks/useTeamDates").then((m) => m.clearTeamDatesCache()).catch(() => {})
    // Attendee profile photos and presence dots are other people's PII under
    // the same rule.
    import("@/hooks/usePeoplePhotos").then((m) => m.clearPeoplePhotoCache()).catch(() => {})
    import("@/hooks/usePresence").then((m) => m.clearPresenceCache()).catch(() => {})
    // Kişi kartı: başkalarının ünvanı, telefonu, yöneticisi ve büyük fotoğrafı.
    import("@/lib/personDirectory").then((m) => m.clearPersonCache()).catch(() => {})
    // Ekibim ve departmanım: iş arkadaşlarının adresleri.
    import("@/lib/myCircle").then((m) => m.clearMyCircleCache()).catch(() => {})
    // Toplantıların yapay zekâ özetleri: konuşulanlar ve yapılacaklar.
    import("@/hooks/useMeetingInsight").then((m) => m.clearMeetingInsightCache()).catch(() => {})
    // Dosya panelinin listesi, küçük resimleri ve önizlemeleri — hepsi
    // başkasının da görebileceği bir tarayıcıda duran belge içeriği.
    import("@/hooks/useDriveItems").then((m) => m.clearDriveCache()).catch(() => {})
    import("@/hooks/useDriveThumbnail").then((m) => m.clearThumbnailCache()).catch(() => {})
    import("@/hooks/useDrivePreview").then((m) => m.clearPreviewCache()).catch(() => {})
    // Politika klasörlerinin içeriği ve kişinin kendi sürücü kimliği — ikisi
    // de bu zincirde YOKTU (2026-09-30'da bulundu): klasör adları başkasının
    // belgeleri, sürücü kimliği ise "bu dosya benim mi" kararını veriyor ve
    // bir sonraki kullanıcıya geçerse onun dosyalarını yanlış ayırırdı.
    import("@/hooks/useSharedFolder").then((m) => m.clearSharedFolderCache()).catch(() => {})
    import("@/hooks/useMyDriveId").then((m) => m.clearMyDriveIdCache()).catch(() => {})
    // Keşfet › Dosyalarım: arama sonuçları, klasör listeleri, politika
    // klasörlerinin kimlikleri, konum adları ve oturumun hafızası (son arama,
    // kırıntı izi) — hepsi başkalarının belge adları, bir sonraki kullanıcıya geçmez.
    import("@/hooks/useFilesSearch").then((m) => m.clearFilesSearchCache()).catch(() => {})
    import("@/hooks/useFilesListing").then((m) => m.clearFilesListingCache()).catch(() => {})
    import("@/hooks/usePolicyFolder").then((m) => m.clearPolicyFolderCache()).catch(() => {})
    // Kimlik basamağı (hangi adresle "ben"im, bulunan posta adresi) — PII.
    import("@/hooks/useRecentFiles").then((m) => m.resetRecentFilesRung()).catch(() => {})
    import("@/lib/filesNav").then((m) => m.clearFilesNav()).catch(() => {})
    // Hava durumu: kişinin kendi konumu (şehir + koordinat) — o da PII.
    import("@/hooks/useWeather").then((m) => m.clearWeatherCache()).catch(() => {})
    // Oturumun yetenek hafızası (hangi arama/liste şekli bu hesapta 400 aldı).
    // İki kanca kendi alanını zaten temizliyor; bu satır HEPSİNİ — yeni bir
    // alan eklenip bir temizleyiciye bağlanmayı unutsa bile hesaplar arası
    // devredilmesin.
    import("@/lib/filesLadder").then((m) => m.resetCaps()).catch(() => {})
    // Gelen kutusundan türetilen "son yazıştığın kişiler" listesi: adres = PII.
    // (tyroTrade bunu çıkışta temizlemiyor — aynı kuralın altına giriyor.)
    import("@/hooks/useRecentPeople").then((m) => m.clearRecentPeopleCache()).catch(() => {})
    // A parked "prepare for this meeting" question carries the meeting's
    // subject and organizer — sessionStorage survives logoutRedirect in the
    // same tab, and the chat auto-sends whatever it finds parked.
    import("@/lib/chatBus").then((m) => m.clearPendingAsk()).catch(() => {})
    // Isıtılmış konuşma + Copilot client'ı: bir sonraki kullanıcıya
    // DEVREDİLEMEZ. Konuşma kimliği o hesabın ajanla olan bağlamını taşıyor.
    import("@/lib/warmStart").then((m) => m.clearWarmCache()).catch(() => {})
  }
})
