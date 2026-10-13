import { toast } from "sonner"
import { DataRefreshToast } from "@/components/common/DataRefreshToast"
import { placeToastStack } from "@/lib/toastAvoid"

/**
 * Bildirimlerin tek çizim yolu: veri yenilemesi (`startRefreshToast`) ve tek atımlık
 * sonuçlar (`showResultToast`; düz çağrılar için `notify`, `@/lib/notify`). Hepsi aynı
 * kartı (`DataRefreshToast`) çizer: her yer kendi bildirimini çizdiğinde ifade, yer ve
 * davranış zamanla ayrışıyordu.
 *
 * Sağ altta, uygulamanın tek yığını (`Toaster` da sağ altta; güncelleme kartı aynı yığında).
 * Sağ panel ya da besteci oradaysa yığın onlardan kaçar: `placeToastStack`, lib/toastAvoid.js.
 *
 *   const t = startRefreshToast({ title })
 *   t.progress({ label, step, totalSteps })
 *   t.success({ title, detail })   // ya da t.error({ title, detail, action })
 */
const OPTS = { position: "bottom-right", unstyled: true, duration: Infinity }

/** Durum başına varsayılan süre (ms): uyarı ve hata okunacak metin taşıyor. */
export const RESULT_DURATION = { success: 5000, info: 5000, warning: 7000, error: 9000 }
/** Eylemli bildirim daha uzun yaşar: kullanıcı okuyup düğmeye basacak. */
export const ACTION_DURATION = 15000

export function resultDuration(state, hasAction = false) {
  if (hasAction) return ACTION_DURATION
  return RESULT_DURATION[state] ?? RESULT_DURATION.success
}

// Eylem sonner'ınki gibi davranır: basınca bildirim kapanır. Açık kalsın isteyen
// `onClick` içinde `event.preventDefault()` çağırır.
function closingAction(action, id) {
  if (!action) return undefined
  return {
    label: action.label,
    onClick(event) {
      action.onClick?.(event)
      if (!event?.defaultPrevented) toast.dismiss(id)
    },
  }
}

export function startRefreshToast({ title }) {
  placeToastStack()
  const id = toast.custom(() => <DataRefreshToast state="loading" title={title} />, OPTS)

  return {
    id,
    progress({ label, step, totalSteps }) {
      toast.custom(
        () => (
          <DataRefreshToast
            state="loading"
            title={title}
            detail={label}
            current={step}
            total={totalSteps}
          />
        ),
        { ...OPTS, id },
      )
    },
    success({ title: t, detail }) {
      toast.custom(() => <DataRefreshToast state="success" title={t} detail={detail} />, {
        ...OPTS,
        id,
        duration: 4500,
      })
    },
    /** @param {{ title: string, detail?: string, action?: { label: string, onClick: Function } }} opts */
    error({ title: t, detail, action }) {
      toast.custom(
        () => (
          <DataRefreshToast
            state="error"
            title={t}
            detail={detail}
            action={closingAction(action, id)}
          />
        ),
        { ...OPTS, id, duration: action ? ACTION_DURATION : 8000 },
      )
    },
  }
}

/**
 * Tek atımlık sonuç bildirimi — yükleme aşaması olmayan işler için. Dönüş: toast kimliği.
 *
 * @param {{
 *   state?: "success" | "info" | "warning" | "error",
 *   title: string,
 *   detail?: string,
 *   action?: { label: string, onClick: Function },
 *   duration?: number,
 *   id?: string | number,
 * }} opts `id` verilirse aynı kimlikli bildirim yığılmaz, yerinde tazelenir; `duration`
 *   durumun varsayılan süresini ezer.
 */
export function showResultToast({ state = "success", title, detail, action, duration, id } = {}) {
  placeToastStack()
  return toast.custom(
    (toastId) => (
      <DataRefreshToast
        state={state}
        title={title}
        detail={detail}
        action={closingAction(action, toastId)}
      />
    ),
    { ...OPTS, id, duration: duration ?? resultDuration(state, Boolean(action)) },
  )
}
