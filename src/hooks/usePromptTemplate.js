import { useCallback, useState } from "react"
import { useLocale } from "@/hooks/useLocale"
import {
  applySlot,
  composeTemplate,
  isTemplate,
  missingSlot,
  presetValues,
} from "@/lib/promptTemplates"

/**
 * Doldurulan hazır sorunun durumu — Anasayfa'nın soru kutusu (`AskBox`) ile
 * sohbet bestecisinin (`ComposerTemplate`) ORTAK kancası. Kurallar
 * `lib/promptTemplates.js`te; iki yüzey ayrı yazılsaydı bitişin
 * temizlenmesi, eksik alanın açılması ve gönderilen cümle zamanla ayrışırdı.
 *
 * `tpl`: `{ key, values, open, ...extra }` — `open` ebeveynin açık tuttuğu alan
 * (başlangıç seçilince bitiş, eksik alanla gönderilince o alan). `rootRef`
 * eksik yazı alanını bulmak için (`data-slot-name`). `init` (`{ key, preset }`)
 * verilirse şablon açık başlar — sohbet bestecisi her kartta yeniden kuruyor.
 */
export function usePromptTemplate(rootRef, init) {
  const { t, locale } = useLocale()
  const [tpl, setTpl] = useState(() =>
    init && isTemplate(init.key)
      ? { key: init.key, values: presetValues(init.key, init.preset), open: null }
      : null,
  )

  const start = useCallback((key, extra, preset) => {
    setTpl({ ...extra, key, values: presetValues(key, preset), open: null })
  }, [])

  const setSlot = useCallback((name, value) => {
    setTpl((s) => (s ? { ...s, ...applySlot(s.key, s.values, name, value) } : s))
  }, [])

  /**
   * Açık tutulan alanı bırakır. `name` verilirse YALNIZ o alan açıksa: zorla
   * açılmış başlangıç seçilince `setSlot` bitişi açıyor ve hemen ardından gelen
   * kapanış onu ezmemeli. Adsız çağrı (başka alana uzanmak) hangisi açıksa kapatır.
   */
  const closeForced = useCallback((name) => {
    setTpl((s) => (s?.open && (name == null || s.open === name) ? { ...s, open: null } : s))
  }, [])

  /**
   * Gönderilecek cümle. ⚠️ Eksik zorunlu alanla `null` döner ve o alana YOL
   * GÖSTERİR (açar ya da odaklar): kapalı bir düğme neyin eksik olduğunu
   * söylemiyor.
   */
  function submit() {
    if (!tpl) return null
    const miss = missingSlot(t, tpl.key, tpl.values)
    if (miss?.focus) {
      rootRef.current?.querySelector(`[data-slot-name="${miss.name}"]`)?.focus()
      return null
    }
    if (miss) {
      setTpl((s) => (s ? { ...s, open: miss.name } : s))
      return null
    }
    return composeTemplate(t, locale, tpl.key, tpl.values)
  }

  /** Cümlenin düz metni; boş alanlar `[etiket]` ("metin olarak düzenle"). */
  const asText = () => (tpl ? composeTemplate(t, locale, tpl.key, tpl.values) : "")

  return { tpl, setTpl, start, setSlot, closeForced, submit, asText }
}
