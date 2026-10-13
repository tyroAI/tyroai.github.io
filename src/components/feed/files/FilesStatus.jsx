import SquareLock02Icon from "@hugeicons/core-free-icons/SquareLock02Icon"
import { STATUS } from "@/lib/graph"
import { StateCard } from "./FilesStates"
import { SITES } from "./filesShared"

/**
 * Okunamayan kaynağın kartı: izin (Bağlan — yalnız `denied`) · oturum · hata
 * (Tekrar dene). "Soramadık ≠ dosya yok": her kaynak kendi durumunu çizer.
 */
export function StatusFor({ t, status, scopes, httpStatus, code, onConnect, onRetry }) {
  if (status === STATUS.denied) {
    return (
      <StateCard
        icon={SquareLock02Icon}
        title={
          httpStatus === 403
            ? t("myfiles.state.forbidden")
            : scopes === SITES
              ? t("myfiles.state.sitesDenied")
              : t("files.permissionTitle")
        }
        body={httpStatus === 403 ? t("myfiles.state.forbiddenBody") : t("files.permissionBody")}
        action={httpStatus === 403 ? null : t("files.connect")}
        actionTone="connect"
        onAction={() => onConnect(scopes)}
      />
    )
  }
  if (status === STATUS.unauthenticated) return <StateCard title={t("files.signedOut")} />
  if (status === STATUS.error) {
    const detail =
      httpStatus || code
        ? t("myfiles.state.detail", {
            detail: [httpStatus && `HTTP ${httpStatus}`, code].filter(Boolean).join(" · "),
          })
        : null
    if (httpStatus === 404)
      return (
        <StateCard
          title={t("myfiles.state.notFound")}
          body={t("myfiles.state.notFoundBody")}
          detail={detail}
        />
      )
    // Tekrar denemeler de 429'a takıldıysa sorun bizde değil: "yoğun, biraz sonra".
    if (httpStatus === 429)
      return (
        <StateCard
          title={t("myfiles.state.throttled")}
          detail={detail}
          action={t("files.retry")}
          onAction={onRetry}
        />
      )
    return (
      <StateCard
        title={t("myfiles.state.error")}
        body={t("files.errorBody")}
        detail={detail}
        action={t("files.retry")}
        onAction={onRetry}
      />
    )
  }
  return null
}
