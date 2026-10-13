import { forwardRef, useEffect, useMemo, useState } from "react"
import { useMsal } from "@azure/msal-react"
import { useLocale } from "@/hooks/useLocale"
import { useCalendarEvents } from "@/hooks/useCalendarEvents"
import { useMailMessages } from "@/hooks/useMailMessages"
import { useDriveItems, RECENT, searchLocation, FILES_SCOPES } from "@/hooks/useDriveItems"
import { useRecentPeople } from "@/hooks/useRecentPeople"
import { useMyDriveId } from "@/hooks/useMyDriveId"
import { defaultCalendarRange } from "@/lib/calendarRange"
import { derivePeopleFromEvents, derivePeopleFromMessages, mergePeople } from "@/lib/derivePeople"
import { readSharedCalendars } from "@/lib/sharedCalendars"
import { STATUS, requestGraphScopes } from "@/lib/graph"
import { isOwnDrive } from "@/lib/fileActions"
import { ReferenceList } from "./ReferenceList"
import { filterRows, initialsOf, searchKey } from "./referenceSources"
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon"
import File01Icon from "@hugeicons/core-free-icons/File01Icon"
import Mail01Icon from "@hugeicons/core-free-icons/Mail01Icon"
import UserGroupIcon from "@hugeicons/core-free-icons/UserGroupIcon"

/**
 * Ofis sekmeleri — Graph'tan gelen referanslar.
 *
 * Her sekme AYRI bir bileşendir ve yalnızca etkinken mount edilir. Sebep tek
 * bir sekmede: `useDriveItems` mount olur olmaz ağa çıkıyor (ve `null` konumla
 * bilinçli olarak hata döndürüyor). Diğer üçü zaten sıcak önbellekten okuyor —
 * takvim ve posta panelleri header'da her rotada mount, yani bu listeler
 * kullanıcı "/" yazmadan ÖNCE çekilmiş oluyor ve seçici sıfır istek yapıyor.
 *
 * "Sıfır istek" ÖNBELLEK TAZEYKEN geçerli: takvim 5, posta 2 dakikalık bir
 * TTL taşıyor. Uygulamayı açıp yirmi dakika başka sayfada çalışan biri
 * seçiciyi açtığında o iki liste yeniden çekilir — ama bu, panelin kendi
 * için açtığı bir uç değil, header panellerinin zaten kullandığı aynı
 * önbellek girdisi; ikinci bir istek yollanmaz.
 *
 * Yeni Graph kapsamı İSTENMEZ. Teams kanalları, dizin araması, kişi fotoğrafı
 * ve presence hepsi yönetici onaylı kapsamlar ister; onaysız bir kapsamı
 * `loginRequest`'e eklemek girişi "Approval required" duvarına çevirir.
 */

/** dd.MM.yyyy HH:mm — uygulamanın tarih kuralı (her dilde aynı düzen). */
function stamp(d, withTime = true) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return ""
  const p = (n) => String(n).padStart(2, "0")
  const date = `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`
  return withTime ? `${date} ${p(d.getHours())}:${p(d.getMinutes())}` : date
}

function useConnect(scopes, refresh) {
  const { instance, accounts } = useMsal()
  return async () => {
    const ok = await requestGraphScopes(instance, accounts[0], scopes)
    if (ok) refresh?.()
  }
}

