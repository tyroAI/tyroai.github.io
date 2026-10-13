import { useCallback, useState } from "react"

/**
 * Ayrıntısı açık iş. `?task=` (Anasayfa'dan gelen bağlantı) ilk açılışta o işi
 * açar; panel kapanınca parametre de adresten düşer (geri tuşu yeniden açmasın).
 */
export function useOpenTask(params, setParams) {
  const [openId, setOpenId] = useState(() => params.get("task"))
  const close = useCallback(() => {
    setOpenId(null)
    if (!params.has("task")) return
    const next = new URLSearchParams(params)
    next.delete("task")
    setParams(next, { replace: true })
  }, [params, setParams])
  return [openId, setOpenId, close]
}
