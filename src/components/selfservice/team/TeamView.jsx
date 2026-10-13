import { useCallback, useMemo, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import RefreshIcon from "@hugeicons/core-free-icons/RefreshIcon"
import UserGroupIcon from "@hugeicons/core-free-icons/UserGroupIcon"
import { useLocale } from "@/hooks/useLocale"
import { usePeoplePhotos } from "@/hooks/usePeoplePhotos"
import { usePresence } from "@/hooks/usePresence"
import { useSelfServiceTeam } from "@/hooks/useSelfServiceTeam"
import { useTeamDates } from "@/hooks/useTeamDates"
import { cn } from "@/lib/utils"
import { AskPopover } from "../ask/AskPopover"
import { GHOST, ICON } from "../chips"
import { updatedText } from "../period/updatedText"
import { MemberSheet } from "./MemberSheet"
import { TeamList } from "./TeamList"
import { TeamNotice } from "./TeamNotice"
import { TeamSummary } from "./TeamSummary"
import { TeamTimeline } from "./TeamTimeline"
import { TeamUpcoming } from "./TeamUpcoming"
import { byComposition, peopleText } from "./teamText"
import { useTeamView } from "./useTeamView"

/** Yükleme iskeleti — özet, çizelge ve liste gerçek yerlerinde (zıplama yok). */
function TeamSkeleton() {
  return (
    <div aria-hidden="true" className="mt-4 @[40rem]/ss:mt-5">
      <span className="ms-skeleton block h-8 w-48 rounded-full" />
      <span className="ms-skeleton mt-3 block h-16 rounded-[1.25rem] @[44rem]/ss:h-[4.75rem]" />
      <span className="ms-skeleton mt-5 block h-56 rounded-2xl" />
      <div className="mt-5 space-y-px overflow-hidden rounded-2xl">
        {[0, 1, 2].map((i) => (
          <span key={i} className="ms-skeleton block h-14" />
        ))}
      </div>
    </div>
  )
}

/**
 * "EKİBİM" — ekibin izin görünümü (ERP self servisinin Ekibim sekmesinin karşılığı; ekip
 * Anasayfa'daki "Çevrem"le aynı: yönetici, aynı yöneticiye bağlılar, bana bağlılar): özet (bugün
 * · bu hafta · ekip), geniş kapta 6 haftalık izin çizelgesi (doğum günü ve iş yıl dönümü
 * rozetleriyle; dar kapta "Yaklaşanlar" listesi), ekip listesi ("Bana bağlı olanlar" · "Ekip arkadaşlarım") ve kişi bölmesi. Kimlik
 * Graph'tan, izin ve bakiye ERP'den (`useSelfServiceTeam`); bakiye ve izin türü yalnız bana
 * bağlılarda, yönetici ve ekip arkadaşında yalnız izin günleri (türsüz). ERP okunamazsa liste
 * yine görünür, not kibarca söyler. `onAsk(soru, bağlam?)`: İK asistanına sorar (sohbet
 * rıhtımı); başlıktaki "TYRO'ya sor" ekibin bileşimine göre hazır sorular ve yazı alanı açar
 * (`AskPopover`) — ekip arkadaşı için yalnız tarih sorulur.
 */
export function TeamView({ onAsk }) {
  const { t, locale } = useLocale()
  const team = useSelfServiceTeam(true)
  // Doğum günü (gün-ay) ve kıdem tarihi İK görünümünden; okunamazsa yalnız Graph'ın işe girişi.
  const dates = useTeamDates(team.people)
  const view = useTeamView(team, dates)
  const [openKey, setOpenKey] = useState(null)
  // Bölmeyi açan düğme: kapanınca odak oraya döner (çubuğa fareyle basıldıysa yok).
  const returnTo = useRef(null)
  const openMember = useCallback((key) => {
    const el = document.activeElement
    returnTo.current = el && el !== document.body ? el : null
    setOpenKey(key)
  }, [])
  const addresses = useMemo(() => team.people.map((p) => p.address), [team.people])
  const upns = useMemo(() => team.people.map((p) => p.upn), [team.people])
  const photos = usePeoplePhotos(addresses)
  const presence = usePresence(upns)
  const leave = team.leave
  // Bölüm bazında durum: bir bölüm düştüyse (`failed`) yalnız o bölüm "error", öteki hazır kalır.
  const part = (name) =>
    leave.status === "ready" && leave.failed?.includes(name) ? "error" : leave.status
  const status = {
    all: leave.status,
    reason: leave.reason,
    leaves: part("leaves"),
    balance: part("balance"),
  }
  const open = openKey ? (view.rows.find((r) => r.key === openKey) ?? null) : null
  const updated = updatedText(leave.updatedAt, locale)
  const shared = { rows: view.rows, photos, presence, onOpen: openMember }
  // Hazır sorular ekibin bileşimine göre: ekip arkadaşının izin türü ve bakiyesi sorulmaz.
  const askTab = byComposition(view.summary, ["team", "teammates", "mixed"])
  // İki bölüm varsa çizelgede bölüm satırları da var (`TeamTimeline` › `GroupRow`): iskelet sayar.
  const split = view.groups.length > 1
  // Graph'tan okunamayan parça: liste eksik — not söyler, Yenile ve "Tekrar dene" yeniden sorar.
  const missing = (team.failed?.length ?? 0) > 0

  if (team.status === "loading") return <TeamSkeleton />
  if (!team.people.length) {
    return (
      <p className="mt-5 rounded-2xl border border-dashed border-border px-6 py-8 text-center text-[0.8125rem] text-muted-foreground">
        {t(
          team.status === "ready" && !missing
            ? "selfService.team.empty"
            : "selfService.team.unavailable",
        )}
      </p>
    )
  }
  return (
    <section aria-labelledby="ss-team" className="mt-4 min-w-0 @[40rem]/ss:mt-5">
      <div className="flex min-w-0 items-center gap-2">
        <h2
          id="ss-team"
          className="flex min-w-0 flex-1 items-center gap-2 px-1 text-[0.9375rem] font-semibold"
        >
          <HugeiconsIcon
            icon={UserGroupIcon}
            aria-hidden="true"
            className="size-4 shrink-0 text-brand-ink"
          />
          <span className="truncate">{t("selfService.view.team")}</span>
          <span className="shrink-0 text-[0.8125rem] font-normal text-muted-foreground">
            · {peopleText(team.people.length, t, locale)}
          </span>
        </h2>
        {updated && (
          <span className="hidden shrink-0 whitespace-nowrap text-[0.6875rem] tabular-nums text-muted-foreground @[56rem]/ss:inline">
            {t("selfService.updated", { time: updated })}
          </span>
        )}
        <button
          type="button"
          onClick={team.refresh}
          aria-label={t("selfService.team.refresh")}
          title={updated ? t("selfService.updated", { time: updated }) : undefined}
          aria-busy={team.busy || undefined}
          className={cn(GHOST, ICON)}
        >
          <HugeiconsIcon
            icon={RefreshIcon}
            className={cn(team.busy && "animate-spin motion-reduce:animate-none")}
            strokeWidth={1.9}
          />
        </button>
        <AskPopover tab={askTab} onAsk={onAsk} />
      </div>
      <TeamNotice
        leave={leave}
        missing={missing}
        busy={team.busy}
        onRetry={team.refresh}
        onConnect={team.connect}
        className="mt-3"
      />
      <TeamSummary summary={view.summary} rows={view.rows} status={status} className="mt-3" />
      {status.leaves === "loading" && (
        // Çizelgenin (genişte; iki bölümde bölüm satırları da) ya da yaklaşan izinlerin
        // (telefonda) yaklaşık boyu: zıplama olmasın.
        <span
          aria-hidden="true"
          style={{ "--rows": team.people.length, "--groups": split ? view.groups.length : 0 }}
          className="ms-skeleton mt-5 block h-[calc(2.75rem+min(var(--rows),5)*3.5rem)] rounded-2xl @[48rem]/ss:h-[calc(5.25rem+var(--rows)*2.5rem+var(--groups)*2rem)]"
        />
      )}
      {status.leaves === "ready" && (
        <>
          <TeamTimeline
            timeline={view.timeline}
            groups={view.groups}
            className="mt-5 hidden @[48rem]/ss:block"
            {...shared}
          />
          <TeamUpcoming upcoming={view.soon} className="mt-5 @[48rem]/ss:hidden" {...shared} />
        </>
      )}
      <TeamList groups={view.groups} status={status} className="mt-5" {...shared} />
      <MemberSheet
        row={open}
        rows={view.rows}
        today={view.today}
        status={status}
        onOpenChange={(o) => !o && setOpenKey(null)}
        onAsk={onAsk}
        onSwitch={setOpenKey}
        returnTo={returnTo}
      />
    </section>
  )
}
