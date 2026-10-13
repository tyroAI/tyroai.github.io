/**
 * Eşzamanlılık sınırı: en çok `limit` iş aynı anda, fazlası sırayla bekler. Akış kartlarının
 * kapak istekleri (her biri iki Graph isteği) kaydırırken fırtınaya dönmesin diye.
 */
export function createQueue(limit) {
  let active = 0
  const waiting = []
  const next = () => {
    if (active >= limit || !waiting.length) return
    active += 1
    const { task, resolve, reject } = waiting.shift()
    Promise.resolve()
      .then(task)
      .then(resolve, reject)
      .finally(() => {
        active -= 1
        next()
      })
  }
  return (task) =>
    new Promise((resolve, reject) => {
      waiting.push({ task, resolve, reject })
      next()
    })
}
