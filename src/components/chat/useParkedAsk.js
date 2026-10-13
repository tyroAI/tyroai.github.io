import { useEffect, useRef, useState } from "react"
import { onOpenChat, takePendingAsk, takePendingFiles } from "@/lib/chatBus"
import { sameCatalogName } from "@/lib/agentName"
import { asAttachments } from "./composerFiles"
import { openParkedTemplate } from "./openParkedTemplate"

// Katalogda HİÇ görünmeyen bir asistan (katalogda adı değişmiş, /settings'te
// gizlenmiş) sonsuza kadar bekletirdi; o yüzden kısa bir son tarih var ve
// sonrasında soru sessizce ölmek yerine mevcut asistana düşer.
const AGENT_WAIT_MS = 5000

/**
 * BAŞKA BİR YÜZEYDEN PARK EDİLMİŞ SORU. Header'ın posta / takvim / dosya
 * panelleri, Anasayfa'nın soru kutusu ve hazır istemleri, gün özeti düğmesi
 * soruyu otobüse park ediyor (bkz. lib/chatBus): gönder'e basıldığında sohbet
 * henüz ekranda olmayabilir ve boş odaya atılan bir olay kaybolur. Ekrana gelir
 * gelmez soru alınır ve GERÇEKTEN gönderilir — paneli açıp soruyu sessizce
 * düşürmek en kötü sonuç olurdu. `takePendingAsk` okurken siliyor, yani en
 * fazla bir kez ateşlenebilir.
 *
 * ALANLI HAZIR SORU (`template`) gönderilmez: asistan aynı çözücüyle seçilir, sonra bestecide
 * şablon açılır (`openParkedTemplate`). Soruyla bırakılan dosyalar (`setPendingFiles`, Self
 * Servis masraf formunun fişleri) soruyla birlikte alınır ve ek olarak gider.
 *
 * Park edilmiş soru, DOĞRU asistan belli olana kadar bekler. Tüketim ile
 * salıverme ayrı: adı verilen asistanın kilit durumu soru geldiğinde henüz
 * oturmamış olabiliyor — taze bir sayfa yüklenişinde Entra yönetici zinciri
 * sorgusu birkaç saniye sürüyor ve o pencerede kısıtlı asistanlar kilitli
 * okunuyor. Hemen çözmek soruyu en son seçili asistana gönderirdi.
 *
 * ── GÜN ÖZETİ ──
 * `briefIntentRef`: kullanıcı HANGİ pencerenin özeti için düğmeye bastı
 * ("YYYY-AA-GG:morning"). `briefAdoptedRef`: o özet bu mount'ta EKRANA BASILDI
 * mı. İkisi ayrı, çünkü aralarında init'in tamamı var: niyet park tüketiminde
 * yazılıyor, basım init'in devralma dalında oluyor ve salıverme ikisinin
 * arasında "soruyu canlı göndereyim mi" diye soruyor. Ref, state DEĞİL: render'ı
 * etkilemiyorlar; mount başına yeterli (`PersistentChat` oturum boyunca mount).
 *
 * ⚠️ **ÖZET SORUSU HEMEN GÖRÜNÜR** (`briefPending`). Soru, devralma kararı
 * verilene (init bitene) kadar gönderilmiyor ve bu el sıkışma + ısıtma
 * beklemesi kadar sürüyor; o arada boş bir sohbet "tıkladım, hiçbir şey
 * olmuyor" diye okunuyordu. Bekleyen balon, gerçeği (devralınan ya da canlı
 * gönderilen) çizildiği anda kalkar.
 */
