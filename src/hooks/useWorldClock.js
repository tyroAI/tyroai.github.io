import { useCallback, useEffect, useState } from "react"
import { DEFAULT_STATE, STORAGE_KEY, parseStored } from "@/lib/worldClock"

function readState() {
  try {
    return parseStored(localStorage.getItem(STORAGE_KEY)) ?? DEFAULT_STATE
  } catch {
    return DEFAULT_STATE
  }
}

/**
 * Dünya saatinin şehirleri ve ana şehri. Kişinin tercihi, bu tarayıcıda
 * (`tyro-world-clock-v1`, kayıt defteri `data/appMeta.js`); depo kapalıysa
 * varsayılan ofis şehirleriyle çalışır, hata vermez.
 */
export function useWorldClock() {
  const [state, setState] = useState(readState)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, ...state }))
    } catch {
      // Depo kapalı / kota dolu: tercih bu oturumda kalır.
    }
  }, [state])

  const add = useCallback(
    (id) => setState((s) => (s.cities.includes(id) ? s : { ...s, cities: [...s.cities, id] })),
    [],
  )
  // Ana şehir kaldırılamaz (şeritlerin ölçüsü o): önce başka bir şehir ana olur.
  const remove = useCallback(
    (id) =>
      setState((s) => (id === s.home ? s : { ...s, cities: s.cities.filter((c) => c !== id) })),
    [],
  )
  const setHome = useCallback(
    (id) => setState((s) => (s.cities.includes(id) ? { ...s, home: id } : s)),
    [],
  )
  const reset = useCallback(() => setState(DEFAULT_STATE), [])

  return { ...state, add, remove, setHome, reset }
}
