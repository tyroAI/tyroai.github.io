import { requestComposerTemplate } from "@/lib/chatBus"

/**
 * Park edilmiş ALANLI hazır soruyu bestecide açar (`setPendingAsk({ template })`) — gönderilmez,
 * kişi alanları doldurup kendisi gönderir.
 *
 * ⚠️ İSTEK INIT BİTİNCE VE ÇİZİMDEN SONRA GİDER. Asistan değişimi konuşmayı yeniden kuruyor ve
 * besteci, selamlama gelince boş ekrandan konuşma ağacına taşınıyor (yeniden bağlanır, açık
 * şablon düşer). `ready` init'in kapısı (`conversationReadyRef`); kapı açıldığında son
 * `setMessages` henüz çizilmemiş olabilir, o yüzden bir görev + bir kare daha beklenir —
 * bağlanmamış bir besteciye atılan olay kaybolur.
 */
export async function openParkedTemplate(key, readyRef) {
  try {
    await readyRef.current
  } finally {
    setTimeout(() => requestAnimationFrame(() => requestComposerTemplate({ key })), 0)
  }
}
