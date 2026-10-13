import { cn } from "@/lib/utils"
import { useWidgetEditor } from "./widgetEditorContext"
import { ZoneGrid } from "./ZoneGrid"

// Satırlar sabit: 1. satır hava kartının tasarım boyu (232px), sonrakiler 15rem. Sol sütun
// ve sağ ızgara aynı satırları kullanır — yan yana kartlar hizalı. Tek sütunda (telefon)
// hizalanacak komşu yok: kart kendi boyunda, boş alan bırakmaz.
const ROWS = "@[34rem]/myspace:[grid-template-rows:14.5rem] @[34rem]/myspace:auto-rows-[15rem]"

/**
 * Ana bölüm — Anasayfa'nın üst kısmının düzeni: solda karşılama sütunu (genişliği
 * Anasayfa'nınki, 0.74fr; hava + soru kutusu), sağda widget ızgarası. İkisi de
 * düzenlenir; sol sütun boşsa ızgara tam genişlik (düzenlerken sütun bırakma
 * alanı olarak durur).
 */
export function MainWidgets({ render }) {
  const { editing, layout } = useWidgetEditor()
  const left = editing || layout.items.some((x) => x.zone === "left")
  return (
    <div
      className={cn(
        "grid gap-10",
        left &&
          "@[60rem]/myspace:grid-cols-[minmax(0,0.74fr)_minmax(0,1.26fr)] @[60rem]/myspace:gap-x-12",
      )}
    >
      {left && <ZoneGrid zone="left" className={cn("grid min-w-0 gap-4", ROWS)} render={render} />}
      <ZoneGrid
        zone="main"
        className={cn(
          // Üç sütunda KÖŞE sütunu hava kartının tasarım genişliğinden (16.25rem = 260px)
          // daralmaz: dar ekranda o sütundaki kartlar hava kartıyla aynı genişlikte (hava
          // kartı sütunu aşıp taşıyordu); öteki ikisi kalan payı paylaşır.
          "grid min-w-0 grid-flow-row-dense gap-4 @[34rem]/myspace:grid-cols-2 @[46rem]/myspace:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(16.25rem,1fr)]",
          ROWS,
        )}
        render={render}
      />
    </div>
  )
}
