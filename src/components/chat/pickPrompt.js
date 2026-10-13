import { requestComposerTemplate } from "@/lib/chatBus"

/**
 * Bir öneri kartı seçildi (`PromptStarters` · `PromptLab`). Alanlı istem
 * bestecide Anasayfa'daki gibi seçilebilir alanlı cümle açar; düz istem metni
 * yazı alanına düşürür ve AÇIK bir şablonu kapatır — kapatmasa metin, şablonun
 * altında gizli kalan yazı alanına yazılırdı.
 */
export function pickPrompt(p, onPick) {
  // Düz kartın metni de bestecinin "son seçilen kart"ıdır: dokunulmadan bir
  // alanlı karta geçilirse onun yerine şablon açılır (`useComposerTemplate`).
  if (p.template) {
    requestComposerTemplate({ key: p.template.key, preset: p.template.preset, text: p.text })
    return
  }
  requestComposerTemplate({ text: p.text })
  onPick(p.text)
}
