import { cn } from "@/lib/utils"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  GÜVENLİK EKRANININ KENDİ PARÇALARI
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ── NEDEN `profile/primitives.jsx` DEĞİL ───────────────────────────────
 *
 * Kart kabuğu, kaş başlık ve rozet oradan geliyor (aynı uygulamada iki
 * kart dili olmasın). Buradakiler o dosyanın taşımadığı, yalnız bu
 * ekranın ihtiyacı olan üç şey: bir KİMLİK hücresi, bir OPAK DEĞER plakası
 * ve bir DURUM kanalı.
 *
 * ⚠️ `CodeChip` BİLEREK kullanılmıyor: o `font-mono` taşıyor ve bu turun
 * işi tam olarak mono fontu bu ekrandan kaldırmak (istek üzerine,
 * 2026-09-17). `CodeChip`in kendisini değiştirmek profil sayfasını da
 * etkilerdi — ayrı bir iş.
 */

/**
 * OPAK DEĞER — GUID, kapsam URI'si, depolama anahtarı.
 *
 * ⚠️ **MONO YERİNE PLAKA + AÇIK HARF ARASI.** Mono burada iki iş
 * yapıyordu: opak bir jetonu düz metinden AYIRMAK ve harfleri tek tek
 * ayırt edilebilir kılmak. Birincisini tonlu bir plaka yapıyor,
 * ikincisini `tracking-[0.015em]` + `tabular-nums` +
 * `[font-variant-ligatures:none]`. Inter'in `1`/`l`/`I` ve `0`/`O`
 * ayrımı zaten net; bağ (ligature) kapatılınca kalan tek risk de gidiyor.
 *
 * Kazanç yalnızca tutarlılık değil: mono, aynı ekranda ikinci bir ses
 * gibi duruyordu — bir tasarım değil, bir konsol çıktısı gibi.
 */
export function ValueChip({ children, className, title }) {
  return (
    <span
      title={title}
      className={cn(
        "inline-block max-w-full rounded-md bg-foreground/[0.045] px-1.5 py-0.5",
        "text-[0.71875rem] leading-relaxed text-foreground/[0.82]",
        "tracking-[0.015em] tabular-nums [font-variant-ligatures:none]",
        "break-words dark:bg-white/[0.06]",
        className,
      )}
    >
      {children}
    </span>
  )
}

/**
 * KİMLİK HÜCRESİ — giriş adresi, iki satırda.
 *
 * ⚠️ **ADRES `@`DEN BÖLÜNÜR.** Tek tenantlı bir şirkette
 * `@<alan adı>` iki yüz satırın tamamında tekrar ediyor: aynı
 * ağırlıkta, sıfır ayırt edici bilgi taşıyan iki yüz tekrar. Yerel kısım
 * öne alınıp alan adı bir kademe geriye atılınca geriye gözün tarayacağı
 * TEK sütun kalıyor — bu, mono bir tek satırdan daha okunur.
 *
 * ⚠️ `break-all` KULLANILMAZ (eski hâli öyleydi): adı hecenin ortasından
 * kırıyordu. `truncate` + tam adresi taşıyan `title` doğrusu.
 *
 * ⚠️ Alan adı tenant'lar arası farkın tek işareti — kiracıda 801 aktif
 * kullanıcının 237'sinde giriş adresi ile posta adresi farklı ve o fark
 * çoğu zaman alan adında. Silinmiyor, yalnız geri plana alınıyor.
 */
export function IdentityCell({ upn, className, size = "md" }) {
  const at = String(upn ?? "").indexOf("@")
  const local = at === -1 ? String(upn ?? "") : upn.slice(0, at)
  const domain = at === -1 ? "" : upn.slice(at)
  return (
    <span className={cn("flex min-w-0 flex-col", className)} title={upn || undefined}>
      <span
        className={cn(
          "truncate tracking-[-0.006em] [font-variant-ligatures:none]",
          size === "sm"
            ? "text-[0.75rem] font-medium text-foreground/[0.88]"
            : "text-[0.8125rem] font-medium text-foreground",
        )}
      >
        {local || "—"}
      </span>
      {domain ? (
        <span className="truncate text-[0.6875rem] leading-tight text-muted-foreground/75">
          {domain}
        </span>
      ) : null}
    </span>
  )
}

/**
 * SAYI ÇİPİ — bölüm başlıklarındaki adet.
 *
 * `--badge` / `--badge-foreground` çifti tam bunun için var: görsel alanı
 * kırması gereken ama bir DURUM olmayan bir sayı. Eskiden
 * `bg-foreground/[0.06]` ile çiziliyordu ve zeminden ayrılmıyordu.
 */
