import { useState } from "react"
import { compressImageFile } from "@/lib/copilot"
import { applySlot, initialValues } from "@/lib/promptTemplates"
import {
  FORM_TEMPLATE,
  expenseMessage,
  formErrors,
  newExpenseRow,
  packReceipts,
  requestMessage,
  valuesChanged,
} from "@/lib/requestForm"
import { useExpenseRows } from "./useExpenseRows"

const count = (errors) => Object.keys(errors).length

/**
 * Talep formunun durumu. İzin ve avans tek değer kümesi; masraf kalem kalem (`useExpenseRows`).
 * Hatalar ilk gönderme denemesinden sonra görünür (`tried`); eksikle gönderilen masrafta ilk
 * hatalı kalem açılır.
 */
export function useRequestForm(kind) {
  const key = FORM_TEMPLATE[kind]
  // Başlangıç değerleri saklanır: "dolu mu" bunlarla karşılaştırılır.
  const [start] = useState(() => ({
    values: initialValues(key),
    row: newExpenseRow("start").values,
  }))
  const [values, setValues] = useState(start.values)
  const [tried, setTried] = useState(false)
  // İzinde başlangıç seçilince bitişin takvimi kendiliğinden açılır (`applySlot`).
  const [openDate, setOpenDate] = useState(null)
  const expense = useExpenseRows()
  const { rows } = expense

  const setSlot = (name, value) => {
    const next = applySlot(key, values, name, value)
    setValues(next.values)
    if (next.open) setOpenDate(next.open)
  }
  const addSlot = (field) => setValues((v) => ({ ...v, [field.name]: field.slot.addDefault(v) }))
  const removeSlot = (name) =>
    setValues((v) => {
      const next = { ...v }
      delete next[name]
      return next
    })

  const isExpense = kind === "expense"
  // Kişinin girdiği bir şey var mı: varsa form dışarı dokunuşla kapanmaz, kapatmak onay ister.
  const dirty = isExpense
    ? rows.length > 1 || rows.some((r) => r.files.length > 0 || valuesChanged(start.row, r.values))
    : valuesChanged(start.values, values)
  const errors = isExpense ? null : formErrors(key, values)
  const rowErrors = isExpense ? rows.map((r) => formErrors("expense", r.values)) : null
  const invalid = isExpense ? rowErrors.reduce((n, e) => n + count(e), 0) : count(errors)

  /**
   * Gönderilecek mesaj ve dosyalar (Promise: fişler önce küçültülür, `packReceipts`); eksik varsa
   * `null` (hatalar görünür olur).
   */
  const build = (t, locale) => {
    if (invalid) {
      setTried(true)
      if (isExpense && !count(rowErrors[rows.findIndex((r) => r.id === expense.active)] ?? {}))
        expense.activate(rows[rowErrors.findIndex((e) => count(e))].id)
      return null
    }
    if (!isExpense)
      return Promise.resolve({ text: requestMessage(t, locale, key, values), files: [] })
    return packReceipts(
      rows.map((r) => ({ files: r.files.map((f) => f.file) })),
      (n) => t("selfService.form.receiptFile", { n }),
      compressImageFile,
    ).then(({ names, files }) => ({ text: expenseMessage(t, locale, rows, names), files }))
  }

  return {
    key,
    values,
    setSlot,
    addSlot,
    removeSlot,
    expense,
    openDate,
    setOpenDate,
    errors: tried ? errors : null,
    rowErrors: tried ? rowErrors : null,
    invalid: tried ? invalid : 0,
    dirty,
    build,
  }
}
