import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import Refresh01Icon from "@hugeicons/core-free-icons/Refresh01Icon"
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon"
import LinkSquare02Icon from "@hugeicons/core-free-icons/LinkSquare02Icon"
import { Button } from "@/components/ui/button"
import { BrandOrb } from "@/components/brand/BrandOrb"
import { ChatComposer } from "./ChatComposer"
import { ChatMessage } from "./ChatMessage"
import { PromptStarters } from "./PromptStarters"
import { PromptLab } from "./PromptLab"
import { useLocale } from "@/hooks/useLocale"
import { useConfig } from "@/hooks/useConfig"
import { useAppLock } from "@/hooks/useAuthorizations"
import { useAgentAccess } from "@/hooks/useAgentAccess"
import { AgentAccessOverlay } from "@/components/chat/AgentAccessOverlay"
import { useIsMobile } from "@/hooks/use-mobile"
import { useMe } from "@/hooks/useMe"
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis"
import { loadChatSession, scheduleChatSessionSave, clearChatSession } from "@/lib/chatSession"
import { useAnswerNotification } from "@/hooks/useAnswerNotification"
import { requestFocusComposer } from "@/lib/chatBus"
import { promptPickUpdater } from "@/lib/promptMerge"
import { useParkedAsk } from "./useParkedAsk"
import { notify } from "@/lib/notify"
import { showFirstReplyToast } from "@/lib/firstReplyToast"
import { NotifyOptIn } from "@/components/chat/NotifyOptIn"
import { textWithStagedFiles } from "@/lib/chatFileStaging"
import {
  startConversation,
  resumeConversation,
  sendMessage,
  sendAction,
  resolveSuggestedAction,
  filesToAttachments,
  readConversationId,
} from "@/lib/copilot"
import {
  awaitWarmConversation,
  markConversationLive,
  markConversationCold,
  peekWarmBrief,
  subscribeWarm,
} from "@/lib/warmStart"
import { DAILY_BRIEF, markBriefUsed } from "@/lib/dailyBriefPolicy"
import { WARM_START } from "@/lib/warmStartPolicy"
import { useIsInGroup } from "@/hooks/useIsInGroup"
import { ADMIN_GROUP_ID } from "@/lib/constants"
import { foldActivityStep, foldToolCall } from "@/lib/toolTracePolicy"
import { bcp47 } from "@/lib/intl-cache"
import { cn } from "@/lib/utils"
import { greetingKey } from "@/lib/greeting"
import {
  extractSubmitActions,
  findConsentCard,
  consentActionData,
  consentName,
} from "./consentCards"
import { EarlierConversationDivider } from "./EarlierConversationDivider"
import { useChatScroll } from "./useChatScroll"
import { makeId } from "@/lib/makeId"

// "Asistan çalışıyor" bildiriminin ekranda kalma süresi: iki cümleyi okumaya yeter, akan
// cevabın üstünde oyalanmaz (bildirim kesinti değil, teselli — okunmasa da cevap gelir).
const FIRST_REPLY_NOTICE_MS = 6_000

// Empty-state welcome reveal — matches the dashboard hero (AppLauncher.jsx)
// so the app speaks in one motion vocabulary. Each word fades + rises +
// un-blurs in sequence under a small parent-driven stagger.
const wordVariants = {
  hidden: { opacity: 0, y: 18, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
}
const greetingLineVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.35 } },
}
const subtitleLineVariants = {
  hidden: {},
  // Subtitle starts after the greeting line is largely revealed so it
  // feels like one continuous wave instead of two parallel runs.
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.95 } },
}

/**
 * @param onScreen - false while the user is on another route. The component
 *   stays MOUNTED either way (App.jsx keeps it alive so a slow answer isn't
 *   killed by navigating to the dashboard); this only says whether the user
 *   can currently see it, which is what decides whether a finished answer
 *   needs announcing.
 */
/**
 * Isınma sürerken sohbet açılırsa devralmak için beklenecek AZAMİ süre.
 * Isıtma turunun sahadaki medyanı 16,5 sn; 8 sn, "bitmek
 * üzereyse bekle" ile "uzun sürüyorsa kullanıcıyı bekletme" arasındaki
 * dengedir. Bu süre dolarsa sıfırdan kurulur ve akış hiç değişmez.
 */
const WARM_ADOPT_WAIT_MS = 8000

