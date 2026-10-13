import { Fragment } from "react"

/**
 * İstem metnini çizer ve `[köşeli parantez]` yer tutucularını işaretler.
 *
 * Kullanıcının doldurması gereken yeri görmesi gerekiyor: düz metinde
 * `[proje no]` cümlenin parçası gibi okunuyor ve ancak composer'a düştükten
 * sonra fark ediliyordu. Hafif bir marka tonu, "burayı sen yazacaksın"
 * demenin en sessiz yolu — kutu ya da çerçeve, kart listesini gürültüye
 * çevirirdi.
 *
 * Köşeli parantezler KORUNUR: composer'a giden metin birebir aynı ve ilk yer
 * tutucuyu seçen kod da onları arıyor (bkz. `chatBus.requestFocusComposer`).
 *
 * `ghost`: kartın hover silmesindeki kopya (`PromptCard`). Metin `::before`
 * ile çizilir — gerçek metin olsaydı sayfada bul (Ctrl+F) görünmez kopyayı da
 * bulurdu (`PromptTile`ın aynı kararı). Parçalar ve dolgular aynı, yani satır
 * aynı yerden kırılır.
 */
export function PromptText({ text, ghost = false }) {
  const parts = String(text ?? "").split(/(\[[^\]]+\])/g)
  return (
    <>
      {parts.map((part, i) => {
        const slot = /^\[[^\]]+\]$/.test(part)
        if (ghost) {
          return (
            <span
              key={i}
              data-t={part}
              className={
                slot
                  ? "rounded bg-[color-mix(in_oklab,var(--tile-wipe-fg)_16%,transparent)] px-1 font-medium before:content-[attr(data-t)]"
                  : "before:content-[attr(data-t)]"
              }
            />
          )
        }
        return slot ? (
          <span key={i} className="rounded bg-brand/10 px-1 font-medium text-brand-ink">
            {part}
          </span>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      })}
    </>
  )
}
