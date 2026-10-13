import { useState } from "react"
import { InviteList } from "@/components/myspace/DayInvites"
import { MeetingList } from "@/components/myspace/MeetingList"
import { PreviewDialog } from "@/components/myspace/preview/PreviewDialog"
import { TipPreviewList } from "@/components/myspace/preview/TipPreviewList"
import { useLocale } from "@/hooks/useLocale"
import { getDateTimeFormat } from "@/lib/intl-cache"
import { requestPanel } from "@/lib/panelBus"

const OPTS_TIME = { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }

/**
 * Brifing maddelerinin ipuçları — Anasayfa özetinin kapı davranışı: ilk kayıtlar,
 * kayda basınca önizleme, dipte ilgili yer (panel, To-Do, Keşfet). Günün brifingi
 * ve Karşılama kartı ortak. `dialog`: telefonda önizleme penceresi, kartın
 * içine çizilir. `meetingsTip(list, title)`: cümledeki toplantı ifadesinin ipucu
 * (Anasayfa özetinin aynısı — listeden önizleme, dipte takvim).
 */
export function useBriefTips(data) {
  const { t, locale } = useLocale()
  const [preview, setPreview] = useState(null)
  const { invites, unreadMail, tasks, feedItems, todoOpen, todoSynced } = data
  const openWith = (close, kind) => (item) => {
    close()
    requestAnimationFrame(() => setPreview({ kind, item }))
  }
  const toTask = (x, i) => ({
    ...x,
    n: i + 1,
    openTo:
      todoSynced && todoOpen && !String(x.id).startsWith("tmp-")
        ? `/todo?${new URLSearchParams({ task: x.id })}`
        : undefined,
  })
  const taskList = (list) => (close) => (
    <TipPreviewList
      kind="task"
      items={list.map(toTask)}
      label={(x) => `${x.n}.`}
      value={(x) => x.title}
      labelClass="w-[1.25rem]"
      onOpen={openWith(close, "task")}
    />
  )
  const todoAction = todoOpen ? { label: t("myspace.tip.tasks.open"), to: "/todo" } : undefined

  const TIP = {
    invites: {
      title: t("myspace.tip.invites.title"),
      kicker: t("myspace.tip.meetings.kicker"),
      list: (close) => <InviteList invites={invites} onOpen={openWith(close, "event")} />,
      note: t("myspace.tip.invites.note"),
      action: { label: t("myspace.tip.meetings.open"), onClick: () => requestPanel("calendar") },
    },
    mail: {
      title: t("myspace.tip.mail.title"),
      kicker: t("myspace.tip.mail.kicker"),
      list: (close) => (
        <TipPreviewList
          kind="mail"
          items={unreadMail}
          label={(m) => m.from || "—"}
          value={(m) => m.subject || t("calendar.noSubject")}
          valueLang={null}
          onOpen={openWith(close, "mail")}
        />
      ),
      note: t("myspace.tip.mail.note"),
      action: { label: t("myspace.tip.mail.open"), onClick: () => requestPanel("mail") },
    },
    overdue: {
      title: t("widgets.brief.tip.overdue"),
      kicker: t("myspace.tasks.title"),
      list: taskList(tasks.filter((x) => !x.done && x.overdue)),
      action: todoAction,
    },
    tasks: {
      title: t("myspace.tip.tasks.title"),
      kicker: t("myspace.tasks.title"),
      list: taskList(tasks.filter((x) => !x.done && !x.overdue)),
      action: todoAction,
    },
    feed: {
      title: t("myspace.tip.posts.title"),
      kicker: t("nav.feed"),
      list: (close) => (
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
      ),
      note: t("myspace.tip.posts.note"),
      action: { label: t("myspace.tip.posts.open"), to: "/feed" },
    },
  }

  const meetingsTip = (list, title) => ({
    title,
    kicker: t("myspace.tip.meetings.kicker"),
    list: (close) => (
      <MeetingList
        meetings={list}
        timeFmt={getDateTimeFormat(locale, OPTS_TIME)}
        onOpen={openWith(close, "event")}
      />
    ),
    note: t("myspace.tip.meetings.note"),
    action: { label: t("myspace.tip.meetings.open"), onClick: () => requestPanel("calendar") },
  })

  return {
    tips: TIP,
    meetingsTip,
    dialog: <PreviewDialog preview={preview} onClose={() => setPreview(null)} />,
  }
}
