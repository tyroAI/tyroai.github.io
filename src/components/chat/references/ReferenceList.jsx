import { forwardRef, useImperativeHandle, useRef } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useLocale } from "@/hooks/useLocale"
import { STATUS } from "@/lib/graph"
import { foldTr } from "./referenceSources"
import { cn } from "@/lib/utils"

/**
 * Bir sekmenin gövdesi: satırlar, altı durum ve klavye seçimi.
 *
 * Klavye neden BURADA: besteci ↑/↓/Enter'ı yakalıyor ama satırlar sekme
 * bileşenlerinin içinde yaşıyor (her sekme kendi hook'unu çağırıyor ve ancak
 * ETKİNKEN mount ediliyor — Dokümanlar sekmesi mount olur olmaz ağa çıkıyor).
 * Seçili satırı state'e taşımak yerine imperatif bir tutamak veriliyor:
 * besteci "bir aşağı" der, aktif gövde kendi listesinde gezer. Böylece satır
 * listesi hiç yukarı akmaz ve effect içinde setState zinciri kurulmaz.
 *
 * "Soramadık ≠ veri yok" burada sekme başına uygulanır: izin verilmemiş bir
 * kaynak BOŞ LİSTE göstermez, bir cümle ve **Bağlan** düğmesi gösterir.
 */
export const ReferenceList = forwardRef(function ReferenceList(
  {
    status,
    rows,
    error,
    query,
    onPick,
    onConnect,
    onRetry,
    emptyKey,
    footer,
    listId,
    compact,
    index = 0,
    onIndexChange,
    total,
  },
  ref,
) {
  const { t } = useLocale()
  const scrollRef = useRef(null)

  // Seçili satırın numarası PANELDE yaşıyor (bkz. ReferencePicker): ekran
  // okuyucuya duyurulacak `aria-activedescendant` en yukarıya, besteciye
  // kadar çıkıyor ve sıfırlama kararı da orada veriliyor — burada tutulsaydı
  // "sonuç sayısı tesadüfen aynı" durumunda seçim eski satırda kalıyordu.
  const at = Math.min(Math.max(index, 0), Math.max(rows.length - 1, 0))
  const setAt = (i) => onIndexChange?.(i)

  useImperativeHandle(
    ref,
    () => ({
      move(delta) {
        if (rows.length === 0) return
        const index = at
        // Liste SARMAZ: uçta durur. Sarmalayan liste, uzun listede
        // kullanıcının nerede olduğunu kaybettiriyor.
        const next = Math.min(Math.max(index + delta, 0), rows.length - 1)
        setAt(next)
        queueMicrotask(() => {
          const el = scrollRef.current?.querySelector(`[data-row-index="${next}"]`)
          el?.scrollIntoView({ block: "nearest" })
        })
      },
      pick() {
        const row = rows[at]
        if (row) onPick(row)
        return Boolean(row)
      },
      count: rows.length,
      activeId: rows[at]?.id ?? null,
    }),
    [at, rows, onPick],
  )

  // `STATUS`ta "loading" YOK — hook'lar bu durumu düz dize olarak taşıyor.
  if (status === "loading") {
    return (
      <div className="space-y-1.5 p-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2.5 px-2 py-1.5">
            <Skeleton className="size-6 shrink-0 rounded-lg" />
            <Skeleton className="h-3 flex-1 rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (status === STATUS.denied) {
    return (
      <Notice
        text={error === "consent_required" ? t("ref.denied") : t("ref.staleSession")}
        actionLabel={t("ref.connect")}
        onAction={onConnect}
      />
    )
  }

  if (status === STATUS.error) {
    return <Notice text={t("ref.error")} actionLabel={t("ref.retry")} onAction={onRetry} />
  }

  if (status === STATUS.unauthenticated) {
    return <Notice text={t("ref.signedOut")} />
  }

  if (rows.length === 0) {
    // "Bu listede kayıt yok" ile "aradığın eşleşmedi" AYRI cümleler: ikisini
    // birleştirmek, dolu bir listede yazım hatası yapan kullanıcıya kaynağın
    // boş olduğunu söylerdi.
    return <Notice text={query.trim() ? t("ref.noMatch") : t(emptyKey ?? "ref.empty")} />
  }

  return (
    <>
      <ul
        ref={scrollRef}
        id={listId}
        role="listbox"
        aria-label={t("ref.results")}
        className="max-h-[min(46dvh,18rem)] overflow-y-auto overscroll-contain p-1.5"
      >
        {rows.map((row, i) => (
          <li key={row.id}>
            <button
              type="button"
              role="option"
              id={`${listId}-${i}`}
              aria-selected={i === at}
              data-row-index={i}
              // Fare imleci klavye seçimini TAŞIR: iki ayrı vurgu (biri fare,
              // biri klavye) aynı anda görünürse Enter'ın hangisini
              // ekleyeceği belirsiz kalıyor.
              onMouseMove={() => setAt(i)}
              // Besteci odağı bırakmamalı: seçiciyi açan textarea'dır ve
              // dokunmatikte odak kaybı yumuşak klavyeyi kapatır.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onPick(row)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors",
                i === at ? "bg-brand/10" : "hover:bg-accent/60",
              )}
            >
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-lg",
                  i === at
                    ? "bg-brand/15 text-brand-ink"
                    : "bg-foreground/[0.06] text-muted-foreground",
                )}
              >
                {row.initials ? (
                  <span className="text-[0.625rem] font-semibold uppercase">{row.initials}</span>
                ) : (
                  <HugeiconsIcon icon={row.icon} className="size-3.5" strokeWidth={1.8} />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-[0.78125rem] font-medium text-foreground">
                    <Highlight text={row.title} query={query} />
                  </span>
                  {/* Rozet SAKİN: gider hesaplarında aynı kategori her satırda
                      tekrar ediyor ve marka renginde olduğunda listeyi rozet
                      duvarına çeviriyordu. Bilgi kalsın, gürültü kalmasın. */}
                  {row.badge && (
                    <span className="shrink-0 rounded px-1 py-px text-[0.59375rem] font-medium uppercase tracking-wide text-muted-foreground ring-1 ring-border">
                      {row.badge}
                    </span>
                  )}
                </span>
                {row.subtitle && (
                  // Dar kapsayıcıda ikincil bilgi ALT SATIRA iner; 340 px'lik
                  // dock'ta sağa yaslanınca başlığı iki karaktere düşürüyordu.
                  <span className="mt-px block truncate text-[0.6875rem] text-muted-foreground">
                    {row.subtitle}
                  </span>
                )}
              </span>
              {/* Panel PORTALDA yaşıyor, yani `@container/chat` ölçümünün
                  dışında: kapsayıcı sorguları burada hiç eşleşmiyordu ve
                  ikincil bilgi her genişlikte gizli kalıyordu. Ölçüyü panelin
                  kendi genişliği veriyor. */}
              {row.meta && !compact && (
                <span className="shrink-0 text-[0.65625rem] tabular-nums text-muted-foreground">
                  {row.meta}
                </span>
              )}
            </button>
          </li>
        ))}
        {/* Kesilen satır sayısı SÖYLENİR: liste 50'de duruyor ve bunu
            yazmadığımızda kullanıcı aradığı kaydı "yok" sanıyordu. */}
        {total > rows.length && (
          <li className="px-3 pb-1 pt-2 text-center text-[0.65625rem] text-muted-foreground/80">
            {t("ref.more", { n: total - rows.length })}
          </li>
        )}
      </ul>
      {footer}
    </>
  )
})

