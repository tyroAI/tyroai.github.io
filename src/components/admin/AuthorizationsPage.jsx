import { HugeiconsIcon } from "@hugeicons/react"
import UserMultipleIcon from "@hugeicons/core-free-icons/UserMultipleIcon"
import InboxIcon from "@hugeicons/core-free-icons/InboxIcon"
import RefreshIcon from "@hugeicons/core-free-icons/RefreshIcon"
import CheckmarkCircle02Icon from "@hugeicons/core-free-icons/CheckmarkCircle02Icon"
import Clock01Icon from "@hugeicons/core-free-icons/Clock01Icon"
import PencilEdit01Icon from "@hugeicons/core-free-icons/PencilEdit01Icon"
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon"
import Delete02Icon from "@hugeicons/core-free-icons/Delete02Icon"
import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon"
import UserAdd01Icon from "@hugeicons/core-free-icons/UserAdd01Icon"
import GridIcon from "@hugeicons/core-free-icons/GridIcon"
import PlusSignIcon from "@hugeicons/core-free-icons/PlusSignIcon"
import MoreHorizontalIcon from "@hugeicons/core-free-icons/MoreHorizontalIcon"
import ShieldKeyIcon from "@hugeicons/core-free-icons/ShieldKeyIcon"
import Mail01Icon from "@hugeicons/core-free-icons/Mail01Icon"
import { notify } from "@/lib/notify"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  CountChip,
  Eyebrow,
  FilterSegment,
  IdentityCell,
  Pagination,
  PanelToolbar,
  SearchInput,
} from "@/components/security/primitives"
import { fold } from "@/lib/fold"
import { RAIL, railBase } from "@/components/security/rail"
import { BrandDialog, DestructiveDialog } from "@/components/security/dialogs"
import { APP_LOCK } from "@/lib/appLockPolicy"
import { useEffect, useMemo, useRef, useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { useLocale } from "@/hooks/useLocale"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { daysSince, formatAgo, formatStamp } from "@/lib/date"
import { cn } from "@/lib/utils"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  YETKİLER (`/authorizations`) — yönetim ekranı
 * ═══════════════════════════════════════════════════════════════════════
 *
 * İki Dataverse tablosu yan yana: kimin neye yetkisi var
 * (`tyro_authorizedapp`) ve kim ne talep etmiş (`tyro_requestapp`).
 *
 * ⚠️ **APP SEÇİMİ KATALOGDAN, DEĞER İSİM.** Seçenekler `tyro_launcherapp`ten
 * CANLI geliyor (ConfigProvider zaten yüklü — ikinci bir sorgu yok), yani
 * katalogda yeni bir app açıldığında listede kendiliğinden beliriyor.
 * Kaydedilen şey GUID değil ADdır (`TYRO Trader;Power BI`): Dataverse'te
 * gerçek bir lookup değeri GUID tutardı ve hem ızgarada hem dışa aktarımda
 * okunamaz olurdu. Ayrıca bu depoda katalog GUID'i ortamlar arasında
 * değişiyor — asistanlar da aynı sebeple ADla eşleşiyor.
 *
 * ⚠️ **İSMİN BEDELİ GÖRÜNÜR KILINDI.** Bağ metinsel olduğu için katalogda
 * bir app yeniden adlandırılırsa o satırdaki ad boşa düşer. Sessiz kalmak
 * yerine, katalogda karşılığı OLMAYAN her ad uyarı renginde ve bir not ile
 * çiziliyor — yetkinin neden işlemediği ekrandan okunabilsin.
 *
 * ⚠️ **KAPI `useIsAppAdmin`** — Entra grubu DEĞİL, tablonun kendi
 * `tyro_isadmin` bayrağı. Gerekçesi `hooks/useAuthorizations.js` başında.
 *
 * ⚠️ **Yönetici olmayana sayfa AÇILIR ama içerik yerine sebep yazılır.**
 * Sessizce başka bir yere atmak, yer imi koymuş kullanıcıya uygulamayı
 * bozuk gösterirdi — `/security`de verilen kararın aynısı.
 */

/* Tarih biçimi `lib/date.js#formatStamp`ten geliyor: aynı damgayı kilitli
   kartın talep dökümü de gösteriyor ve iki ekranın aynı satırı farklı
   yazması "bu o talep mi" sorusunu doğururdu. */

function Section({ icon, title, hint, count, action, footer, children }) {
  const { locale } = useLocale()
  return (
    <section className="rounded-2xl border border-border bg-card">
      {/* ⚠️ Marka tonlu ikon karesi KALDIRILDI — bu sayfadaki yedi
          tekrardan biriydi (gerekçe `SecurityPage`in başlığında yazılı).
          İkon satır içinde, sessiz ve başlığın hizmetinde. */}
      <header className="flex items-start gap-2.5 border-b border-border/70 px-4 py-3">
        <HugeiconsIcon
          icon={icon}
          aria-hidden="true"
          className="mt-px size-4 shrink-0 text-muted-foreground/70"
          strokeWidth={1.8}
        />
        <div className="min-w-0 flex-1">
          <h2
            lang={locale}
            className="text-[0.9375rem] font-semibold leading-tight tracking-[-0.01em]"
          >
            {title}
          </h2>
          <p className="text-[0.75rem] leading-snug text-muted-foreground">{hint}</p>
        </div>
        <span className="flex shrink-0 items-center gap-2">
          {action}
          <CountChip>{count}</CountChip>
        </span>
      </header>
      {children}
      {footer}
    </section>
  )
}

function Empty({ children }) {
  return <p className="px-4 py-8 text-center text-[0.8125rem] text-muted-foreground">{children}</p>
}

/** Salt okunur app çipleri. Katalogda karşılığı olmayan ad UYARI renginde:
 *  yeniden adlandırma sessizce yetki düşürmesin. */
function AppChips({ apps, known, emptyLabel, unknownTitle }) {
  if (!apps.length) {
    return <span className="text-[0.8125rem] text-muted-foreground">{emptyLabel}</span>
  }
  return (
    <span className="flex flex-wrap gap-1">
      {apps.map((a) => {
        const missing = !known.has(a)
        return (
          <span
            key={a}
            title={missing ? unknownTitle : undefined}
            className={cn(
              "rounded-md px-1.5 py-0.5 text-[0.75rem]",
              missing
                ? "bg-amber-500/12 text-amber-700 ring-1 ring-amber-500/30 dark:text-amber-400"
                : "bg-foreground/[0.06] text-foreground/[0.78]",
            )}
          >
            {a}
            {missing ? " ⚠" : null}
          </span>
        )
      })}
    </span>
  )
}

/**
 * Çoklu app seçici. Katalogdan gelen her ad bir kutucuk; birden fazlası
 * seçilebilir. Satırda ZATEN yazılı olup katalogda bulunmayan adlar da
 * listeye eklenir — yoksa kaydetmek onları sessizce silerdi.
 */
function AppPicker({ options, value, onChange, disabled, label, emptyLabel }) {
  const { t } = useLocale()
  const [q, setQ] = useState("")
  const orphans = value.filter((v) => !options.includes(v))
  const all = [...options, ...orphans]
  const shown = useMemo(() => {
    const needle = fold(q)
    return needle ? all.filter((n) => fold(n).includes(needle)) : all
  }, [all, q])
  const toggle = (name) => {
    onChange(value.includes(name) ? value.filter((v) => v !== name) : [...value, name])
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="inline-flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-2.5 text-left text-[0.8125rem] text-foreground transition-colors hover:bg-foreground/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-60"
        >
          {/* ⚠️ TETİKTE ADLARIN VİRGÜLLÜ DİZİSİ DEĞİL, SAYI + İLK BİRKAÇI.
              On üç app seçiliyken "a, b, c, d, e, f…" tek satıra
              kırpılıyordu ve ne kaç tane olduğu ne de hangileri olduğu
              okunuyordu. Sayı kesin, çipler örnek. */}
          {value.length ? (
            <span className="flex min-w-0 flex-1 items-center gap-1.5">
              <CountChip>{value.length}</CountChip>
              <span className="min-w-0 truncate text-muted-foreground">{value.join(" · ")}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{emptyLabel}</span>
          )}
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            className="size-3.5 shrink-0 text-muted-foreground"
            strokeWidth={2}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(22rem,90vw)] p-0">
        <div className="border-b border-border p-2">
          <SearchInput value={q} onChange={setQ} placeholder={t("authz.picker.search")} />
        </div>
        <p className="flex items-center justify-between gap-2 px-3 pb-1 pt-2">
          <Eyebrow>{label}</Eyebrow>
          {value.length > 0 && (
            /* Hepsini kaldır: on üç kutucuğu tek tek kapatmak, seçmekten
               daha uzun sürüyordu. */
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[0.6875rem] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("authz.picker.clear")}
            </button>
          )}
        </p>
        <div className="max-h-[16rem] overflow-y-auto px-1.5 pb-1.5">
          {shown.length === 0 ? (
            <p className="px-2 py-4 text-center text-[0.75rem] text-muted-foreground">
              {t("authz.search.empty")}
            </p>
          ) : (
            shown.map((name) => {
              const checked = value.includes(name)
              const missing = !options.includes(name)
              return (
                <label
                  key={name}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-[0.8125rem] transition-colors",
                    "[@media(pointer:coarse)]:min-h-10",
                    checked ? "bg-brand-soft/40" : "hover:bg-foreground/[0.05]",
                  )}
                >
                  <Checkbox checked={checked} onCheckedChange={() => toggle(name)} />
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate",
                      missing && "text-amber-700 dark:text-amber-400",
                      checked && "font-medium",
                    )}
                  >
                    {name}
                  </span>
                  {/* Katalogda karşılığı olmayan ad: bu yetki hiçbir şey
                      açmıyor ve sebebi yalnız burada söylenebilir. */}
                  {missing && (
                    <HugeiconsIcon
                      icon={Alert02Icon}
                      className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400"
                      strokeWidth={2}
                    />
                  )}
                </label>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function StatusPill({ done, doneLabel, pendingLabel }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.75rem] font-medium",
        done
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      )}
    >
      <HugeiconsIcon
        icon={done ? CheckmarkCircle02Icon : Clock01Icon}
        className="size-3.5"
        strokeWidth={2}
      />
      {done ? doneLabel : pendingLabel}
    </span>
  )
}

