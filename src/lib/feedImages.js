import { graphGet, STATUS } from "@/lib/graph"
import { FEED } from "@/lib/feedPolicy"
import { shrinkDataUrl } from "@/lib/imageShrink"

/**
 * Bir iletinin GÖMÜLÜ eklerini getirir (kapak görseli ve `cid:` eşlemesi).
 *
 * ⚠️ İki aşama ZORUNLU: önce üst veri (`$select` ile, içerik YOK), sonra
 * yalnız seçilen ekin baytları. Tek aşamada `contentBytes` istemek, imzadaki
 * her logoyu ve megabaytlık PDF'i de indirmek demekti.
 */
export async function fetchInlineImages(instance, account, id, variant = "hero") {
  const cfg = variant === "body" ? FEED.body : FEED.hero
  const meta = await graphGet(instance, account, {
    path: `/me/messages/${encodeURIComponent(id)}/attachments?$select=id,name,contentType,size,isInline`,
    scopes: ["Mail.Read"],
  })
  if (meta.status !== STATUS.ready) return { status: meta.status, images: [] }

  // ⚠️ Tip karşılaştırması KÜÇÜK HARFE indirilmiş ve `;` ÖNCESİNDEN alınmış
  // hâliyle: Exchange `IMAGE/JPEG` ve `image/jpeg; name="x.jpg"` şekillerini
  // de yazıyor, ham eşitlik ikisini de listede yok sayıp görseli indirmeden
  // eliyordu — ekranda yırtık bir ikon olarak görünüyordu.
  const typeOf = (a) =>
    String(a.contentType ?? "")
      .split(";")[0]
      .trim()
      .toLowerCase()

  const candidates = (meta.data.value ?? [])
    .filter(
      (a) =>
        a["@odata.type"] === "#microsoft.graph.fileAttachment" &&
        cfg.types.includes(typeOf(a)) &&
        typeof a.size === "number" &&
        a.size <= cfg.maxBytes &&
        a.size >= cfg.minBytes,
    )
    // ⚠️ BÜYÜKTEN KÜÇÜĞE. Kurumsal bir bültende on beş gömülü görselin on
    // üçü imza logosu ve ayraç pikselidir; kapak fotoğrafı en büyüğüdür.
    // Kart yalnız bir tane istiyor (`limit: 1`) ve o birinin doğru olması
    // bu sıralamaya bağlı. Okuma penceresi hepsini istiyor; orada sıra
    // yalnız BÜTÇE dolarsa kimin düşeceğini belirliyor — küçük bir ayraç
    // pikselinin düşmesi, kişi fotoğrafının düşmesinden iyidir.
    // Gömülü (gövdede görünen) görsel önce: gövdede hiç geçmeyen büyük bir ek kapak olmasın.
    .sort((a, b) => Number(Boolean(b.isInline)) - Number(Boolean(a.isInline)) || b.size - a.size)
    .slice(0, cfg.limit)

  if (!candidates.length) return { status: STATUS.ready, images: [] }

  // ⚠️ TOPLAM BAYT FRENİ. Hepsi tek bir `srcDoc` dizesine giriyor ve base64
  // ham baytın ~1,33 katı; tavan olmadan yirmi tam boy fotoğraf taşıyan bir
  // duyuru sekmeyi kilitleyebilirdi. Tavanı aşan ek İNDİRİLMEZ ve
  // `sealUnloadableImages` onu yırtık değil mühürlü çizer.
  const budget = cfg.totalBytes ?? Infinity
  let spent = 0
  const affordable = candidates.filter((a) => {
    if (spent + a.size > budget) return false
    spent += a.size
    return true
  })

  // ⚠️ Baytlar ANCAK BURADA isteniyor. Üst veri sorgusuna `contentBytes`
  // eklemek bütün ekleri base64 olarak indirmek demekti — bir bültende
  // megabaytlar.
  const loaded = await Promise.all(
    affordable.map(async (a) => {
      const one = await graphGet(instance, account, {
        path: `/me/messages/${encodeURIComponent(id)}/attachments/${encodeURIComponent(a.id)}`,
        scopes: ["Mail.Read"],
      })
      if (one.status !== STATUS.ready || !one.data.contentBytes) return null
      return {
        id: a.id,
        name: a.name ?? "",
        // `contentId` köşeli parantezle gelebiliyor: `<abc123>` → `abc123`.
        contentId: String(one.data.contentId ?? "").replace(/^<|>$/g, ""),
        isInline: Boolean(one.data.isInline ?? a.isInline),
        size: a.size,
        contentType: typeOf(a),
        // ⚠️ `data:` şemasının tipi TEMİZ olmak zorunda: ham `contentType`
        // `; name="foto.jpg"` taşıyabiliyor ve o parça URL'in içinde
        // kalırsa tarayıcı çözemiyor — görsel yine yırtık çıkıyordu.
        dataUrl: `data:${typeOf(a)};base64,${one.data.contentBytes}`,
      }
    }),
  )
  const images = loaded.filter(Boolean)
  // Kapak için büyük görsel kart boyuna iner (bellek ve çizim); pencere asıl görseli ister.
  if (cfg.shrinkAbove) {
    await Promise.all(
      images.map(async (im) => {
        if (im.size > cfg.shrinkAbove) im.dataUrl = await shrinkDataUrl(im.dataUrl)
      }),
    )
  }
  return { status: STATUS.ready, images }
}