export const MeetingsTab = forwardRef(function MeetingsTab(
  { query, onPick, footer, compact, index, onIndexChange },
  ref,
) {
  const { t } = useLocale()
  // Aralık ve paylaşılan takvim listesi takvim paneliyle BİREBİR aynı
  // kaynaktan: önbellek anahtarı ikisini de içeriyor, bir milisaniyelik fark
  // aynı veriyi ikinci kez çektirirdi.
  const { rangeStart, rangeEnd } = useMemo(() => defaultCalendarRange(), [])
  const people = useMemo(() => readSharedCalendars(), [])
  const { status, events, error, refresh } = useCalendarEvents(rangeStart, rangeEnd, true, people)
  const connect = useConnect(["Calendars.Read"], refresh)

  // "Şimdi" panel açılırken BİR KEZ okunur: render sırasında saat okumak
  // saf olmayan bir çağrı ve liste zaten menü açık kaldığı sürece aynı
  // eşikle sıralanmalı (satırlar altımızda kaymasın).
  const [now] = useState(() => Date.now())
  const rows = useMemo(() => {
    // Sıra ZAMANA göre: aralık bugünden ~5 hafta ÖNCE başlıyor (ızgara
    // geçmiş ayı da kapsıyor) ve ham sırayla basıldığında liste temmuzdaki
    // toplantılarla açılıyordu — 50 satırlık kesme de bugünkü toplantıyı
    // listeden atıyordu. Önce yaklaşanlar (yakın olan üstte), sonra geçmiş
    // (yeni olan üstte): kimse üç hafta önceki toplantıyı referans vermiyor.
    const ms = (e) => (e.start instanceof Date ? e.start.getTime() : 0)
    const upcoming = events.filter((e) => ms(e) >= now - 3600_000).sort((a, b) => ms(a) - ms(b))
    const past = events.filter((e) => ms(e) < now - 3600_000).sort((a, b) => ms(b) - ms(a))
    return [...upcoming, ...past].map((e, i) => {
      const when = stamp(e.start)
      const title = e.subject || t("ref.untitledMeeting")
      return {
        id: `mtg-${e.id ?? i}`,
        icon: Calendar03Icon,
        title,
        subtitle: e.organizer || e.organizerAddress || "",
        meta: when,
        search: searchKey(title, e.organizer, e.organizerAddress, when),
        token: `${t("ref.token.meeting")} "${title}" ${when}`.trim(),
      }
    })
  }, [events, t, now])

  return (
    <Filtered
      ref={ref}
      {...{
        status,
        error,
        rows,
        query,
        onPick,
        connect,
        refresh,
        footer,
        compact,
        index,
        onIndexChange,
      }}
      emptyKey="ref.empty.meetings"
    />
  )
})

export const PeopleTab = forwardRef(function PeopleTab(
  { query, onPick, footer, compact, index, onIndexChange },
  ref,
) {
  const { t } = useLocale()
  const { accounts } = useMsal()
  const me = (accounts[0]?.username ?? "").toLowerCase()
  const { rangeStart, rangeEnd } = useMemo(() => defaultCalendarRange(), [])
  const people = useMemo(() => readSharedCalendars(), [])
  const {
    status: calStatus,
    events,
    error: calError,
    refresh,
  } = useCalendarEvents(rangeStart, rangeEnd, true, people)
  const { status: mailStatus, messages, refresh: refreshMail } = useMailMessages(12)

  const base = useMemo(
    () => mergePeople(derivePeopleFromEvents(events, me), derivePeopleFromMessages(messages, me)),
    [events, messages, me],
  )

  const q = query.trim()
  const baseRows = useMemo(() => base.map((p) => toPersonRow(p, t)), [base, t])
  const baseHits = useMemo(() => filterRows(baseRows, query), [baseRows, query])

  // Bellekteki iki kaynak yetmediyse gelen kutusunun son 50 göndericisi
  // İSTENİR — ama ancak kullanıcı yazıp eşleşme bulamadığında. Sıfır ağ
  // vaadini bozan tek yer burası ve maliyeti kullanıcının niyeti tetikliyor;
  // dizin araması ise onaysız bir kapsam istediği için hiç yok.
  const wantMore = q.length >= 2 && baseHits.rows.length === 0
  const recent = useRecentPeople(wantMore)
  const rows = useMemo(
    () =>
      wantMore
        ? mergePeople(
            base,
            recent.map((p) => ({ ...p, n: 0 })),
          ).map((p) => toPersonRow(p, t))
        : baseRows,
    [wantMore, base, recent, baseRows, t],
  )

  const status =
    calStatus === STATUS.ready || mailStatus === STATUS.ready ? STATUS.ready : calStatus
  // İki kaynak birden tazelenir: eskiden yalnızca takvim yenileniyordu ve
  // izin verildikten sonra gelen kutusundan türeyen kişiler gelmiyordu.
  const connect = useConnect(["Calendars.Read", "Mail.Read"], () => {
    refresh()
    refreshMail()
  })

  return (
    <Filtered
      ref={ref}
      {...{
        status,
        error: calError,
        rows,
        query,
        onPick,
        connect,
        refresh,
        footer,
        compact,
        index,
        onIndexChange,
      }}
      emptyKey="ref.empty.people"
      hint={wantMore && recent.length === 0 ? t("ref.searchingInbox") : null}
    />
  )
})