export function ChatScreen({ onReset, initialAgent, onScreen = true, inDock = false }) {
  const { t, locale } = useLocale()
  // Yalnız ısıtma rozetinin kapısı için okunuyor (bkz. WARM_START.badge).
  // Üç değerli hook; KATI `=== true` — çözülmemiş cevap yönetici sayılmaz.
  const isAdmin = useIsInGroup(ADMIN_GROUP_ID) === true
  // ⚠️ REF ile okunur, closure ile DEĞİL. `initConversation` bir async
  // efektin içinde çalışıyor ve MSAL ilk render'dan SONRA oturaklaşabiliyor;
  // kapıyı efektin kapattığı değerden okumak, yöneticinin rozeti bazen hiç
  // görmemesi demekti.
  const startBadgeAllowedRef = useRef(false)
  startBadgeAllowedRef.current =
    WARM_START.badge === "*" || (WARM_START.badge === "admins" && isAdmin)
  // Konuşmanın NASIL kurulduğu, BİR SONRAKİ gerçek cevaba iliştirilmek üzere
  // bekler ({ kind, handshakeMs, warmTurnMs }). Ref, state değil: rozeti
  // taşıyan mesaj bir kez kurulur ve bu değer yeniden render tetiklememeli.
  const startBadgeRef = useRef(null)
  const { agents, getAgent, settled: catalogSettled } = useConfig()
  const isMobile = useIsMobile()
  const lock = useAppLock()
  const navigate = useNavigate()
  /**
   * ⚠️ **VARSAYILAN ASİSTAN KİLİTLİ OLAMAZ.**
   *
   * `agents[0]` katalog sırasının ilki ve kişiye göre değişmiyor; kilit
   * ise kişiye göre. Kilitli bir asistan listenin başındaysa sohbeti açan
   * herkes — sidebar'daki "Yeni sohbet" dahil — onu SEÇMEDEN onunla
   * konuşmaya başlıyordu. Asistan seçici kilitliyi zaten pasif çiziyor
   * (`AgentSelect`), yani ekranda "seçilemez" yazan bir asistan aktif
   * olabiliyordu: kilidin en görünür yerinden sızması.
   *
   * ⚠️ Adres çubuğundan gelen `?agent=` de aynı süzgeçten geçer; kilitli
   * bir kimlik verilirse ilk açık asistana düşülür. Bu bir güvenlik sınırı
   * değil (Copilot çağrısı ayrı bir izin — bkz. appLockPolicy.js), ama
   * ekranın kendi kuralıyla çelişmemesi gerekiyor.
   *
   * ⚠️ Kilit ÇÖZÜLENE KADAR `isLocked` false döner, yani ilk kare bugünkü
   * davranışın aynısı; cevap gelince süzgeç tutar.
   */
  // ⚠️ SÜZGEÇ BURADA KURULMAZ, ORTAK KANCADAN GELİR (`useAgentAccess`):
  // aynı listeyi sidebar satırı ve "Yeni sohbet" düğmesi de soruyor ve üç
  // kopya, kuralın zamanla üç ayrı şeye dönüşmesi demekti.
  const agentAccess = useAgentAccess()
  const openAgents = agentAccess.openAgents
  const defaultAgentId = openAgents[0]?.id ?? agents[0]?.id ?? null
  const requestedOpen =
    initialAgent && openAgents.some((a) => a.id === initialAgent) ? initialAgent : null
  const [agent, setAgent] = useState(requestedOpen || defaultAgentId)
  // Konuşmayı bırakıldığı yerden getir — kapanan sekme, sayfa yenileme ve
  // ikinci bir sekme boyunca, son mesajdan itibaren 24 saat (bkz. chatSession.js).
  // İlk render'da okunur; agent değişiminde init effect'i o agent'ın kendi
  // snapshot'ını yükler. `?reset=` URL parametresi bu bileşeni (key ile)
  // remount ettiği için orada tasarım gereği temiz bir başlangıç alırız.
  const [restored] = useState(() => loadChatSession(requestedOpen || defaultAgentId))
  const [messages, setMessages] = useState(() => restored?.messages ?? [])
  // Ekrandaki satırların kaçı depodan geri geldi — bundan sonrası bu ziyarette
  // söylendi. Geri gelen baloncukların canlı bir yanıt gibi okunmasını
  // engelleyen tek seferlik ayracı besler.
  const [restoredCount, setRestoredCount] = useState(() => restored?.messages.length ?? 0)
  const [orbState, setOrbState] = useState("idle")
  // Composer'ı yalnızca bot GERÇEKTEN yanıt üretirken kilitler. orbState
  // "thinking" kullanıcı yazarken de tetiklendiği için (kozmetik orb), Enter'ı
  // ona bağlamak yazma sonrası gereksiz bekleme yaratıyordu — bunun yerine busy.
  const [busy, setBusy] = useState(false)
  // Header "yeni sohbet" butonu bunu artırır → init effect yeniden çalışır
  // (Copilot konuşmasını SIFIRDAN başlatır + greeting'i tekrar getirir).
  // Sidebar "Yeni sohbet" tüm komponenti remount ettiği için ayrı; bu, aynı
  // mount içindeki sıfırlama için.
  const [resetNonce, setResetNonce] = useState(0)
  // Aktif agent + schema adı render'da hesaplanır. schemaName init effect'in
  // bağımlılığıdır: agents (ConfigProvider) ASENKRON yüklenir; agent zaten HR
  // olsa bile ilk render'da getAgent() undefined dönebilir → init erken çıkar.
  // schemaName deps'te olduğu için agents yüklenince init kendiliğinden çalışır.
  const [promptLabOpen, setPromptLabOpen] = useState(false)
  // Son yazılan hazır istem — handlePromptPick'in "üstüne yaz mı, alt satıra
  // ekle mi" kararı buna bakıyor.
  const lastPromptRef = useRef("")
  /**
   * ⚠️ **AKTİF ASİSTAN TEK ÇIKIŞ NOKTASI, kilit BURADA da tutar.**
   *
   * Varsayılanı kilitsiz seçmek yetmiyordu: `ConfigProvider.getAgent`
   * kimliği bulamazsa listenin İLKİNE düşüyor (`open[0]`) ve o liste
   * yalnız `isActive`e göre süzülü — kilide bakmıyor. Katalog geç
   * yüklendiğinde, `?agent=` bilinmeyen bir kimlik taşıdığında ya da
   * kayıt yeniden adlandırıldığında o geri düşüş kilitli bir asistan
   * döndürebiliyordu. Konuşma `activeAgent`in `agentId`si üzerinden
   * kuruluyor, yani kapının gerçekten kapandığı yer burası.
   *
   * `getAgent`i düzeltmek yerine burada süzmek bilinçli: ConfigProvider
   * kilidi TANIMIYOR ve tanımamalı — kilit oturuma bağlı, katalog değil
   * (aynı gerekçe `markAgentAccess`in `state` yerine `value` memo'sunda
   * olmasında da yazılı).
   */
  const resolveOpenAgent = useCallback(
    (id) => {
      const found = getAgent(id)
      if (found && !lock.isLocked(found.name)) return found
      return openAgents[0] ?? null
    },
    [getAgent, lock, openAgents],
  )
  const activeAgent = resolveOpenAgent(agent)
  // ⚠️ SEÇİCİYE GİDEN KİMLİK, HAM `agent` DEĞİL — gerçekten aktif olan.
  // `AgentSelect` kendi `getAgent(value)`sini çağırıyor ve o kilide
  // bakmıyor; ham kimliği verseydik kutuda kilitli asistanın adı yazarken
  // konuşma başka asistanla kuruluyor olurdu. Ekranın söylediği ile
  // çalışan aynı şey olmalı.
  const activeAgentId = activeAgent?.id ?? agent
  const schemaName = activeAgent?.agentId
  const [input, setInput] = useState("")
  const [speakingLevel, setSpeakingLevel] = useState(0)
  const { isSpeaking: ttsSpeaking, speak, cancel: cancelTts } = useSpeechSynthesis()
  // Debounce timer for typing → thinking → idle transitions.
  const typingTimerRef = useRef(null)
  const copilotClientRef = useRef(null)
  // Şu an oynayan Copilot Studio konuşması. Dökümle birlikte saklanır ki bir
  // sonraki ziyaret yalnızca baloncukları yeniden çizmesin, AJANIN bağlamını
  // da devam ettirsin.
  const conversationIdRef = useRef(restored?.conversationId ?? null)
  // Kimlik bir ref'te yaşıyor (akışlar onu React dışından okuyor); ref tek
  // başına yeni kurulan bir konuşmanın bir sonraki mesaja kadar kaydedilmemesi
  // demek olurdu — o da bir sonraki ziyaretin ölü olduğunu bildiğimiz bir
  // kimliği denemesi. Bu sayaç, kimlik değişince kayıt effect'ini tetikler.
  const [conversationTick, setConversationTick] = useState(0)
  // Bu tur saklanan bir konuşmanın üstüne mi bindi? Kimliğin sunucudaki ömrü
  // belgelenmemiş: sabah devam ettirilebilen bir konuşma öğleden sonra ölmüş
  // olabilir. Ölü kimliği elimizde tutarsak sonraki HER soru aynı şekilde
  // düşer ve tek çıkış "yeni sohbet" olurdu — bu ikisi tek seferlik kurtarmayı
  // yönetiyor (bkz. recoverFromDeadConversation).
  const resumedRef = useRef(false)
  const recoveringRef = useRef(false)
  const abortGenRef = useRef(0)
  // "İlk yanıt yavaş olabilir" bildirimi bu konuşmada gösterildi mi? Konuşma
  // her sıfırdan başladığında (agent değişimi / yeni sohbet / reload) init
  // içinde false'a döner, çünkü Copilot konuşması da o anda yeniden kurulur —
  // yani yavaş ilk tur yeniden yaşanır.
  const firstReplyNoticeRef = useRef(false)
  // Konuşma hazır-kapısı: init akışı (startConversation + greeting auto-submit)
  // TAMAMEN bitene kadar resolve OLMAZ. handleSend bunu bekleyerek aynı sunucu
  // konuşmasına ikinci bir turun çakışmasını (→ "Sohbet durduruldu") önler.
  const conversationReadyRef = useRef(Promise.resolve())
  const {
    isNearBottom,
    setIsNearBottom,
    unread,
    setUnread,
    attachScrollRef,
    attachContentRef,
    handleScroll,
    scrollToBottom,
  } = useChatScroll({ messages, onScreen })

  // ── Work IQ bağlantı onayı ──────────────────────────────────────────────
  // consentPrompt: ilk consent kartı gelince açılan özet-onay kutusu
  //   ({ name, card, gen } | null). consentWait: otomatik onaylanırken
  //   gösterilen "izinler tamamlanıyor" overlay'i. autoConsentRef: bu
  //   konuşmadaki karar — null (sorulmadı) / true (hepsine izin) / false (ret).
  const [consentPrompt, setConsentPrompt] = useState(null)
  const [consentWait, setConsentWait] = useState(false)
  const autoConsentRef = useRef(null)
  const greetHour = new Date().getHours()
  const me = useMe()
  const firstName = me.name || ""
  // Announces a finished answer when the user isn't looking at it — see
  // useAnswerNotification for the channel-selection table.
  const notifier = useAnswerNotification(onScreen)

  // Başka bir yüzeyden park edilmiş soru + gün özeti akışı (bkz. useParkedAsk).
  const sendRef = useRef(null)
  const { briefIntentRef, briefAdoptedRef, briefPending, setBriefPending } = useParkedAsk({
    onScreen,
    agents,
    catalogSettled,
    agent,
    setAgent,
    conversationReadyRef,
    sendRef,
  })

  // Speaking-mode level oscillation for the orb.
  useEffect(() => {
    if (orbState !== "speaking") return
    const id = setInterval(() => {
      setSpeakingLevel(0.22 + Math.random() * 0.78)
    }, 95)
    return () => clearInterval(id)
  }, [orbState])

  const effectiveLevel = orbState === "speaking" ? speakingLevel : 0

  // Dökümü + devam ettirilecek konuşmayı sakla. Her mesaj değişiminde çalışır,
  // böylece geri gezinme (hatta kenar çubuğuyla gezinme) taze bir ChatScreen'i
  // aynı konuşmayla doldurur — ve sekme kapansa bile 24 saat boyunca öyle kalır.
  useEffect(() => {
    scheduleChatSessionSave(agent, {
      conversationId: conversationIdRef.current,
      messages,
    })
  }, [messages, agent, conversationTick])

  // Orb click → speak the greeting line (the static text under the orb,
  // with the user's name woven in) in the current locale. While speaking,
  // an effect below forces orb into "speaking" mode. Click again to cancel.
  // No-op while the mic is listening (Web Speech in & out collide on iOS).
  function handleOrbClick() {
    if (orbState === "listening") return
    if (ttsSpeaking) {
      cancelTts()
      return
    }
    const greeting = t(greetingKey(greetHour))
    const lead = t("chat.subtitle.lead")
    const highlight = t("chat.subtitle.highlight")
    const fullText = `${greeting}, ${firstName}. ${lead} ${highlight}`
    const lang = bcp47(locale)
    // rate 1.1 — slightly faster than default (1.0) so the greeting sounds
    // brisk and confident instead of plodding. Cloud / neural voices handle
    // it cleanly; if the user is on a slow bundled OS voice the engine will
    // still keep up — most older voices clip more at low rates than high.
    speak(fullText, { lang, rate: 1.1 })
  }

  // The composer drives the recognizer; we only need to mirror its boolean
  // listening flag into orbState. Listening always wins over any other mode.
  function handleMicToggle(nextListening) {
    if (nextListening) setOrbState("listening")
    else setOrbState((s) => (s === "listening" ? "idle" : s))
  }

  /**
   * Seçilen hazır istem GÖNDERİLMEZ, besteciye yazılır.
   *
   * İstemlerin çoğu `[proje no]` gibi doldurulacak bir yer taşıyor; doğrudan
   * göndermek asistana yarım bir cümle yollamak olurdu. Odak isteği
   * `selectPlaceholder` ile gidiyor: composer ilk yer tutucuyu seçili
   * bırakıyor, kullanıcı yazmaya başlayınca üzerine yazıyor.
   */
  function handlePromptPick(text) {
    // Kullanıcının YAZDIĞI metin silinmez, aynı istem alt alta çoğalmaz —
    // kural `lib/promptMerge.js`te (alanlı kartlar da aynısını kullanıyor).
    setInput(promptPickUpdater(lastPromptRef, text))
    setPromptLabOpen(false)
    requestAnimationFrame(() => requestFocusComposer({ selectPlaceholder: true }))
  }

  // User-typing → "thinking" with a 600 ms idle debounce. Mic listening and
  // TTS speaking both outrank typing — don't flap them.
  function handleInputChange(next) {
    setInput(next)
    if (orbState === "listening" || orbState === "speaking" || ttsSpeaking) return
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    if (next.trim()) {
      if (orbState !== "thinking") setOrbState("thinking")
      typingTimerRef.current = setTimeout(() => {
        setOrbState((s) => (s === "thinking" ? "idle" : s))
      }, 600)
    } else {
      setOrbState((s) => (s === "thinking" ? "idle" : s))
    }
  }

  // Force orb into "speaking" while the TTS engine is playing the greeting,
  // revert to "idle" when it finishes (unless something else has claimed
  // the orb in the meantime). This is a legitimate external-signal-to-state
  // mirror (the speechSynthesis engine fires onstart/onend through the hook
  // and we need to reflect that in the orb's visual mode).
  useEffect(() => {
    if (ttsSpeaking) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOrbState("speaking")
    } else {
      setOrbState((s) => (s === "speaking" ? "idle" : s))
    }
  }, [ttsSpeaking])

  // Tear down the typing debounce on unmount. Bildirimin ömrünü sonner
  // yönetiyor, burada kapatılacak bir zamanlayıcı yok.
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    }
  }, [])

  // Agent değişince (veya ilk yüklemede) Copilot konuşmasını başlat ve selamlamayı göster.
  // Bu sayede kullanıcı ilk mesajını gönderdiğinde bot zaten hazır olur.
  useEffect(() => {
    if (!schemaName || schemaName === "agent-id") return

    copilotClientRef.current = null
    const gen = ++abortGenRef.current
    // Yeni bir hazır-kapısı kur; init tamamen bitince (finally) resolve edilir.
    let resolveReady
    conversationReadyRef.current = new Promise((r) => {
      resolveReady = r
    })

    async function initConversation() {
      // Isınma durumu yalan söylemesin: eski konuşma bırakıldı, yenisi henüz
      // kurulmadı (ısıtma sürüyorsa bu çağrı ona dokunmaz).
      markConversationCold(schemaName)
      const greetingId = makeId()
      const greetingStartedAt = Date.now()
      // Yeni konuşmada Work IQ onay kararını ve overlay'leri sıfırla.
      autoConsentRef.current = null
      firstReplyNoticeRef.current = false
      setConsentPrompt(null)
      setConsentWait(false)
      // Init (greeting + auto-submit) boyunca composer'ı KİLİTLE. Aksi halde
      // kullanıcı network beklerken yazıp gönderebiliyor ve init'in yanıtı onun
      // mesajından sonra listeye eklenip "sanki bu cevap geldi" karmaşası yaratıyor.
      setBusy(true)
      setOrbState("thinking")

      // Bu agent'ın son 24 saatteki dökümü. Agent DEĞİŞİMİNDE de okunur:
      // ilk render'daki hidrasyon yalnızca açılış agent'ını kapsar, her
      // agent kendi konuşmasını taşır.
      const saved = loadChatSession(agent)
      const hadPriorSession = !!saved?.messages.length

      // ⚠️ **ÖZET DÜĞMESİ KAYITLI OTURUMU EZER — ama YALNIZ o düğme.**
      //
      // Döküm 24 saat yaşıyor, yani her gün giren kullanıcı sabah hep
      // "kayıtlı oturum" dalına düşüyordu ve özeti hiçbir zaman hazır
      // bulamıyordu (özelliğin tam hedef kitlesi). Karar: YENİ
      // GÜN, YENİ SOHBET — ama yalnız niyet AÇIKSA.
      //
      // İki giriş, iki niyet ve ikisi de korunuyor:
      //   sidebar → "Sohbet"          → dünkü döküm aynen açılır (resume)
      //   dashboard → "Sabah özeti…"  → temiz konuşmada hazır özet
      //
      // Dünkü döküm SİLİNMEZ, yalnız bu açılışta çizilmez; depoda duruyor ve
      // asistan değiştirip geri gelince yine karşılıyor.
      const briefWanted = briefIntentRef.current
      // Düğmeye basıldı, özet henüz ekranda değil: aşağıda selamlamanın
      // otomatik menü turu bu yüzden gönderilmez.
      const briefPendingNow = !!briefWanted && briefAdoptedRef.current !== briefWanted
      const briefReady = briefPendingNow && !!peekWarmBrief(schemaName)
      // Ölü konuşmadan kurtarma turu: kimliği YOK SAY (yoksa aynı ölü konuşmaya
      // geri bağlanır ve sonraki her soru da düşer) ve ekrandaki mesajlara
      // DOKUNMA — depodaki snapshot debounce yüzünden az önceki soruyu ve hata
      // baloncuğunu henüz içermeyebilir, onları geri yazmak kullanıcının
      // gözünün önünde satır silmek olurdu.
      const recovering = recoveringRef.current
      recoveringRef.current = false
      const resumeId = recovering || briefReady ? null : (saved?.conversationId ?? null)
      conversationIdRef.current = resumeId
      setConversationTick((n) => n + 1)
      if (recovering) {
        // ekrandaki döküm olduğu gibi kalır
      } else if (hadPriorSession && !briefReady) {
        setRestoredCount(saved.messages.length)
        setMessages(saved.messages)
      } else {
        setRestoredCount(0)
        // Sıfırdan başlıyoruz: eski (ölü) mesajları temizle ve tek bir
        // selamlama baloncuğu göster — yığılmayı önler.
        setMessages([
          {
            id: greetingId,
            role: "assistant",
            agent,
            content: "",
            attachments: [],
            time: new Date(),
            activity: { received: false, steps: [], startedAt: greetingStartedAt },
          },
        ])
      }

      let greetingText = ""
      let greetingAttachments = []
      let greetingSuggested = []
      let copilotClient = null
      try {
        // Önce kaldığı yerden devam etmeyi dene. Başarılıysa ajan dünkü
        // konuşmayı hatırlar; selamlama da otomatik menü turu da atlanır —
        // ikisi de var olan bir dökümün altına ikinci bir "merhaba" basardı.
        let resumed = false
        if (resumeId) {
          try {
            copilotClient = await resumeConversation(schemaName, resumeId)
            if (abortGenRef.current !== gen) return
            copilotClientRef.current = { client: copilotClient, agentId: agent }
            markConversationLive(schemaName)
            resumed = true
            // Ölçülecek bir süre YOK: `resumeConversation` hiç ağ isteği
            // yapmıyor. Rozet bunu balonda cümleyle söyler, "0,0s" ile değil.
            startBadgeRef.current = startBadgeAllowedRef.current
              ? { kind: "resumed", handshakeMs: null, warmTurnMs: null }
              : null
          } catch (err) {
            // Bağlanmanın kendisi ağ isteği yapmıyor; buraya ancak token
            // alınamazsa düşeriz. Kimliği düşür, aşağıda sıfırdan kur.
            console.debug("Copilot resume failed, starting fresh:", err)
            conversationIdRef.current = null
            setConversationTick((n) => n + 1)
          }
          if (abortGenRef.current !== gen) return
        }
        resumedRef.current = resumed

        // Devam ettirilemedi → yeni konuşma. Döküm geri geldiyse selamlamayı
        // GÖSTERME: kullanıcı geçmişini görüyor, altına bir karşılama mesajı
        // düşmek onu canlı bir yanıt gibi okuturdu. Handshake yine de tüketilir.
        const showGreeting = (!hadPriorSession || briefReady) && !recovering

        // ── ÖN-ISITILMIŞ KONUŞMAYI DEVRAL ──
        // `warmStart` kullanıcı sohbete basmadan önce handshake'i yapmış
        // olabilir (bkz. o dosyanın başlığı). Varsa hazır client'ı ve
        // selamlamayı olduğu gibi alırız; ağa HİÇ çıkılmaz.
        //
        // ⚠️ Yalnızca `resumed` DEĞİLKEN: kaydedilmiş bir konuşma varsa o
        // kullanıcının gerçek dökümüdür ve ısıtılmış boş konuşma onun yerine
        // geçemez. `take*` okur ve kaydı düşürür — aynı client iki kez
        // devralınırsa iki ChatScreen aynı konuşmaya çakışan tur gönderirdi.
        let warmAdopted = false
        if (!resumed) {
          // Isınma SÜRÜYORSA kısa bir süre bekle (bkz. awaitWarmConversation):
          // beklemeden sıfırdan kurmak, ısıtmayı çöpe atıp MCP başlatmasını
          // kullanıcıya yeniden ödetiyordu (ölçüldü: 27 ısıtmanın 1'i
          // devralınmıştı).
          const warmed = await awaitWarmConversation(schemaName, WARM_ADOPT_WAIT_MS)
          if (warmed) {
            warmAdopted = true
            copilotClient = warmed.client
            copilotClientRef.current = { client: copilotClient, agentId: agent }
            markConversationLive(schemaName)
            conversationIdRef.current = warmed.conversationId
            setConversationTick((n) => n + 1)
            greetingText = warmed.greeting.text
            greetingAttachments = warmed.greeting.attachments
            greetingSuggested = warmed.greeting.suggestedActions
            resumed = true
            // ⚠️ ISITMA ROZETİ MESAJ DEĞİL, İŞARET. Isıtma turu bir zamanlar
            // sohbete iki mesaj olarak yazılıyordu; kullanıcının sormadığı
            // bir soruyu dökümüne yazmak konuşmayı yalan söyletir. Ölçü
            // ATILMIYOR — bir sonraki GERÇEK cevabın eylem satırına bir ateş
            // glifi olarak iliştiriliyor, süreler onun balonunda.
            //
            // Neden SELAMLAMAYA değil de o cevaba: ısıtmanın kazandırdığı
            // saniyeler MCP başlatmasıdır ve onu ödeyecek turu kullanıcının
            // İLK gerçek sorusu tetikler. Selamlama zaten ısıtma sırasında
            // alınmıştı, yani onun hızı ısıtmanın değil el sıkışmanın
            // hikâyesi.
            startBadgeRef.current = startBadgeAllowedRef.current
              ? { kind: "warm", ...(warmed.warm ?? { handshakeMs: null, warmTurnMs: null }) }
              : null
            if (
              showGreeting &&
              (greetingText || greetingAttachments.length || greetingSuggested.length)
            ) {
              setMessages((m) =>
                m.map((msg) =>
                  msg.id === greetingId
                    ? {
                        ...msg,
                        content: greetingText,
                        attachments: greetingAttachments,
                        suggestedActions: greetingSuggested,
                      }
                    : msg,
                ),
              )
            } else if (showGreeting) {
              setMessages((m) => m.filter((msg) => msg.id !== greetingId))
            }

            // ── GÜN ÖZETİ: ÖNCEDEN HAZIRLANMIŞ CEVABI EKRANA BAS ──
            //
            // ⚠️ Bu, "ısıtma sohbete YAZILMAZ" kuralının TEK istisnası ve
            // koşulu tek: kullanıcı DÜĞMEYE BASMIŞ olmalı (`briefWanted`,
            // park edilmiş niyetten geliyor). Kuralın gerekçesi "kullanıcının
            // sormadığı bir soruyu dökümüne yazmak konuşmayı yalan söyletir"
            // idi — burada soruyu kullanıcı sordu; biz yalnızca cevabı
            // önceden hazırladık. Basılmamış bir özet hâlâ döküme GİRMEZ:
            // devralınır, metni atılır.
            //
            // ⚠️ TAZELİK TAVANI (15 dk): bayat bir tampon ETİKETLENMEZ,
            // DÜŞÜRÜLÜR. Böylece basılan her özet en fazla 15 dakika eski bir
            // veriyi gösterir ve balonun saati doğru kalır — "bu cevap ne
            // zaman üretildi" sorusu hiç doğmaz. Düşerse park salıverme
            // soruyu canlı gönderir, yani kullanıcı yine özetini alır.
            //
            // ⚠️ Metinsiz DÜŞMÜŞ bir tur basılmaz: boş bir balon, cevap
            // gelmiş gibi durur. O da canlı yola düşer.
            const brief = warmed.brief
            if (
              brief &&
              briefWanted &&
              briefAdoptedRef.current !== briefWanted &&
              Date.now() - brief.startedAt <= DAILY_BRIEF.freshMs &&
              !(brief.state === "failed" && !brief.text)
            ) {
              briefAdoptedRef.current = briefWanted
              // ⚠️ DAMGA TAM BURADA "KULLANILDI" OLUR — turu atarken değil.
              // Hazırlanan özet yalnız bu sayfa yüklemesinin belleğinde
              // yaşıyor; basılmadan yenilenirse kayboluyor ve o hâlde
              // pencerenin işi BİTMİŞ sayılmamalı (bir deneme hakkı daha
              // var, bkz. DAILY_BRIEF.maxArms).
              markBriefUsed(briefWanted)
              const askId = makeId()
              const ansId = makeId()
              setMessages((m) => [
                ...m,
                {
                  id: askId,
                  role: "user",
                  content: brief.question,
                  attachments: [],
                  // Soru GERÇEKTEN o an gitti — saat uydurulmuyor.
                  time: new Date(brief.startedAt),
                },
                {
                  id: ansId,
                  role: "assistant",
                  agent,
                  content: brief.text,
                  attachments: brief.attachments,
                  suggestedActions: brief.suggestedActions,
                  time: new Date(),
                  activity: brief.activity,
                  // Rozet BU balona: özet, bu konuşmanın ilk gerçek cevabı.
                  start: startBadgeRef.current,
                },
              ])
              setBriefPending(null)
              startBadgeRef.current = null

              if (brief.state === "running") {
                // Tur HÂLÂ akıyor: kullanıcı cevabın oluşmasını izliyor.
                // `busy`, orb ve besteci kilidi için ek kod YOK — init zaten
                // `setBusy(true)` + `thinking` ile başladı ve `finally`de
                // açıyor; burada `await` etmek ilerleme arayüzünü de hazır
                // kapısını da BEDAVA doğru yapıyor.
                notifier.armTurn(brief.question)
                const unsub = subscribeWarm(() =>
                  setMessages((m) =>
                    m.map((msg) =>
                      msg.id === ansId
                        ? {
                            ...msg,
                            content: brief.text,
                            attachments: brief.attachments,
                            suggestedActions: brief.suggestedActions,
                            activity: brief.activity,
                          }
                        : msg,
                    ),
                  ),
                )
                let capped = false
                await Promise.race([
                  warmed.turnPromise?.catch(() => {}) ?? Promise.resolve(),
                  new Promise((r) =>
                    setTimeout(() => {
                      capped = true
                      r()
                    }, DAILY_BRIEF.streamCapMs),
                  ),
                ])
                unsub()
                const failed = capped || brief.state === "failed"
                notifier.resolveTurn({ answer: brief.text, failed })
                if (failed) {
                  // ⚠️ Yarım bir özeti tam cevap gibi göstermek, araç izinde
                  // kaçındığımız yalanın aynısı. Mevcut "tamamlanmadı" satırı
                  // ve "Tekrar dene" düğmesi devreye girer.
                  setMessages((m) =>
                    m.map((msg) =>
                      msg.id === ansId
                        ? {
                            ...msg,
                            incomplete: true,
                            retry: { kind: "message", text: brief.question },
                          }
                        : msg,
                    ),
                  )
                } else {
                  setOrbState("speaking")
                  setTimeout(() => setOrbState("idle"), 2400)
                }
              }
            }
          }
        }

        if (!resumed) {
          // Sıfırdan kurulum: el sıkışmanın süresi burada ölçülür — rozetin
          // "cold" balonundaki tek rakam bu, ısıtmanın ölçtüğüyle aynı faz.
          const coldStartedAt = performance.now()
          for await (const chunk of startConversation(schemaName)) {
            if (abortGenRef.current !== gen) return
            if (chunk.done) {
              copilotClient = chunk.client
              copilotClientRef.current = { client: copilotClient, agentId: agent }
              markConversationLive(schemaName)
              conversationIdRef.current = chunk.conversationId ?? readConversationId(copilotClient)
              setConversationTick((n) => n + 1)
              startBadgeRef.current = startBadgeAllowedRef.current
                ? {
                    kind: "cold",
                    handshakeMs: Math.round(performance.now() - coldStartedAt),
                    warmTurnMs: null,
                  }
                : null
              break
            }
            // Geçici "Processing…"/informative güncellemesini selamlamaya
            // basma — ama ajanın ne yaptığını anlatan sözünü izde göster.
            if (chunk.transient) {
              if (showGreeting) {
                setMessages((m) =>
                  m.map((msg) =>
                    msg.id === greetingId
                      ? {
                          ...msg,
                          activity: foldActivityStep(msg.activity, chunk.text, greetingStartedAt),
                        }
                      : msg,
                  ),
                )
              }
              continue
            }
            greetingText = chunk.text
            if (chunk.attachments?.length) greetingAttachments = chunk.attachments
            if (chunk.suggestedActions?.length) greetingSuggested = chunk.suggestedActions
            if (!showGreeting) continue
            setMessages((m) =>
              m.map((msg) =>
                msg.id === greetingId
                  ? {
                      ...msg,
                      content: greetingText,
                      attachments: greetingAttachments,
                      suggestedActions: greetingSuggested,
                    }
                  : msg,
              ),
            )
          }
          if (abortGenRef.current !== gen) return
          if (
            showGreeting &&
            !greetingText &&
            !greetingAttachments.length &&
            !greetingSuggested.length
          ) {
            setMessages((m) => m.filter((msg) => msg.id !== greetingId))
          }
        }

        // Selamlama kartındaki ilk Action.Submit'i otomatik gönder ve YANITI
        // GÖRÜNÜR yap (menüyü göster). Bu tur init'in içinde, kullanıcı turundan
        // ÖNCE bitmeli — handleSend hazır-kapısını beklediği için çakışmaz.
        //
        // ⚠️ `resumed` burada İKİ şeyi birden kapatıyor ve bu bilinçli:
        // gerçekten devam ettirilen bir konuşmada menü zaten dökümde var,
        // ÖN-ISITILMIŞ bir konuşmada ise otomatik gönderim YAPILMALI (ısıtma
        // yalnızca handshake'i ödedi, bu turu değil).
        // ⚠️ `!briefPendingNow`: özet istendiyse menü kartı otomatik GÖNDERİLMEZ.
        // Özet basıldıysa altına alakasız bir menü düşürür; basılmadıysa canlı
        // özet sorusu bu turun bitmesini bekler ve kullanıcı istediği özet
        // yerine saniyelerce menünün aktığını izler. İkisi de sunucuda ek tur.
        // Kart yine ÇİZİLİYOR — kullanıcı menüye kendi basabilir.
        if (
          showGreeting &&
          (!resumed || warmAdopted) &&
          !briefPendingNow &&
          copilotClient &&
          greetingAttachments.length
        ) {
          const firstCard = greetingAttachments.find(
            (a) => a.contentType === "application/vnd.microsoft.card.adaptive",
          )
          if (firstCard?.content) {
            const actions = extractSubmitActions(firstCard.content.body || [])
            const firstAction = actions.find((a) => a.style === "positive") || actions[0]
            if (firstAction) {
              await streamReply(sendAction(copilotClient, firstAction.data ?? {}), gen)
            }
          }
        }
      } catch (err) {
        console.error("Copilot init error:", err)
      } finally {
        // Init ne olursa olsun (başarı / abort / hata) kapıyı aç ki handleSend
        // sonsuza kadar beklemesin. Yalnızca hâlâ güncel tur isek composer'ı aç.
        resolveReady()
        if (abortGenRef.current === gen) {
          setBusy(false)
          setOrbState((s) => (s === "thinking" ? "idle" : s))
        }
      }
    }

    initConversation()
    // schemaName: agents async yüklenince init'in tetiklenmesi için şart.
    // resetNonce: header "yeni sohbet" ile aynı mount'ta yeniden başlatma.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent, schemaName, resetNonce])

  // Bir Copilot generator'ını tüketir, tek bir assistant baloncuğunu
  // streaming boyunca günceller (text + kartlar + suggestedActions).
  // İçerik gelmezse baloncuğu kaldırır. Abort olursa { aborted:true } döner.
  async function streamReply(generator, gen) {
    const replyId = makeId()
    // `activity` is the live account of the turn — see AgentActivity. It
    // starts at "sending" because that is all we know before the stream
    // answers, and every later change is driven by an activity we received.
    const startedAt = Date.now()
    // Rozet TEK SEFERLİK: konuşmanın nasıl kurulduğu tek bir olaydır ve
    // ısıtmanın ödediği MCP başlatması yalnız bu tura yarıyor. Her cevaba
    // basmak, konuşmaya ait bir olguyu mesaj özelliği gibi okuturdu.
    //
    // ⚠️ Selamlama kartının OTOMATİK turu da bu yoldan geçiyor (menü tipi
    // ajanlarda). Rozeti ona bırakmak bilinçli: MCP başlatmasını gerçekten
    // ödeyen tur odur ve rozet "bu konuşma nasıl kuruldu" diyor, "senin ilk
    // sorun ne kadar sürdü" demiyor.
    const startBadge = startBadgeRef.current
    startBadgeRef.current = null
    setMessages((m) => [
      ...m,
      {
        id: replyId,
        role: "assistant",
        agent,
        content: "",
        attachments: [],
        suggestedActions: [],
        time: new Date(),
        start: startBadge,
        activity: { received: false, steps: [], startedAt },
      },
    ])

    // Fold one update into this reply's activity, leaving the rest alone.
    const updateActivity = (fn) =>
      setMessages((m) =>
        m.map((msg) =>
          msg.id === replyId
            ? { ...msg, activity: fn(msg.activity ?? { received: false, steps: [], startedAt }) }
            : msg,
        ),
      )
    let fullText = ""
    let fullAttachments = []
    let fullSuggested = []
    // Tamamlanmış "message" aktivitesi gördük mü? Görmeden akış biterse
    // (iOS PWA'da bağlantı kopması) yanıt yarıda kalmış demektir.
    let sawFinal = false
    // Geçici "Processing…"/informative güncellemesi gördük mü? Bunları balona
    // basmıyoruz ama akış SADECE bunları görüp final gelmeden biterse, balonu
    // "yarıda kesildi" sayıp Tekrar dene sunabilmek için izliyoruz.
    let sawTransient = false
    // Araç çağrısı event'leri — tur boyunca yaşar, `planIdentifier` ile
    // anahtarlanır (bkz. foldToolCall).
    const toolBuffer = new Map()
    // Araçların ürettiği belgeler (izin formu): asistanın eklerinin YANINA
    // konur, onları ezmez (bkz. botFiles).
    const docs = []
    for await (const chunk of generator) {
      if (abortGenRef.current !== gen) return { aborted: true }
      if (chunk.done) break
      // Araç çağrısı: balona hiçbir şey yazmaz. Metinli geçici güncellemeden
      // ÖNCE bakılır, çünkü bu parçanın metni yok — `foldActivityStep`e
      // düşse boş bir adım eklemeye çalışırdı.
      if (chunk.document) docs.push(chunk.document)
      if (chunk.tool) {
        // Geçici trafik kadar o da "ajan çalışıyor" kanıtı: yalnız bunları
        // görüp final gelmeden akış biterse yanıt yarıda kesilmiştir.
        sawTransient = true
        const step = foldToolCall(toolBuffer, chunk.tool)
        if (step?.kind === "running") {
          // Çalışan araç BAŞLIKTA durur, ize DÜŞMEZ: iz satırı tik taşıyor
          // ve bitmemiş bir çağrıya tik koymak kaçındığımız yalan.
          updateActivity((a) => ({
            ...(a ?? { received: false, steps: [], startedAt }),
            received: true,
            running: step.label,
          }))
        } else if (step?.kind === "done") {
          // Biten çağrı ize düşerken başlık boşalır; bir sonraki araç
          // başlayana kadar orayı ajanın son sözü ya da saat devralır.
          updateActivity((a) => foldActivityStep({ ...a, running: null }, step.label, startedAt))
        }
        continue
      }
      // Geçici durum güncellemesi: içeriği balona UYGULAMA — "yazıyor"
      // göstergesi gerçek yanıt gelene kadar kalsın (Teams davranışı).
      if (chunk.transient) {
        sawTransient = true
        // …but the agent's own words about what it is doing DO belong on
        // screen — just in the activity trace rather than in the answer.
        updateActivity((a) => foldActivityStep(a, chunk.text, startedAt))
        continue
      }
      // Any non-transient activity is equally proof the agent is answering.
      updateActivity((a) => (a.received ? a : { ...a, received: true }))
      if (chunk.final) sawFinal = true
      fullText = chunk.text
      // BOŞ bir parça öncekini SİLMEZ: ekler ve hızlı yanıt düğmeleri ayrı
      // bir aktivitede gelebiliyor, ardından gelen metin parçası onları
      // sıfırlıyordu.
      if (chunk.attachments?.length) fullAttachments = chunk.attachments
      if (chunk.suggestedActions?.length) fullSuggested = chunk.suggestedActions
      setMessages((m) =>
        m.map((msg) =>
          msg.id === replyId
            ? {
                ...msg,
                content: fullText,
                attachments: [...fullAttachments, ...docs],
                suggestedActions: fullSuggested,
              }
            : msg,
        ),
      )
    }
    const hasContent =
      Boolean(fullText) || fullAttachments.length + docs.length > 0 || fullSuggested.length > 0
    // İçerik geldi (ya da yalnızca geçici güncelleme görüldü) ama final mesaj
    // gelmediyse: akış erken kesilmiş.
    const incomplete = (hasContent || sawTransient) && !sawFinal
    // Boş balonu yalnızca eksik DE değilse kaldır (eksikse Tekrar dene için kalsın).
    if (!hasContent && !incomplete) {
      setMessages((m) => m.filter((msg) => msg.id !== replyId))
    }
    return { fullText, fullAttachments, fullSuggested, incomplete, replyId }
  }

  // Akış bittikten sonra ortak son-iş: yarıda kesildiyse baloncuğu "eksik"
  // işaretle (Tekrar dene butonu için retry tarifini sakla), yoksa orb'u
  // kısa süre "speaking"e al. retryDescriptor: { kind:"message", text } veya
  // { kind:"action", actionData } — retryTurn aynı turu yeniden gönderir.
  function finishStream(res, retryDescriptor) {
    // Single funnel for every completed turn — so "tell me when it's done"
    // can't drift between send / suggested-action / card-action / retry.
    // Turns the user didn't start (greeting, auto-submit) were never armed
    // and are ignored inside the notifier.
    notifier.resolveTurn({ answer: res.fullText, failed: !!res.incomplete })
    if (res.incomplete) {
      setMessages((m) =>
        m.map((msg) =>
          msg.id === res.replyId ? { ...msg, incomplete: true, retry: retryDescriptor } : msg,
        ),
      )
      setOrbState("idle")
    } else {
      setOrbState("speaking")
      setTimeout(() => setOrbState("idle"), 2400)
    }
  }

  // ── Work IQ bağlantı onay akışı ────────────────────────────────────────
  // Bir streamReply sonucu consent kartıysa ele alır. true dönerse çağıran
  // finishStream'i ATLAMALI (akışı biz devraldık).
  async function maybeHandleConsent(res, gen) {
    const card = findConsentCard(res?.fullAttachments)
    if (!card) return false
    // Ham consent baloncuğunu gizle — kendi kutumuz/otomatik akışımız yönetecek.
    if (res.replyId) setMessages((m) => m.filter((msg) => msg.id !== res.replyId))
    const client = copilotClientRef.current?.client
    if (!client) return true
    if (autoConsentRef.current === true) {
      await runConsentLoop(client, card, gen)
    } else if (autoConsentRef.current === false) {
      // Daha önce reddedildi → sessizce iptal et. Sessiz iptal duyurulacak bir
      // yanıt değil; bekleyen turu düşür ki sonraki turun bildirimine karışmasın.
      notifier.cancelTurn()
      await streamReply(sendAction(client, consentActionData(card, "Cancel")), gen)
    } else {
      // Karar verilmedi → özet-onay kutusunu aç (Evet/Hayır kullanıcıdan gelir).
      setConsentPrompt({ name: consentName(card), card, gen })
    }
    return true
  }

  // Onaydan sonra: gelen HER consent kartını otomatik "Allow"lar; consent
  // olmayan nihai yanıt gelince onun baloncuğunu bırakıp döngüyü bitirir.
  async function runConsentLoop(client, firstCard, gen) {
    setConsentWait(true)
    setBusy(true)
    try {
      let card = firstCard
      let lastRes = null
      while (card) {
        const res = await streamReply(sendAction(client, consentActionData(card, "Allow")), gen)
        if (res.aborted) {
          notifier.cancelTurn()
          return
        }
        lastRes = res
        const next = findConsentCard(res.fullAttachments)
        if (next) {
          // Ara consent baloncuğunu gizle, döngüye devam et.
          if (res.replyId) setMessages((m) => m.filter((msg) => msg.id !== res.replyId))
          card = next
        } else {
          card = null // nihai (consent-olmayan) yanıt — baloncuğu bırak
        }
      }
      if (lastRes) finishStream(lastRes, { kind: "action", actionData: {} })
    } finally {
      setConsentWait(false)
      if (abortGenRef.current === gen) setBusy(false)
    }
  }

  // Özet kutu: "Evet, hepsine izin ver" → tüm consent kartlarını otomatik onayla.
  async function approveConsent() {
    const p = consentPrompt
    setConsentPrompt(null)
    if (!p) return
    autoConsentRef.current = true
    const client = copilotClientRef.current?.client
    if (client) await runConsentLoop(client, p.card, p.gen)
  }

  // Özet kutu: "Hayır" → bu bağlantıyı iptal et, otomatik onayı kapat.
  async function rejectConsent() {
    const p = consentPrompt
    setConsentPrompt(null)
    if (!p) return
    autoConsentRef.current = false
    const client = copilotClientRef.current?.client
    if (!client) return
    const gen = ++abortGenRef.current
    setBusy(true)
    try {
      const res = await streamReply(sendAction(client, consentActionData(p.card, "Cancel")), gen)
      if (!res.aborted) finishStream(res, { kind: "action", actionData: {} })
    } finally {
      if (abortGenRef.current === gen) setBusy(false)
    }
  }

  // "Tekrar dene" → onaylanınca aynı turu yeniden gönderir. Eski yarım
  // baloncuğu kaldırıp temiz bir akış başlatır (tek nihai yanıt kalsın).
  async function handleRetry(message) {
    if (!message?.retry) return
    await conversationReadyRef.current
    const client = copilotClientRef.current?.client
    if (!client) return
    setMessages((m) => m.filter((msg) => msg.id !== message.id))
    setIsNearBottom(true)
    setOrbState("thinking")
    setBusy(true)
    const gen = ++abortGenRef.current
    try {
      const r = message.retry
      const generator =
        r.kind === "action"
          ? sendAction(client, r.actionData ?? {})
          : sendMessage(client, String(r.text ?? ""))
      notifier.armTurn(r.kind === "message" ? r.text : "")
      const res = await streamReply(generator, gen)
      if (res.aborted) {
        notifier.cancelTurn()
        return
      }
      if (await maybeHandleConsent(res, gen)) return
      finishStream(res, r)
    } catch (err) {
      console.error("Retry error:", err)
      notifier.resolveTurn({ failed: true })
      setOrbState("idle")
    } finally {
      if (abortGenRef.current === gen) setBusy(false)
    }
  }

  // suggestedActions chip'ine tıklanınca: imBack/messageBack → mesaj gönder,
  // postBack → action gönder, openUrl → yeni sekme.
  async function handleSuggestedAction(action) {
    const { kind, payload } = resolveSuggestedAction(action)
    if (kind === "url") {
      if (payload) window.open(payload, "_blank", "noopener,noreferrer")
      return
    }
    await conversationReadyRef.current
    const client = copilotClientRef.current?.client
    if (!client) return
    // Kullanıcının seçimini kendi baloncuğu olarak göster
    setIsNearBottom(true)
    setMessages((m) => [
      ...m,
      { id: makeId(), role: "user", content: action.title, time: new Date() },
    ])
    setOrbState("thinking")
    setBusy(true)
    const gen = ++abortGenRef.current
    try {
      const actionData = typeof payload === "object" ? payload : { value: payload }
      const generator =
        kind === "action" ? sendAction(client, actionData) : sendMessage(client, String(payload))
      notifier.armTurn(action.title)
      const res = await streamReply(generator, gen)
      if (res.aborted) {
        notifier.cancelTurn()
        return
      }
      if (await maybeHandleConsent(res, gen)) return
      finishStream(
        res,
        kind === "action"
          ? { kind: "action", actionData }
          : { kind: "message", text: String(payload) },
      )
    } catch (err) {
      console.error("Suggested action error:", err)
      notifier.resolveTurn({ failed: true })
      setOrbState("idle")
      recoverFromDeadConversation()
    } finally {
      if (abortGenRef.current === gen) setBusy(false)
    }
  }

  // Park edilmiş soru effect'inden çağrılır. handleSend her render'da yeniden
  // tanımlanıyor; ref, effect'i onun kimliğine bağlamadan en tazesine
  // ulaşmayı sağlıyor.
  sendRef.current = (picked, text) => handleSend(picked, text)

  async function handleSend(picked = [], overrideText) {
    // `overrideText`, composer'dan hiç geçmemiş sorular için var (header
    // panelleri). Önce state'e yazıp bu fonksiyonu çağırmak bayat closure
    // değerini okuyacağı için metin doğrudan geliyor.
    const text = (overrideText ?? input).trim()
    if (!text && picked.length === 0) return

    // ⚠️ ÇEVRİMDIŞIYKEN DÜRÜST REDDET. Öncesinde mesaj gidiyor, ağ hatasına
    // düşüyor ve kullanıcı ajanın bozulduğunu sanıyordu — oysa sorun ondaydı.
    // Baloncuğu listeye EKLEMEDEN önce dönüyoruz: yazdığı metin bestecide
    // kalsın, ağ gelince tek tuşla göndersin. `navigator.onLine === false`
    // güvenilirdir (kesin çevrimdışı); `true` bir şey iddia etmediği için
    // burada yalnızca NEGATİF hâle bakıyoruz.
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      notify.error(t("offline.chat"))
      return
    }

    // Baloncukta YALNIZCA görüntüleme metası tutulur (ad/boyut/tip). base64
    // data-URI'leri buraya koymuyoruz: mesajlar chatSession ile localStorage'a
    // mirror'lanıyor ve büyük dosyalar quota'yı patlatır.
    const displayAttachments = picked.map((a) => ({
      name: a.name,
      size: a.size,
      contentType: a.type,
    }))
    const userMsg = {
      id: makeId(),
      role: "user",
      content: text,
      attachments: displayAttachments,
      time: new Date(),
    }
    setIsNearBottom(true)
    setMessages((m) => [...m, userMsg])
    setInput("")
    setOrbState("thinking")
    setBusy(true)

    // Sohbetin İLK kullanıcı mesajı: Copilot konuşması bu tur sırasında
    // kuruluyor, yani ilk yanıt sonrakilerden belirgin şekilde yavaş geliyor ve
    // kullanıcı tarafında "takıldı" gibi görünüyor. Bir kez, kendiliğinden
    // kapanan bir bildirimle söylüyoruz. Agent'ı yapılandırılmamış (mock)
    // sohbette gerek yok — orada yanıt zaten anında geliyor.
    if (!firstReplyNoticeRef.current && schemaName && schemaName !== "agent-id") {
      firstReplyNoticeRef.current = true
      showFirstReplyToast({ t, inDock, duration: FIRST_REPLY_NOTICE_MS })
    }

    // KRİTİK: init akışı (greeting + auto-submit) tamamen bitene kadar bekle.
    // gen'i bundan ÖNCE artırmıyoruz; yoksa init'in turunu yarıda kesip aynı
    // konuşmaya çakışan ikinci tur göndererek "Sohbet durduruldu" hatasını
    // tetikleriz.
    await conversationReadyRef.current

    const gen = ++abortGenRef.current
    try {
      // ⚠️ Gönderim yolu da AYNI süzgeçten geçer. Burada `getAgent`i
      // doğrudan çağırmak, render'da kapattığımız kapıyı ilk mesajda
      // yeniden açardı.
      const activeAgent = resolveOpenAgent(agent)
      const schemaName = activeAgent?.agentId

      if (!schemaName || schemaName === "agent-id") {
        // Agent henüz yapılandırılmamış — mock fallback
        await new Promise((r) => setTimeout(r, 1000))
        if (abortGenRef.current !== gen) return
        const replyText =
          activeAgent?.description?.trim() ||
          `${activeAgent?.name ?? "Agent"} — ${t("chat.subtitle.lead")} ${t("chat.subtitle.highlight")}`
        setMessages((m) => [
          ...m,
          { id: makeId(), role: "assistant", agent, content: replyText, time: new Date() },
        ])
        setOrbState("speaking")
        setTimeout(() => setOrbState("idle"), 2400)
        return
      }

      // Bot hazır değilse bekle (startConversation hâlâ çalışıyor olabilir)
      if (!copilotClientRef.current || copilotClientRef.current.agentId !== agent) {
        // ⚠️ BURAYA `await conversationReadyRef.current`TAN SONRA DÜŞÜLÜR,
        // yani "henüz bağlanıyor" DEĞİL: başlatma bitti ve istemci yine de
        // kurulamadı. "Bir saniye bekleyin" demek yalan olurdu — beklemek
        // bir şeyi değiştirmiyor, yeni bir sohbet gerekiyor.
        setMessages((m) => [
          ...m,
          {
            id: makeId(),
            role: "assistant",
            agent,
            content: t(
              "chat.notReady",
              "Bu sohbet başlatılamadı. Sağ üstten yeni bir sohbet başlatıp tekrar dener misin?",
            ),
            attachments: [],
            time: new Date(),
          },
        ])
        setOrbState("idle")
        return
      }

      const client = copilotClientRef.current.client
      // Dosyaları gönderim anında base64 data-URI attachment'larına çevir
      // (kalıcı değil — yalnızca bu activity için). Bot tarafında
      // System.Activity.Attachments üzerinden .Name / .Content okunur.
      const wireAttachments = await filesToAttachments(picked.map((a) => a.file))
      // Masraf fişi: dosyanın kopyası HR MCP'ye, kimliği mesaja (lib/chatFileStaging.js).
      const wireText = await textWithStagedFiles(text, wireAttachments, activeAgent, t)
      // Turdan hemen önce işaretle: yukarıdaki erken çıkışlarda (mock agent,
      // client hazır değil) bekleyen tur bırakmayalım.
      notifier.armTurn(text)
      const res = await streamReply(sendMessage(client, wireText, wireAttachments), gen)
      if (res.aborted) {
        notifier.cancelTurn()
        return
      }
      if (await maybeHandleConsent(res, gen)) return
      // Retry tarifi yalnızca metin: base64 dosyalar kalıcı tutulmadığı için
      // (sessionStorage quota) eklenti yeniden gönderilemez — metinle tekrar dener.
      finishStream(res, { kind: "message", text })
    } catch (err) {
      if (abortGenRef.current !== gen) return
      console.error("Copilot Studio error:", err)
      notifier.resolveTurn({ failed: true })
      // ⚠️ `recoverFromDeadConversation()` hemen aşağıda konuşmayı zaten
      // tazeliyor (süresi dolmuş bir konuşma ilk `sendMessage`de patlıyor —
      // `resumeConversation` ağa çıkmadığı için ölü olduğu ancak burada
      // anlaşılıyor). Yani TEKRAR DENEMEK gerçekten işe yarıyor ve mesaj
      // bunu söylemek zorunda; "bağlantı hatası" tek başına kullanıcıya
      // yapacak bir şey bırakmıyordu.
      setMessages((m) => [
        ...m,
        {
          id: makeId(),
          role: "assistant",
          agent,
          content: t("chat.error", "Yanıt alınamadı. Aynı soruyu tekrar gönderir misin?"),
          attachments: [],
          time: new Date(),
        },
      ])
      setOrbState("idle")
      recoverFromDeadConversation()
    } finally {
      if (abortGenRef.current === gen) setBusy(false)
    }
  }

  /**
   * Devam ettirilen bir konuşma üzerindeki tur düştüğünde bir kez çalışır:
   * kimliği at ve sıfırdan el sıkış. Sessiz bir yeniden gönderim DEĞİL — ajan
   * akış kopmadan önce bir işlem yapmış olabilir ve bir turu tekrarlamak bizim
   * kararımız değil; kullanıcı sorusunu tekrar sorduğunda artık canlı bir
   * konuşmaya düşer.
   */
  function recoverFromDeadConversation() {
    if (!resumedRef.current) return
    resumedRef.current = false
    recoveringRef.current = true
    conversationIdRef.current = null
    setConversationTick((n) => n + 1)
    setResetNonce((n) => n + 1)
  }

  async function handleCardAction(actionData) {
    await conversationReadyRef.current
    const client = copilotClientRef.current?.client
    if (!client) return
    const gen = ++abortGenRef.current
    setOrbState("thinking")
    setBusy(true)
    try {
      notifier.armTurn("")
      const res = await streamReply(sendAction(client, actionData), gen)
      if (res.aborted) {
        notifier.cancelTurn()
        return
      }
      if (await maybeHandleConsent(res, gen)) return
      finishStream(res, { kind: "action", actionData })
    } catch (err) {
      console.error("Card action error:", err)
      notifier.resolveTurn({ failed: true })
      setOrbState("idle")
      recoverFromDeadConversation()
    } finally {
      if (abortGenRef.current === gen) setBusy(false)
    }
  }

  function handleResetLocal() {
    // Saklanan dökümü VE konuşma kimliğini birlikte at: kimlik kalsaydı init
    // effect'i temizlenen sohbeti hemen ajanın hafızasına geri bağlardı.
    clearChatSession(agent)
    conversationIdRef.current = null
    setRestoredCount(0)
    setOrbState("idle")
    setInput("")
    setUnread(0)
    setIsNearBottom(true)
    // Copilot konuşmasını sıfırdan başlat: init effect'i resetNonce ile yeniden
    // tetikle (eski client/mesajları temizleyip yeni greeting'i getirir).
    setResetNonce((n) => n + 1)
    onReset?.()
  }

  // ── Baloncuklara giden geri çağırımlar: KİMLİĞİ sabit, GÖVDESİ güncel ──
  //
  // `ChatMessage` memo'lu ve karşılaştırıcısı bu üç prop'u da kıyaslıyor
  // (ChatMessage.jsx sonundaki `memo(...)`). Handler'lar her render'da yeniden
  // tanımlandığı için karşılaştırma daima "değişti" diyordu: yeni bir token
  // geldiğinde LİSTENİN TAMAMI yeniden çiziliyor, yani her baloncuğun
  // markdown'ı yeniden ayrıştırılıyordu. Uzun bir konuşmada bu, cevap akarken
  // sürekli tekrarlanan bir maliyet.
  //
  // Bağımlılık listesi yazmak burada YANLIŞ araç: üç fonksiyon da akış
  // durumuna, iptal sayacına, bildiriciye ve bir düzine ayarlayıcıya
  // dokunuyor; eksik yazılan tek bir bağımlılık, kullanıcının "yeniden dene"
  // düğmesine bastığında eski bir konuşmaya yazmasına yol açardı. Bunun
  // yerine referans deseni: sarmalayıcının kimliği hiç değişmez, çağrıldığı
  // anda en SON render'ın gövdesini çalıştırır — yani bugünkü davranışın
  // birebir aynısı.
  //
  // Atama layout effect'te yapılır: tıklama ancak commit'ten sonra
  // gelebileceği için sarmalayıcı hiçbir zaman bir render geride kalmaz.
  const latestHandlers = useRef(null)
  useLayoutEffect(() => {
    latestHandlers.current = { handleRetry, handleSuggestedAction, handleCardAction }
  })
  const onRetry = useCallback((message) => latestHandlers.current?.handleRetry(message), [])
  const onSuggestedAction = useCallback(
    (action) => latestHandlers.current?.handleSuggestedAction(action),
    [],
  )
  const onCardAction = useCallback(
    (actionData) => latestHandlers.current?.handleCardAction(actionData),
    [],
  )

  // "Boş" = gösterilecek GERÇEK içerik yok. init effect'i ağ beklemesi
  // başlarken içeriği boş bir placeholder assistant balonu ekliyor; bunu
  // "dolu" saymak orb karşılama ekranını anında tam chat layout'una atlatıp
  // boş bir "yazıyor" balonu flash'liyordu. İçeriksiz balonları yok sayarak
  // greeting (metin/kart/suggested) GERÇEKTEN gelene kadar orb ekranında
  // kalıyoruz — orb'un "thinking" animasyonu zaten yükleniyor göstergesi.
  const hasRenderableContent = (m) =>
    Boolean(m.content) ||
    m.attachments?.length > 0 ||
    m.suggestedActions?.length > 0 ||
    m.incomplete
  const isEmpty = !messages.some(hasRenderableContent)

  /**
   * ⚠️ **AÇIK KAPI, SOHBETİN KENDİ EKRANINDA KAPANIR:** hiçbir asistana yetkisi olmayan kişi
   * sohbet ekranına girebilir, ama ortada bulanık arka planla "erişim iste" görür.
   *
   * Kilit bugüne kadar yalnız SEÇİMİ süzüyordu: `resolveOpenAgent` kilitli
   * bir asistan görünce `openAgents[0]`a düşüyor, o liste de boşsa `null`
   * dönüyordu. Ama ekran yine de çiziliyordu — besteci, asistan hapı ve
   * istem kütüphanesiyle birlikte. Ölçüldü (sıfır yetkili oturum): besteci
   * VAR, hapta KİLİTLİ bir asistanın adı yazıyor ve altında o asistana ait
   * olmayan "genel" istem kütüphanesi duruyordu.
   *
   * ⚠️ **SIDEBAR SATIRINA DOKUNULMAZ — BİR TUR DENENDİ VE GERİ ALINDI.**
   * Satır bir tur kilitlenip bulanıklaştırıldı; istek üzerine geri alındı:
   * sohbete GİRİLEBİLMELİ, kapı içeride durmalı. Gerekçesi de sağlam —
   * menüdeki bir satırı kilitlemek kullanıcıya gideceği yeri hiç
   * göstermeden "olmaz" demekti.
   *
   * ⚠️ **KAPI BURADA, ÇAĞIRANLARDA DEĞİL.** Sohbete giden yol bir tane
   * değil: sol menü satırı, "Yeni sohbet", başlıktaki TYRO hapı, komut
   * paleti, header araması, park edilmiş "TYRO'ya sor" sorusu ve düpedüz
   * `/chat` adresi. Her birine ayrı bir kapı koymak, yedincisinde birini
   * unutmak demekti; ekranın KENDİSİ tek çıkış noktası.
   *
   * ⚠️ **EKRAN SÖKÜLMEZ, ÖRTÜLÜR.** İki dönüş yolu da (boş ekran ve dolu
   * döküm) aynı sarmalayıcıdan geçiyor: arka katman bulanık ve
   * etkileşimsiz, kart tam ortada. Bulanıklık ARKA KATMANA veriliyor, karta
   * değil — kart onun KARDEŞİ, çocuğu olsaydı o da bulanırdı.
   *
   * ⚠️ Arka katman ÜÇ kanalla birden kapatılır: `pointer-events-none`
   * (fare), `aria-hidden` (ekran okuyucu) ve `inert` (sekme sırası).
   * `blur` tek başına hiçbirini yapmaz — deponun defalarca ölçülmüş kuralı.
   *
   * ⚠️ Bu bir GÜVENLİK SINIRI DEĞİL ve öyle sunulmuyor (bkz.
   * `appLockPolicy.js`): konuşma zaten hiç kurulmuyordu — init effect'i
   * `!schemaName` ile erken dönüyor. Kapanan şey keşif ve yanlışlıkla
   * girme; gerçek sınır Copilot Studio'nun kendi Entra kapısı.
   */
  const withAccessOverlay = (node) =>
    agentAccess.locked ? (
      <div className="relative flex min-h-0 w-full flex-1 flex-col">
        <div
          aria-hidden="true"
          // React 19 `inert`i BOOLEAN olarak basar; boş dize FALSY ve öznitelik
          // hiç yazılmaz (ölçüldü: `document.querySelector("[inert]")` boş döndü).
          inert={true}
          className="pointer-events-none flex min-h-0 w-full flex-1 select-none flex-col opacity-70 blur-[5px]"
        >
          {node}
        </div>
        <AgentAccessOverlay onGoToCatalogue={() => navigate("/dashboard")} />
      </div>
    ) : (
      node
    )

  if (isEmpty) {
    return withAccessOverlay(
      // Boş ekran KENDİ İÇİNDE kayar. Kabuk `h-[100dvh] overflow-hidden`
      // ile kilitli, yani buradaki içerik ekrandan uzunsa hiçbir yere
      // sığmadan KIRPILIYORDU: bir konu açıldığında (İK on istem taşıyor)
      // listenin sonu ekranın altında kalıyor ve ona ulaşmanın yolu
      // olmuyordu. `justify-center` yerine `m-auto`: içerik sığdığında yine
      // dikeyde ortalanır, sığmadığında yukarıdan başlar ve kaydırılır —
      // taşan bir flex çocuğunu ortalamak üst tarafı erişilemez kılıyor.
      <div className="@container/chat flex w-full flex-1 flex-col overflow-y-auto overscroll-contain px-4 py-6 sm:py-8 short:py-4 shorter:py-3">
        <div className="m-auto flex w-full max-w-4xl flex-col items-center [&>*]:shrink-0">
          {/* Küre SABİT: bu ekranın kahramanı o ve alçak bir pencerede
            küçültülecek ilk şey değil. Yer açan şey aşağıdaki boşluklar ve
            öneri kartlarının yoğunluğu (bkz. `short:` / `shorter:`). */}
          <BrandOrb
            surface="chat"
            state={orbState}
            level={effectiveLevel}
            size={isMobile ? 110 : 150}
            onClick={handleOrbClick}
            ariaLabel={t("chat.orb.aria")}
          />
          {(() => {
            // Pre-split per-render so the locale toggle re-renders the right
            // tokens. Each word becomes its own motion.span with wordVariants
            // and the parent's stagger drives the wave.
            const greetingWords = t(greetingKey(greetHour)).split(" ")
            const leadWords = t("chat.subtitle.lead").split(" ")
            return (
              <div className="mt-4 space-y-1 text-center sm:mt-6 short:mt-3 shorter:mt-2">
                <motion.h1
                  initial="hidden"
                  animate="visible"
                  variants={greetingLineVariants}
                  className="text-2xl font-medium tracking-tight text-foreground sm:text-3xl"
                  aria-label={`${t(greetingKey(greetHour))}, ${firstName}`}
                >
                  {greetingWords.map((word, i) => (
                    <Fragment key={`g-${i}`}>
                      <motion.span variants={wordVariants} className="inline-block">
                        {word}
                      </motion.span>
                      {i < greetingWords.length - 1 ? " " : null}
                    </Fragment>
                  ))}
                  <motion.span variants={wordVariants} className="inline-block">
                    ,&nbsp;
                  </motion.span>
                  <motion.span
                    variants={wordVariants}
                    className="inline-block bg-gradient-to-r from-brand-text-from via-brand-text-via to-brand-text-to bg-clip-text text-transparent"
                  >
                    {firstName}
                  </motion.span>
                </motion.h1>

                <motion.p
                  initial="hidden"
                  animate="visible"
                  variants={subtitleLineVariants}
                  className="text-lg tracking-tight text-foreground/90 sm:text-xl md:text-2xl"
                  aria-label={`${t("chat.subtitle.lead")} ${t("chat.subtitle.highlight")}`}
                >
                  {leadWords.map((word, i) => (
                    <Fragment key={`l-${i}`}>
                      <motion.span variants={wordVariants} className="inline-block">
                        {word}
                      </motion.span>{" "}
                    </Fragment>
                  ))}
                  <motion.span
                    variants={wordVariants}
                    className="inline-block bg-gradient-to-r from-brand-text-from via-brand-text-via to-brand-text-to bg-clip-text text-transparent"
                  >
                    {t("chat.subtitle.highlight")}
                  </motion.span>
                </motion.p>
              </div>
            )
          })()}
          <ChatComposer
            value={input}
            onChange={handleInputChange}
            onSend={handleSend}
            agent={activeAgentId}
            agentName={activeAgent?.name}
            onAgentChange={(id) => setAgent(id)}
            onMicToggle={handleMicToggle}
            onOpenPromptLab={() => setPromptLabOpen(true)}
            promptLabOpen={promptLabOpen}
            micActive={orbState === "listening"}
            disabled={busy}
            className="mt-6 w-full max-w-3xl sm:mt-8 short:mt-4 shorter:mt-3"
          />
          <div className="mt-4 w-full max-w-3xl short:mt-3 shorter:mt-2">
            <PromptStarters
              agentName={activeAgent?.name}
              onPick={handlePromptPick}
              onOpenLab={() => setPromptLabOpen(true)}
              collapsed={inDock}
            />
          </div>
          <PromptLab
            open={promptLabOpen}
            onOpenChange={setPromptLabOpen}
            agentName={activeAgent?.name}
            onPick={handlePromptPick}
          />
        </div>
      </div>,
    )
  }

  // Canonical 3-row chat layout:
  //   row 1: header  (auto)
  //   row 2: scroll  (flex-1 min-h-0 overflow-y-auto overscroll-contain)
  //   row 3: composer (auto, pb-safe)
  // min-h-0 on the scroller is non-negotiable — without it flex children
  // can't shrink below their content height, so the scroller would push the
  // composer off-screen. Composer is NOT sticky — the 3-row flex naturally
  // pins it. Sticky inside a transformed/overflow-hidden ancestor is fragile
  // on iOS Safari. Root uses h-full to inherit from DashboardLayout's main,
  // which itself is flex-1 of the viewport.
  return withAccessOverlay(
    // min-h-0 + h-full lock the chat shell to its parent's height so the
    // flex-1 scroller below cannot grow taller than the viewport. Without
    // min-h-0, 10+ messages push this column past 100dvh and the WHOLE
    // page starts scrolling — the chat header and composer disappear.
    // @container/chat: the composer, the message type and the activity row
    // scale off THIS element's width, not the viewport's. Same component in
    // the page and in the dock, two very different amounts of room — a media
    // query cannot tell them apart, a container query can.
    <div className="@container/chat relative mx-auto flex h-full min-h-0 w-full max-w-4xl flex-1 flex-col px-3 pt-2 sm:px-4 sm:pt-3">
      {/* Row 1 — header. Mini orb on the left mirrors the modes the big
          orb plays (idle / listening / thinking / speaking) so the user
          gets a visual "agent state" cue. Below the agent name we show
          the agent's description by default, swapping in "Yazıyor…" when
          the orb is in thinking mode so the user gets a clear in-progress
          signal. */}
      <div className="relative shrink-0 border-b border-border/60 pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <BrandOrb
              surface="chat"
              state={orbState}
              level={effectiveLevel}
              size={30}
              onClick={handleOrbClick}
              ariaLabel={t("chat.orb.aria")}
            />
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-sm font-medium leading-4">{activeAgent?.name}</span>
              {orbState === "thinking" ? (
                <span className="truncate text-[0.6875rem] font-medium text-brand-deep">
                  {t("chat.status.thinking")}
                </span>
              ) : activeAgent?.description ? (
                <span className="truncate text-[0.6875rem] text-muted-foreground">
                  {activeAgent.description}
                </span>
              ) : null}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetLocal}
            className="h-8 w-8 shrink-0 gap-1.5 p-0 text-xs text-muted-foreground hover:text-foreground sm:w-auto sm:px-3"
            aria-label={t("chat.reset")}
          >
            <HugeiconsIcon icon={Refresh01Icon} className="size-4 sm:size-3.5" />
            <span className="hidden sm:inline">{t("chat.reset")}</span>
          </Button>
        </div>
      </div>

      {/* Kart, başlık çizgisinin ÜSTÜnde durur ve gerekirse başlık yazısının
          üstüne biner. Portal ile body'ye render edilir — `main`'in
          overflow-hidden'ı yoksa tepesini kırpıyordu. */}
      {/* Row 2 — message scroller. overscroll-contain blocks Android PTR +
          iOS rubber-band from bubbling to the page. onTouchStart blurs the
          textarea so the soft keyboard dismisses when the user taps an
          older message — matches ChatGPT/Claude mobile behavior. */}
      <div
        ref={attachScrollRef}
        onScroll={handleScroll}
        onTouchStart={() => {
          if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
            document.activeElement.blur()
          }
        }}
        className="relative flex-1 min-h-0 overflow-y-auto overscroll-contain px-1 py-3"
      >
        <div ref={attachContentRef} className="space-y-4">
          {/* Geri gelen satırlar tarihlenir: aksi hâlde dünkü bir yanıt bu
              ziyaretin ilk mesajıymış gibi okunuyor. */}
          {restoredCount > 0 && <EarlierConversationDivider at={messages[0]?.time ?? null} />}
          {messages.map((m) => (
            <ChatMessage
              key={m.id}
              message={m}
              onCardAction={onCardAction}
              onSuggestedAction={onSuggestedAction}
              onRetry={onRetry}
            />
          ))}
          {/* Gün özeti sorusu, devralma kararı beklenirken (bkz. useParkedAsk);
              gerçek balon çizildiği anda kalkar. */}
          {briefPending && (
            <ChatMessage
              message={{
                id: "brief-pending",
                role: "user",
                content: briefPending.text,
                attachments: [],
                time: briefPending.time,
              }}
            />
          )}
        </div>
      </div>

      {/* Floating new-message pill — appears above the composer when the user
          has scrolled up and a new assistant message arrives. */}
      <div className="pointer-events-none relative z-10 -mb-2 flex justify-center">
        <AnimatePresence>
          {unread > 0 && !isNearBottom && (
            <motion.button
              key="new-msg-pill"
              type="button"
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onClick={scrollToBottom}
              className={cn(
                "pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/90 px-3 py-1.5",
                "text-xs font-medium text-foreground shadow-lg backdrop-blur",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
              )}
              aria-label={t("chat.scrollToLatest")}
            >
              <HugeiconsIcon icon={ArrowDown01Icon} className="size-3.5" strokeWidth={2} />
              <span>{t("chat.newMessagePill").replace("{count}", String(unread))}</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Row 3 — composer. Symmetric py only: the safe-area-inset-bottom
          is ALREADY applied one level up by SidebarInset
          (pb-[env(safe-area-inset-bottom)] in DashboardLayout). Adding env()
          here too would double the home-indicator gutter (~68 px on iOS PWA)
          and leave a tall bg-background band above the indicator — the
          "white gap" regression. Solid bg keeps the indicator from bleeding
          through the gradient. */}
      <div className="chat-composer-row shrink-0 bg-background py-2 pwa:pb-5 sm:py-3">
        {/* Yalnızca kullanıcı gerçekten bir soru sorduktan sonra çıkar — o an
            "bu ne kadar sürecek?" sorusu zaten akılda, teklif oraya oturuyor. */}
        <NotifyOptIn visible={messages.some((m) => m.role === "user")} />
        <ChatComposer
          value={input}
          onChange={handleInputChange}
          onSend={handleSend}
          agent={activeAgentId}
          agentName={activeAgent?.name}
          onAgentChange={(id) => setAgent(id)}
          onMicToggle={handleMicToggle}
          onOpenPromptLab={() => setPromptLabOpen(true)}
          promptLabOpen={promptLabOpen}
          micActive={orbState === "listening"}
          disabled={busy}
        />
      </div>

      {/* Karşılama şeridi sohbet başlayınca ekranda kalmıyor; hazır
          istemlere bestecideki ampulden dönülüyor. */}
      <PromptLab
        open={promptLabOpen}
        onOpenChange={setPromptLabOpen}
        agentName={activeAgent?.name}
        onPick={handlePromptPick}
      />

      {/* Work IQ bağlantı izinleri — TEK özet onay kutusu. Bot art arda birçok
          "Connect to continue" kartı gönderiyor; kullanıcı burada bir kez onay
          verince hepsini otomatik "Allow"luyoruz (aşağıdaki bekle-overlay). */}
      <AnimatePresence>
        {consentPrompt && (
          <motion.div
            key="consent-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-md overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl"
            >
              {/* marka aksan şeridi */}
              <div className="h-1.5 w-full bg-gradient-to-r from-brand-from via-brand-via to-brand-to" />
              <div className="p-7">
                <div className="flex items-start gap-3.5">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-from via-brand-via to-brand-to text-brand-on-brand shadow-sm">
                    <HugeiconsIcon icon={LinkSquare02Icon} className="size-6" strokeWidth={1.8} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-xl font-semibold text-foreground">
                      {t("chat.consent.title")}
                    </h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {t("chat.consent.subtitle")}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                  {t("chat.consent.body")}{" "}
                  <span className="font-medium text-foreground">{t("chat.consent.question")}</span>
                </p>
                <div className="mt-6 flex justify-end gap-2.5">
                  <Button variant="ghost" onClick={rejectConsent}>
                    {t("chat.consent.decline")}
                  </Button>
                  <Button
                    onClick={approveConsent}
                    className="bg-brand-fill-deep text-white shadow-sm hover:bg-brand-fill-deep hover:opacity-90"
                  >
                    {t("chat.consent.allow")}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Otomatik onaylanırken bekleme overlay'i */}
      <AnimatePresence>
        {consentWait && (
          <motion.div
            key="consent-wait"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/75 backdrop-blur-sm"
          >
            {/* ⚠️ İKİ DURUM, ÇÜNKÜ İKİ GÖRÜNÜM VAR. Küre dört durum
                konuşuyor ve orada doğru karşılık `thinking`; maskotun
                `syncing`i var ve burada olan şey tam olarak o — düşünmek
                değil, kullanıcı adına iki tarafın izinlerini karşılıklı
                kurmak.
                ⚠️ `expressive`: bu örtü asistanın yüzü değil bir DURUM
                göstergesi (aynı gerekçe kutulardaki küreler için de
                yazılı), o yüzden ifadeyi durumun kendisi seçiyor —
                stüdyoda "mutlu" seçmiş biri bekleme ekranında gülümsemez. */}
            <BrandOrb
              surface="chat"
              state="thinking"
              mascotState="syncing"
              expressive
              level={0.4}
              size={90}
            />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">{t("chat.consent.preparing")}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("chat.consent.preparingBody")}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
  )
}
