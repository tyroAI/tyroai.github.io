import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import Folder01Icon from "@hugeicons/core-free-icons/Folder01Icon"
import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon"
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon"
import LinkSquare02Icon from "@hugeicons/core-free-icons/LinkSquare02Icon"
import Image01Icon from "@hugeicons/core-free-icons/Image01Icon"
import Structure01Icon from "@hugeicons/core-free-icons/Structure01Icon"
import JusticeScale01Icon from "@hugeicons/core-free-icons/JusticeScale01Icon"
import File02Icon from "@hugeicons/core-free-icons/File02Icon"
import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon"
import { ImageLightbox } from "@/components/common/ImageLightbox"
import { useLocale } from "@/hooks/useLocale"
import { useSharedFolder } from "@/hooks/useSharedFolder"
import { STATUS } from "@/lib/graph"
import { DOC_FOLDERS, ORG_CHART_URL, POLICY_FOLDERS } from "@/data/companyDocs"
import { cn } from "@/lib/utils"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  KEŞFET › DOKÜMANLAR — üç kutucuk, bento ızgara
 * ═══════════════════════════════════════════════════════════════════════
 *
 * İçerik `data/companyDocs.js`te (adresler, klasörler, gruplama gerekçesi).
 * Bu dosya yalnız yüzey.
 *
 * ── DÜZEN ──────────────────────────────────────────────────────────────
 * Bento: solda TEK ve YÜKSEK kart (Kurumsal Dokümanlar — beş klasör ve 14
 * görselle en çok içerik orada), sağda üst üste iki kısa kart. Üç eşit
 * kutu, en dolusunu en boşuyla aynı boya sıkıştırırdı.
 *
 * ⚠️ **EŞİK KAPSAYICI SORGUSU** (`@[52rem]/feed`), görüntü alanı DEĞİL:
 * sohbet rıhtımı `<main>`in kardeşi ve sayfayı 340px'e kadar daraltıyor —
 * `lg:` orada hâlâ "geniş ekran" sanıp üç kartı ezerdi. Sayfanın kendi
 * kuralı, `FeedPage`in başında yazılı.
 *
 * ── İKİ KART, AYNI JEST ────────────────────────────────────────────────
 * Kurumsal Dokümanlar da Politika ve Prosedürler de KART İÇİNDE geziliyor:
 * klasöre bas, içeri gir, geri dön. Kaynakları farklı (biri CDN'deki sabit
 * liste, öteki Graph üzerinden canlı SharePoint) ama kullanıcı için tek bir
 * jest var. Ayrımı yalnız SON adım taşıyor: görsel ışık kutusunda açılıyor,
 * belge SharePoint'te — satırın glifi hangisi olduğunu söylüyor (içeri ok ↔
 * dış bağlantı karesi).
 */

/** Kart kabuğu — üçü de aynı giysiyi giyer, ayrım İÇERİKTE. */
function DocCard({ title, subtitle, icon, children, className }) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col rounded-2xl border border-border bg-card p-4",
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-on-soft">
          <HugeiconsIcon icon={icon} className="size-4" strokeWidth={1.9} />
        </span>
        <div className="min-w-0">
          <h2 className="text-[0.875rem] font-semibold leading-tight tracking-[-0.01em]">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 text-[0.71875rem] leading-snug text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 min-w-0 flex-1">{children}</div>
    </section>
  )
}

/** Klasör / dosya satırı — iki kartın PAYLAŞTIĞI tek tarif. */
function Row({ icon, label, meta, external, onClick, href }) {
  const inner = (
    <>
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted/60 text-muted-foreground group-hover/row:text-foreground">
        <HugeiconsIcon icon={icon} className="size-4" strokeWidth={1.8} />
      </span>
      <span
        lang="tr"
        className="min-w-0 flex-1 text-left text-[0.78125rem] font-medium leading-snug text-foreground/90"
      >
        {label}
      </span>
      {meta != null && (
        <span className="shrink-0 text-[0.6875rem] tabular-nums text-muted-foreground">{meta}</span>
      )}
      <HugeiconsIcon
        icon={external ? LinkSquare02Icon : ArrowRight01Icon}
        className="size-3.5 shrink-0 text-muted-foreground/60 transition group-hover/row:text-foreground"
        strokeWidth={2}
      />
    </>
  )
  const cls =
    "group/row flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [@media(pointer:coarse)]:min-h-11"
  // Dış bağlantı GERÇEK bir `<a>`: orta tuş / Cmd+tık ile yeni sekmede
  // açmak, bir düğmeye çevirince kaybolur ve burada asıl eylem odur.
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {inner}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  )
}

