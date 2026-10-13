// Microsoft girişinin yerine geçen sahte MSAL örneği. Entra'ya, Microsoft'a ya da
// başka bir kimlik sağlayıcısına HİÇBİR istek gitmez: "giriş yap" yerel bir
// işaret yazar, belirteçler sabit bir dizedir ve yalnız demo ağ katmanında
// (src/demo/router.js) anlam taşır.
import { EventType, InteractionType, InteractionRequiredAuthError } from "@azure/msal-browser"
import { ME } from "./persona"

const SESSION_KEY = "tyro-demo-session"
const TENANT = "00000000-0000-0000-0000-000000000000"

export const DEMO_ACCOUNT = {
  homeAccountId: `${ME.id}.${TENANT}`,
  localAccountId: ME.id,
  environment: "login.demo.invalid",
  tenantId: TENANT,
  username: ME.userPrincipalName,
  name: ME.displayName,
  idTokenClaims: {
    name: ME.displayName,
    preferred_username: ME.userPrincipalName,
    oid: ME.id,
    tid: TENANT,
  },
}

function readSignedIn() {
  try {
    return window.localStorage.getItem(SESSION_KEY) === "1"
  } catch {
    return false
  }
}

function writeSignedIn(on) {
  try {
    if (on) window.localStorage.setItem(SESSION_KEY, "1")
    else window.localStorage.removeItem(SESSION_KEY)
  } catch {
    /* özel pencere — yalnız bellekte kalır */
  }
}

const noop = () => {}
const logger = {
  error: noop,
  errorPii: noop,
  warning: noop,
  warningPii: noop,
  info: noop,
  infoPii: noop,
  verbose: noop,
  verbosePii: noop,
  trace: noop,
  tracePii: noop,
  isPiiLoggingEnabled: () => false,
}
logger.clone = () => logger

function tokenResult(scopes = []) {
  return {
    accessToken: "demo-access-token",
    idToken: "demo-id-token",
    account: DEMO_ACCOUNT,
    scopes,
    tokenType: "Bearer",
    expiresOn: new Date(Date.now() + 60 * 60 * 1000),
    fromCache: true,
    authority: "https://login.demo.invalid/common",
    uniqueId: ME.id,
    tenantId: TENANT,
    idTokenClaims: DEMO_ACCOUNT.idTokenClaims,
  }
}

const base = () => import.meta.env.BASE_URL || "/"

function createDemoMsal() {
  let signedIn = typeof window !== "undefined" && readSignedIn()
  let active = signedIn ? DEMO_ACCOUNT : null
  const callbacks = new Map()
  let seq = 0

  const emit = (eventType, payload = null, interactionType = InteractionType.Redirect) => {
    const message = { eventType, interactionType, payload, error: null, timestamp: Date.now() }
    for (const cb of callbacks.values()) {
      try {
        cb(message)
      } catch {
        /* dinleyicinin hatası ötekileri durdurmasın */
      }
    }
  }

  const requireSession = () => {
    if (!signedIn) {
      throw new InteractionRequiredAuthError("login_required", "Demo oturumu kapalı.")
    }
  }

  const signIn = (interactionType) => {
    signedIn = true
    active = DEMO_ACCOUNT
    writeSignedIn(true)
    emit(EventType.LOGIN_START, null, interactionType)
    emit(EventType.LOGIN_SUCCESS, tokenResult(), interactionType)
  }

  const signOut = (interactionType) => {
    signedIn = false
    active = null
    writeSignedIn(false)
    emit(EventType.LOGOUT_START, null, interactionType)
    emit(EventType.LOGOUT_SUCCESS, null, interactionType)
    emit(EventType.LOGOUT_END, null, interactionType)
  }

  const instance = {
    initialize: () => Promise.resolve(),
    initializeWrapperLibrary: noop,
    getLogger: () => logger,
    setLogger: noop,
    handleRedirectPromise: () => Promise.resolve(null),
    addEventCallback(cb) {
      const id = `demo-cb-${++seq}`
      callbacks.set(id, cb)
      return id
    },
    removeEventCallback: (id) => callbacks.delete(id),
    addPerformanceCallback: () => `demo-perf-${++seq}`,
    removePerformanceCallback: () => true,
    enableAccountStorageEvents: noop,
    disableAccountStorageEvents: noop,
    getAllAccounts: () => (signedIn ? [DEMO_ACCOUNT] : []),
    getAccount: () => (signedIn ? DEMO_ACCOUNT : null),
    getAccountByHomeId: () => (signedIn ? DEMO_ACCOUNT : null),
    getAccountByLocalId: () => (signedIn ? DEMO_ACCOUNT : null),
    getAccountByUsername: () => (signedIn ? DEMO_ACCOUNT : null),
    getActiveAccount: () => active,
    setActiveAccount: (account) => {
      active = account ? DEMO_ACCOUNT : null
    },
    async acquireTokenSilent(request = {}) {
      requireSession()
      return tokenResult(request.scopes)
    },
    async acquireTokenPopup(request = {}) {
      if (!signedIn) signIn(InteractionType.Popup)
      return tokenResult(request.scopes)
    },
    async acquireTokenRedirect() {
      if (!signedIn) signIn(InteractionType.Redirect)
    },
    async acquireTokenByCode(request = {}) {
      requireSession()
      return tokenResult(request.scopes)
    },
    async ssoSilent(request = {}) {
      requireSession()
      return tokenResult(request.scopes)
    },
    async loginPopup(request = {}) {
      signIn(InteractionType.Popup)
      return tokenResult(request.scopes)
    },
    async loginRedirect(request = {}) {
      // Sessiz giriş denemesi (prompt=none) demo'da kimseyi içeri almaz.
      if (request?.prompt === "none") {
        throw new InteractionRequiredAuthError("login_required", "Demo: sessiz giriş yok.")
      }
      signIn(InteractionType.Redirect)
      window.location.assign(`${base()}myspace`)
    },
    async logoutRedirect() {
      signOut(InteractionType.Redirect)
      window.location.assign(`${base()}login`)
    },
    async logoutPopup() {
      signOut(InteractionType.Popup)
    },
    async logout() {
      signOut(InteractionType.Redirect)
      window.location.assign(`${base()}login`)
    },
    async clearCache() {
      signedIn = false
      active = null
      writeSignedIn(false)
    },
    getConfiguration: () => ({ auth: { clientId: "demo", authority: "https://login.demo.invalid" } }),
    getTokenCache: () => ({ loadExternalTokens: async () => ({}) }),
    setNavigationClient: noop,
    hydrateCache: async () => {},
    getRedirectResponse: () => new Map(),
  }

  // Burada tanımlanmamış bir MSAL metodu çağrılırsa uygulama çökmesin.
  return new Proxy(instance, {
    get(target, prop) {
      if (prop in target) return target[prop]
      if (typeof prop === "symbol" || prop === "then" || prop === "toJSON" || prop === "$$typeof") {
        return undefined
      }
      return () => {
        if (import.meta.env.DEV) console.warn(`[demo msal] tanımsız çağrı: ${String(prop)}`)
        return Promise.resolve(null)
      }
    },
  })
}

export const demoMsalInstance = createDemoMsal()
