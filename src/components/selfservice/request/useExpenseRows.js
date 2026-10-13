import { useEffect, useRef, useState } from "react"
import { applySlot } from "@/lib/promptTemplates"
import { newExpenseRow } from "@/lib/requestForm"

export const MAX_ROWS = 20
let seq = 0
const nextId = () => `r${++seq}`
const thumbUrl = (file) => (file.type.startsWith("image/") ? URL.createObjectURL(file) : null)
const revoke = (f) => f.url && URL.revokeObjectURL(f.url)

/**
 * Masraf kalemleri: her kalemin değerleri ve fiş görselleri; bir anda tek kalem açık (`active`),
 * ötekiler tek satır özet. Yeni ya da kopyalanan kalem açılır. Fişin ön izleme adresi kalem
 * silinince, fiş kaldırılınca ve form kapanınca bırakılır.
 */
export function useExpenseRows() {
  const [rows, setRows] = useState(() => [newExpenseRow(nextId())])
  const [active, setActive] = useState(() => rows[0].id)

  const live = useRef(rows)
  useEffect(() => {
    live.current = rows
  }, [rows])
  useEffect(() => () => live.current.forEach((r) => r.files.forEach(revoke)), [])

  const patch = (id, fn) => setRows((rs) => rs.map((r) => (r.id === id ? fn(r) : r)))
  const withValues = (id, fn) => patch(id, (r) => ({ ...r, values: fn(r.values) }))
  const insert = (at, row) => {
    if (rows.length >= MAX_ROWS) return null
    setRows((rs) => [...rs.slice(0, at), row, ...rs.slice(at)])
    setActive(row.id)
    return row.id
  }

  return {
    rows,
    active,
    activate: setActive,
    set: (id, name, value) => withValues(id, (v) => applySlot("expense", v, name, value).values),
    addSlot: (id, field) =>
      withValues(id, (v) => ({ ...v, [field.name]: field.slot.addDefault(v) })),
    removeSlot: (id, name) =>
      withValues(id, (v) => {
        const next = { ...v }
        delete next[name]
        return next
      }),
    // Yeni kalem sonuncunun tarihini ve para birimini alır: aynı gezinin fişleri çoğunlukla öyle.
    append: () => {
      const last = rows[rows.length - 1].values
      const fresh = newExpenseRow(nextId())
      fresh.values = { ...fresh.values, date: last.date, currency: last.currency }
      return insert(rows.length, fresh)
    },
    duplicate: (id) => {
      const at = rows.findIndex((r) => r.id === id)
      return insert(at + 1, newExpenseRow(nextId(), rows[at]))
    },
    remove: (id) => {
      if (rows.length < 2) return
      const at = rows.findIndex((r) => r.id === id)
      rows[at].files.forEach(revoke)
      if (active === id) setActive(rows[at > 0 ? at - 1 : 1].id)
      setRows((rs) => rs.filter((r) => r.id !== id))
    },
    addFiles: (id, files) =>
      patch(id, (r) => ({
        ...r,
        files: [...r.files, ...files.map((file) => ({ id: nextId(), file, url: thumbUrl(file) }))],
      })),
    removeFile: (id, fileId) => {
      rows.find((r) => r.id === id)?.files.forEach((f) => f.id === fileId && revoke(f))
      patch(id, (r) => ({ ...r, files: r.files.filter((f) => f.id !== fileId) }))
    },
  }
}
