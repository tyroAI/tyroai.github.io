import { useMemo, useState } from "react"
import { InsightTerm } from "@/components/myspace/InsightTerm"
import { TONE } from "@/components/myspace/summaryTone"
import { InviteList } from "@/components/myspace/DayInvites"
import { PreviewDialog } from "@/components/myspace/preview/PreviewDialog"
import { MeetingList } from "@/components/myspace/MeetingList"
import { TipPreviewList } from "@/components/myspace/preview/TipPreviewList"
import { useLocale } from "@/hooks/useLocale"
import { getDateTimeFormat } from "@/lib/intl-cache"
import { STATUS } from "@/lib/graph"
import "./daySummary.css"
import { requestPanel } from "@/lib/panelBus"
import { cn } from "@/lib/utils"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  Günün özeti — MADDE LİSTESİ, anahtar veri vurgulu ve açılır
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ⚠️ **MADDE, PARAGRAF DEĞİL.** Giriş cümlesi (`myspace.sum.intro`) kürenin
 * yanında, sayfada; burada konu başına BİR madde ve noktasız kısa ifade
 * (`myspace.sum.*` — "Listende 1 açık iş"). Paragraf dar kartta (sağ ızgaranın
 * ilk satırı) satırları ortadan bölüyordu; madde her konuyu kendi satırına
 * koyuyor. Madde işareti vurgunun tonunda (`TONE`), soramadık / boş hâl nötr.
 *
 * ⚠️ **ANAHTAR VERİ BİR KAPI.** Vurgulu ifadenin ipucu ilk üç kaydı gösterir ve
 * dibindeki eylem ilgili yere götürür: takvim ve posta PANELLERİ
 * (`lib/panelBus` — o an paneli çizen sahip, çentik ya da header), To-Do,
 * Keşfet. Özet bir şey söyleyip orada kalmamalı.
 *
 * ⚠️ **ÇOĞUL ARTIK GERÇEK — `Intl.PluralRules`.** Etiketli sayı biçimi bu
 * yüzden seçilmişti: "2 meetings / 1 meeting" dört dilde ayrı kural ister ve
 * sözlükte çoğul motoru yoktu. Cümleye geçince kaçış yok, motor burada:
 * `myspace.q.<ad>.<kategori>`, kategori `PluralRules(locale).select(n)`.
 * ⚠️ ALTI KATEGORİNİN HEPSİ (`zero one two few many other`) DÖRT sözlükte
 * de yazılı — TR/EN'de bazıları hiç seçilmez ama eksik anahtar İNGİLİZCEYE
 * düşüyor (`LocaleProvider`); Türkçe bir cümlenin ortasında "1 meeting"
 * çıkardı. Parite de böyle korunuyor.
 *
 * ⚠️ **SIFIR ayrı bir CÜMLE, sayı değil.** "Bugün 0 toplantın var" doğru ama
 * kötü; "Bugün başka toplantın yok" kişinin gerçekten okuyacağı cümle.
 * Arapçanın `zero` kategorisi de bu yüzden hiç kullanılmıyor.
 *
 * ⚠️ **"SORAMADIK" SIFIR DEĞİLDİR.** Takvim ya da posta okunamadıysa cümle
 * "ulaşılamıyor" der, "toplantın yok" DEMEZ; yüklenirken yerinde küçük bir
 * iskelet durur.
 *
 * ⚠️ **İPUCU HOVER'A MAHKUM DEĞİL.** Radix `Tooltip` dokunmatikte hiç açılmıyor
 * ve deponun kuralı hover'a bağlı bilgi bırakmamak. Terim bir DÜĞME ve açılan
 * şey `Popover`: farede üstüne gelince (kısa gecikmeyle) açılıp çıkınca
 * kapanıyor, dokunmatikte ve klavyede dokunuş/Enter ile açılıp kapanıyor.
 * Farede tıklamak kapatmıyor — üstüne gelince açılan bir şeyi tıklayınca
 * kapatmak, "tıkladım, gitti" hissi verirdi. Davranış toplantı kartının
 * önizlemesiyle ORTAK: `useHoverPopover` (kapanışta odağın tetiğe atlama
 * hatası ve düzeltmesi orada yazılı).
 */

