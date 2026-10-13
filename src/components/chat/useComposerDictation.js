import { useEffect, useRef, useState } from "react"
import { useMicrophone } from "voice-glow"
import { useVoiceBeamColors } from "@/hooks/useVoiceBeam"
import { useIsBrave } from "@/hooks/useIsBrave"
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition"
import { bcp47 } from "@/lib/intl-cache"
import { notify } from "@/lib/notify"

/**
 * Sesle yazdırma + SES HÜZMESİ (dikte sırasında bestecinin altında yanan ışık).
 * Web Speech API sarmalayıcısı `value`yu hiç değiştirmez — yalnız geri çağırır;
 * metin kutusunun durumu bestecide, kesinleşen parçalar burada eklenir.
 *
 * ⚠️ **İKİNCİ BİR MİKROFON AKIŞI, ve bilinçli.** `useSpeechRecognition` Web
 * Speech API'si üzerinden çalışıyor ve bir MediaStream VERMİYOR — yalnız metin.
 * Hüzmenin sese gerçekten tepki vermesi için ayrı bir `getUserMedia` şart.
 * Seviyeyi metinden uydurmak, "sese tepki veriyor" diye gösterilen ama sesi
 * hiç duymayan bir ışık olurdu.
 * ⚠️ Akış SADECE dikte sürerken açık: mikrofon göstergesi (tarayıcının kendi
 * kırmızı noktası) dikte bitince sönmeli. `stop()` bütün track'leri kapatıyor.
 * ⚠️ Başarısız olursa hiçbir şey kırılmıyor: `stream` null kalır, hüzme kendi
 * sakin nefesini çizer, dikte çalışmaya devam eder. İzin reddi için AYRI bir
 * uyarı YOK — çalışan bir şeyi bozuk göstermek olurdu.
 *
 * ⚠️ **BRAVE'DE SESLİ YAZDIRMA ÇALIŞMIYOR ve özellik algılaması bunu
 * söylemiyor.** Brave Chromium tabanlı, yani `webkitSpeechRecognition` var ve
 * `isSupported` true; ama arkadaki Google konuşma servisinin anahtarını
 * çıkardığı için her deneme `network` hatasıyla düşer ve kullanıcı bağlantısı
 * sağlamken "internet bağlantınızı kontrol edin" görür. Düğme baştan
 * "desteklenmiyor" hâlinde; tıklayan kişi sebebini söyleyen bir bildirim alır.
 */
export function useComposerDictation({ t, locale, value, onChange, taRef, disabled, onMicToggle }) {
  // Mirror controlled value into a ref so dictate's onResult can read the
  // latest text without forcing the recognizer to re-create on each keystroke.
  const valueRef = useRef(value)
  useEffect(() => {
    valueRef.current = value
  }, [value])

  const unsupportedToastShownRef = useRef(false)
  const isBrave = useIsBrave()
  const beamMic = useMicrophone()
  // Bu tur SESLE mi başladı? Hüzmenin `processing` hâli (dikte bitti,
  // asistan çalışıyor) yalnız o zaman yanmalı — klavyeyle yazılan her
  // mesajda ışık yakmak, sesle ilgisi olmayan bir yerde ses göstergesi olurdu.
  const [voiceTurn, setVoiceTurn] = useState(false)
  const beamColors = useVoiceBeamColors()

  const speech = useSpeechRecognition({
    lang: bcp47(locale),
    continuous: true,
    interimResults: true,
    onResult: ({ final, isFinal }) => {
      if (!isFinal || !final) return
      const prev = valueRef.current ?? ""
      const sep = prev.length === 0 || /\s$/.test(prev) ? "" : " "
      const next = prev + sep + final
      onChange?.(next)
      // Restore caret to end so further typing appends naturally. Skip on
      // touch — re-focusing fights the iOS soft-keyboard composition.
      if (typeof window !== "undefined" && window.matchMedia?.("(pointer: fine)").matches) {
        requestAnimationFrame(() => {
          const ta = taRef.current
          if (!ta) return
          ta.focus()
          ta.setSelectionRange(next.length, next.length)
        })
      }
    },
    onError: (code) => {
      // user-initiated stop → silent
      if (code === "aborted") return
      const keyMap = {
        "not-allowed": "chat.mic.error.permission",
        "no-speech": "chat.mic.error.noSpeech",
        "audio-capture": "chat.mic.error.noMic",
        network: "chat.mic.error.network",
        "language-not-supported": "chat.mic.error.lang",
        "not-supported": "chat.mic.error.unsupported",
      }
      const key = keyMap[code] || "chat.mic.error.unknown"
      // no-speech is informational — natural pauses; everything else is error-level.
      if (code === "no-speech") notify.info(t(key))
      else notify.error(t(key))
    },
  })

  // Mikrofon gerçekten kullanılabilir mi: motor var VE tarayıcı onu
  // besleyen servisi kapatmıyor.
  const micUsable = speech.isSupported && !isBrave

  function toggle() {
    if (!micUsable) {
      if (!unsupportedToastShownRef.current) {
        notify.error(t(isBrave ? "chat.mic.error.brave" : "chat.mic.error.unsupported"))
        unsupportedToastShownRef.current = true
      }
      return
    }
    // Tell the parent what the NEXT listening state is, synchronously, so
    // it can flip the orb (or any other UI) without subscribing to the
    // recognizer's onstart/onend events. Engine async start is fine — the
    // parent gets a clean boolean to mirror.
    const nextListening = !speech.isListening
    if (nextListening) {
      speech.start()
      setVoiceTurn(true)
      // ⚠️ TIKLAMANIN İÇİNDE çağrılmak zorunda: Safari mikrofonu yalnız bir
      // kullanıcı jestinin içinde açıyor. Sözü beklemiyoruz — dikte akışı
      // izin turuna takılmamalı.
      beamMic.start?.()
    } else {
      speech.stop()
      beamMic.stop?.()
    }
    onMicToggle?.(nextListening)
  }

  // Abort recognition if the composer becomes disabled (orb thinking)
  // so a late final doesn't land in a textarea the user can't see.
  useEffect(() => {
    if (disabled && speech.isListening) {
      speech.abort()
      beamMic.stop?.()
    }
  }, [disabled, speech, beamMic])

  /** Gönderimde dikteyi kapatır. */
  function endForSend() {
    // Dikte edilmeden gönderilen bir mesaj sesli tur DEĞİLDİR: işaret burada
    // düşer, yoksa bir kez dikte eden kullanıcıda hüzme her cevapta yanardı.
    if (!speech.isListening) setVoiceTurn(false)
    // Drop any in-flight dictate interim — a delayed final after the
    // textarea has been cleared by the parent would otherwise land in
    // the fresh empty composer.
    if (speech.isListening) speech.abort()
    beamMic.stop?.()
  }

  return {
    speech,
    micUsable,
    beamColors,
    // Hüzmenin girdisi: akış yalnız dikte sürerken (açık kalsa ortam sesine
    // tepki vermeye devam ederdi); `processing` yalnız sesli turun cevabında.
    beamStream: speech.isListening ? beamMic.stream : null,
    beamProcessing: !!disabled && voiceTurn,
    toggle,
    endForSend,
  }
}