/**
 * KURUMSAL DOKÜMANLAR — klasör listesi ⇄ görsel ızgarası.
 *
 * ⚠️ **TEK KART, İKİ KADEME.** Klasöre girince liste yerini ızgaraya
 * bırakıyor ve üstte geri satırı çıkıyor; ikinci bir pencere AÇILMIYOR.
 * Pencere açmak, kartın içindeki gezinmeyi kartın dışına taşımak olurdu —
 * beş klasör ve 14 görsel için fazla ağır.
 *
 * ⚠️ **GÖRSELE TIKLAYINCA IŞIK KUTUSU** (`ImageLightbox`) — deponun zaten
 * sahip olduğu bileşen. İkinci bir tam-ekran görüntüleyici yazmak, aynı
 * jestin iki farklı davranışı demekti.
 *
 * ⚠️ **`loading="lazy"` ŞART.** 14 görselin toplamı ~8 MB; sekme açılır
 * açılmaz hepsini indirmek, klasörüne hiç girilmeyen kartların bedelini
 * peşin ödemek olurdu. Kapak görselleri yalnız klasör AÇILINCA iniyor.
 */
function CorporateDocs() {
  const { t } = useLocale()
  const [openId, setOpenId] = useState(null)
  const [lightboxId, setLightboxId] = useState(null)
  const folder = DOC_FOLDERS.find((f) => f.id === openId) ?? null

  if (!folder) {
    return (
      <ul className="flex flex-col gap-0.5">
        {DOC_FOLDERS.map((f) => (
          <li key={f.id}>
            <Row
              icon={Folder01Icon}
              label={f.name}
              meta={f.files.length}
              onClick={() => setOpenId(f.id)}
            />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpenId(null)}
        className="group/row -mx-1 flex items-center gap-1.5 self-start rounded-lg px-1.5 py-1 text-[0.75rem] font-medium text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [@media(pointer:coarse)]:min-h-9"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5" strokeWidth={2.2} />
        {t("docs.back")}
      </button>
      <p lang="tr" className="truncate text-[0.75rem] font-semibold text-foreground/85">
        {folder.name}
      </p>
      <ul className="grid grid-cols-2 gap-2 @[30rem]/feed:grid-cols-3">
        {folder.files.map((file) => (
          <li key={file.id}>
            <button
              type="button"
              onClick={() => setLightboxId(file.id)}
              className="group/tile block w-full overflow-hidden rounded-xl border border-border bg-muted/40 text-left transition hover:border-brand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              <span className="block aspect-[4/3] w-full overflow-hidden bg-muted">
                <img
                  src={file.url}
                  alt={file.name}
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover transition duration-300 group-hover/tile:scale-[1.03]"
                />
              </span>
              <span
                lang="tr"
                className="block truncate px-2 py-1.5 text-[0.6875rem] text-muted-foreground"
              >
                {file.name}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <ImageLightbox
        items={folder.files}
        activeId={lightboxId}
        onActiveIdChange={setLightboxId}
        onClose={() => setLightboxId(null)}
      />
    </div>
  )
}

/**
 * POLİTİKA VE PROSEDÜRLER — SharePoint klasörleri KART İÇİNDE (2026-09-23,
 * istek üzerine: *"o SharePoint yapısını o kartın içinde yönetemez miyiz,
 * bizim dosyalar yapısı gibi"*).
 *
 * Klasör → alt klasör → dosya, hepsi kartın içinde; kırıntı yolu üstte.
 * Mekanizma `hooks/useSharedFolder.js`te (paylaşım adresi → Graph sürücü
 * öğesi), gerekçeleri orada yazılı.
 *
 * ⚠️ **DOSYAYA BASINCA SHAREPOINT AÇILIR.** Belgeler Word/Excel/PDF; onları
 * uygulama içinde göstermek `/preview` ucuyla mümkün ama o ayrı bir yüzey
 * (`FilePreviewDialog`) ve bu kart bir LİSTE. Klasörde gezinmek içeride,
 * belgeyi açmak dışarıda — ayrımı satırın glifi söylüyor.
 *
 * ⚠️ **DÜŞERSE SESSİZ KALMAZ, YEDEK VERİR.** Graph okuyamazsa (yetki, ağ ya
 * da bu yolun kiracıda hiç çalışmaması) kart bir satır açıklama ve o klasörün
 * SharePoint bağlantısını gösteriyor. Yani bu özellik "çalışmazsa bozar"
 * değil, "çalışmazsa eski hâline döner" sınıfında — canlı kiracıda
 * ölçülemediği için tasarım bilerek böyle.
 */
function PolicyBrowser() {
  const { t } = useLocale()
  // Kırıntı yolu: [{ name, url? , driveId?, itemId? }] — ilki KÖK klasör.
  const [trail, setTrail] = useState([])
  const here = trail[trail.length - 1] ?? null
  const folder = useSharedFolder(here)

  if (!here) {
    return (
      <ul className="flex flex-col gap-0.5">
        {POLICY_FOLDERS.map((f) => (
          <li key={f.id}>
            <Row
              icon={Folder01Icon}
              label={f.name}
              onClick={() => setTrail([{ name: f.name, url: f.url }])}
            />
          </li>
        ))}
      </ul>
    )
  }

  const failed = folder.status !== STATUS.ready && folder.status !== "loading"

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <button
        type="button"
        onClick={() => setTrail(trail.slice(0, -1))}
        className="-mx-1 flex items-center gap-1.5 self-start rounded-lg px-1.5 py-1 text-[0.75rem] font-medium text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [@media(pointer:coarse)]:min-h-9"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5" strokeWidth={2.2} />
        {trail.length > 1 ? trail[trail.length - 2].name : t("docs.policy.allFolders")}
      </button>
      <p lang="tr" className="truncate text-[0.75rem] font-semibold text-foreground/85">
        {here.name}
      </p>

      {folder.status === "loading" && (
        <p className="px-2 py-3 text-[0.75rem] text-muted-foreground">{t("docs.loading")}</p>
      )}

      {failed && (
        /* ⚠️ "Soramadık ≠ boş klasör": okunamadığını SÖYLÜYOR ve klasörün
           kendi bağlantısını veriyor — kullanıcı yine de ulaşabilsin. */
        <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-muted/30 p-2.5">
          <p className="flex items-start gap-1.5 text-[0.71875rem] leading-snug text-muted-foreground">
            <HugeiconsIcon
              icon={Alert02Icon}
              className="mt-0.5 size-3.5 shrink-0"
              strokeWidth={1.9}
            />
            {t("docs.policy.unreadable")}
          </p>
          {here.url && (
            <Row
              icon={Folder01Icon}
              label={t("docs.policy.openInSharePoint")}
              external
              href={here.url}
            />
          )}
        </div>
      )}

      {folder.status === STATUS.ready && folder.rows.length === 0 && (
        <p className="px-2 py-3 text-[0.75rem] text-muted-foreground">{t("docs.policy.empty")}</p>
      )}

      {folder.status === STATUS.ready && folder.rows.length > 0 && (
        <ul className="flex max-h-80 flex-col gap-0.5 overflow-y-auto">
          {folder.rows.map((row) =>
            row.isFolder ? (
              <li key={row.id}>
                <Row
                  icon={Folder01Icon}
                  label={row.name}
                  meta={row.childCount ?? undefined}
                  onClick={() =>
                    setTrail([
                      ...trail,
                      {
                        name: row.name,
                        driveId: row.driveId ?? folder.driveId,
                        itemId: row.id,
                        url: row.url,
                      },
                    ])
                  }
                />
              </li>
            ) : (
              <li key={row.id}>
                <Row icon={File02Icon} label={row.name} external href={row.url ?? here.url} />
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  )
}

export function FeedDocs() {
  const { t } = useLocale()
  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 @[52rem]/feed:grid-cols-[1.35fr_1fr] @[52rem]/feed:grid-rows-[auto_1fr]">
      <DocCard
        title={t("docs.corporate.title")}
        subtitle={t("docs.corporate.subtitle")}
        icon={Image01Icon}
        className="@[52rem]/feed:row-span-2"
      >
        <CorporateDocs />
      </DocCard>

      <DocCard title={t("docs.org.title")} subtitle={t("docs.org.subtitle")} icon={Structure01Icon}>
        <Row icon={Structure01Icon} label={t("docs.org.link")} external href={ORG_CHART_URL} />
      </DocCard>

      <DocCard
        title={t("docs.policy.title")}
        subtitle={t("docs.policy.subtitle")}
        icon={JusticeScale01Icon}
      >
        <PolicyBrowser />
      </DocCard>
    </div>
  )
}
