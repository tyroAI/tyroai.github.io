import { useId } from "react"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"
import { COL } from "./columns"
import { MemberRow } from "./MemberRow"
import { rowNav } from "./rowNav"
import { peopleText } from "./teamText"

const HEAD = "text-[0.6875rem] font-medium text-muted-foreground"

/** Bir bölüm: başlık (kişi sayısıyla), genişte sütun başlıkları (süs), satırlar. */
function Group({ title, rows, balance, wide, photos, presence, status, onOpen }) {
  const { t, locale } = useLocale()
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className="min-w-0">
      <h3 id={titleId} className="px-1 text-[0.875rem] font-semibold">
        {title}
        <span className="font-normal text-muted-foreground">
          {" "}
          · {peopleText(rows.length, t, locale)}
        </span>
      </h3>
      <div aria-hidden="true" className="mt-2 hidden items-center gap-3 px-4 @[56rem]/ss:flex">
        <span className={cn(HEAD, "flex-1 ps-12")}>{t("selfService.team.list.person")}</span>
        <span className={cn(HEAD, wide ? COL.statusWide : COL.status)}>
          {t("selfService.team.list.status")}
        </span>
        {balance && (
          <span className={cn(HEAD, COL.balance)}>{t("selfService.team.list.balance")}</span>
        )}
        <span className={cn(HEAD, COL.tenure)}>{t("selfService.team.list.tenure")}</span>
        <span className="w-4 shrink-0" />
      </div>
      <ul className="ms-surface mt-1.5 divide-y divide-border/60 overflow-hidden rounded-2xl">
        {rows.map((row) => (
          <MemberRow
            key={row.key}
            row={row}
            wide={wide}
            photo={photos.get(row.person.address)}
            presence={presence.get(row.person.upn)}
            status={status}
            onOpen={onOpen}
          />
        ))}
      </ul>
    </section>
  )
}

/**
 * Ekip listesi — Graph'tan gelen ekip, ERP'den durum ve (yalnız bana bağlılarda) bakiye. İki
 * bölüm varsa ayrı başlıklarla: "Bana bağlı olanlar" önce, "Ekip arkadaşlarım" sonra (yönetici
 * önde, "Yöneticim" etiketli); tek bölümde başlık "Ekip üyeleri". "Kalan yıllık izin" sütunu
 * yalnız bana bağlılar bölümünde. Satır kişi bölmesini açar; ↑/↓ bölümler arasında da sürer.
 * Genişte sütun başlıkları süs (`aria-hidden`): satırların okunur etiketleri kendi içinde.
 */
export function TeamList({ rows, groups, photos, presence, status, onOpen, className }) {
  const { t } = useLocale()
  const list = groups ?? [{ id: "reports", rows }]
  const split = list.length > 1
  return (
    <div className={cn("min-w-0 space-y-5", className)} onKeyDown={rowNav}>
      {list.map((g) => (
        <Group
          key={g.id}
          title={t(split ? `selfService.team.group.${g.id}` : "selfService.team.list.title")}
          rows={g.rows}
          balance={g.id === "reports"}
          wide={split && g.id !== "reports"}
          photos={photos}
          presence={presence}
          status={status}
          onOpen={onOpen}
        />
      ))}
    </div>
  )
}
