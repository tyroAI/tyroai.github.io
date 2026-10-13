import { useEffect, useState } from "react"
import { useMsal } from "@azure/msal-react"
import { graphGet, STATUS } from "@/lib/graph"
import { isMsalConfigured } from "@/lib/msal"
import { metaFor, rememberMeta } from "@/lib/filesNav"

/**
 * Bir konumun ADI ve ADRESİ (`{ name, webUrl, parentId? }`).
 *
 * Satıra tıklayarak gelindiyse ikisi de zaten biliniyor (`filesNav` tohumu)
 * ve istek ATILMAZ. Yalnız soğuk açılışta (yer imi, paylaşılan bağlantı,
 * sayfa yenileme) tek bir GET: klasörde öğenin kendisi, kitaplıkta sürücü,
 * sitede site. Adres, klasör içinde aramanın `path:` kapsamı; ad, başlık.
 * Sonuç `filesNav`e yazılıyor — yani o da bellekte ve çıkışta düşüyor.
 *
 * `nonce` (Dosyalarım'ın "Tekrar dene" sayacı): değişince BAŞARISIZ bir okuma
 * yeniden sorulur ve o sırada "loading" döner — yoksa konum adı okunamayan
 * bir klasörde "Tekrar dene" hiçbir şey yapmazdı (D-3).
 */
export function useLocationMeta(loc, nonce = 0) {
  const { instance, accounts } = useMsal()
  const account = accounts[0] ?? null
  const token = loc?.token ?? ""
  const needs = loc && ["folder", "drive", "site"].includes(loc.kind)
  const [state, setState] = useState({ token: "", nonce: 0, value: null })

  useEffect(() => {
    if (!needs || !isMsalConfigured || !account) return
    const seeded = metaFor(token)
    if (seeded?.webUrl) return
    let alive = true
    const req =
      loc.kind === "folder"
        ? {
            path: `/drives/${loc.driveId}/items/${loc.itemId}?$select=id,name,webUrl,parentReference`,
            scopes: ["Files.Read.All"],
          }
        : loc.kind === "drive"
          ? {
              path: `/drives/${loc.driveId}?$select=id,name,webUrl,driveType`,
              scopes: ["Files.Read.All"],
            }
          : {
              path: `/sites/${loc.siteId}?$select=id,displayName,webUrl`,
              scopes: ["Sites.Read.All"],
            }
    graphGet(instance, account, { ...req, retry: 1 }).then((res) => {
      if (!alive) return
      if (res.status !== STATUS.ready) {
        setState({ token, nonce, value: { status: res.status, httpStatus: res.httpStatus } })
        return
      }
      const d = res.data ?? {}
      const meta = {
        name: d.displayName ?? d.name ?? "",
        webUrl: d.webUrl ?? "",
        parentId: d.parentReference?.id ?? null,
        // Kitaplığın kökü de bir "öğe" ve üst kimliği yok; kök klasörde yukarı gidilmez.
        isRoot: loc.kind === "folder" && !d.parentReference?.path?.includes(":/"),
      }
      rememberMeta(token, meta)
      setState({ token, nonce, value: { status: STATUS.ready, ...meta } })
    })
    return () => {
      alive = false
    }
    // `loc` belirteçten türüyor; kimlik `token`da.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needs, token, instance, account, nonce])

  if (!loc) return null
  const seeded = metaFor(token)
  if (seeded?.webUrl) return { status: STATUS.ready, ...seeded }
  if (!needs) return null
  if (
    state.token === token &&
    state.value &&
    (state.value.status === STATUS.ready || state.nonce === nonce)
  )
    return state.value
  return { status: "loading", ...(seeded ?? {}) }
}