export function useParkedAsk({
  onScreen,
  agents,
  catalogSettled,
  agent,
  setAgent,
  conversationReadyRef,
  sendRef,
}) {
  const parkedAskRef = useRef(null)
  const [askTick, setAskTick] = useState(0)
  const briefIntentRef = useRef(null)
  const briefAdoptedRef = useRef(null)
  const [briefPending, setBriefPending] = useState(null)

  // Sohbet ZATEN ekrandaysa da bir tüketim sinyali gerekiyor: o durumda
  // `onScreen` hiç değişmez ve yalnızca ona bağlı bir effect soruyu bir
  // sonraki geçişe kadar otobüste bırakır.
  useEffect(() => onOpenChat(() => setAskTick((n) => n + 1)), [])

  useEffect(() => {
    if (!onScreen) return
    const pending = takePendingAsk()
    if (!pending) return
    const files = takePendingFiles()
    const text = pending.context ? `${pending.context}: ${pending.question}` : pending.question
    parkedAskRef.current = {
      text,
      // AD olarak tutulur, her salıverme denemesinde yeniden çözülür.
      agentName: pending.agent ?? null,
      // Katalog beklemesinin son tarihi buradan hesaplanır (bkz. çözücü).
      parkedAt: Date.now(),
      // Gün özeti bu kanaldan geçiyor (bkz. dailyBriefPolicy.js).
      kind: pending.kind ?? null,
      windowId: pending.windowId ?? null,
      template: pending.template ?? null,
      files,
    }
    if (pending.kind === "brief" && pending.windowId) {
      // Niyet init'ten ÖNCE yazılmalı: init "kayıtlı oturumu mu süreyim,
      // özetli konuşmayı mı alayım" kararını buna bakarak veriyor.
      briefIntentRef.current = pending.windowId
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBriefPending({ text, time: new Date() })
    }
    // Asıl iş yukarıdaki tüketim; bu render dürtmesi, başka bir bağımlılığı
    // kımıldamamışken çözücü effect'in de çalışmasını sağlıyor.
    setAskTick((n) => n + 1)
  }, [onScreen, askTick])

  // Çöz + salıver. `agents` de bağımlılık: katalog ASENKRON geliyor
  // (Dataverse turu) ve liste dolduğunda bu effect yeniden çalışıp park
  // edilmiş soruyu doğru asistana taşıyor.
  useEffect(() => {
    const parked = parkedAskRef.current
    if (!parked || !onScreen) return

    let targetId = null
    if (parked.agentName) {
      // Yüzeyler adı marka önekiyle park ediyor ("tyro office"), katalog
      // öneksiz yazıyor ("Office"): ikisi aynı anahtara iner.
      const found = agents.find((a) => sameCatalogName(a.name, parked.agentName))
      if (found) {
        targetId = found.id
      } else if (!catalogSettled && Date.now() - parked.parkedAt < AGENT_WAIT_MS) {
        // ⚠️ ADI GEÇEN ASİSTAN HENÜZ LİSTEDE OLMAYABİLİR. Katalog Dataverse
        // turuyla geliyor; `agents` o gelene kadar tohum satırlarını taşıyor.
        // Hemen mevcut asistana düşmek, soruyu YANLIŞ asistana göndermek
        // demekti — ve kullanıcı bunu ancak cevabın konusu tutmayınca
        // anlıyor. Kısa süre bekleyip yeniden bakıyoruz.
        const retry = setTimeout(() => setAskTick((n) => n + 1), 400)
        return () => clearTimeout(retry)
      }
      // Son tarihten sonra hâlâ yoksa mevcut asistan yanıtlar.
      //
      // ⚠️ KATALOG SON HÂLİNDEYSE HİÇ BEKLENMEZ (`catalogSettled`): bekleme yalnız katalog
      // YÜKLENİRKEN anlamlı; yüklendiyse bulunamayan ad bir daha gelmeyecek ve her hazır
      // soru boşuna beş saniye öderdi (balon `handleSend`te hemen çiziliyor).
      if (!found) {
        console.warn(
          `[chat] "${parked.agentName}" adlı asistan katalogda yok; soru mevcut asistana gidiyor`,
        )
      }
    }

    if (targetId && targetId !== agent) {
      // Tek seferlik geçiş; park aşağıda tam bir kez tüketiliyor.
      setAgent(targetId)
      return
    }

    // Park, zamanlayıcı KURULURKEN değil İÇİNDE temizleniyor: StrictMode bu
    // effect'i araya bir cleanup koyarak iki kez çalıştırıyor ve erken
    // temizlemek, birinci turun parkı tüketip zamanlayıcısının iptal
    // edilmesine, ikinci turun ise gönderecek bir şey bulamamasına yol
    // açardı. Böylece iptal edilen zamanlayıcı parkı yerinde bırakır ve
    // kimlik kontrolü çifte gönderimi engeller.
    const id = setTimeout(async () => {
      if (parkedAskRef.current !== parked) return
      parkedAskRef.current = null
      if (parked.template) {
        openParkedTemplate(parked.template, conversationReadyRef)
        return
      }
      if (parked.kind !== "brief") {
        sendRef.current?.(asAttachments(parked.files), parked.text)
        return
      }
      // ⚠️ GÜN ÖZETİ İKİ KEZ SORULMAZ. Özet ısıtılmış konuşmadan ekrana
      // basıldıysa aynı soruyu bir de canlı göndermek, kullanıcıya aynı
      // cevabı iki kez yazdırır ve ikinci turu da faturalar. Kararı init
      // veriyor, o yüzden ÖNCE onu bekliyoruz; basılmadıysa (ısıtma
      // olmamış, tampon bayatlamış, tur düşmüş) soru canlı gider — yani
      // özellik kapalıyken de düğme çalışır.
      try {
        await conversationReadyRef.current
        if (briefAdoptedRef.current !== parked.windowId) sendRef.current?.([], parked.text)
      } finally {
        // `handleSend` balonunu eşzamanlı ekliyor: bekleyen balon aynı çizimde
        // gerçeğine devreder. Niyet karşılandı — sonraki init'ler (asistan
        // değişimi) özet beklemesin.
        setBriefPending(null)
        briefIntentRef.current = null
      }
    }, 0)
    return () => clearTimeout(id)
  }, [agent, agents, onScreen, askTick, catalogSettled, setAgent, conversationReadyRef, sendRef])

  return { briefIntentRef, briefAdoptedRef, briefPending, setBriefPending }
}