/** Küçük, ikonlu satır eylemi. */
function RowButton({ icon, onClick, disabled, children, tone, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border px-2 [min-height:max(1.75rem,28px)] text-[0.75rem] font-medium transition-colors disabled:opacity-60",
        tone === "primary"
          ? "border-transparent bg-brand-fill-deep text-brand-on-brand hover:brightness-110"
          : tone === "brand"
            ? "border-brand/30 bg-brand-soft/50 text-brand hover:bg-brand-soft/80"
            : "border-border bg-background text-foreground/[0.78] hover:bg-foreground/[0.04]",
      )}
    >
      <HugeiconsIcon icon={icon} className="size-3.5" strokeWidth={2} />
      {children}
    </button>
  )
}

/** Kapı + hata şeridi — iki panelin ortak kabuğu. */
function Gate({ ctx, children }) {
  const { t, allowed, gateKey, error, errorKey } = ctx
  if (!allowed) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-[0.8125rem] text-muted-foreground">
        {t(gateKey)}
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-4 py-3">
          <p className="text-[0.8125rem] font-medium text-foreground">{t(errorKey)}</p>
          <details className="mt-1.5">
            <summary className="cursor-pointer text-[0.75rem] text-muted-foreground">
              {t("authz.error.detail")}
            </summary>
            <p className="mt-1 text-[0.6875rem] leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
              {String(error.message ?? error)}
            </p>
          </details>
        </div>
      )}
      {children}
      {ctx.fetchedAt ? (
        <p className="text-[0.75rem] text-muted-foreground">
          {t("authz.updated")} {formatStamp(new Date(ctx.fetchedAt).toISOString())}
        </p>
      ) : null}
    </div>
  )
}

/** Yenile — iki panelin de başlığında duran tek düğme. */
export function AuthorizationsReload({ ctx }) {
  const { t, allowed, status, reload } = ctx
  if (!allowed) return null
  return (
    <button
      type="button"
      onClick={reload}
      disabled={status === "loading"}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 [min-height:max(2rem,28px)] text-[0.78125rem] font-medium text-foreground/[0.78] transition-colors hover:bg-foreground/[0.04] disabled:opacity-60"
    >
      <HugeiconsIcon
        icon={RefreshIcon}
        className={cn("size-3.5", status === "loading" && "animate-spin")}
        strokeWidth={2}
      />
      {t("authz.reload")}
    </button>
  )
}