export function CountChip({ children, className }) {
  return (
    <span
      className={cn(
        "grid min-w-[1.25rem] shrink-0 place-items-center rounded-full px-1.5",
        "bg-badge text-badge-foreground",
        "text-[0.6875rem] font-semibold leading-5 tabular-nums",
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Kaş başlık — bölüm ayracı. Profil sayfasındakiyle aynı ölçü. */
export function Eyebrow({ children, className }) {
  return (
    <span
      className={cn(
        "text-[0.625rem] font-semibold uppercase tracking-[0.13em] text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  )
}

/**
 * PANEL ARAÇ ÇUBUĞU — arama · süzgeç · sağ taraf.
 *
 * ⚠️ **SEKME ŞERİDİNİN ALTINDA, İÇİNDE DEĞİL.** Şerit üç sekmenin
 * ortak imzası; ona sekmeye özgü kontrol koymak, sekme değiştirince
 * şeridin kendisini değiştirirdi. Araç çubuğu sekmenin İÇERİĞİNE ait.
 *
 * ⚠️ Sarmalama (`flex-wrap`) kapsayıcı sorgusuyla değil doğal akışla:
 * arama + iki süzgeç + iki düğme dar alanda kendiliğinden alt satıra
 * iniyor ve her kırılım için ayrı bir kural yazmak gerekmiyordu.
 */
export function PanelToolbar({ children, className }) {
  return <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}</div>
}

/**
 * SÜZGEÇ SEGMENTİ — sekme şeridinin yarım ölçeği.
 *
 * Aynı görsel aile (gömülü track + yüzen aktif düğme), yarı boy. Üçüncü
 * bir kontrol dili üretmemek için: kullanıcı bu şekli sekmelerden zaten
 * tanıyor, ikinci kez öğrenmesi gerekmiyor.
 */
export function FilterSegment({ value, onChange, options, ariaLabel }) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex shrink-0 gap-0.5 rounded-lg bg-muted/60 p-0.5 dark:bg-white/[0.04]"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[0.75rem] font-medium transition-colors",
            "[@media(pointer:coarse)]:min-h-9 [@media(pointer:coarse)]:px-2.5",
            value === o.value
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
          {o.count > 0 && (
            <span
              className={cn(
                "tabular-nums",
                value === o.value ? "text-muted-foreground" : "text-muted-foreground/60",
              )}
            >
              {o.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

/**
 * SAYFALAMA — 800 kayıtlık bir listede tek gerçek çare.
 *
 * ⚠️ **İSTEMCİ TARAFINDA, ve bu ölçülmüş bir karar.** `fetchAuthorizations`
 * bütün satırları TEK sorguda getiriyor (Dataverse sayfası 5000, tablo
 * ~800) ve `apiAll` fazlasını da takip ediyor. Sunucu tarafı sayfalama
 * eklemek, her sayfa dönüşünde bir ağ turu ve arama/süzgeç için sunucuya
 * giden ikinci bir sorgu demekti — elde zaten olan bir dizi için.
 *
 * ⚠️ **SAYI SÜZÜLMÜŞ VE TOPLAM OLMAK ÜZERE İKİ TANE.** "1–25 / 812"
 * ararken "1–3 / 3 (812 içinde)" olur: aramanın kaç kaydı elediğini
 * göstermeyen bir sayaç, kullanıcıya listenin kısaldığını söylemez.
 */
export function Pagination({ page, pageCount, from, to, filtered, total, onPage, labels }) {
  if (pageCount <= 1 && filtered === total) return null
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 px-4 py-2.5">
      <span className="text-[0.75rem] tabular-nums text-muted-foreground">
        {filtered === 0 ? labels.none : `${from}–${to} / ${filtered}`}
        {filtered !== total && (
          <span className="text-muted-foreground/60"> {labels.ofTotal.replace("{n}", total)}</span>
        )}
      </span>
      {pageCount > 1 && (
        <span className="flex items-center gap-1">
          <PageButton onClick={() => onPage(page - 1)} disabled={page <= 1} label={labels.prev}>
            ‹
          </PageButton>
          <span className="px-1 text-[0.75rem] tabular-nums text-muted-foreground">
            {page} / {pageCount}
          </span>
          <PageButton
            onClick={() => onPage(page + 1)}
            disabled={page >= pageCount}
            label={labels.next}
          >
            ›
          </PageButton>
        </span>
      )}
    </div>
  )
}

function PageButton({ onClick, disabled, label, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "grid size-7 place-items-center rounded-md text-[0.875rem] leading-none transition-colors",
        "[@media(pointer:coarse)]:size-9",
        disabled
          ? "cursor-default text-muted-foreground/30"
          : "text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}

/**
 * ARAMA ALANI — ikonlu, temizlenebilir.
 *
 * ⚠️ Kısayol ipucu (`/` tuşu) BİLEREK yok: bu ekran günde birkaç kez
 * açılıyor, her gün değil; öğrenilmeyecek bir kısayolun ipucu yalnızca
 * gürültü. Esc ile temizleme var, çünkü o öğrenilmesi gerekmeyen bir
 * reflekstir.
 */
export function SearchInput({ value, onChange, placeholder, className }) {
  return (
    <span className={cn("relative min-w-0 flex-1 @[560px]/security:max-w-64", className)}>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/60"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onChange("")}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(
          "no-ios-zoom h-9 w-full rounded-lg border border-border bg-card pl-8 pr-2.5",
          "text-[0.8125rem] outline-none transition",
          "placeholder:text-muted-foreground/70",
          "focus-visible:border-brand/40 focus-visible:ring-2 focus-visible:ring-brand/25",
          "[&::-webkit-search-cancel-button]:appearance-none",
        )}
      />
    </span>
  )
}
