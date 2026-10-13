/**
 * Sohbetin ÖN-ISITMASI ve faz ölçümü.
 *
 * ─── NEDEN VAR ───────────────────────────────────────────────────────────
 *
 * `PersistentChat` sohbeti GÖRÜNÜR olana kadar mount etmiyor (App.jsx),
 * yani sohbete basana kadar hiçbir şey başlamıyor. Bastığın anda şunlar
 * SIRAYLA oluyor ve kullanıcı hepsini bekliyor:
 *
 *   1. Copilot SDK'sı indiriliyor      (177 KB, tembel import)
 *   2. Copilot Studio token'ı alınıyor (MSAL turu)
 *   3. `startConversation` → handshake + selamlama akışı
 *   4. Selamlama kartındaki ilk butonun otomatik gönderimi (tam bir tur)
 *   5. Kullanıcının mesajı — ki `conversationReadyRef` ile 1-4 bitene kadar
 *      BEKLİYOR (ChatScreen)
 *
 * Bu modül 1-3'ü VE MCP init'ini kullanıcı sohbete basmadan ÖNCE ödüyor.
 * 4 (selamlama kartının otomatik gönderimi) ChatScreen'de kalıyor: o turun
 * yanıtı ekranda GÖRÜNEN menü ve akış mantığı (geçici "informative"
 * adımlar, adaptive card'lar, aktivite izi) orada yaşıyor; buraya
 * kopyalamak iki yerde iki farklı sohbet akışı demek olurdu.
 *
 * ─── ISITMA NEDEN İŞE YARIYOR ────────────────────────────────────────────
 *
 * `resumeConversation` var olan bir konuşmaya HİÇ AĞ İSTEĞİ YAPMADAN
 * bağlanıyor (bkz. copilot.js). Yani ısıtılan konuşma, kullanıcı sohbeti
 * açtığında aynen devralınır — yeni bir handshake yapılmaz.
 *
 * ─── MCP INIT'İ NEDEN BİR TUR GEREKTİRİYOR (ÖLÇÜLDÜ) ────────────────────
 *
 * Copilot Studio activity trace'i (2026-08-29, canlı):
 *
 *   kullanıcı mesajı        …572806
 *   Initialize  sales-mcp   …574366   (+1,56 sn)
 *   Confirmation            …575412
 *   ToolsList               …576287
 *   Initialize  finance-mcp …577452   (+1,17 sn)
 *   Confirmation            …578347
 *   ToolsList               …579559
 *   ────────────────────────────────  mesajdan sona 6,75 sn
 *
 * Üç şey okundu ve üçü de bu dosyanın tasarımını belirliyor:
 *
 * 1. Her `DynamicServerInitialize`ın `replyToId`si KULLANICI MESAJININ
 *    id'si — `startConversation`ın değil. Yani el sıkışmayı ödemek bu
 *    maliyeti ÖDEMİYOR; init ancak orkestratöre giden bir tur olunca
 *    tetikleniyor. AŞAMA 3'ün var olma sebebi tam olarak budur.
 * 2. Soru bir GEMİ/ÖDEME sorusuydu ama sales VE finance sunucularının
 *    İKİSİ birden başlatıldı: Copilot Studio o turda hangi aracın
 *    gerekeceğine bakmadan bağlı TÜM MCP sunucularını ayağa kaldırıyor.
 *    Maliyet sunucu sayısıyla doğrusal (~2 sn/sunucu + ~1,2 sn geçiş).
 * 3. Sunucular SERİ başlatılıyor, paralel değil.
 *
 * Konuşma sıcak kaldığı sürece sonraki turlar hızlı (kullanıcı gözlemi).
 * Isıtma o ilk turu kullanıcıdan önce ödüyor.
 *
 * ─── ÖLÇÜM ÖNCE ──────────────────────────────────────────────────────────
 *
 * Hangi saniyenin nereye gittiği TAHMİN değil VERİ olsun diye her faz ayrı
 * ölçülüyor (`getWarmTimings`). Ölçmeden ısıtma tasarlamak, olmayan bir
 * darboğazı optimize etme riskiydi.
 *
 * ─── KAPSAM: KAPI ÇAĞIRANDA ──────────────────────────────────────────────
 *
 * Kapı ÇAĞIRANDA (`WarmStart`), burada değil: bu modül saf bir mekanizma,
 * kimin ısıtılacağı bir politika kararı (`warmStartPolicy.js`). Isıtma
 * herkes için doğruysa kapıyı kaldırmak tek satır.
 *
 * ⚠️ Bir zamanlar burada KİLİTLİ asistanların ısıtılmadığı yazılıydı: agent
 * kilidi 2026-09-10'da kaldırıldı, katalogda açık olan her asistan herkese
 * açık. Tek süzgeç kataloğun `active` bayrağı.
 */
