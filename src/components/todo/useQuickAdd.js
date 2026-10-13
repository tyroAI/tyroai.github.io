import { useState } from "react"
import { useLocale } from "@/hooks/useLocale"
import { showResultToast } from "@/lib/refreshToast"

/**
 * Bugüne hızlı ekleme — To-Do sayfasının kartı ve To-Do widget'ı aynı kuralı okur: varsayılan
 * listeye bugünün tarihiyle, yani iş Anasayfa'nın "Bugünün odağı"nda da görünür. `busy`
 * eklenirken maskotu çalıştırır; sonuç bildirimle söylenir (kartta ipucu satırı yok).
 * `quickAdd` eklemeye başladıysa `true` döner (alan o zaman boşalır).
 */
export function useQuickAdd(board, today) {
  const { t } = useLocale()
  const [busy, setBusy] = useState(false)

  function quickAdd(title) {
    const res = board.addTask({ title, dueKey: today })
    if (!res) return false
    setBusy(true)
    res.promise
      .then((task) => {
        if (task) showResultToast({ title: t("todo.hero.added"), detail: t("todo.hero.addHint") })
      })
      .finally(() => setBusy(false))
    return true
  }

  return { busy, quickAdd }
}