const PLURAL_CATEGORIES = new Set(["zero", "one", "two", "few", "many", "other"])

const OPTS_TIME = { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }

/** "{q}" yuvalı bir cümle şablonunu, yuvaya bir düğüm koyarak böler. */
function fill(template, node) {
  const [before, after = ""] = String(template).split("{q}")
  return (
    <>
      {before}
      {node}
      {after}
    </>
  )
}

/**
 * @param meetings  bugün bitmemiş toplantılar (kendi takvimin, sıralı)
 * @param invites   yanıt bekleyen davetler (`lib/calendarInvites` › `pendingInvites`)
 * @param unreadMail bugün gelen okunmamış postalar (`useMailMessages` satırları)
 */
export function DaySummary({
  cal,
  meetings,
  invites = [],
  mail,
  unreadMail,
  tasks,
  tasksLoading = false,
  tasksSource = "local",
  feedOpen,
  feedUnread,
  feedItems = [],
  todoOpen = false,
  compact = false,
}) {
  const { t, locale } = useLocale()
  const plural = useMemo(() => new Intl.PluralRules(locale), [locale])
  const timeFmt = getDateTimeFormat(locale, OPTS_TIME)
  const [preview, setPreview] = useState(null) // telefonda önizlemesi açık toplantı/davet
  // Telefonda önizleme penceresi: ipucu kapanır, sonra pencere açılır.
  const openWith = (close, kind) => (item) => {
    close()
    requestAnimationFrame(() => setPreview({ kind, item }))
  }

  const phrase = (name, n) => {
    const cat = plural.select(n)
    // Sayı ardındaki sözcüğe bölünmez boşlukla bağlı: dar kartta "8" satır
    // sonunda tek başına kalıp "непрочитанных" alt satıra iniyordu.
    return t(`myspace.q.${name}.${PLURAL_CATEGORIES.has(cat) ? cat : "other"}`, { n }).replace(
      /(\p{Nd}+) /u,
      "$1\u00A0",
    )
  }
  // ⚠️ Satır içi `span`, `Skeleton` DEĞİL: o bir `div` çiziyor ve `<p>` içinde
  // geçersiz HTML (React iç içe geçme uyarısı).
  // ⚠️ YÜKLENİRKEN CÜMLENİN YERİNDE ÜÇ HAYALET SATIR: yuvalara konan satır içi
  // haplar, hazır bir cümle ("Listende 2 açık iş var.") aralarına düşünce
  // balonu boşluklu bir cümle gibi okutuyordu. Satırlar paragrafın
  // KENDİ satır yüksekliğinde (`1.7rem`), yani cümle gelince balon boy
  // değiştirmiyor.
  // Bugünün odağı To Do'dan geliyorsa o da yolda olabilir: "Listen henüz boş"
  // cümlesi liste inmeden basılırsa yanlış olurdu.
  // Hayalet maddeler gerçek maddenin satır yüksekliğinde: liste gelince balon
  // boy değiştirmesin.
  if (cal.status === "loading" || mail.status === "loading" || tasksLoading) {
    return (
      <div aria-busy="true" className="day-summary">
        <span className="sr-only">{t("myspace.loading")}</span>
        <div aria-hidden="true" className={cn("flex flex-col", compact ? "gap-2" : "gap-1.5")}>
          {["72%", "84%", "58%"].map((w) => (
            <span
              key={w}
              className={cn("flex items-center gap-2.5", compact ? "h-[1.3125rem]" : "h-[1.55rem]")}
            >
              <span className="ms-skeleton size-1.5 shrink-0 rounded-full" />
              <span className="ms-skeleton h-[0.8rem] rounded-full" style={{ width: w }} />
            </span>
          ))}
        </div>
      </div>
    )
  }

  // ── Toplantılar
  let meetingsNode
  if (cal.status !== STATUS.ready) meetingsNode = <>{t("myspace.sum.calUnavailable")}</>
  else if (!meetings.length) meetingsNode = <>{t("myspace.sum.meetingsNone")}</>
  else
    meetingsNode = (
      <>
        {fill(
          t("myspace.sum.meetings"),
          <InsightTerm
            tone="from"
            title={t("myspace.tip.meetings.title")}
            kicker={t("myspace.tip.meetings.kicker")}
            list={(close) => (
              <MeetingList
                meetings={meetings}
                timeFmt={timeFmt}
                onOpen={(event) => {
                  close()
                  requestAnimationFrame(() => setPreview({ kind: "event", item: event }))
                }}
              />
            )}
            note={t("myspace.tip.meetings.note")}
            action={{
              label: t("myspace.tip.meetings.open"),
              onClick: () => requestPanel("calendar"),
            }}
          >
            {phrase("meetings", meetings.length)}
          </InsightTerm>,
        )}
      </>
    )

  // ── Davetler (yalnız varsa — sıfır davet cümleye değmez). İpucu davetleri
  // listeler (Kabul et · Belki · Reddet); davete basınca önizleme açılır.
  const invitesNode = invites.length
    ? fill(
        t("myspace.sum.invites"),
        <InsightTerm
          tone="to"
          title={t("myspace.tip.invites.title")}
          kicker={t("myspace.tip.meetings.kicker")}
          list={(close) => (
            <InviteList
              invites={invites}
              onOpen={(invite) => {
                close()
                requestAnimationFrame(() => setPreview({ kind: "event", item: invite }))
              }}
            />
          )}
          note={t("myspace.tip.invites.note")}
          action={{
            label: t("myspace.tip.meetings.open"),
            onClick: () => requestPanel("calendar"),
          }}
        >
          {phrase("invites", invites.length)}
        </InsightTerm>,
      )
    : null

  // ── Posta
  let mailNode
  if (mail.status !== STATUS.ready) mailNode = <>{t("myspace.sum.mailUnavailable")}</>
  else if (!mail.unread) mailNode = <>{t("myspace.sum.mailNone")}</>
  else
    mailNode = (
      <>
        {fill(
          t("myspace.sum.mail"),
          <InsightTerm
            tone="via"
            title={t("myspace.tip.mail.title")}
            kicker={t("myspace.tip.mail.kicker")}
            list={(close) => (
              <TipPreviewList
                kind="mail"
                items={unreadMail}
                label={(m) => m.from || "—"}
                value={(m) => m.subject || t("calendar.noSubject")}
                valueLang={null}
                onOpen={openWith(close, "mail")}
              />
            )}
            note={t("myspace.tip.mail.note")}
            action={{ label: t("myspace.tip.mail.open"), onClick: () => requestPanel("mail") }}
          >
            {phrase("mail", mail.unread)}
          </InsightTerm>,
        )}
      </>
    )

  // ── Liste
  const open = tasks.filter((x) => !x.done)
  let tasksNode
  if (!tasks.length) tasksNode = <>{t("myspace.sum.tasksEmpty")}</>
  else if (!open.length) tasksNode = <>{t("myspace.sum.tasksDone")}</>
  else
    tasksNode = (
      <>
        {fill(
          t("myspace.sum.tasks"),
          <InsightTerm
            tone="to"
            title={t("myspace.tip.tasks.title")}
            kicker={t("myspace.tasks.title")}
            list={(close) => (
              <TipPreviewList
                kind="task"
                items={open.map((x, i) => ({
                  ...x,
                  n: i + 1,
                  // To Do'daki iş: ayrıntısı To-Do sayfasında açılır (`?task=`).
                  openTo:
                    tasksSource === "todo" && todoOpen && !String(x.id).startsWith("tmp-")
                      ? `/todo?${new URLSearchParams({ task: x.id })}`
                      : undefined,
                }))}
                label={(x) => `${x.n}.`}
                value={(x) => x.title}
                labelClass="w-[1.25rem]"
                onOpen={openWith(close, "task")}
              />
            )}
            note={t(tasksSource === "todo" ? "myspace.todo.synced" : "myspace.tasks.local")}
            action={todoOpen ? { label: t("myspace.tip.tasks.open"), to: "/todo" } : undefined}
          >
            {phrase("tasks", open.length)}
          </InsightTerm>,
        )}
      </>
    )

  // ── Keşfet (yalnız açıkken ve yeni bir şey varken — sıfır duyuru cümleye
  // değmez, sayfa zaten sidebar rozetiyle söylüyor).
  // ⚠️ İPUCU DUYURULARIN KENDİSİNİ LİSTELER, öteki maddeler gibi: satır
  // kanal · konu; konuya basmak o duyuruyu
  // Keşfet'in okuma penceresinde açar (`?post=`), dipteki bağlantı Keşfet'i
  // (Popüler). Liste sidebar rozetinin AYNI sorgusundan (`useFeedFresh`).
  const postsNode =
    feedOpen && feedUnread > 0
      ? fill(
          t("myspace.sum.posts"),
          <InsightTerm
            tone="from"
            title={t("myspace.tip.posts.title")}
            kicker={`${t("nav.feed")} · ${t("feed.section.agenda")}`}
            list={(close) => (
              <TipPreviewList
                kind="post"
                items={feedItems.map((p) => ({
                  ...p,
                  openTo: `/feed?${new URLSearchParams({ post: p.id })}`,
                }))}
                label={(p) => t(`feed.tag.${p.tag}`)}
                value={(p) => p.subject || t("calendar.noSubject")}
                labelClass="w-[5.5rem]"
                onOpen={openWith(close, "post")}
              />
            )}
            more={
              feedUnread > feedItems.length && feedItems.length
                ? t("myspace.tip.more", { n: feedUnread - feedItems.length })
                : null
            }
            note={t("myspace.tip.posts.note")}
            action={{ label: t("myspace.tip.posts.open"), to: "/feed" }}
          >
            {phrase("posts", feedUnread)}
          </InsightTerm>,
        )
      : null

  const items = [
    {
      key: "meetings",
      tone: cal.status === STATUS.ready && meetings.length ? "from" : null,
      node: meetingsNode,
    },
    invitesNode && { key: "invites", tone: "to", node: invitesNode },
    {
      key: "mail",
      tone: mail.status === STATUS.ready && mail.unread ? "via" : null,
      node: mailNode,
    },
    { key: "tasks", tone: open.length ? "to" : null, node: tasksNode },
    postsNode && { key: "posts", tone: "from", node: postsNode },
  ].filter(Boolean)

  return (
    // ⚠️ Yazı dar kartta 14 px, genişte 16 px; dar kartta satır arası en az
    // 8 px. Genişte en az 6 px: o düzende (hava kartı yok) balon satırın
    // boyunu BELİRLİYOR ve 10 px sağdaki kartları 18 px uzatıyordu (ölçüldü).
    // Dar kart üç kartlık satırın öteki ikisinden bir kademe büyük — bu kartın
    // işi okunmak, ötekilerin işi göz atılmak.
    // `justify-evenly`: kart satırla uzadıysa artan yer maddelerin arasına
    // dağılır (gerekçe sayfada, balonun kabında).
    <>
      <ul
        className={cn(
          "day-summary flex flex-1 flex-col justify-evenly text-foreground/80",
          compact ? "gap-2 text-[0.875rem] leading-[1.5]" : "gap-1.5 text-[1rem] leading-[1.55]",
        )}
      >
        {items.map(({ key, tone, node }) => (
          <li key={key} className="flex gap-2.5">
            {/* Nokta ilk satırın ortasında (`lh`), çevresinde aynı tonun hâlesi. */}
            <span
              aria-hidden="true"
              className={cn(
                "mt-[calc(0.5lh-0.1875rem)] size-1.5 shrink-0 rounded-full bg-current ring-[3px] ring-current/15",
                tone ? TONE[tone] : "text-foreground/30",
              )}
            />
            <span className="min-w-0">{node}</span>
          </li>
        ))}
      </ul>
      <PreviewDialog preview={preview} onClose={() => setPreview(null)} />
    </>
  )
}
