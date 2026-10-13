import { useMemo } from "react"
import { useTodoBoard } from "@/hooks/useTodoBoard"
import { BoardEditBar } from "@/components/widgets/BoardEditBar"
import { MainWidgets } from "@/components/widgets/MainWidgets"
import { WidgetEditor } from "@/components/widgets/WidgetEditor"
import { BOARDS, CATALOG } from "@/components/widgets/layout"
import { renderWidgetFor } from "@/components/widgets/renderWidget"
import { useWidgetLayout } from "@/components/widgets/useWidgetLayout"

/**
 * Anasayfa'nın düzenlenebilir hâli (kitle `HOME_EDIT`, `lib/widgetsPolicy.js`): bugünkü
 * kartlar widget olarak (`HOME_LAYOUT`), Pano'yla aynı düzenleme — header'daki
 * "Anasayfayı düzenle", sürükle, yığın, görünüm, önizlemeli katalog. "Diğer widget'lar"
 * YOK: eklenen her şey ana bölüme, asistan ayracının üstüne. Veriler sayfanın (`env`);
 * To Do panosu yalnız burada istenir (öneri ve To-Do özeti widget'ları için) — eski sabit
 * Anasayfa onu hiç çağırmaz.
 */
export function HomeBoard({ env }) {
  const board = useTodoBoard()
  const { pageAccess } = env.ctx
  const available = useMemo(
    () =>
      new Set(
        Object.keys(CATALOG).filter(
          (id) =>
            (id !== "feed-picks" || pageAccess.feed) && (id !== "todo-summary" || pageAccess.todo),
        ),
      ),
    [pageAccess.feed, pageAccess.todo],
  )
  const layout = useWidgetLayout(available, BOARDS.home)
  const render = renderWidgetFor({ ...env, ctx: { ...env.ctx, board } })
  return (
    <WidgetEditor layout={layout} render={render}>
      <BoardEditBar />
      {/* Cam kart varken arkada paletin yumuşak ışıkları: cam ancak böyle görünür. */}
      <div className="relative isolate">
        {layout.hasGlass && <div aria-hidden="true" className="board-ambient" />}
        <MainWidgets render={render} />
      </div>
    </WidgetEditor>
  )
}