import {
  loadSdk,
  prewarmToken,
  startConversation,
  sendMessage,
  readConversationId,
} from "@/lib/copilot"
import { WARM_START } from "@/lib/warmStartPolicy"
import { foldActivityStep, foldToolCall } from "@/lib/toolTracePolicy"

/** schemaName → { state, entry, error } */
const warm = new Map()
/** Faz süreleri (ms). Ölçüm sırası bozulmasın diye tek yerde. */
const timings = { sdkMs: null, tokenMs: null, byAgent: {} }
const listeners = new Set()

/**
 * Isıtma turunun beklenme tavanı. Ölçülen tur ~6,75 sn (iki MCP sunucusu);
 * daha fazla sunucu bağlanırsa uzar, o yüzden pay bırakıldı. Tavan bir
 * İPTAL değil, BEKLEMEYİ BIRAKMAdır — istek arka planda sürer.
 */
const WARM_TURN_TIMEOUT_MS = 30_000

/**
 * Isınma durumu — yeşil noktanın okuduğu tek kaynak.
 *
 *   cold    → bu asistan için canlı bir konuşma yok
 *   warming → konuşma kuruluyor
 *   ready   → CANLI bir konuşma var; bir sonraki mesaj el sıkışma ödemez
 *   failed  → denendi, olmadı (sessizce; sohbet yine de normal açılır)
 *
 * ⚠️ `ready` "devralınmayı bekleyen bir kayıt var" DEĞİL, "bu asistanın
 * konuşması CANLI" demektir. İlk sürümde ikisi aynı şeydi ve nokta
 * yapısal olarak görünmezdi: gösterge bestecide yaşıyor, besteci ancak
 * sohbet AÇILINCA çiziliyor, ChatScreen ise açılırken kaydı devralıp
 * SİLİYORDU — yani kullanıcı tam bakacağı anda durum `cold`a düşüyordu.
 * Aynı sebeple kayıtlı bir oturumdan devam eden konuşma da yeşil sayılır:
 * kullanıcı için ikisi aynı gerçek (el sıkışma ödenmeyecek), ve göstergenin
 * anlatması gereken şey bizim hangi yoldan geldiğimiz değil.
 */
export const WARM_COLD = "cold"
export const WARM_WARMING = "warming"
export const WARM_READY = "ready"
export const WARM_FAILED = "failed"

function emit() {
  for (const fn of listeners) {
    try {
      fn()
    } catch {
      /* bir dinleyicinin hatası ötekileri düşürmesin */
    }
  }
}

