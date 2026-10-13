import { useState } from "react"

// Köşk arka planı varsayılan AÇIK; kapatanın seçimi bu tarayıcıda kalır.
const KEY = "tyro-weather-estate"

function readOn() {
  try {
    return localStorage.getItem(KEY) !== "off"
  } catch {
    return true
  }
}

/** Hava kartının köşk arka planı açık mı: `[on, toggle]`. */
export function useEstatePref() {
  const [on, setOn] = useState(readOn)
  const toggle = () => {
    const next = !on
    try {
      if (next) localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, "off")
    } catch {
      // Depo kapalı: seçim bu oturumda kalır.
    }
    setOn(next)
  }
  return [on, toggle]
}
