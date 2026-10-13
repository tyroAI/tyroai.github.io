import { useMemo } from "react"
import { AnimatePresence, motion } from "motion/react"
import { FORM_OPEN, formFields } from "@/lib/requestForm"
import { fieldSelector, focusSoon, isWide } from "./formUi"
import { AddableChips, SlotField } from "./SlotField"

const IN = { opacity: 0, y: -4 }
const SHOWN = { opacity: 1, y: 0 }

/**
 * Şablonun alanları iki sütunlu ızgarada (dar kapta tek sütun): önce zorunlu ve varsayılanlı
 * alanlar, sonra eklenen isteğe bağlı alanlar, en altta eklenmemişlerin "+ alan" çipleri.
 * `children`: ızgaranın altına, çiplerin üstüne (masrafta fiş görselleri).
 */
export function SlotGrid({ tkey, idBase, values, errors, onChange, onAdd, onRemove, children }) {
  const { main, extra } = useMemo(() => formFields(tkey), [tkey])
  const fixed = FORM_OPEN[tkey] ?? []
  const added = extra.filter((f) => values[f.name] !== undefined)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-x-3 gap-y-4 @[28rem]/form:grid-cols-2">
        <AnimatePresence initial={false}>
          {[...main, ...added].map((f) => (
            <motion.div
              key={f.name}
              initial={f.slot.addable ? IN : false}
              animate={SHOWN}
              exit={IN}
              transition={{ duration: 0.18 }}
              className={isWide(f.slot) ? "@[28rem]/form:col-span-2" : undefined}
            >
              <SlotField
                tkey={tkey}
                idBase={idBase}
                field={f}
                values={values}
                onChange={onChange}
                error={errors?.[f.name]}
                onRemove={
                  f.slot.addable && !fixed.includes(f.name)
                    ? (name) => {
                        onRemove(name)
                        focusSoon(`#${CSS.escape(`${idBase}-add-${name}`)}`)
                      }
                    : null
                }
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {children}
      <AddableChips
        idBase={idBase}
        fields={extra}
        values={values}
        onAdd={(f) => {
          onAdd(f)
          focusSoon(fieldSelector(idBase, f.name))
        }}
      />
    </div>
  )
}
