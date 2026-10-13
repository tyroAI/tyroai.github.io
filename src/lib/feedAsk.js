import { requestOpenChat, setPendingAsk } from "@/lib/chatBus"

/**
 * Gönderiyi sohbete taşır (akış kartı ve okuma penceresi aynı soruyu sorar).
 * Kişisel posta kurumsal bir kanaldan gelmediği için duyuru gibi sorulmaz.
 * `t(key, vars)`: konu serbest metin, `.replace()` zinciri `$` kalıplarını bozar.
 */
export function askAboutPost(post, t) {
  setPendingAsk({
    question: t(post.tag ? "feed.askPrompt" : "feed.askPromptMail", {
      author: post.author,
      subject: post.subject || t("feed.noSubject"),
      preview: post.preview || "—",
    }),
    agent: "tyro office",
  })
  requestOpenChat({ focusComposer: true })
}