/** ── Sekme 1: kimin neye yetkisi var ─────────────────────────────── */
/**
 * Yeni yetki satırı kutusu.
 *
 * ⚠️ **GİRİŞ ADRESİ (UPN), POSTA ADRESİ DEĞİL** — ve bu alanın altında
 * yazıyor. Ölçüldü (2026-09-17, TYRO dizini): 801 aktif kullanıcının
 * 237'sinde ikisi farklı. Posta adresiyle açılan bir satır o kişiyi
 * SESSİZCE yetkisiz yapar: hata çıkmaz, kullanıcı yalnız hiçbir şey
 * göremez. Bu, ekranın önleyebileceği en pahalı hata.
 *
 * App seçimi ZORUNLU DEĞİL: yetkisi olmayan ama yönetici olan bir kayıt
 * anlamlı (yetkileri yöneten kişi app'leri kendi kullanmıyor olabilir).
 */
/**
 * ⚠️ **YAPIŞTIRMA TEMİZLİĞİ.** Yönetici bu alana panodan yapıştırıyor ve
 * pano nadiren temiz geliyor: Outlook `Ad Soyad <a@b.com>` veriyor, Entra
 * portalı `mailto:` öneki ya da sondaki boşlukla kopyalıyor. Bunlar
 * temizlenmezse satır o hâliyle yazılıyor ve kişi SESSİZCE yetkisiz
 * kalıyor — hata çıkmıyor, yalnızca hiçbir şey göremiyor.
 *
 * Temizlik yazarken değil YAPIŞTIRIRKEN yapılıyor: kullanıcının kendi
 * yazdığı harfleri anında değiştirmek, imleci zıplatan ve ne olduğu
 * anlaşılmayan bir alan üretir.
 */
function cleanPastedUpn(raw) {
  let v = String(raw ?? "").trim()
  const angled = v.match(/<([^>]+)>/) // "Ad Soyad <a@b.com>"
  if (angled) v = angled[1]
  v = v.replace(/^mailto:/i, "").trim()
  return v
}

function NewAuthorizationDialog({ ctx }) {
  const {
    t,
    newRow,
    setNewRow,
    saveNewRow,
    catalog,
    busyId,
    writeError,
    writeErrorKey,
    authorizations,
  } = ctx
  const busy = busyId === "new"
  const upn = newRow?.upn ?? ""
  const trimmed = upn.trim()

  // ⚠️ İSTEMCİ KONTROLÜ SUNUCUNUN YERİNE GEÇMEZ, ONDAN ÖNCE GELİR.
  // Tekilliğin otoritesi `tyro_useremail` alternate key'i (iki istemci aynı
  // anda yazarsa istemci kontrolü zaten geç kalır). Buradaki kontrolün işi
  // farklı: ağ turunu beklemeden, kutuyu kapatmadan söylemek.
  const duplicate = useMemo(() => {
    const k = trimmed.toLowerCase()
    if (!k) return null
    return authorizations.find((r) => r.upn.trim().toLowerCase() === k) ?? null
  }, [authorizations, trimmed])

  // Biçim kontrolü KASITLI OLARAK GEVŞEK: tek bir `@` ve iki yanında birer
  // karakter. Sıkı bir e-posta regex'i burada yanlış olurdu — bu bir posta
  // adresi değil bir GİRİŞ adresi ve UPN'ler posta kurallarına uymak
  // zorunda değil.
  const malformed = trimmed.length > 0 && !/^[^\s@]+@[^\s@]+$/.test(trimmed)
  return (
    <BrandDialog
      open={!!newRow}
      onOpenChange={(o) => !o && !busy && setNewRow(null)}
      title={t("authz.new.title")}
      description={t("authz.new.body")}
      busy={busy}
      footer={
        <>
          <Button variant="outline" onClick={() => setNewRow(null)} disabled={busy}>
            {t("authz.cancel")}
          </Button>
          <Button
            onClick={saveNewRow}
            disabled={busy || !trimmed || !!duplicate}
            className="gap-1.5 bg-brand-fill-deep text-brand-on-brand hover:bg-brand-fill-deep hover:brightness-110"
          >
            <HugeiconsIcon icon={UserAdd01Icon} className="size-3.5" strokeWidth={2} />
            {t("authz.new.save")}
          </Button>
        </>
      }
    >
      <Field
        htmlFor="authz-new-upn"
        icon={Mail01Icon}
        label={t("authz.col.user")}
        hint={t("authz.new.upnHint")}
      >
        <input
          id="authz-new-upn"
          value={upn}
          onChange={(e) => setNewRow({ ...newRow, upn: e.target.value })}
          onPaste={(e) => {
            const text = e.clipboardData?.getData("text")
            const cleaned = cleanPastedUpn(text)
            if (cleaned && cleaned !== text.trim()) {
              e.preventDefault()
              setNewRow({ ...newRow, upn: cleaned })
            }
          }}
          disabled={busy}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={duplicate || malformed ? true : undefined}
          placeholder="ad.soyad@vegaglobal.example"
          className={cn(
            "no-ios-zoom h-9 w-full rounded-lg border bg-background px-2.5 text-[0.8125rem] tracking-[0.015em] tabular-nums [font-variant-ligatures:none] outline-none transition",
            duplicate
              ? "border-amber-500/50 focus-visible:ring-2 focus-visible:ring-amber-500/30"
              : "border-border focus-visible:ring-2 focus-visible:ring-brand/40",
          )}
        />
        {/* Geri bildirim SIRAYLA: önce engelleyen şey (aynı kayıt var),
            sonra biçim uyarısı. Her ikisi de yoksa alanın kendi dersi
            (`hint`) kalıyor — üçünü birden yazmak kutuyu uyarı duvarına
            çevirirdi. */}
        {duplicate ? (
          <Note tone="amber" icon={Alert02Icon}>
            {t("authz.new.duplicate")}
          </Note>
        ) : malformed ? (
          <Note tone="muted">{t("authz.new.malformed")}</Note>
        ) : null}
      </Field>

      {/* ⚠️ YÖNETİCİ SEÇENEĞİ APP SEÇİCİNİN ÜSTÜNDE, ve bu sıra bilinçli:
          işaretlendiği an aşağısı gereksizleşiyor. Altta dursaydı kişi
          önce on app seçip sonra hepsinin boşa gittiğini öğrenirdi. */}
      <label
        className={cn(
          "flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 transition-colors",
          newRow?.isAdmin
            ? "border-brand/30 bg-brand-soft/40"
            : "border-border hover:bg-foreground/[0.03]",
        )}
      >
        <Checkbox
          checked={!!newRow?.isAdmin}
          onCheckedChange={(v) => setNewRow({ ...newRow, isAdmin: v === true })}
          disabled={busy}
          className="mt-0.5"
        />
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-[0.8125rem] font-medium">
            <HugeiconsIcon
              icon={ShieldKeyIcon}
              className={cn("size-3.5", newRow?.isAdmin ? "text-brand" : "text-muted-foreground")}
              strokeWidth={1.9}
            />
            {t("authz.new.isAdmin")}
          </span>
          <span className="mt-0.5 block text-[0.6875rem] leading-snug text-muted-foreground">
            {t("authz.new.isAdmin.hint")}
          </span>
        </span>
      </label>

      {newRow?.isAdmin && APP_LOCK.adminBypass ? (
        <Note tone="emerald" icon={CheckmarkCircle02Icon}>
          {t("authz.apps.adminNote")}
        </Note>
      ) : (
        <Field icon={GridIcon} label={t("authz.col.apps")}>
          <AppPicker
            options={catalog}
            value={newRow?.apps ?? []}
            onChange={(apps) => setNewRow({ ...newRow, apps })}
            disabled={busy}
            label={t("authz.picker.label")}
            emptyLabel={t("authz.picker.empty")}
          />
        </Field>
      )}

      {writeError && (
        <Note tone="amber" icon={Alert02Icon}>
          {t(writeErrorKey)}
        </Note>
      )}
    </BrandDialog>
  )
}

