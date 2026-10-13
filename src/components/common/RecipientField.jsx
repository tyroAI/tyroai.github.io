import { useMemo, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import { Label } from "@/components/ui/label"
import { usePeopleSearch } from "@/hooks/useRecentPeople"
import { fold } from "@/lib/fold"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Kişi çipleri + serbest giriş. Ad da yazılabilir ama adresi olmayan satır
 * gönderilmez; çağıran `unresolvedRecipients` ile uyarır.
 *
 * Öneriler iki kaynaktan: yazıştığın kişiler (`suggestions`) ve şirket
 * dizini (`usePeopleSearch`; `directory` kapalıysa hiç sorulmaz). Dizin izni
 * yoksa arama sessizce boş döner, yerel liste tek başına çalışır.
 */
export function RecipientField({
  id,
  label,
  value,
  onChange,
  suggestions,
  placeholder,
  directory = true,
}) {
  const [text, setText] = useState("")
  const inputRef = useRef(null)
  const remote = usePeopleSearch(text, directory)

  // ⚠️ Katlama `fold`, düz `toLowerCase()` DEĞİL: "ŞULE".toLowerCase()
  // "sule" vermez, "şule" kalır — "sule" yazan Şule'yi
  // bulamıyordu. Yerel eşleşmeler ÖNCE (yazıştığın kişi dizindeki adaşından
  // önce gelmeli), dizin sonuçları arkadan; adres küçük harfle tekilleşir.
  const matches = useMemo(() => {
    const q = fold(text)
    if (q.length < 2) return []
    const taken = new Set(value.map((v) => (v.address || "").toLowerCase()))
    const local = suggestions.filter(
      (p) =>
        !taken.has(p.address.toLowerCase()) &&
        (fold(p.name).includes(q) || fold(p.address).includes(q)),
    )
    const seen = new Set(local.map((p) => p.address.toLowerCase()))
    const extra = remote.filter((p) => {
      const k = p.address.toLowerCase()
      if (taken.has(k) || seen.has(k)) return false
      seen.add(k)
      return true
    })
    return [...local, ...extra].slice(0, 6)
  }, [text, suggestions, remote, value])

  const add = (entry) => {
    const trimmed = typeof entry === "string" ? entry.trim().replace(/[;,]$/, "") : null
    const next = trimmed ? { name: trimmed, address: EMAIL_RE.test(trimmed) ? trimmed : "" } : entry
    if (!next || (!next.address && !next.name)) return
    if (value.some((v) => (v.address || v.name) === (next.address || next.name))) return
    onChange([...value, next])
    setText("")
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[0.71875rem] text-muted-foreground">
        {label}
      </Label>
      <div
        className="flex min-h-9 flex-wrap items-center gap-1 rounded-lg border border-input bg-transparent px-2 py-1.5 focus-within:ring-2 focus-within:ring-brand/30"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((p) => (
          <span
            key={p.address || p.name}
            className="inline-flex items-center gap-1 rounded-md bg-brand/10 px-1.5 py-0.5 text-[0.71875rem] text-brand-ink"
          >
            {p.name}
            <button
              type="button"
              aria-label={p.name}
              onClick={(e) => {
                e.stopPropagation()
                onChange(value.filter((v) => v !== p))
              }}
              className="grid size-3.5 place-items-center rounded-sm opacity-60 hover:opacity-100"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-3" strokeWidth={2.4} />
            </button>
          </span>
        ))}
        <input
          id={id}
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Enter / virgül / noktalı virgül çipe çevirir; boşken geri silme
            // son çipi alır — her posta istemcisinin davranışı.
            if (e.key === "Enter" || e.key === "," || e.key === ";") {
              e.preventDefault()
              add(matches[0] ?? text)
            } else if (e.key === "Backspace" && !text && value.length) {
              onChange(value.slice(0, -1))
            }
          }}
          onBlur={() => text.trim() && add(text)}
          placeholder={value.length ? "" : placeholder}
          className="min-w-[8rem] flex-1 bg-transparent text-[0.78125rem] outline-none placeholder:text-muted-foreground/70"
        />
      </div>
      {matches.length > 0 && (
        <ul className="rounded-lg border border-border/60 bg-popover p-1 shadow-sm">
          {matches.map((p) => (
            <li key={p.address}>
              <button
                type="button"
                // `onMouseDown` + preventDefault ŞART: tıklama tamamlanmadan
                // input blur oluyor, blur da yazılan ham metni ("şule")
                // çipe çeviriyordu — seçilen kişinin ADRESİ böyle kaybolup
                // yerine çözümlenemez bir ad kalıyordu (sahada görüldü).
                // Odak korununca blur hiç çalışmıyor ve seçim ayakta kalıyor.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add(p)}
                className="flex w-full flex-col items-start rounded-md px-2 py-1 text-left hover:bg-accent/60"
              >
                <span className="text-[0.75rem] font-medium leading-tight">{p.name}</span>
                <span className="text-[0.65625rem] leading-tight text-muted-foreground">
                  {p.address}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
