import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useLocale } from "@/hooks/useLocale"
import { useSelfService } from "@/hooks/useSelfService"
import { useSelfServiceProfile } from "@/hooks/useSelfServiceProfile"
import { useToday } from "@/hooks/useToday"
import { requestOpenChat, setPendingAsk, setPendingFiles } from "@/lib/chatBus"
import { nextAccrual } from "@/lib/selfServiceAccrual"
import { yearsOf } from "@/lib/selfServiceModel"
import { withNames } from "@/lib/selfServiceNames"
import { nextParams, readParams } from "@/lib/selfServiceParams"
import { SmartAlerts } from "./alerts/SmartAlerts"
import { RecordSheet } from "./detail/RecordSheet"
import { NewRequestActions } from "./header/NewRequestActions"
import { ProfileHeader } from "./header/ProfileHeader"
import { RequestWatchLine } from "./header/RequestWatchLine"
import { ViewSwitch } from "./header/ViewSwitch"
import { leaveContext, recordQuestion } from "./recordText"
import { RequestDialog } from "./request/RequestDialog"
import { MyRecords } from "./MyRecords"
import { BoardSkeleton, SelfServiceState } from "./SelfServiceStates"
import { tabOf } from "./kinds"
import { byComposition } from "./team/teamText"
import { TeamView } from "./team/TeamView"
import { useNewRecordWatch } from "./useNewRecordWatch"
import { useRecordsView } from "./useRecordsView"

const HR_AGENT = "tyro hr"
const THIS_YEAR = new Date().getFullYear()
// Fareli cihazda soru sorulunca imleç sohbetin yazma alanına geçer; dokunmatikte klavye açılmasın.
const finePointer = () => Boolean(window.matchMedia?.("(pointer: fine)").matches)

/** Kayıt adresteki `ref` ile aranır: izinde satır kimliği, masraf/avansta numara (büyük/küçük harf duyarsız). */
function findRecord(data, tab, ref) {
  if (!data || !ref) return null
  const list = data[tabOf(tab).data] ?? []
  const want = String(ref).toLowerCase()
  return list.find((r) => String(r.id).toLowerCase() === want) ?? null
}

/**
 * SELF SERVİS — kişinin profil başlığı (Graph birincil: unvan, departman, sicil, hizmet süresi,
 * bağlı olduğu kişi, ekip) ve ERP'deki izin, izin bakiyesi, masraf ve iş avansı kayıtları;
 * sohbette oluşturulan talepler buraya bağlanır (`?tab=expense&ref=HRMS-…`). İki görünüm:
 * "Bilgilerim" (dönem · özet · sekmeler · liste + rapor) ve ekibi olanlarda (yönetici, aynı
 * yöneticiye bağlılar, bana bağlılar) "Ekibim" (`view=team`). Seçimler adreste
 * (`lib/selfServiceParams.js`). Ayrıntı: docs/features/self-servis.md.
 */