/** Kutu içindeki alan: ikonlu etiket + kontrol + isteğe bağlı ders. */
function Field({ htmlFor, icon, label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-1.5 text-[0.75rem] font-medium text-foreground/[0.78]"
      >
        <HugeiconsIcon
          icon={icon}
          aria-hidden="true"
          className="size-3.5 shrink-0 text-muted-foreground/70"
          strokeWidth={1.8}
        />
        {label}
      </label>
      {children}
      {hint ? <p className="text-[0.6875rem] leading-snug text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

/** Kutu içi not — üç ton, hepsi aynı ölçüde. */
function Note({ tone = "muted", icon, children }) {
  return (
    <p
      className={cn(
        "flex items-start gap-1.5 rounded-lg px-2.5 py-2 text-[0.6875rem] leading-snug",
        tone === "amber" &&
          "border border-amber-500/30 bg-amber-500/[0.07] text-amber-800 dark:text-amber-300",
        tone === "emerald" && "border border-emerald-500/25 bg-emerald-500/[0.07] text-foreground",
        tone === "muted" && "text-muted-foreground",
      )}
    >
      {icon ? (
        <HugeiconsIcon icon={icon} className="mt-px size-3 shrink-0" strokeWidth={2} />
      ) : null}
      {children}
    </p>
  )
}

/**
 * ── Sekme 1: kimin neye yetkisi var ───────────────────────────────────
 *
 * ⚠️ **TABLO GİTTİ, LİSTE GELDİ.** `<table>` + `overflow-x-auto`, sohbet
 * dock'unun yarıya indirebildiği bir kolonun içinde yapılabilecek en kötü
 * şeydi: dört sütunluk bir tabloyu 380px'lik bir telefonda yatay kaydırma
 * arkasına koymak duyarlılık değil tuzak. Artık tek ağaç var — geniş
 * ekranda tek satıra açılan, dar ekranda iki satıra inen bir liste
 * öğesi. "Genişte tablo, darda kart" ikilisi iki ayrı ağaç demekti ve
 * ikisi zamanla birbirinden ayrı düşerdi.
 *
 * ⚠️ **YÖNETİCİ HÜCRESİ ARTIK YALNIZ DURUM.** Eskiden aynı hücre kimi
 * satırda "Yönetici" (bir DURUM), kiminde "Yönetici yap" (bir KOMUT)
 * yazıyordu — sütunun taranamamasının sebebi tam olarak buydu. Göz bir
 * sütunda tek tür şey arar. Durum hücrede kaldı, fiil satır menüsüne
 * taşındı.
 *
 * ⚠️ **KORUMALI EYLEMLER `disabled` DEĞİL.** `disabled` bir düğme
 * işaretçi olaylarını yutuyor, yani `title` balonu KABA İŞARETÇİDE hiç
 * açılmıyor: dokunmatikte kural sessiz bir duvara dönüşüyordu. Bu deponun
 * kendi doktrini (bkz. TYRO Trader kilidi / `showAgentNoAccess`): tıklama
 * KABUL EDİLİR, kural elde reddedilir ve sebebi SÖYLENİR. Metinler zaten
 * dört sözlükte hazırdı.
 */
/**
 * Bu satırın app listesi erişimi BELİRLİYOR MU?
 *
 * ⚠️ Soru `row.isAdmin` DEĞİL. Yöneticinin listesi ancak `adminBypass`
 * açıkken anlamsız; şalter kapatılırsa (politikada tek satır) yönetici de
 * kendi listesiyle sınırlanır ve o hâlde listeyi gizlemek ekranın TERS
 * yönde yalan söylemesi olurdu. Kapı tek yerde: `lib/appLockPolicy.js`.
 */
function adminCoversAllApps(row) {
  return row.isAdmin === true && APP_LOCK.adminBypass
}

function selfGuardToast(message) {
  // Sabit kimlik: aynı kurala üst üste basmak bildirimi yığmasın, tazelesin.
  notify.info(message, { id: "authz-self-guard" })
}

function UserRow({ ctx, row }) {
  const {
    t,
    catalog,
    known,
    draft,
    setDraft,
    busyId,
    saveApps,
    upnDraft,
    setUpnDraft,
    saveUpn,
    myUpn,
  } = ctx
  const editing = draft.id === row.id
  const editingUpn = upnDraft.id === row.id
  const busy = busyId === row.id
  const isSelf = row.upn.trim().toLowerCase() === myUpn
  const broken = row.apps.some((a) => !known.has(a))
  const rail = isSelf ? RAIL.self : broken ? RAIL.broken : RAIL.none

  return (
    <li
      className={cn(
        railBase,
        rail,
        "px-4 py-2.5 transition-colors",
        // Kılcal ayraç KART KENARINDAN İÇERİDE başlar (macOS liste kuralı):
        // kenara kadar uzanan bir çizgi kartı bölüyormuş gibi okunuyor.
        "after:pointer-events-none after:absolute after:inset-x-4 after:bottom-0 after:h-px after:bg-border/60 after:content-[''] last:after:hidden dark:after:bg-white/[0.07]",
        isSelf && "bg-brand-soft/[0.10] dark:bg-brand-soft/[0.14]",
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {editingUpn ? (
          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
            <input
              value={upnDraft.text}
              onChange={(e) => setUpnDraft({ id: row.id, text: e.target.value })}
              disabled={busy}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              className="no-ios-zoom h-8 w-full min-w-0 rounded-lg border border-border bg-background px-2 text-[0.78125rem] tracking-[0.015em] tabular-nums [font-variant-ligatures:none] outline-none transition focus-visible:ring-2 focus-visible:ring-brand/40"
            />
            <span className="text-[0.6875rem] leading-snug text-amber-700 dark:text-amber-400">
              {t("authz.upn.warning")}
            </span>
            <span className="flex gap-1.5">
              <RowButton
                icon={Tick02Icon}
                tone="brand"
                onClick={() => saveUpn(row)}
                disabled={busy || !upnDraft.text.trim()}
              >
                {t("authz.save")}
              </RowButton>
              <RowButton
                icon={Cancel01Icon}
                onClick={() => setUpnDraft({ id: null, text: "" })}
                disabled={busy}
              >
                {t("authz.cancel")}
              </RowButton>
            </span>
          </span>
        ) : (
          <>
            <IdentityCell upn={row.upn} className="flex-1" />

            {/* DURUM, KOMUT DEĞİL. Yönetici olmayan satırda hiçbir şey
                yazmıyor — 195 satırda "Yönetici yap" tekrarı, gözün
                aradığı 5 yöneticiyi görünmez yapıyordu. */}
            {row.isAdmin && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-fill-deep px-2 py-0.5 text-[0.6875rem] font-medium text-brand-on-brand">
                <HugeiconsIcon icon={ShieldKeyIcon} className="size-3" strokeWidth={2} />
                {t("authz.badge.admin")}
              </span>
            )}
            {isSelf && (
              <span className="shrink-0 rounded-full bg-brand-soft/70 px-1.5 py-0.5 text-[0.625rem] font-medium text-brand-on-soft">
                {t("authz.badge.self")}
              </span>
            )}

            <RowMenu ctx={ctx} row={row} isSelf={isSelf} busy={busy} />
          </>
        )}
      </div>

      {/* ⚠️ **YÖNETİCİDE APP LİSTESİ GÖSTERİLMEZ.** `useAppLock` yönetici
          için kilidi tümüyle atlıyor (`APP_LOCK.adminBypass`), yani o
          satırdaki app seçimi erişimi BELİRLEMİYOR — ekranda belirliyormuş
          gibi durması ekranın yalan söylemesiydi. Yöneticiye üç app
          atanmışken kişinin on üçünü de açabilmesi, yetkileri yöneten
          kişinin listeye güvenini bitirirdi.

          ⚠️ Liste SİLİNMİYOR, yalnız çizilmiyor: yöneticilik kaldırıldığı
          an eski seçim geri gelmeli. Menüden hâlâ düzenlenebiliyor —
          "yöneticiliğini alacağım, öncesinde app'lerini ayarlayayım" akışı
          gerçek bir akış. */}
      {!editingUpn && adminCoversAllApps(row) && !editing && (
        <p className="mt-1.5 flex items-center gap-1.5 text-[0.75rem] text-muted-foreground">
          <HugeiconsIcon
            icon={CheckmarkCircle02Icon}
            className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
            strokeWidth={2}
          />
          {t("authz.apps.allAdmin")}
        </p>
      )}

      {/* SATIRIN İKİNCİ SATIRI HEM GÖSTERİM HEM DÜZENLEME KAPISI: en sık
          yapılan iş (app listesini değiştirmek) tek tıkla açılıyor ve
          menüden geçmesi gerekmiyor. */}
      {!editingUpn && (!adminCoversAllApps(row) || editing) && (
        <div className="mt-1.5">
          {editing ? (
            <div className="flex flex-col gap-1.5">
              {adminCoversAllApps(row) && (
                <p className="text-[0.6875rem] leading-snug text-muted-foreground">
                  {t("authz.apps.adminNote")}
                </p>
              )}
              <AppPicker
                options={catalog}
                value={draft.apps}
                onChange={(apps) => setDraft({ id: row.id, apps })}
                disabled={busy}
                label={t("authz.picker.label")}
                emptyLabel={t("authz.picker.empty")}
              />
              <span className="flex gap-1.5">
                <RowButton
                  icon={Tick02Icon}
                  tone="brand"
                  onClick={() => saveApps(row)}
                  disabled={busy}
                >
                  {t("authz.save")}
                </RowButton>
                <RowButton
                  icon={Cancel01Icon}
                  onClick={() => setDraft({ id: null, apps: [] })}
                  disabled={busy}
                >
                  {t("authz.cancel")}
                </RowButton>
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setDraft({ id: row.id, apps: row.apps })}
              className="group/apps -mx-1 flex w-full items-center gap-1.5 rounded-lg px-1 py-0.5 text-left transition-colors hover:bg-foreground/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [@media(pointer:coarse)]:min-h-9"
            >
              <AppChips
                apps={row.apps}
                known={known}
                emptyLabel={t("authz.apps.none")}
                unknownTitle={t("authz.apps.unknown")}
              />
              <HugeiconsIcon
                icon={PencilEdit01Icon}
                className="ml-auto size-3 shrink-0 text-muted-foreground/0 transition-colors group-hover/apps:text-muted-foreground/60 [@media(pointer:coarse)]:text-muted-foreground/50"
                strokeWidth={2}
              />
            </button>
          )}
        </div>
      )}
    </li>
  )
}

/**
 * Satır menüsü — üç eylem ve bir yıkıcı eylem.
 *
 * ⚠️ **SİLMEK DÜZENLEMEKLE AYNI AĞIRLIKTA DEĞİL.** Eskiden ikisi de 28px
 * aynı çipti; geri alınamaz bir eylem, geri alınabilir bir eylemle aynı
 * görünüyordu. Menüde silme bir ayracın altında ve yıkıcı renkte.
 */
function RowMenu({ ctx, row, isSelf, busy }) {
  const { t, toggleAdmin, canDelete, canEditUpn, setConfirmDeleteAuth, setUpnDraft, setDraft } = ctx
  const adminBlocked = isSelf && row.isAdmin
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("authz.row.menu")}
          disabled={busy}
          className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground/60 transition-colors hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-50 [@media(pointer:coarse)]:size-9"
        >
          <HugeiconsIcon icon={MoreHorizontalIcon} className="size-4" strokeWidth={2} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuItem onClick={() => setDraft({ id: row.id, apps: row.apps })}>
          <HugeiconsIcon icon={PencilEdit01Icon} className="size-4" strokeWidth={1.7} />
          {t("authz.menu.apps")}
        </DropdownMenuItem>

        {/* ⚠️ `disabled` DEĞİL: tıklama kabul edilir, kural elde reddedilir
            ve sebebi bildirimle SÖYLENİR. `disabled` + `title` dokunmatikte
            hiçbir şey söylemiyordu. */}
        <DropdownMenuItem
          aria-disabled={!canEditUpn(row) || undefined}
          onSelect={(e) => {
            if (!canEditUpn(row)) {
              e.preventDefault()
              selfGuardToast(t("authz.upn.self"))
              return
            }
            setUpnDraft({ id: row.id, text: row.upn })
          }}
          className={cn(!canEditUpn(row) && "opacity-55")}
        >
          <HugeiconsIcon icon={Mail01Icon} className="size-4" strokeWidth={1.7} />
          {t("authz.menu.upn")}
        </DropdownMenuItem>

        <DropdownMenuItem
          aria-disabled={adminBlocked || undefined}
          onSelect={(e) => {
            if (adminBlocked) {
              e.preventDefault()
              selfGuardToast(t("authz.admin.self"))
              return
            }
            toggleAdmin(row)
          }}
          className={cn(adminBlocked && "opacity-55")}
        >
          <HugeiconsIcon icon={ShieldKeyIcon} className="size-4" strokeWidth={1.7} />
          {row.isAdmin ? t("authz.admin.remove") : t("authz.admin.make")}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          aria-disabled={!canDelete(row) || undefined}
          onSelect={(e) => {
            if (!canDelete(row)) {
              e.preventDefault()
              selfGuardToast(t("authz.delete.self"))
              return
            }
            setConfirmDeleteAuth(row)
          }}
          className={cn(
            "text-destructive focus:bg-destructive/10 focus:text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive [&_svg]:!text-destructive",
            !canDelete(row) && "opacity-55",
          )}
        >
          <HugeiconsIcon icon={Delete02Icon} className="size-4" strokeWidth={1.7} />
          {t("authz.req.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Sayfa boyu. 25: bir ekrana sığan ve "daha var mı" sorusunu
 *  doğurmayan en büyük sayı — 50 satır iki ekran kaydırma demek. */
const PAGE_SIZE = 25

export function AuthorizationsUsersPanel({ ctx }) {
  const {
    t,
    status,
    authorizations,
    known,
    setNewRow,
    confirmDeleteAuth,
    setConfirmDeleteAuth,
    removeAuthorization,
    busyId,
  } = ctx

  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState("all")
  const [page, setPage] = useState(1)

  const counts = useMemo(
    () => ({
      admins: authorizations.filter((r) => r.isAdmin).length,
      users: authorizations.filter((r) => !r.isAdmin).length,
      // Katalogda karşılığı OLMAYAN app taşıyan satır: böyle bir yetki
      // hiçbir şey açmıyor ama listede sağlam görünüyor ve 800 satırda
      // çip çip okuyarak bulunamaz.
      stale: authorizations.filter((r) => r.apps.some((a) => !known.has(a))).length,
    }),
    [authorizations, known],
  )

  const shown = useMemo(() => {
    const needle = fold(query)
    return authorizations.filter((r) => {
      if (filter === "admins" && !r.isAdmin) return false
      if (filter === "users" && r.isAdmin) return false
      if (filter === "stale" && !r.apps.some((a) => !known.has(a))) return false
      if (!needle) return true
      // Arama HEM adresi HEM app adlarını tarar: yönetici çoğu zaman
      // "bu app'i kimler açabiliyor" diye bakıyor, kişiyi değil.
      return fold(`${r.upn} ${r.apps.join(" ")}`).includes(needle)
    })
  }, [authorizations, query, filter, known])

  // ⚠️ Arama ya da süzgeç değişince sayfa BAŞA döner. Dönmeseydi 3.
  // sayfadayken arama yapan kişi boş bir sayfa görür ve "sonuç yok"
  // sanırdı — oysa sonuç var, sadece 1. sayfada.
  const pageCount = Math.max(1, Math.ceil(shown.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const slice = shown.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const reset = (fn) => (v) => {
    fn(v)
    setPage(1)
  }

  return (
    <Gate ctx={ctx}>
      <PanelToolbar className="mb-3">
        <SearchInput
          value={query}
          onChange={reset(setQuery)}
          placeholder={t("authz.search.users")}
        />
        <FilterSegment
          value={filter}
          onChange={reset(setFilter)}
          ariaLabel={t("authz.filter.label")}
          /* ⚠️ **SÜZGEÇ EKSENİ ROL.** Eskiden üçüncü çip "Sorunlu"ydu ve
             bir KAYIT özelliğini (katalogda olmayan app) anlatıyordu ama
             KİŞİ listesinde insanları etiketliyormuş gibi okunuyordu —
             "sorunlu kullanıcılar" diye. Eksen artık tek cinsten: herkes ·
             yönetici · kullanıcı.

             ⚠️ Katalog dışı kayıt süzgeci KAYBOLMADI, yalnız VARSA
             çiziliyor ve adı kişiyi değil KAYDI tarif ediyor. Sıfırken
             gösterilseydi her açılışta basılacak bir şey yokmuş gibi
             duran dördüncü bir çip olurdu. */
          options={[
            { value: "all", label: t("authz.filter.all") },
            { value: "admins", label: t("authz.filter.admins"), count: counts.admins },
            { value: "users", label: t("authz.filter.users"), count: counts.users },
            ...(counts.stale > 0
              ? [{ value: "stale", label: t("authz.filter.stale"), count: counts.stale }]
              : []),
          ]}
        />
        {/* ⚠️ BİRİNCİL EYLEM SAĞ UÇTA, bölüm başlığında değil. Araç
            çubuğundaki yerin anlamı "bu listeyle ilgili işler burada":
            arama, süzgeç ve ekleme aynı satırda. Bölüm başlığında dururken
            sayının yanına sıkışıyor ve listeye ait değil kartın süsü gibi
            duruyordu. */}
        <Button
          size="sm"
          onClick={() => setNewRow({ upn: "", apps: [], isAdmin: false })}
          className="ml-auto gap-1.5 bg-brand-fill-deep text-brand-on-brand hover:bg-brand-fill-deep hover:brightness-110"
        >
          <HugeiconsIcon icon={PlusSignIcon} className="size-3.5" strokeWidth={2.2} />
          {t("authz.new.cta")}
        </Button>
      </PanelToolbar>

      <Section
        icon={UserMultipleIcon}
        title={t("authz.list.title")}
        hint={t("authz.list.hint")}
        count={shown.length}
        footer={
          <Pagination
            page={safePage}
            pageCount={pageCount}
            from={(safePage - 1) * PAGE_SIZE + 1}
            to={Math.min(safePage * PAGE_SIZE, shown.length)}
            filtered={shown.length}
            total={authorizations.length}
            onPage={setPage}
            labels={{
              none: t("authz.page.none"),
              ofTotal: t("authz.page.ofTotal"),
              prev: t("authz.page.prev"),
              next: t("authz.page.next"),
            }}
          />
        }
      >
        {authorizations.length === 0 ? (
          <Empty>{status === "loading" ? t("authz.loading") : t("authz.list.empty")}</Empty>
        ) : shown.length === 0 ? (
          <Empty>{t("authz.search.empty")}</Empty>
        ) : (
          <ul role="list">
            {slice.map((row) => (
              <UserRow key={row.id} ctx={ctx} row={row} />
            ))}
          </ul>
        )}
      </Section>

      <NewAuthorizationDialog ctx={ctx} />

      <DestructiveDialog
        open={!!confirmDeleteAuth}
        onOpenChange={(o) => !o && setConfirmDeleteAuth(null)}
        icon={Delete02Icon}
        title={t("authz.delete.title")}
        description={t("authz.delete.body.short")}
        subject={confirmDeleteAuth?.upn}
        consequences={[
          { kind: "lose", text: t("authz.delete.lose.apps") },
          ...(confirmDeleteAuth?.isAdmin
            ? [{ kind: "lose", text: t("authz.delete.lose.admin") }]
            : []),
          { kind: "keep", text: t("authz.delete.keep.requests") },
        ]}
        confirmLabel={t("authz.req.delete")}
        cancelLabel={t("authz.cancel")}
        onConfirm={() => removeAuthorization(confirmDeleteAuth)}
        busy={busyId === confirmDeleteAuth?.id}
      />
    </Gate>
  )
}

/**
 * ── Sekme 2: kim ne talep etmiş ───────────────────────────────────────
 *
 * ⚠️ **TABLO DEĞİL KART, ve bunun sebebi notlar.** Talep satırı artık iki
 * serbest metin taşıyor (kullanıcının gerekçesi, yöneticinin cevabı); bunlar
 * bir hücreye sığmıyor ve kırpılmış bir gerekçe, okunmamış bir gerekçedir.
 * Kullanıcı yetkileri sekmesi tablo olarak KALDI — orada her alan kısa.
 */
function RequestCard({ ctx, row }) {
  const {
    t,
    locale,
    busyId,
    noteDraft,
    setNoteDraft,
    saveAdminNote,
    approve,
    toggleCompleted,
    setConfirmDelete,
  } = ctx
  const busy = busyId === row.id
  const editingNote = noteDraft.id === row.id

  const waiting = !row.isCompleted ? daysSince(row.createdOn) : 0
  return (
    <article
      className={cn(
        railBase,
        row.isCompleted ? RAIL.done : RAIL.pending,
        "border-b border-border/50 px-4 py-3.5 last:border-b-0",
        // Biten iş GERİ ÇEKİLİR ama okunmaz olmaz: üstüne gelince tam
        // mürekkebe dönüyor, çünkü denetim için bakılan şey de bu.
        row.isCompleted && "opacity-[0.72] transition-opacity hover:opacity-100",
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1.5">
        <div className="min-w-0">
          <p className="truncate text-[0.875rem] font-semibold leading-tight">{row.app || "—"}</p>
          <IdentityCell upn={row.upn} size="sm" className="mt-0.5" />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusPill
            done={row.isCompleted}
            doneLabel={t("authz.req.done")}
            pendingLabel={t("authz.req.pending")}
          />
          {/* ⚠️ KUYRUKTA OKUNMASI GEREKEN ŞEY "ne kadar bekledi"dir.
              Kesin damga denetim bilgisi ve balonda duruyor. Üç günü
              geçen bekleme kehribara dönüyor — KIRMIZI DEĞİL: geciken bir
              talep bir hata değil, bir hatırlatma. */}
          <span
            title={formatStamp(row.createdOn)}
            className={cn(
              "text-[0.75rem] tabular-nums",
              waiting >= 3
                ? "font-medium text-amber-700 dark:text-amber-400"
                : "text-muted-foreground",
            )}
          >
            {formatAgo(row.createdOn, locale)}
          </span>
        </div>
      </header>

      {/* Kullanıcının gerekçesi SALT OKUNUR — yöneticinin düzeltebildiği
          bir gerekçe, değerlendirilen şeyin kendisini değiştirirdi. */}
      {row.userNote ? (
        <div className="mt-2.5 rounded-lg border border-border/70 bg-foreground/[0.025] px-3 py-2">
          <p className="text-[0.625rem] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
            {t("authz.req.userNote")}
          </p>
          <p className="mt-0.5 whitespace-pre-wrap break-words text-[0.8125rem] leading-relaxed text-foreground">
            {row.userNote}
          </p>
        </div>
      ) : null}

      {/* ⚠️ YÖNETİCİ NOTUNU KULLANICI OKUR. Bu bir iç yorum alanı değil:
          aynı metin talep edenin kilitli kartındaki döküm kutusunda
          görünüyor. Kutunun altındaki satır bunu açıkça yazıyor, çünkü
          "sadece kendime not" sanıp yazılan bir cümle karşı tarafa
          gidiyorsa bu bir arıza olur. */}
      <div className="mt-2.5">
        {editingNote ? (
          <div className="space-y-1.5">
            <Textarea
              value={noteDraft.text}
              onChange={(e) => setNoteDraft({ id: row.id, text: e.target.value })}
              disabled={busy}
              rows={3}
              maxLength={2000}
              autoFocus
              placeholder={t("authz.req.adminNote.placeholder")}
              className="resize-none text-[0.8125rem]"
            />
            <p className="text-[0.6875rem] text-muted-foreground">
              {t("authz.req.adminNote.visible")}
            </p>
            <span className="flex gap-1.5">
              <RowButton
                icon={Tick02Icon}
                tone="brand"
                onClick={() => saveAdminNote(row)}
                disabled={busy}
              >
                {t("authz.save")}
              </RowButton>
              <RowButton
                icon={Cancel01Icon}
                onClick={() => setNoteDraft({ id: null, text: "" })}
                disabled={busy}
              >
                {t("authz.cancel")}
              </RowButton>
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setNoteDraft({ id: row.id, text: row.adminNote ?? "" })}
            className={cn(
              "group flex w-full items-start gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-left",
              "transition-colors hover:border-brand/40 hover:bg-brand-soft/20",
            )}
          >
            <HugeiconsIcon
              icon={PencilEdit01Icon}
              className="mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-brand"
              strokeWidth={2}
            />
            <span className="min-w-0 flex-1">
              <span className="block text-[0.625rem] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
                {t("authz.req.adminNote")}
              </span>
              <span
                className={cn(
                  "mt-0.5 block whitespace-pre-wrap break-words text-[0.8125rem] leading-relaxed",
                  row.adminNote ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {row.adminNote || t("authz.req.adminNote.empty")}
              </span>
            </span>
          </button>
        )}
      </div>

      <footer className="mt-2.5 flex flex-wrap justify-end gap-1.5">
        {row.isCompleted ? (
          <RowButton icon={Cancel01Icon} onClick={() => toggleCompleted(row)} disabled={busy}>
            {t("authz.req.reopen")}
          </RowButton>
        ) : (
          /* ONAYLA app'i kisinin listesine EKLER ve talebi kapatir - iki
             adimi ayirmak yoneticiyi "once yetkiyi ver, sonra talebi
             isaretle" diye gereksiz bir siraya sokardi. */
          /* ⚠️ ONAYLA BU SEKMENİN BİRİNCİL EYLEMİ ve öyle görünmeli.
             Eskiden silmeyle aynı ağırlıktaydı; yapılacak iş ile
             temizlenecek kayıt aynı görünüyordu. */
          <RowButton icon={Tick02Icon} tone="primary" onClick={() => approve(row)} disabled={busy}>
            {t("authz.req.approve")}
          </RowButton>
        )}
        <RowButton icon={Delete02Icon} onClick={() => setConfirmDelete(row)} disabled={busy}>
          {t("authz.req.delete")}
        </RowButton>
      </footer>
    </article>
  )
}

export function AuthorizationsRequestsPanel({ ctx }) {
  const { t, status, requests, busyId, confirmDelete, setConfirmDelete, removeRequest } = ctx
  // ⚠️ Bu oturumda bir kart tamamlananlara GEÇTİYSE grup açık kalır:
  // yoksa "onayladım, nereye gitti?" anı yaratırdı. Katlama bir gizleme
  // değil, yoldan çekme.
  const [showDone, setShowDone] = useState(false)
  const doneCount = requests.filter((r) => r.isCompleted).length
  const prevDone = useRef(doneCount)
  useEffect(() => {
    if (doneCount > prevDone.current) setShowDone(true)
    prevDone.current = doneCount
  }, [doneCount])

  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState("pending")

  // ⚠️ VARSAYILAN "Bekleyen", "Tümü" DEĞİL. Bu sekmenin varlık sebebi
  // cevap bekleyen talepler; arşiv ikinci sorudur. Varsayılanı "tümü"
  // yapmak, her açılışta yöneticiye yapılacak işi kendi eliyle
  // ayıklatmak olurdu.
  const matched = useMemo(() => {
    const needle = fold(query)
    return requests.filter((r) => {
      if (filter === "pending" && r.isCompleted) return false
      if (filter === "done" && !r.isCompleted) return false
      if (!needle) return true
      // Notlar da taranıyor: "lisans" diye arayan yönetici, o gerekçeyle
      // gelen bütün talepleri bir arada görmek istiyor.
      return fold(`${r.upn} ${r.app} ${r.userNote} ${r.adminNote}`).includes(needle)
    })
  }, [requests, query, filter])

  const pending = matched.filter((r) => !r.isCompleted)
  const done = matched.filter((r) => r.isCompleted)
  const totalPending = requests.filter((r) => !r.isCompleted).length
  const totalDone = requests.length - totalPending

  return (
    <Gate ctx={ctx}>
      <PanelToolbar className="mb-3">
        <SearchInput value={query} onChange={setQuery} placeholder={t("authz.search.requests")} />
        <FilterSegment
          value={filter}
          onChange={setFilter}
          ariaLabel={t("authz.filter.label")}
          options={[
            { value: "pending", label: t("authz.filter.pending"), count: totalPending },
            { value: "done", label: t("authz.filter.done"), count: totalDone },
            { value: "all", label: t("authz.filter.all") },
          ]}
        />
      </PanelToolbar>

      <Section
        icon={InboxIcon}
        title={t("authz.req.title")}
        hint={t("authz.req.hint")}
        count={pending.length}
      >
        {requests.length === 0 ? (
          <Empty>{status === "loading" ? t("authz.loading") : t("authz.req.empty")}</Empty>
        ) : matched.length === 0 ? (
          <Empty>{t("authz.search.empty")}</Empty>
        ) : (
          <>
            {/* ⚠️ **KUYRUK ARŞİVDEN AYRILDI.** Sorgu `createdon desc` ile
                düz geliyor, yani yöneticinin yapacağı iş denetim geçmişinin
                arasına serpiliyordu ve "hangisi beni bekliyor" sorusunun
                cevabı ancak her rozeti okuyarak bulunuyordu. Bekleyenler
                üstte ve her zaman açık; tamamlananlar bir açılır satırın
                arkasında — silinmiyor, yalnız yoldan çekiliyor. */}
            {filter === "done" ? (
              done.map((row) => <RequestCard key={row.id} ctx={ctx} row={row} />)
            ) : pending.length > 0 ? (
              pending.map((row) => <RequestCard key={row.id} ctx={ctx} row={row} />)
            ) : (
              <Empty>{t("authz.req.allDone")}</Empty>
            )}

            {done.length > 0 && filter !== "done" && (
              <div className="border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setShowDone((v) => !v)}
                  aria-expanded={showDone}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-foreground/[0.03] [@media(pointer:coarse)]:min-h-11"
                >
                  <HugeiconsIcon
                    icon={ArrowDown01Icon}
                    className={cn(
                      "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
                      showDone && "rotate-180",
                    )}
                    strokeWidth={2}
                  />
                  <Eyebrow>{t("authz.req.doneGroup")}</Eyebrow>
                  <CountChip className="ml-auto">{done.length}</CountChip>
                </button>
                {showDone && done.map((row) => <RequestCard key={row.id} ctx={ctx} row={row} />)}
              </div>
            )}
          </>
        )}
      </Section>

      {/* ⚠️ SİLMEK ile ONAYLAMAK ayrı: onaylamak yetki verir ve izi
          bırakır, silmek yalnız kaydı kaldırır. Kutu bu farkı yazıyor,
          çünkü yanlış düğmeye basan kişi geri alamıyor. */}
      <DestructiveDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        icon={Delete02Icon}
        title={t("authz.req.delete.title")}
        description={t("authz.req.delete.body.short")}
        subject={confirmDelete ? `${confirmDelete.app} · ${confirmDelete.upn}` : null}
        consequences={[
          { kind: "lose", text: t("authz.req.delete.lose") },
          { kind: "keep", text: t("authz.req.delete.approveInstead") },
        ]}
        confirmLabel={t("authz.req.delete")}
        cancelLabel={t("authz.cancel")}
        onConfirm={() => removeRequest(confirmDelete)}
        busy={busyId === confirmDelete?.id}
      />
    </Gate>
  )
}
