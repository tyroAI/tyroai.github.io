import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { onOpenChat, requestFocusComposer } from "@/lib/chatBus"

// Dibe bu kadar yakınsa kullanıcı "son mesajda" sayılır ve yeni mesajda otomatik
// kaydırılır; uzaktaysa "↓ N yeni" hapı gösterilir.
const NEAR_BOTTOM_THRESHOLD_PX = 120

/**
 * Sohbet dökümünün kaydırma davranışı: dibe yapışma, okunmamış sayacı, içerik ve
 * kaydırıcı yükseklik değişimlerinde dipte kalma, sohbet yeniden görününce dibe inme.
 */
export function useChatScroll({ messages, onScreen }) {
  const [isNearBottom, setIsNearBottom] = useState(true)
  const [unread, setUnread] = useState(0)
  const scrollRef = useRef(null)

  // isNearBottom'u ref'te de tut: ResizeObserver geri-çağrısı bunu yeniden
  // abone olmadan okuyabilsin.
  const isNearBottomRef = useRef(true)
  useEffect(() => {
    isNearBottomRef.current = isNearBottom
  }, [isNearBottom])

  // İçerik yüksekliği değiştikçe (Adaptive Card'lar DOM'a ASENKRON eklenir,
  // "yazıyor" → metin geçişi yüksekliği büyütür) dibe sabit kal. Tek seferlik
  // messages-effect scroll'u kart render'ından önce çalıştığı için yetmiyordu.
  //
  // KRİTİK: content node'u sabit `[]` bağımlılıklı bir effect ile DEĞİL,
  // CALLBACK ref ile gözlüyoruz. Boş-durum (orb karşılama) ekranında scroller
  // ve content DOM'da YOK; greeting + menü kartı gelip isEmpty false olunca
  // chat layout MOUNT olur. `[]` effect yalnızca ilk mount'ta (o an refler
  // null iken) çalıştığı için ResizeObserver hiç kurulmuyordu → ilk konuşmada
  // asenkron büyüyen Adaptive Card'lar dibe çekmiyordu (özellikle mobil/PWA'da
  // kart viewport'tan uzun olunca dibi composer'ın altında kalıyordu). Callback
  // ref node tam mount olunca tetiklenir ve her reset→boş→dolu döngüsünde
  // observer'ı yeniden bağlar.
  const contentRef = useRef(null)
  const resizeObsRef = useRef(null)
  const attachContentRef = useCallback((node) => {
    contentRef.current = node
    if (resizeObsRef.current) {
      resizeObsRef.current.disconnect()
      resizeObsRef.current = null
    }
    if (node && typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => {
        // scroller'ı tembel oku: callback ref child (content) parent
        // (scroller) ref'inden ÖNCE bağlanabilir; RO ateşlendiğinde ikisi de hazır.
        const scroller = scrollRef.current
        if (scroller && isNearBottomRef.current) scroller.scrollTop = scroller.scrollHeight
      })
      ro.observe(node)
      resizeObsRef.current = ro
    }
  }, [])

  // Kaydırıcının KENDİ yüksekliği değişince de dibe sabit kal.
  //
  // Yukarıdaki observer İÇERİĞİ gözlüyor, ve klavye açılınca içerik
  // BÜYÜMÜYOR — görünen alan KISALIYOR. `scrollTop` olduğu yerde kaldığı
  // için son mesaj bestecinin arkasına giriyor: ekranda cevabın ortasından
  // kesilmiş bir balon ve bestecinin altında boş bir şerit kalıyor (kurulu
  // PWA'da görüldü). Kaydırıcıyı da gözlemek klavyeyi, panelin yeniden
  // boyutlanmasını ve rıhtımın genişlik değişimini bir kuralla kapatıyor.
  const scrollerObsRef = useRef(null)
  const attachScrollRef = useCallback((node) => {
    scrollRef.current = node
    if (scrollerObsRef.current) {
      scrollerObsRef.current.disconnect()
      scrollerObsRef.current = null
    }
    if (node && typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => {
        if (isNearBottomRef.current) node.scrollTop = node.scrollHeight
      })
      ro.observe(node)
      scrollerObsRef.current = ro
    }
  }, [])

  // Auto-scroll trap: snap to bottom if the user was already near it; else
  // surface a "new message" pill. We track everything in refs to avoid
  // setState inside a layout effect (cascading-render risk). The pill's
  // displayed count is derived from messages.length - lastSeenLengthRef.
  const lastSeenLengthRef = useRef(messages.length)
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (isNearBottom) {
      el.scrollTop = el.scrollHeight
      lastSeenLengthRef.current = messages.length
      if (unread !== 0) setUnread(0) // eslint-disable-line react-hooks/set-state-in-effect
    } else if (messages.length > 0) {
      const last = messages[messages.length - 1]
      // Don't count user's own message as "unread" — the user just sent it.
      if (last?.role !== "user") {
        const next = messages.length - lastSeenLengthRef.current
        if (next !== unread) setUnread(next)
      } else {
        lastSeenLengthRef.current = messages.length
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages])

  // Sohbet yeniden ekrana gelince (başka sayfadan dönüş / bildirime tıklama)
  // en alta çek: yokken gelen yanıt listenin dibindedir ve gizliyken (display:
  // none) scrollHeight 0 olduğu için otomatik kaydırma iş görmez.
  useEffect(() => {
    if (!onScreen) return
    const el = scrollRef.current
    if (!el || !isNearBottomRef.current) return
    // İki kare bekle: display:none → contents geçişinde layout ilk karede
    // henüz ölçülmemiş oluyor.
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const node = scrollRef.current
        if (node) node.scrollTop = node.scrollHeight
      })
    })
    return () => cancelAnimationFrame(id)
  }, [onScreen])

  // Bildirim/toast "Görüntüle" → sohbet açılır; kullanıcı yukarı kaydırmış
  // olsa bile yeni yanıta indir.
  useEffect(() => {
    return onOpenChat(({ focusComposer } = {}) => {
      setIsNearBottom(true)
      isNearBottomRef.current = true
      requestAnimationFrame(() => {
        const el = scrollRef.current
        if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
        // Bildirimdeki "Yanıtla" → kullanıcı yazmak istiyor; imleci hazırla.
        // Bir kare sonra, sohbet görünür hâle geldikten sonra iste.
        if (focusComposer) requestAnimationFrame(requestFocusComposer)
      })
    })
  }, [])

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    const near = distance < NEAR_BOTTOM_THRESHOLD_PX
    setIsNearBottom(near)
    if (near) {
      setUnread(0)
      lastSeenLengthRef.current = messages.length
    }
  }

  function scrollToBottom() {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
    setUnread(0)
    setIsNearBottom(true)
    lastSeenLengthRef.current = messages.length
  }

  return {
    isNearBottom,
    setIsNearBottom,
    unread,
    setUnread,
    attachScrollRef,
    attachContentRef,
    handleScroll,
    scrollToBottom,
  }
}
