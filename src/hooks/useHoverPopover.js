import { useCallback, useEffect, useId, useRef, useState } from "react"
import { roomiestSide } from "@/lib/placement"

/**
 * Üstüne gelince açılan, dokununca ve klavyeyle de açılan bir Popover'ın
 * davranışı. Tüketiciler: Akışım'ın ipucu kartı (`InsightTip` — özetin vurgulu
 * sayıları ve toplantı ritminin çubukları) ve toplantı kartının önizlemesi
 * (`NextMeetingCard`).
 *
 * ⚠️ **HoverCard DEĞİL.** Radix'in HoverCard'ı dokunuşu yok sayıyor (telefonda
 * önizleme HİÇ açılmazdı) ve klavyeyle açılamıyor.
 *
 * Dört açılış yolu, dört ayrı odak kararı:
 *
 * | yol | açılış | odak içeri girer mi | kapanınca odak |
 * |---|---|---|---|
 * | fare üstüne gelir | `openDelay` sonra | HAYIR | yerinde kalır |
 * | fare tıklar | hemen, açık tutar | HAYIR | yerinde kalır |
 * | dokunuş | Radix'in aç/kapası | HAYIR | yerinde kalır |
 * | klavye (Enter · Boşluk) | Radix'in aç/kapası | EVET | tetiğe döner |
 *
 * ⚠️ **KAPANIŞTA ODAK TETİĞE ATLAMAZ** (fare ve dokunuşta) — ve bu bir HATAYDI.
 * Radix'in modal olmayan Popover'ı kapanırken, dışarıda bir etkileşim yoksa
 * odağı TETİĞE taşıyor; üstünden geçip giden bir fare "dışarıda etkileşim"
 * sayılmıyor. Soru kutusuna yazarken imleci özetteki vurgulu bir sayının
 * üstünden geçiren kişinin odağı o sayıya atlıyordu ve yazdığı sonraki harf
 * kutuya gitmiyordu. Odak yalnız klavyeyle açılmışsa geri verilir — orada
 * odak zaten içerideydi ve tetiğe dönmesi doğru olan.
 *
 * ⚠️ Farede TIKLAMA açık tutar, kapatmaz: üstüne gelince zaten açılmış bir
 * ipucuna basan kişi onu okumak istiyor; Radix'in aç/kapası o anda kapatırdı.
 *
 * ⚠️ **SAYFADA AYNI ANDA TEK İPUCU** (`openTip`, modül düzeyi). Toplantı
 * ritminin yedi çubuğu yan yana: her birinin kendi zamanlayıcısı olunca fare
 * çubuktan çubuğa geçerken eskisi 160 ms daha açık kalıyor ve iki koyu kart
 * üst üste biniyordu. Biri açılırken öteki HEMEN kapanır; ve bir ipucu zaten
 * açıksa yenisi GECİKMESİZ açılır — grafiği tarayan fare her çubukta 90 ms
 * beklemesin (Radix Tooltip'in `skipDelayDuration`ının karşılığı).
 */
let openTip = null // { id, close }

export function useHoverPopover({ openDelay = 90, closeDelay = 160, side, prefer, size } = {}) {
  const id = useId()
  const [open, setOpenState] = useState(false)
  // Açılış yönü (`side` + `size` verilirse): açılırken tetiğin yerine göre en
  // geniş boşluk (`lib/placement`). Tetik, son dokunulan/üstüne gelinen eleman.
  const [placed, setPlaced] = useState(side)
  const target = useRef(null)
  const preferKey = prefer?.join(",") ?? side // her çizimde yeni dizi olabilir
  const timer = useRef(null)
  // Son `pointerdown`ın türü; klavyeyle açılışta boş.
  const pointer = useRef("")
  // Nasıl açıldı: "hover" · "mouse" · "touch" · "pen" · "keyboard".
  const how = useRef("")

  const setOpen = useCallback(
    (next) => {
      if (next && preferKey && size && target.current?.isConnected) {
        setPlaced(roomiestSide(target.current.getBoundingClientRect(), size, preferKey.split(",")))
      }
      if (next) {
        if (openTip && openTip.id !== id) openTip.close()
        openTip = {
          id,
          close: () => {
            clearTimeout(timer.current)
            setOpenState(false)
          },
        }
      } else if (openTip?.id === id) {
        openTip = null
      }
      setOpenState(next)
    },
    // `size` her çizimde yeni nesne olabilir; ölçüleri yeter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, preferKey, size?.width, size?.height],
  )

  useEffect(
    () => () => {
      clearTimeout(timer.current)
      if (openTip?.id === id) openTip = null
    },
    [id],
  )

  const later = useCallback(
    (next, ms) => {
      clearTimeout(timer.current)
      // Başka bir ipucu açıkken yenisi beklemez (yukarıda).
      const delay = next && openTip && openTip.id !== id ? 0 : ms
      timer.current = setTimeout(() => {
        if (next) how.current = "hover"
        setOpen(next)
      }, delay)
    },
    [id, setOpen],
  )

  const close = useCallback(() => {
    clearTimeout(timer.current)
    setOpen(false)
  }, [setOpen])

  // Radix buradan çağırıyor: dokunuş/klavye ile tetik, Escape, dışarı tıklama.
  const onOpenChange = useCallback(
    (next) => {
      clearTimeout(timer.current)
      if (next) how.current = pointer.current || "keyboard"
      pointer.current = ""
      setOpen(next)
    },
    [setOpen],
  )

  const triggerProps = {
    onPointerDown: (e) => {
      pointer.current = e.pointerType
      target.current = e.currentTarget
    },
    // Klavyeyle açılış, eski bir `pointerdown`ın türünü miras almasın.
    onKeyDown: (e) => {
      pointer.current = ""
      target.current = e.currentTarget
    },
    onPointerEnter: (e) => {
      target.current = e.currentTarget
      if (e.pointerType === "mouse") later(true, openDelay)
    },
    onPointerLeave: (e) => {
      if (e.pointerType === "mouse") later(false, closeDelay)
    },
    onClick: (e) => {
      if (pointer.current !== "mouse") return // dokunuş ve klavye Radix'e düşer
      e.preventDefault()
      clearTimeout(timer.current)
      how.current = "mouse"
      pointer.current = ""
      setOpen(true)
    },
  }

  const contentProps = {
    onPointerEnter: (e) => {
      if (e.pointerType === "mouse") clearTimeout(timer.current)
    },
    onPointerLeave: (e) => {
      if (e.pointerType === "mouse") later(false, closeDelay)
    },
    onOpenAutoFocus: (e) => {
      if (how.current !== "keyboard") e.preventDefault()
    },
    onCloseAutoFocus: (e) => {
      if (how.current !== "keyboard") e.preventDefault()
    },
    // Sohbet rıhtımı pencere düzeyinde Escape dinliyor: ipucunu kapatan
    // Escape rıhtımı da kapatmasın. `preventDefault` DEĞİL — Radix ipucunu
    // yine kapatıyor (Keşfet'in `stopEscape` deseni).
    onEscapeKeyDown: (e) => e.stopPropagation(),
  }

  return { open, onOpenChange, close, triggerProps, contentProps, side: placed }
}