/**
 * Eşleşen parçayı işaretler.
 *
 * `foldTr` 1:1 uzunluk koruyor (İ→i, I→ı, ı→i), yani katlanmış metinde
 * bulunan konum ham metinde de aynı konumdur — vurgu kaymaz. Uzun bir
 * listede kullanıcının "neden bu satır çıktı" sorusunu tek bakışta
 * cevaplıyor.
 */
function Highlight({ text, query }) {
  const q = foldTr(String(query ?? "").trim())
  const raw = String(text ?? "")
  if (!q) return raw
  const at = foldTr(raw).indexOf(q)
  if (at < 0) return raw
  return (
    <>
      {raw.slice(0, at)}
      <mark className="rounded-sm bg-brand/20 px-px text-inherit">
        {raw.slice(at, at + q.length)}
      </mark>
      {raw.slice(at + q.length)}
    </>
  )
}

function Notice({ text, actionLabel, onAction }) {
  return (
    <div className="px-4 py-6 text-center">
      <p className="text-[0.75rem] leading-snug text-muted-foreground">{text}</p>
      {actionLabel && onAction && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          // Otomatik yükseltme yasak, kullanıcının bastığı düğme değil:
          // sessiz alım düşünce panel kendiliğinden popup açmaz, bu düğme açar.
          onMouseDown={(e) => e.preventDefault()}
          onClick={onAction}
          className="mt-2.5 h-7 rounded-full px-3 text-[0.71875rem]"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
