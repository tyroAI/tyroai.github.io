import { useEffect, useState } from "react"

/** `play` iken metni `delay` sonra harf harf açar; değilse tamamını verir. */
export function useTypewriter(text, play, { delay = 0, step = 34 } = {}) {
  const [n, setN] = useState(play ? 0 : Infinity)
  useEffect(() => {
    if (!play) return undefined
    let i = 0
    let timer = setTimeout(function tick() {
      i += 1
      setN(i)
      if (i < text.length) timer = setTimeout(tick, step)
    }, delay)
    return () => clearTimeout(timer)
  }, [play, text, delay, step])
  return { shown: text.slice(0, n), done: n >= text.length }
}