function toPersonRow(p, t) {
  return {
    id: `person-${p.address.toLowerCase()}`,
    icon: UserGroupIcon,
    initials: initialsOf(p.name),
    title: p.name,
    subtitle: p.address,
    search: searchKey(p.name, p.address),
    // ADRES ŞART: dizinde ad çözecek bir uç yok, asistanın postada
    // arayabileceği tek anahtar adresin kendisi (posta gönderme diyaloğundaki
    // "tam adres gerekir" kısıtının aynısı).
    token: `${t("ref.token.person")} ${p.name} <${p.address}>`,
  }
}

export const MailTab = forwardRef(function MailTab(
  { query, onPick, footer, compact, index, onIndexChange },
  ref,
) {
  const { t } = useLocale()
  // TAM OLARAK 12: posta panelinin istediği sayı bu ve önbellek anahtarı
  // sayıyı içeriyor — 13 demek yeni bir GET demek.
  const { status, messages, error, refresh } = useMailMessages(12)
  const connect = useConnect(["Mail.Read"], refresh)

  const rows = useMemo(
    () =>
      messages.map((m) => {
        const when = stamp(m.received, false)
        const subject = m.subject || t("ref.untitledMail")
        return {
          id: `mail-${m.id}`,
          icon: Mail01Icon,
          title: subject,
          subtitle: m.from,
          meta: when,
          search: searchKey(subject, m.from, m.fromAddress),
          token: `${t("ref.token.mail")} "${subject}" — ${m.from}, ${when}`,
        }
      }),
    [messages, t],
  )

  return (
    <Filtered
      ref={ref}
      {...{
        status,
        error,
        rows,
        query,
        onPick,
        connect,
        refresh,
        footer,
        compact,
        index,
        onIndexChange,
      }}
      emptyKey="ref.empty.mail"
    />
  )
})

/**
 * Dosya sekmeleri — OneDrive ve SharePoint AYRI.
 *
 * Tek "Dokümanlar" sekmesi vardı ve iki farklı yeri tek listede topluyordu:
 * kullanıcı "bu dosya benim mi, ekibin mi" sorusunu listeden cevaplayamıyordu.
 * Ayrım Graph'ın KENDİ alanından geliyor (`parentReference.driveType`):
 * `personal`/`business` kullanıcının kendi sürücüsü, `documentLibrary` bir
 * SharePoint kitaplığı. URL'den tahmin etmek (`-my.sharepoint.com`) bulutlara
 * göre değişiyor; alan değişmiyor.
 *
 * İKİ SEKME TEK İSTEK: ikisi de aynı `useDriveItems` çağrısını yapıyor, yani
 * aynı önbellek girdisini okuyor. Sekme değiştirmek ağa çıkmaz; yalnızca
 * süzgeç değişir. Arama da ortak (`/search/query` kapsamı zaten OneDrive +
 * erişilebilen SharePoint'in tamamı), sonuç aynı alana göre ikiye ayrılır.
 *
 * İzinler bilinçli olarak ayrı: SharePoint'e erişimi olmayan bir kurumda
 * kullanıcı kendi OneDrive'ını görmeye devam eder.
 */
// "Kendi OneDrive'ım mı?" kararı `lib/fileActions.js`te (Dosyalarım da okuyor).

