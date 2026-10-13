import { createContext, useContext } from "react"

/** Pano'nun düzenleme kipi — kartlar, sürükleme ve alttaki çubuk aynı durumu paylaşır. */
export const WidgetEditorContext = createContext(null)

export const useWidgetEditor = () => useContext(WidgetEditorContext)