/** Yeşil noktanın abonesi. Dönüş değeri aboneliği bırakır. */
export function subscribeWarm(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getWarmState(schemaName) {
  if (!schemaName || schemaName === "agent-id") return WARM_COLD
  return warm.get(schemaName)?.state ?? WARM_COLD
}

/** Ölçülen faz süreleri — teşhis panelinin ve konsol dökümünün kaynağı. */
export function getWarmTimings() {
  return { ...timings, byAgent: { ...timings.byAgent } }
}

/**
 * AŞAMA 1 — taşıma katmanı. Ajanla KONUŞULMAZ.
 *
 * Yalnızca SDK modülü ve Copilot Studio erişim belirteci. Konuşma açılmaz,
 * tur harcanmaz, ajan geçmişine hiçbir şey yazılmaz — yani bu adımın
 * kullanıcıya görünen tek etkisi sohbetin daha hızlı açılması.
 *
 * Token SESSİZ alınır ve başarısızlık YUTULUR: `getToken()`in popup dalı
 * bilinçli olarak burada YOK. Kullanıcı bir düğmeye basmadan açılan bir
 * oturum penceresi, ısıtmanın kazandırdığı saniyelerden çok daha pahalıdır.
 */
let transportPromise = null
export function prewarmTransport() {
  transportPromise ??= (async () => {
    const t0 = performance.now()
    try {
      await loadSdk()
    } catch {
      transportPromise = null
      return false
    }
    timings.sdkMs = Math.round(performance.now() - t0)
    const t1 = performance.now()
    const ok = await prewarmToken()
    timings.tokenMs = ok ? Math.round(performance.now() - t1) : null
    emit()
    return ok
  })()
  return transportPromise
}

/**
 * AŞAMA 2 — konuşmayı kur ve selamlamayı sakla.
 *
 * Selamlama ekranda GÖSTERİLECEK bir mesaj, o yüzden atılmaz: ChatScreen
 * devraldığında aynen basar. Geçici ("informative") parçalar SAKLANMAZ —
 * onlar bir ilerleme anlatımı ve geçmişe ait bir anlatımı sonradan
 * göstermek yanıltıcı olurdu.
 *
 * Aynı agent için ikinci çağrı hiçbir şey yapmaz: konuşma açmak bir yan
 * etkidir ve iki kez açmak iki konuşma demektir.
 */
export function prewarmConversation(schemaName, { brief } = {}) {
  if (!schemaName || schemaName === "agent-id") return Promise.resolve(false)
  const existing = warm.get(schemaName)
  if (existing && existing.state !== WARM_FAILED) return existing.promise ?? Promise.resolve(true)

  // ⚠️ KAYIT ÖNCE, SÖZ SONRA. Async IIFE ilk `await`e kadar SENKRON
  // çalışıyor; kaydı sonra koymak, gövdenin `warm.get()` ile henüz var
  // olmayan bir kaydı okumasına dayanan sessiz bir yarış bırakırdı.
  // EL SIKIŞMA SÖZÜ — `awaitWarmConversation`ın beklediği şey artık turun
  // bitmesi değil, konuşmanın kurulması.
  let resolveHandshake
  const handshakePromise = new Promise((r) => {
    resolveHandshake = r
  })
  const rec = {
    state: WARM_WARMING,
    entry: null,
    error: null,
    promise: null,
    handshakePromise,
    // Beklemenin NEYİ bekleyeceğini bu belirliyor (bkz. awaitWarmConversation).
    hasBrief: !!brief,
  }
  warm.set(schemaName, rec)
  emit()

  // Isıtma turunun metni: gün özeti varsa onun sorusu, yoksa bugünkü hafif
  // ısıtma metni. Tampon YALNIZ özet varken kurulur — özet yoksa akış
  // bugünküyle birebir aynı kalır ve hiçbir şey saklanmaz.
  const prompt = brief?.question || WARM_START.warmPrompt
  const briefBuf = brief
    ? {
        question: brief.question,
        text: "",
        attachments: [],
        suggestedActions: [],
        activity: { received: false, steps: [], startedAt: Date.now() },
        state: "running",
        startedAt: Date.now(),
      }
    : null

  const run = (async () => {
    await prewarmTransport()
    const t0 = performance.now()
    const greeting = { text: "", attachments: [], suggestedActions: [] }
    try {
      for await (const chunk of startConversation(schemaName)) {
        if (chunk.done) {
          const client = chunk.client
          const conversationId = chunk.conversationId ?? readConversationId(client)
          const handshakeMs = Math.round(performance.now() - t0)
          timings.byAgent[schemaName] = { handshakeMs, warmTurnMs: null }

          // ── DEVİR KONUSU EL SIKIŞMADA HAZIR ──
          //
          // ⚠️ Bugüne kadar burası turun SONUNDAYDI ve kullanıcının tarif
          // ettiği senaryo — "girdi, on saniye sonra düğmeye bastı" — tam da
          // bu yüzden devralınAMIYORDU: ısıtma turu sahada medyan 16,5 sn,
          // ChatScreen'in bekleme tavanı 8 sn. Artık konuşma kurulur
          // kurulmaz devredilebilir.
          //
          // ⚠️ `rec.state` HÂLÂ `warming` ve bu DEĞİŞMEDİ. O bayrak "bu
          // konuşmaya ikinci bir tur gönderme" güvencesi (aksi hâlde Copilot
          // "Sohbet durduruldu" ile düşer); devralan taraf bu yüzden turu
          // beklemek için `turnPromise`ye zincirleniyor, bayrağa bakmıyor.
          const entry = {
            client,
            conversationId,
            greeting,
            // Gün özeti tamponu — yoksa `undefined` ve her brief dalı ölü kod.
            brief: briefBuf,
            // Uçuştaki ısıtma turunun kendisi. Devralan bunu bekler.
            turnPromise: null,
            // Rozetin ölçüsü. HER ZAMAN doldurulur — iki sayı, metin yok;
            // rozetin çizilip çizilmeyeceğine politika (`WARM_START.badge`)
            // ve ChatScreen karar verir, mekanizma değil.
            //
            // ⚠️ `warmTurnMs` NULL KALABİLİR: tur zaman aşımına uğradıysa
            // konuşma yine canlıdır ve devir hâlâ kazançtır, ama MCP'lerin
            // başlatılıp başlatılmadığını BİLMİYORUZ. Rozet o durumda süre
            // yazmaz — bilinmeyen bir sayıyı "0,0 sn" diye basmak, araç
            // izinde kaçındığımız yalanın aynısı olurdu.
            warm: { handshakeMs, warmTurnMs: null },
          }
          rec.entry = entry
          resolveHandshake()
          emit()

          // ── AŞAMA 3: ısıtma turu ──
          if (WARM_START.warmTurn && prompt) {
            const t1 = performance.now()
            const toolBuf = new Map()
            // ⚠️ CEVAP ARTIK HER ZAMAN ÇÖPE GİTMİYOR. Özet yoksa bugünkü
            // davranış aynen sürer (parça okunur, atılır); özet varsa aynı
            // akış bir tampona katlanır ve katlama kuralı selamlamanınkiyle
            // ve canlı akışınkiyle BİREBİR aynıdır: balon her parçayla
            // DEĞİŞTİRİLİR (bkz. CLAUDE.md, "Akan metin"). Buraya ikinci bir
            // birleştirme kuralı yazmak iki uygulamayı ayrıştırır.
            //
            // Akış SONUNA KADAR tüketilir: yarıda bırakmak konuşmayı yarım
            // turla bırakırdı.
            const drain = (async () => {
              for await (const chunk of sendMessage(client, prompt)) {
                if (!briefBuf) continue
                if (chunk.tool) {
                  const step = foldToolCall(toolBuf, chunk.tool)
                  if (step?.kind === "running") {
                    briefBuf.activity = {
                      ...briefBuf.activity,
                      received: true,
                      running: step.label,
                    }
                  } else if (step?.kind === "done") {
                    briefBuf.activity = foldActivityStep(
                      { ...briefBuf.activity, running: null },
                      step.label,
                      briefBuf.startedAt,
                    )
                  }
                  emit()
                  continue
                }
                if (chunk.transient) {
                  briefBuf.activity = foldActivityStep(
                    briefBuf.activity,
                    chunk.text,
                    briefBuf.startedAt,
                  )
                  emit()
                  continue
                }
                briefBuf.activity = { ...briefBuf.activity, received: true }
                briefBuf.text = chunk.text
                if (chunk.attachments?.length) briefBuf.attachments = chunk.attachments
                if (chunk.suggestedActions?.length)
                  briefBuf.suggestedActions = chunk.suggestedActions
                emit()
              }
            })()
            entry.turnPromise = drain
            // ⚠️ Kendi tutamağı ŞART: aşağıdaki yarış zaman aşımıyla
            // biterse `drain`in sonraki reddi sahipsiz kalır ("unhandled
            // rejection"). Bugün de öyleydi; tampon eklenince görünür oldu.
            drain
              .then(
                () => {
                  if (briefBuf) briefBuf.state = "done"
                },
                () => {
                  if (briefBuf) briefBuf.state = "failed"
                },
              )
              .finally(emit)
            try {
              // ⚠️ ZAMAN AŞIMI ŞART: akış asılı kalırsa (`client.ts`te
              // AbortSignal yok, uçmuş bir istek gerçekten iptal edilemiyor)
              // kayıt sonsuza dek `warming`de kalırdı. Süre dolunca turu
              // BEKLEMEYİ bırakırız; tampon arkada dolmaya devam eder ve
              // devir artık `entry`ye baktığı için bu tavandan etkilenmez.
              await Promise.race([
                drain,
                new Promise((_, reject) =>
                  setTimeout(() => reject(new Error("warm turn timeout")), WARM_TURN_TIMEOUT_MS),
                ),
              ])
              entry.warm.warmTurnMs = Math.round(performance.now() - t1)
              timings.byAgent[schemaName].warmTurnMs = entry.warm.warmTurnMs
            } catch (err) {
              // Tur düştü ama KONUŞMA CANLI: el sıkışma ödendi ve devir hâlâ
              // kazanç. `warmTurnMs` null kalır, yani ölçüm turun
              // tamamlanmadığını söyler — dot "canlı" der, "MCP hazır" demez.
              console.debug("[warmStart] warm turn failed:", err)
            }
          }

          rec.state = WARM_READY
          emit()
          return true
        }
        if (chunk.transient) continue
        // Kural ChatScreen'deki canlı akışla ve tyrotrade ile AYNI: balon her
        // parçayla DEĞİŞTİRİLİR (bkz. CLAUDE.md, "Akan metin"). Buraya ayrı
        // bir birleştirme kuralı yazmak iki uygulamayı ayrıştırır.
        greeting.text = chunk.text
        if (chunk.attachments?.length) greeting.attachments = chunk.attachments
        if (chunk.suggestedActions?.length) greeting.suggestedActions = chunk.suggestedActions
      }
      // Akış `done` görmeden bitti: elde devralınacak bir client yok.
      throw new Error("startConversation ended without a client")
    } catch (err) {
      rec.state = WARM_FAILED
      rec.error = err
      // ⚠️ Söz BURADA da çözülür: çözülmezse `awaitWarmConversation`
      // devralacak hiçbir şey olmadığı hâlde tavanı sonuna kadar bekler ve
      // kullanıcı boşuna 8 saniye bakar.
      resolveHandshake()
      // Sessiz: ısıtma bir HIZLANDIRMA, bir özellik değil. Başarısızlığı
      // kullanıcıya söylemek, hiç olmayan bir şeyin bozulduğunu söylemektir;
      // sohbet açıldığında normal yolundan kurulur.
      console.debug("[warmStart] prewarm failed:", err)
      emit()
      return false
    }
  })()

  rec.promise = run
  return run
}

/**
 * Isıtılmış konuşmayı DEVRAL — okur ve kaydı düşürür.
 *
 * Tek seferlik: aynı client'ı iki ChatScreen örneğine vermek, ikisinin aynı
 * konuşmaya çakışan tur göndermesi demek olurdu (ChatScreen'in `gen`
 * muhafızının tam olarak önlediği şey).
 */
/**
 * Gün özeti tamponuna TÜKETMEDEN bak.
 *
 * İki okuyucusu var ve ikisi de devralmadan ÖNCE karar vermek zorunda:
 * `ChatScreen` "kayıtlı oturumu mu süreceğim yoksa özetli konuşmayı mı
 * alacağım" diye soruyor, sidebar rozeti ise "bekleyen bir özet var mı".
 * `takeWarmConversation` bu iş için kullanılamaz — o okurken DÜŞÜRÜYOR.
 */
export function peekWarmBrief(schemaName) {
  if (!schemaName || schemaName === "agent-id") return null
  return warm.get(schemaName)?.entry?.brief ?? null
}

/**
 * Devralınmamış gün özeti sayısı — sidebar'daki "1" rozetinin tek kaynağı.
 *
 * ⚠️ `chatBus`ın okunmamış CEVAP sayacına yazılmadı, bilerek: o sayaç
 * "kullanıcının sorduğu bir soruya cevap düştü" demek ve özet henüz
 * sorulmuş bir soru değil — düğmeye basılmadı. İki olguyu tek sayaca
 * toplamak, rozeti temizleyen bir okumanın ötekini de sessizce
 * temizlemesine yol açardı. Rozet aynı yerde çiziliyor çünkü kullanıcı için
 * anlam aynı ("sohbette seni bekleyen bir şey var"); kaynak ayrı.
 */
export function getPendingBriefCount(maxAgeMs = Infinity) {
  let n = 0
  for (const rec of warm.values()) {
    const b = rec.entry?.brief
    // ⚠️ TAZELİK BURADA DA SORULUR. Rozet, basılabilir bir özet varken
    // yanmalı: tampon tazelik tavanını aştıysa ChatScreen onu zaten
    // BASMAYACAK (soruyu canlı gönderecek), yani yanan bir rozet
    // "seni bekleyen hazır bir şey var" diye yalan söylerdi.
    if (b && Date.now() - b.startedAt <= maxAgeMs) n += 1
  }
  return n
}

function grabWarmEntry(schemaName) {
  const rec = warm.get(schemaName)
  if (!rec || !rec.entry) return null
  // ⚠️ İKİ FARKLI KAPI, ve fark özelliğin kendisi.
  //
  // Gün özeti YOKKEN bugünkü katı kural aynen geçerli: tur bitmeden
  // devretme, yoksa aynı konuşmaya ikinci bir tur gider.
  //
  // Özet VARKEN devralan taraf turu `turnPromise` ile bekliyor ve akan
  // metni ekrana basıyor — yani ikinci tur riski yok, kazanç ise tam da
  // beklemenin kendisi: kullanıcı cevabın oluşmasını izliyor.
  if (!rec.entry.brief && rec.state !== WARM_READY) return null
  const entry = rec.entry
  rec.entry = null
  emit()
  return entry
}

export function takeWarmConversation(schemaName) {
  const rec = warm.get(schemaName)
  if (!rec || rec.state !== WARM_READY || !rec.entry) return null
  // Kayıt SİLİNMEZ, yalnız devir konusu boşaltılır: konuşma devralındıktan
  // sonra da CANLIdır ve gösterge bunu söylemeye devam etmeli. Silmek,
  // noktanın tam bakılacağı anda sönmesi demekti.
  const entry = rec.entry
  rec.entry = null
  emit()
  return entry
}

/**
 * ISITMA SÜRERKEN AÇILAN SOHBET İÇİN SINIRLI BEKLEME.
 *
 * ⚠️ SAHADA ÖLÇÜLMÜŞ HATA (tyrotrade, 2026-09-08, 64 konuşma / 115 tur):
 * ısıtma turu medyan 16,5 sn sürüyor ve kayıt o süre boyunca `warming`;
 * `takeWarmConversation` bu durumda `null` döndüğü için ChatScreen SIFIRDAN
 * yeni bir konuşma kuruyordu. Sonuç: hem ısıtma çöpe gidiyor hem kullanıcı
 * MCP başlatmasını (~8 sn) yeniden ödüyordu — o gün 27 ısıtmanın yalnız
 * 1'i devralınmıştı.
 *
 * Bu yüzden ısınma SÜRÜYORSA kısa bir süre beklenir. Bekleme TAVANLI ve
 * kısa: ısınma bitmek üzereyse devralmak her zaman kârlı, ama uzun bir
 * beklemenin sonunda sıfırdan kurmak zorunda kalmak, kullanıcıyı iki kez
 * bekletmek olurdu.
 *
 * `null` dönerse çağıran bugünkü yolunu izler — yani bu fonksiyon hiçbir
 * durumda akışı KIRMAZ.
 */
export async function awaitWarmConversation(schemaName, timeoutMs) {
  const ready = grabWarmEntry(schemaName)
  if (ready) return ready
  const rec = warm.get(schemaName)
  if (!rec || rec.state !== WARM_WARMING) return null
  // ⚠️ TAVANIN ANLAMI ÖZETLE BİRLİKTE DEĞİŞTİ, sayısı değil. Özet yokken
  // beklenen şey bugünkü gibi TURUN BİTMESİ (`rec.promise`); özet varken EL
  // SIKIŞMANIN bitmesi yeterli, çünkü tur zaten ekranda akacak. Isıtma turu
  // medyan 16,5 sn, tavan 8 sn — bu ayrım olmasa özet hiçbir zaman
  // devralınamazdı.
  const wait = rec.hasBrief ? rec.handshakePromise : rec.promise
  if (!wait) return null
  await Promise.race([wait, new Promise((r) => setTimeout(r, timeoutMs))])
  return grabWarmEntry(schemaName)
}

/**
 * "Bu asistanın konuşması artık canlı" — ChatScreen bildirir.
 *
 * Üç yoldan da çağrılır (ısıtılmışı devralma · kayıtlı oturumu sürdürme ·
 * sıfırdan kurma), çünkü kullanıcı için üçü aynı sonuç. Isıtma HİÇ
 * çalışmamış olsa bile (ör. kayıtlı oturum vardı, ısıtma bilinçli olarak
 * atlandı) gösterge doğruyu söylemek zorunda.
 */
export function markConversationLive(schemaName) {
  if (!schemaName || schemaName === "agent-id") return
  const rec = warm.get(schemaName)
  if (rec) {
    if (rec.state === WARM_READY) return
    rec.state = WARM_READY
  } else {
    warm.set(schemaName, { state: WARM_READY, entry: null, error: null, promise: null })
  }
  emit()
}

/**
 * Konuşma öldü/sıfırlandı — gösterge yalan söylemesin.
 *
 * `initConversation`ın BAŞINDA çağrılır: o noktada eski konuşma bırakılmış,
 * yenisi henüz kurulmamıştır ve arada yanan yeşil bir nokta, ödenmemiş bir
 * el sıkışmayı ödenmiş gibi gösterirdi.
 */
export function markConversationCold(schemaName) {
  if (!schemaName) return
  const rec = warm.get(schemaName)
  if (!rec) return
  // Isıtma HÂLÂ sürüyorsa dokunma: onun kendi sözü var ve bitince kendi
  // durumunu yazacak.
  if (rec.state === WARM_WARMING) return
  // ⚠️ DEVRALINMAMIŞ BİR ISITMAYI SİLME — bu satır olmadan özellik HİÇ
  // çalışmıyordu. `initConversation` en başta bu fonksiyonu çağırıyor;
  // ısınma bitmişse (READY + entry) kayıt siliniyor ve birkaç satır sonraki
  // `takeWarmConversation` boş dönüyordu, yani ISITMA TAM DA BAŞARILI
  // OLDUĞUNDA çöpe gidiyordu. Hata görünmüyordu çünkü sıfırdan kurulan
  // konuşma `markConversationLive` ile noktayı yine yeşile çeviriyor.
  //
  // Kural: `entry` duruyorsa o konuşma HÂLÂ canlı ve HÂLÂ devralınabilir;
  // "soğuk" bilgisi ChatScreen'in bıraktığı konuşmaya aittir, ısıtılana
  // değil.
  if (rec.entry) return
  warm.delete(schemaName)
  emit()
}

/** Çıkışta her şey düşer: konuşma kimliği ve client başka bir kullanıcıya
 *  devredilemez. `msal.js`'in LOGOUT zincirinden çağrılır. */
export function clearWarmCache() {
  warm.clear()
  transportPromise = null
  timings.sdkMs = null
  timings.tokenMs = null
  timings.byAgent = {}
  emit()
}