function useFileRows({ mine, query, t }) {
  const [nonce, setNonce] = useState(0)
  const myDriveId = useMyDriveId()
  // `useDeferredValue` bir debounce DEĞİL: her tuşta yeni bir konum nesnesi
  // üretiyordu ve "konşimento" yazmak dokuz ayrı `POST /search/query`
  // demekti. Gerçek bekleme burada.
  const trimmed = query.trim()
  const [deferred, setDeferred] = useState(trimmed)
  useEffect(() => {
    if (trimmed === deferred) return
    const id = setTimeout(() => setDeferred(trimmed), 350)
    return () => clearTimeout(id)
  }, [trimmed, deferred])

  const loc = useMemo(() => (deferred.length >= 2 ? searchLocation(deferred) : RECENT), [deferred])
  const { status, items, scopes, error } = useDriveItems(loc, nonce)
  const refresh = () => setNonce((n) => n + 1)

  const rows = useMemo(
    () =>
      items
        // Satırlar `folder` alanı TAŞIMIYOR, `kind` taşıyor: eski süzgeç
        // hiçbir şeyi elemiyordu ve arama sonucundaki klasörler besteciye
        // "Doküman" diye yazılıyordu.
        .filter((it) => it.kind === "file")
        .filter((it) => isOwnDrive(it, myDriveId) === mine)
        .map((it) => ({
          id: `file-${it.id}`,
          icon: File01Icon,
          title: it.name,
          subtitle: it.modifiedBy || "",
          meta: stamp(it.modified ? new Date(it.modified) : null, false),
          search: searchKey(it.name, it.modifiedBy),
          // METİN değil ADRES: dosyanın içeriği çekilmez, `tyro office`
          // kiracıda yetkili ve SharePoint yolunu kendisi çözüyor.
          token: `${t("ref.token.file")} "${it.name}"${it.webUrl ? ` ${it.webUrl}` : ""}`,
        })),
    [items, mine, myDriveId, t],
  )

  // Ham liste dolu ama bu sekmenin dilimi boşsa bunu AÇIKÇA söyle: "hiç
  // dosya yok" demek yanlış olurdu, dosyalar diğer sekmede duruyor.
  const allInOtherTab = rows.length === 0 && items.some((it) => it.kind === "file")
  return {
    status,
    error,
    rows,
    scopes,
    refresh,
    allInOtherTab,
    serverFiltered: deferred.length >= 2,
  }
}

export const OneDriveTab = forwardRef(function OneDriveTab(
  { query, onPick, footer, compact, index, onIndexChange },
  ref,
) {
  const { t } = useLocale()
  const { status, error, rows, scopes, refresh, allInOtherTab, serverFiltered } = useFileRows({
    mine: true,
    query,
    t,
  })
  const connect = useConnect(scopes ?? FILES_SCOPES, refresh)
  return (
    <Filtered
      ref={ref}
      {...{
        status,
        error,
        rows,
        query: serverFiltered ? "" : query,
        onPick,
        connect,
        refresh,
        footer,
        compact,
        index,
        onIndexChange,
      }}
      emptyKey={
        serverFiltered ? "ref.noMatch" : allInOtherTab ? "ref.empty.otherTab" : "ref.empty.onedrive"
      }
    />
  )
})

export const SharePointTab = forwardRef(function SharePointTab(
  { query, onPick, footer, compact, index, onIndexChange },
  ref,
) {
  const { t } = useLocale()
  const { status, error, rows, scopes, refresh, allInOtherTab, serverFiltered } = useFileRows({
    mine: false,
    query,
    t,
  })
  const connect = useConnect(scopes ?? FILES_SCOPES, refresh)
  return (
    <Filtered
      ref={ref}
      {...{
        status,
        error,
        rows,
        query: serverFiltered ? "" : query,
        onPick,
        connect,
        refresh,
        footer,
        compact,
        index,
        onIndexChange,
      }}
      emptyKey={
        serverFiltered
          ? "ref.noMatch"
          : allInOtherTab
            ? "ref.empty.otherTab"
            : "ref.empty.sharepoint"
      }
    />
  )
})

/** Süzme + liste — dört sekmenin ortak kuyruğu. */
const Filtered = forwardRef(function Filtered(
  {
    status,
    error,
    rows,
    query,
    onPick,
    connect,
    refresh,
    footer,
    emptyKey,
    hint,
    compact,
    index,
    onIndexChange,
  },
  ref,
) {
  const hits = useMemo(() => filterRows(rows, query), [rows, query])
  return (
    <>
      {hint && <p className="px-3 pt-2 text-[0.6875rem] text-muted-foreground">{hint}</p>}
      <ReferenceList
        ref={ref}
        status={status}
        error={error}
        rows={hits.rows}
        query={query}
        onPick={onPick}
        onConnect={connect}
        onRetry={refresh}
        emptyKey={emptyKey}
        total={hits.total}
        footer={footer}
        compact={compact}
        index={index}
        onIndexChange={onIndexChange}
        listId="ref-list"
      />
    </>
  )
})
