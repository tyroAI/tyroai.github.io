import { useLocale } from "@/hooks/useLocale"
import { STATUS } from "@/lib/graph"
import { showResultToast } from "@/lib/refreshToast"

/**
 * Keşfet'in Yenile düğmesi — sonucu SÖYLER: yeni gönderi varsa sayısı, yoksa "güncel".
 * Hata bildirimi yalnız liste yerinde kaldıysa (liste boşsa hata kartı zaten ekranda).
 * Popüler duyuruları ve işaretli postaları birlikte tazeler (yeni sayı ikisinin toplamı);
 * Sana özel yalnız kendininkini. Dönüş `true` ise düğme onay işareti gösterir.
 */
export function useFeedRefresh({ section, feed, important }) {
  const { t } = useLocale()

  async function onRefreshImportant() {
    if (important.refreshing) return false
    const result = await important.refresh()
    if (!result) return false
    if (result.status === STATUS.ready) {
      showResultToast(
        result.added
          ? {
              title: t("feed.important.refreshedTitle"),
              detail: t("feed.important.refreshedNew", { count: result.added }),
            }
          : {
              title: t("feed.important.refreshedSameTitle"),
              detail: t("feed.important.refreshedSame"),
            },
      )
    } else if (result.kept) {
      showResultToast({
        state: "error",
        title: t("feed.important.refreshFailed"),
        detail: t("feed.refreshFailedBody"),
      })
    }
    return result.status === STATUS.ready
  }

  async function onRefresh() {
    if (section === "important") return onRefreshImportant()
    if (feed.refreshing) return false
    const [result, marked] = await Promise.all([
      feed.refresh(),
      important.refreshing ? null : important.refresh(),
    ])
    if (!result) return false
    if (result.status === STATUS.ready && marked?.status === STATUS.ready) {
      result.added = (result.added ?? 0) + (marked.added ?? 0)
    }
    if (result.status === STATUS.ready) {
      showResultToast(
        result.added
          ? {
              title: t("feed.refreshedTitle"),
              detail: t("feed.refreshedNew", { count: result.added }),
            }
          : { title: t("feed.refreshedSameTitle"), detail: t("feed.refreshedSame") },
      )
    } else if (result.kept) {
      showResultToast({
        state: "error",
        title: t("feed.refreshFailed"),
        detail:
          result.status === STATUS.denied ? t("feed.deniedBody") : t("feed.refreshFailedBody"),
      })
    }
    return result.status === STATUS.ready
  }

  const busyRefresh =
    section === "important"
      ? important.refreshing
      : feed.refreshing || (section === "agenda" && important.refreshing)

  return { onRefresh, onRefreshImportant, busyRefresh }
}