export function SelfServicePage() {
  const { t, locale } = useLocale()
  const ss = useSelfService()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const raw = ss.status === "ready" ? ss.data : null
  // Dile bağlı adlar (izin türü, avans amacı, durum) bir kez: liste, arama ve özet bunları kullanır.
  const data = useMemo(() => (raw ? withNames(raw, t) : null), [raw, t])
  const years = useMemo(
    () => (data ? yearsOf(data.leaves, data.expenses, data.advances) : []),
    [data],
  )
  const sel = useMemo(() => readParams(params, { years, thisYear: THIS_YEAR }), [params, years])
  // Seçimler geçmişi kirletmez (`replace`); yalnız kayıt açmak bir adım ekler (`push`): Geri
  // tuşu açık kaydı kapatır, sayfadan çıkarmaz.
  const update = useCallback(
    (patch, { push = false } = {}) =>
      setParams((prev) => nextParams(prev, patch), { replace: !push }),
    [setParams],
  )
  // Arama yerel ve sekmeye bağlı: sekme değişince boşalır (izinde "taksi" aramak boş liste olurdu).
  const [search, setSearch] = useState({ tab: sel.tab, q: "" })
  const query = search.tab === sel.tab ? search.q : ""
  const setQuery = useCallback((q) => setSearch({ tab: sel.tab, q }), [sel.tab])

  const profile = useSelfServiceProfile(raw?.worker ?? null, {
    erpLoading: ss.status === "loading",
  })
  // Sonraki izin hak edişi (tahmin): profil başlığındaki işe giriş günü + bu yılki hak. "Bugün"
  // gün değişince yenilenir: sekme gece açık kalsa da "x gün sonra" eskimez.
  const hireTime = profile.hireDate?.getTime() ?? null
  const claim = raw?.balance?.claim ?? null
  const today = useToday()
  const accrual = useMemo(
    () => (hireTime == null ? null : nextAccrual(new Date(hireTime), today, claim)),
    [hireTime, claim, today],
  )
  // Ekip = yönetici + aynı yöneticiye bağlılar + bana bağlılar (`useMyTeam`); yüklenirken o ana
  // dek gelenler: yönetici bilinince anahtar çıkar, sayı ekip tamamlanınca.
  const team = profile.team ?? {}
  const teamPending = Boolean(profile.pending?.team)
  const hasTeam = (team.size ?? 0) > 0
  // Ekip henüz gelmediyse `view=team` bağlantısı Bilgilerim'i bir an çizmesin.
  const teamView = sel.view === "team" && (hasTeam || teamPending)
  const view = useRecordsView({ data, sel, query })
  // Gözcünün yoklaması sessiz: düşerse yüklü sayfa kalır (`ss.pollFailed`).
  const watch = useNewRecordWatch({ data, refresh: ss.poll })
  const watchSlot = useRef(null)
  const open = findRecord(data, sel.tab, sel.ref)

  // Sohbetten gelen bağlantının kaydı başka bir yıldaysa liste o yıla geçer: satır vurgulu görünsün.
  const openYear = open?.date?.getFullYear()
  useEffect(() => {
    if (openYear && sel.year != null && openYear !== sel.year) update({ year: openYear })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openYear])

  // Soru İK asistanına park edilir, rıhtım açılır. `context`: serbest sorunun konusu
  // ("Masraflarım") — sohbette sorunun önünde görünür.
  const ask = (question, context) => {
    setPendingAsk({ question, context, agent: HR_AGENT })
    requestOpenChat({ focusComposer: finePointer() })
  }
  // Yeni talep: önce form (`request/RequestDialog`); "Sohbette gönder" şablonun cümlesini (ve
  // masraf fişlerini) İK asistanına yollar, konuşma rıhtımda sürer. Talep ERP'ye yansıyana kadar
  // sayfa yoklar (`useNewRecordWatch`).
  const [form, setForm] = useState(null)
  // `from`: form kapanınca odağın döneceği öğe (telefonda menüyü açan "Yeni talep" düğmesi).
  const onNew = (kind, from = null) => setForm({ kind, seq: Date.now(), from })
  const onSubmitRequest = (kind, { text, files }) => {
    setPendingFiles(files)
    setPendingAsk({ question: text, agent: HR_AGENT })
    setForm(null)
    requestOpenChat({ focusComposer: finePointer() })
    watch.start(kind)
  }
  // Kayıt açmak geçmişe adım ekler; kapatmak (×, Escape) o adımı geri alır. Sohbetten gelen
  // bağlantıyla açılan kayıtta adım yok: adresten `ref` silinir.
  const pushed = useRef(null)
  useEffect(() => {
    if (!sel.ref) pushed.current = null
  }, [sel.ref])
  const openRecord = (r, extra) => {
    pushed.current = r.id
    update({ ...extra, tab: r.kind, ref: r.id }, { push: true })
  }
  const closeRecord = useCallback(
    (o) => {
      if (o) return
      if (pushed.current && pushed.current === sel.ref) {
        pushed.current = null
        navigate(-1)
      } else update({ ref: null })
    },
    [update, navigate, sel.ref],
  )
  // Uyarının "+n"i listeyi süzer (öteki süzgeçler ve arama boşalır: uyarının kayıtları
  // gizlenmesin); liste başlığın epey altında olabilir, oraya kaydırılır.
  const showList = ({ tab, status, year }) => {
    update({ tab, status, year, facet: null, month: null, ref: null })
    setSearch({ tab, q: "" })
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    requestAnimationFrame(() =>
      document
        .getElementById("ss-records")
        ?.closest("section")
        ?.scrollIntoView({ block: "start", behavior: still ? "auto" : "smooth" }),
    )
  }
  const context = open ? leaveContext(open, view.report, sel.year, t, locale) : null

  const loading = ss.status === "loading"
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="ms-scroll flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="myspace-gutter mx-auto w-full max-w-[96rem] px-5 pb-16 pt-6 sm:px-8 sm:pt-8 lg:px-12 lg:pt-10 shortest:pt-4">
          <div className="@container/ss">
            <h1 className="sr-only">{t("nav.selfService")}</h1>
            <ProfileHeader
              profile={profile}
              level={2}
              views={
                hasTeam ? (
                  <ViewSwitch
                    value={teamView ? "team" : "me"}
                    onChange={(v) => update({ view: v, ref: null })}
                    teamCount={teamPending ? null : team.size}
                    countPending={teamPending}
                  />
                ) : null
              }
              actions={<NewRequestActions onNew={onNew} />}
            />
            {/* Satır kapanınca odak boşa düşmesin: hep duran kap odağı alır. */}
            <div ref={watchSlot} tabIndex={-1} className="outline-none">
              {watch.active && (
                <RequestWatchLine
                  arrived={watch.arrived}
                  busy={ss.busy}
                  failed={ss.pollFailed}
                  onRefresh={ss.poll}
                  onOpen={(r) => openRecord(r, { view: null })}
                  onDismiss={() => {
                    watchSlot.current?.focus({ preventScroll: true })
                    watch.stop()
                  }}
                />
              )}
            </div>
            {!teamView && data && (
              <SmartAlerts
                data={data}
                onOpen={openRecord}
                onShow={showList}
                onAsk={ask}
                onNew={onNew}
                className="mt-3"
              />
            )}
            {sel.ref && ss.status === "ready" && !open && !teamView && (
              <p
                role="status"
                className="mt-4 rounded-2xl border border-border bg-muted/50 px-4 py-3 text-[0.8125rem] text-foreground/80"
              >
                {/* Adresteki metin yazılmaz: bağlantıyla sayfaya başkasının cümlesi konamasın. */}
                {t("selfService.refMissing")}
              </p>
            )}
            {teamView ? (
              <TeamView onAsk={ask} />
            ) : loading ? (
              <BoardSkeleton />
            ) : ss.status === "ready" ? (
              <MyRecords
                data={data}
                sel={sel}
                view={view}
                years={years.length ? years : [THIS_YEAR]}
                update={update}
                query={query}
                onQuery={setQuery}
                updatedAt={ss.updatedAt}
                onRefresh={ss.refresh}
                busy={ss.busy}
                onOpen={openRecord}
                openId={open?.id}
                onAsk={ask}
                onNew={onNew}
                newKeys={watch.newKeys}
                accrual={accrual}
              />
            ) : (
              <SelfServiceState
                status={ss.status}
                detail={ss.detail}
                onConnect={ss.connect}
                onRetry={ss.refresh}
                busy={ss.busy}
              />
            )}
            <p className="mt-8 px-1 text-[0.6875rem] text-muted-foreground">
              {t(
                teamView
                  ? byComposition(team, [
                      "selfService.team.source",
                      "selfService.team.sourceMembers",
                      "selfService.team.sourceMixed",
                    ])
                  : "selfService.source",
              )}
            </p>
          </div>
        </div>
      </div>
      <RequestDialog
        request={form}
        onClose={() => setForm(null)}
        onSubmit={onSubmitRequest}
        balance={raw?.balance ?? null}
      />
      <RecordSheet
        record={teamView ? null : open}
        facet={view.filters.facet}
        context={context}
        onOpenChange={closeRecord}
        onAsk={(r) => ask(recordQuestion(r, t, locale))}
      />
    </div>
  )
}
