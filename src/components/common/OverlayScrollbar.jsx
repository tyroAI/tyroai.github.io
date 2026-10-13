import { useEffect, useRef } from "react"
import { NOTCH_BLEED_REM } from "@/lib/edgeNotchGeometry"

/**
 * Sayfanın kendi kaydırma çubuğu — ince, kısa, kendiliğinden sönen
 * (2026-09-29, istek: *"Akışım'daki scroll çubuğunu daha güzel ve kısa
 * yapabilir miyiz; çentiğe gelince kötü görünüyor"*).
 *
 * ⚠️ **NEDEN YERLİ ÇUBUK DEĞİL.** Tarayıcının çubuğu kaydırıcının sağ kenarında
 * TAM BOY koşuyor ve sağ kenar çentiği (`EdgeNotch`, `fixed`) tam o şeridin
 * üstünde duruyor: çubuk çentiğin cam kabuğunun ARKASINDAN geçip gri bir
 * şerit gibi görünüyordu. Yerli çubuğun ne boyu ne yolu değiştirilebiliyor
 * (`::-webkit-scrollbar-track` payı Chrome 121+'da `scrollbar-color` varken
 * yok sayılıyor, Firefox'ta hiç yok). Bu yüzden yerli çubuk gizlenip yerine
 * bu çiziliyor — ve rayı çentik ekrandayken çentiğin ÜST OMZUNDAN ÖNCE
 * bitiyor (`avoidNotch`).
 *
 * | ne | nasıl |
 * |---|---|
 * | görünüm | 5px, yuvarlak, mürekkebin %22'si (iki temada da kendi zıttı); üstüne gelince 7px · %38 |
 * | boy | içeriğe orantılı ama 36–72px arası — "kısa" istek, orantı yine yön veriyor |
 * | ne zaman | kaydırırken ve 1,1 sn sonrasına kadar; kenara (12px'lik görünmez şerit) gelince; sürüklerken |
 * | etkileşim | sürükle (işaretçi yakalamalı), raya tıkla → oraya kay |
 *
 * ⚠️ **HER KAYDIRMA KARESİNDE RENDER YOK.** Konum ve görünürlük doğrudan
 * stile / `data-*` özniteliğine yazılıyor, `requestAnimationFrame` ile
 * karede bir kez. Akışım ağır bir sayfa (küre, karusel, ipuçları) ve bir
 * `setState` her kaydırma olayında bileşeni yeniden çizerdi.
 *
 * ⚠️ **YALNIZ İNCE İŞARETÇİDE.** Dokunmatikte cihazın kendi kaydırma
 * göstergesi zaten ince ve kendiliğinden sönüyor; orada yerli olan kalıyor
 * (CSS: `.ms-scroll` gizlemesi `pointer: fine` altında).
 *
 * ⚠️ `aria-hidden`: ekran okuyucu kaydırma çubuğu okumaz; kaydırıcının kendisi
 * klavyeyle ve tekerlekle bugünkü gibi kayıyor.
 *
 * Kullanım: kaydırıcı `ms-scroll` sınıfını taşır ve bu bileşen ONUNLA AYNI
 * kutuyu kaplayan `relative` bir ebeveynin içinde, kaydırıcının kardeşi
 * olarak çizilir.
 */
const INSET = 10
const MIN_THUMB = 36
const MAX_THUMB = 72
const MIN_TRACK = 96
const IDLE_MS = 1100
// Çentiğin üst omzu ile rayın dibi arasındaki pay.
const NOTCH_GAP = 14

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

