// Önizleme türlerinin yaklaşık ölçüsü (yön seçimi, `lib/placement`) ve
// kabın sınıfı. Posta kartı kendi içinde kayar (gövde iframe), ötekiler kapta.
export const PREVIEW_KIND = {
  event: { size: { width: 344, height: 440 }, className: "w-[21.5rem] overflow-y-auto" },
  mail: {
    size: { width: 416, height: 560 },
    className: "flex w-[min(26rem,calc(100vw-3rem))] flex-col overflow-hidden",
  },
  post: {
    size: { width: 416, height: 560 },
    className: "flex w-[min(26rem,calc(100vw-3rem))] flex-col overflow-hidden",
  },
  task: { size: { width: 336, height: 440 }, className: "w-[21rem] overflow-y-auto" },
}

/** Önizlemenin erişilebilir adı: toplantı/posta konusu, görev başlığı. */
export const previewLabel = (kind, item) => (kind === "task" ? item?.title : (item?.subject ?? ""))
