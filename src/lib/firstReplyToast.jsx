import { toast } from "sonner"
import { FirstReplyToast } from "@/components/chat/FirstReplyToast"

/**
 * Sohbetin ilk mesajında bir kez çıkan bildirim.
 *
 * Sohbet sayfasında SAYFANIN ÜSTÜNDE, ortada; sohbet sağ paneldeyken (`inDock`) panelin
 * üstünde, sağ üstte ve panele sığan genişlikte — mesaj baktığın sohbetin yanında çıkar.
 * Veri yenileme bildirimi sağ altta kalıyor —
 * o ambiyans, bu ise kullanıcının BİR SANİYE ÖNCE yaptığı şeye verilen
 * cevap: "gönderdin, çalışıyor, beklemene gerek yok". Sağ altta kaçırılan
 * bir mesaj burada kaçırılmıyor. Sonner v2'de `position` toast BAŞINA
 * verilebiliyor, yani uygulamanın alt-orta yerleşimi değişmiyor.
 *
 * Süre metne göre: iki cümle okunacak, yenileme bildirimindeki gibi sonsuz
 * değil ama bir bakışlık da değil.
 */
export function showFirstReplyToast({ t, inDock = false, duration = 9000 }) {
  const title = t("chat.firstReply.title")
  const body = t("chat.firstReply.body")
  return toast.custom(() => <FirstReplyToast title={title} body={body} compact={inDock} />, {
    position: inDock ? "top-right" : "top-center",
    unstyled: true,
    duration,
    // Aynı sohbette ikinci kez çağrılırsa üst üste binmesin.
    id: "first-reply",
  })
}
