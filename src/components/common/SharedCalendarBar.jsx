import { useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import Add01Icon from "@hugeicons/core-free-icons/Add01Icon"
import UserAdd01Icon from "@hugeicons/core-free-icons/UserAdd01Icon"
import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import { useSharedCalendarProbe } from "@/hooks/useSharedCalendarProbe"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"

/**
 * Takvimini bizimle paylaşan kişilerin şeridi — Outlook'un "Kişilerin
 * Takvimleri" listesinin karşılığı.
 *
 * Kimin paylaştığı SORULAMAZ: Graph'ta böyle bir uç yok, paylaşım Exchange
 * tarafında yapılıyor. Okunabilen tek şey, adını verdiğin bir kişinin takvimi
 * sana açık mı — `/users/{upn}/calendarView` ya veriyi ya 403'ü döner. Bu
 * yüzden liste kullanıcının kendi kurduğu listedir ve tarayıcıda saklanır.
 *
 * Erişilemeyen kişi listeden ATILMAZ, işaretlenir: "paylaşmamış" ile "izin
 * yok" ikisi de 403 ve ayırt edemiyoruz; kişiyi sessizce düşürmek,
 * kullanıcının eksik bir takvime bakıp bunu bilmemesi olurdu.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function SharedCalendarBar({ people, candidates = [], unreachable, onChange }) {
  const { t } = useLocale()
  const [adding, setAdding] = useState(false)
  const [text, setText] = useState("")
  // Listede yalnızca takvimi GERÇEKTEN bize açık olanlar çıkar. Adaylar
  // kendi toplantılarımızın katılımcıları; her biri tek tek denenir ve
  // 200 dönen kalır (bkz. useSharedCalendarProbe). Önceki hâli denemeden
  // hepsini listeliyordu ve kullanıcı için anlamsız isimlerle doluydu.
  const { open: available, checking } = useSharedCalendarProbe(candidates, adding)

  const matches = useMemo(() => {
    const q = text.trim().toLowerCase()
    return available
      .filter(
        (r) =>
          !people.some((p) => p.address.toLowerCase() === r.address.toLowerCase()) &&
          (!q || r.name.toLowerCase().includes(q) || r.address.toLowerCase().includes(q)),
      )
      .slice(0, 8)
  }, [text, available, people])

  const blocked = useMemo(
    () => new Set(unreachable.map((p) => p.address.toLowerCase())),
    [unreachable],
  )

  function add(entry) {
    const person =
      typeof entry === "string"
        ? EMAIL_RE.test(entry.trim())
          ? { name: entry.trim(), address: entry.trim() }
          : null
        : entry
    if (!person) return
    if (people.some((p) => p.address.toLowerCase() === person.address.toLowerCase())) return
    onChange([...people, person])
    setText("")
    setAdding(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-1 px-3 pt-2.5">
      {people.map((p) => {
        const failed = blocked.has(p.address.toLowerCase())
        return (
          <span
            key={p.address}
            title={failed ? t("calendar.sharedUnreachable", { name: p.name }) : p.address}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem]",
              failed ? "bg-destructive/10 text-destructive" : "bg-brand/10 text-brand-ink",
            )}
          >
            {failed && <HugeiconsIcon icon={Alert02Icon} className="size-3" strokeWidth={2} />}
            <span className="max-w-[9rem] truncate">{p.name}</span>
            <button
              type="button"
              aria-label={p.name}
              onClick={() => onChange(people.filter((x) => x.address !== p.address))}
              className="grid size-3.5 place-items-center rounded-sm opacity-60 hover:opacity-100"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-3" strokeWidth={2.4} />
            </button>
          </span>
        )
      })}

      {adding ? (
        <div className="relative min-w-[10rem] flex-1">
          <input
            autoFocus
            value={text}
            onChange={(e) => {
              setText(e.target.value)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") add(matches[0] ?? text)
              if (e.key === "Escape") {
                setAdding(false)
                setText("")
              }
            }}
            // Liste açıkken blur ile kapanmaz; kapatma Escape ya da seçimle olur.
            onBlur={(e) => {
              if (!e.currentTarget.parentElement?.contains(e.relatedTarget)) {
                window.setTimeout(() => setAdding(false), 120)
              }
            }}
            placeholder={t("calendar.sharedAddPlaceholder")}
            className="w-full rounded-md bg-foreground/[0.04] px-2 py-1 text-[0.71875rem] outline-none placeholder:text-muted-foreground/70"
          />
          {matches.length === 0 && (checking || text.trim().length > 0) && (
            <ul className="absolute z-20 mt-1 w-full rounded-lg border border-border/60 bg-popover p-1 shadow-md">
              {matches.length === 0 && (
                <li className="px-2 py-1.5 text-[0.65625rem] leading-snug text-muted-foreground">
                  {checking ? t("calendar.sharedChecking") : t("calendar.sharedNoneOpen")}
                </li>
              )}
            </ul>
          )}
          {matches.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full rounded-lg border border-border/60 bg-popover p-1 shadow-md">
              {matches.map((m) => (
                <li key={m.address}>
                  <button
                    type="button"
                    // Odağı korur: blur tıklamadan önce çalışsaydı seçim
                    // kaybolurdu (posta kutusunda ölçülmüş aynı tuzak).
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => add(m)}
                    className="flex w-full flex-col items-start rounded-md px-2 py-1 text-left hover:bg-accent/60"
                  >
                    <span className="text-[0.71875rem] font-medium leading-tight">{m.name}</span>
                    <span className="text-[0.625rem] leading-tight text-muted-foreground">
                      {m.address}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : people.length === 0 ? (
        // BOŞKEN tam genişlikte, kesikli çerçeveli bir davet. Önceki hâli
        // gri, küçük ve satır sonuna sıkışmış bir metindi — kullanıcı orada
        // bir şey olduğunu fark etmiyordu. Kesikli çerçeve "buraya bir şey
        // eklenir" demenin en sessiz yolu; renk marka tonunda ama dolgusuz,
        // yani takvimin kendisiyle yarışmıyor.
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex w-full items-center gap-2 rounded-lg border border-dashed border-brand/40 bg-brand/[0.06] px-2.5 py-1.5 text-left transition hover:border-brand/60 hover:bg-brand/10"
        >
          <span className="grid size-6 shrink-0 place-items-center rounded-md bg-brand/15 text-brand-ink">
            <HugeiconsIcon icon={UserAdd01Icon} className="size-3.5" strokeWidth={1.9} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.71875rem] font-semibold leading-tight text-brand-ink">
              {t("calendar.sharedAdd")}
            </span>
            <span className="block truncate text-[0.625rem] leading-tight text-muted-foreground">
              {t("calendar.sharedAddHint")}
            </span>
          </span>
        </button>
      ) : (
        // Kişi varken davet küçülür ama SÖNMEZ: marka tonlu bir hap olarak
        // çiplerin yanında durur, gri bir metin olarak değil.
        <button
          type="button"
          onClick={() => setAdding(true)}
          title={t("calendar.sharedAdd")}
          className="inline-flex items-center gap-1 rounded-md bg-brand/10 px-1.5 py-0.5 text-[0.6875rem] font-medium text-brand-ink transition hover:bg-brand/20"
        >
          <HugeiconsIcon icon={Add01Icon} className="size-3" strokeWidth={2.4} />
          {t("calendar.sharedAddMore")}
        </button>
      )}
    </div>
  )
}