export function OverlayScrollbar({ targetRef, avoidNotch = false }) {
  const trackRef = useRef(null)
  const thumbRef = useRef(null)

  useEffect(() => {
    const el = targetRef.current
    const track = trackRef.current
    const thumb = thumbRef.current
    if (!el || !track || !thumb) return undefined

    let raf = 0
    let idle = 0
    let drag = null
    let geo = { trackH: 0, thumbH: 0, max: 0 }
    // Sayfanın aşağıya devam ettiğini söyleyen tek seferlik görünüş. Mount
    // anında içerik çoğu zaman henüz taşmıyor (kartlar sonradan doluyor);
    // ipucu bu yüzden İLK TAŞMA anına bağlı, mount'a değil (ölçüldü: mount'ta
    // sınayan ilk sürüm hiç görünmüyordu).
    let hinted = false

    const layout = () => {
      raf = 0
      const box = el.getBoundingClientRect()
      const max = el.scrollHeight - el.clientHeight
      let bottom = box.bottom - INSET
      if (avoidNotch) {
        // Çentik yalnız `lg`+ ve rıhtım kapalıyken var; yokken (ya da
        // `display:none`ken genişliği 0) ray tam boy.
        const notch = document.querySelector('[data-slot="edge-notch"]')
        const r = notch?.getBoundingClientRect()
        if (r && r.width > 0 && r.left < box.right) {
          const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
          bottom = Math.min(bottom, r.top - NOTCH_BLEED_REM * rem - NOTCH_GAP)
        }
      }
      const trackH = Math.max(0, bottom - (box.top + INSET))
      if (max <= 1 || trackH < MIN_TRACK) {
        track.dataset.off = ""
        return
      }
      delete track.dataset.off
      if (!hinted) {
        hinted = true
        wake()
      }
      const thumbH = clamp((trackH * el.clientHeight) / el.scrollHeight, MIN_THUMB, MAX_THUMB)
      geo = { trackH, thumbH, max }
      track.style.height = `${trackH}px`
      thumb.style.height = `${thumbH}px`
      thumb.style.transform = `translateY(${(el.scrollTop / max) * (trackH - thumbH)}px)`
    }
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(layout)
    }
    const wake = () => {
      track.dataset.active = ""
      clearTimeout(idle)
      idle = setTimeout(() => {
        if (!drag) delete track.dataset.active
      }, IDLE_MS)
    }

    const onScroll = () => {
      schedule()
      wake()
    }
    const onDown = (e) => {
      if (e.button !== 0) return
      e.preventDefault()
      thumb.setPointerCapture(e.pointerId)
      drag = { y: e.clientY, top: el.scrollTop }
      track.dataset.drag = ""
      wake()
    }
    const onMove = (e) => {
      if (!drag) return
      const span = geo.trackH - geo.thumbH
      if (span > 0) el.scrollTop = drag.top + ((e.clientY - drag.y) * geo.max) / span
    }
    const onUp = () => {
      drag = null
      delete track.dataset.drag
      wake()
    }
    // Rayın boş yerine basmak oraya kaydırır; başparmağa basmak sürüklemedir.
    const onTrackDown = (e) => {
      if (e.target !== track || e.button !== 0) return
      const r = track.getBoundingClientRect()
      const span = geo.trackH - geo.thumbH
      if (span <= 0) return
      const ratio = clamp((e.clientY - r.top - geo.thumbH / 2) / span, 0, 1)
      el.scrollTo({ top: ratio * geo.max, behavior: "smooth" })
      wake()
    }
    const onEnter = () => {
      track.dataset.hover = ""
    }
    const onLeave = () => {
      delete track.dataset.hover
    }

    el.addEventListener("scroll", onScroll, { passive: true })
    thumb.addEventListener("pointerdown", onDown)
    thumb.addEventListener("pointermove", onMove)
    thumb.addEventListener("pointerup", onUp)
    thumb.addEventListener("pointercancel", onUp)
    track.addEventListener("pointerdown", onTrackDown)
    track.addEventListener("pointerenter", onEnter)
    track.addEventListener("pointerleave", onLeave)
    // İçerik büyüyünce (kartlar dolunca) ya da kutu değişince (rıhtım,
    // pencere) boy ve konum yeniden hesaplanır.
    const ro = new ResizeObserver(schedule)
    ro.observe(el)
    for (const child of el.children) ro.observe(child)
    window.addEventListener("resize", schedule)

    layout()

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(idle)
      el.removeEventListener("scroll", onScroll)
      thumb.removeEventListener("pointerdown", onDown)
      thumb.removeEventListener("pointermove", onMove)
      thumb.removeEventListener("pointerup", onUp)
      thumb.removeEventListener("pointercancel", onUp)
      track.removeEventListener("pointerdown", onTrackDown)
      track.removeEventListener("pointerenter", onEnter)
      track.removeEventListener("pointerleave", onLeave)
      ro.disconnect()
      window.removeEventListener("resize", schedule)
    }
  }, [targetRef, avoidNotch])

  return (
    <div
      ref={trackRef}
      aria-hidden="true"
      data-slot="overlay-scrollbar"
      data-off=""
      className="ms-scrollbar"
    >
      <div ref={thumbRef} className="ms-scrollbar-thumb" />
    </div>
  )
}
