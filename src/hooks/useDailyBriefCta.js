import { useEffect, useMemo, useState } from "react"
import { useLocale } from "@/hooks/useLocale"
import { useIsInGroup } from "@/hooks/useIsInGroup"
import { ADMIN_GROUP_ID } from "@/lib/constants"
import { loadChatSession } from "@/lib/chatSession"
import {
  DAILY_BRIEF,
  briefPromptFor,
  briefWindowId,
  briefWindowName,
  briefWindowStart,
  resolveBriefWindow,
} from "@/lib/dailyBriefPolicy"

/**
 * GÜN ÖZETİ DÜĞMESİ — bu pencerede ne diyecek, basınca ne gönderecek.
 *
 * ⚠️ **İKİ YÜZEY, TEK KARAR.** Dashboard'un hero düğmesi ve mySpace'in öneri
 * çipi aynı soruyu soruyor: "şu an bir özet penceresi açık mı, açıksa bu
 * asistana ne sorulacak, kullanıcı başka bir şey sordu mu". Mantık önce
 * `AppLauncher`in `HeroSection`ının içindeydi; ikinci bir kopya, iki yüzeyin
 * aynı saatte farklı etiket göstermesi demekti (biri "Sabah özeti", öteki
 * "Yeni sohbet") — ve arkada ısıtılan tur yalnız birinin sözünü tutardı.
 *
 * Dönen `ask`, `App.handleNewChat`e olduğu gibi verilir: özet varsa park
 * edilip sohbete gidilir, zaten sorulduysa yalnız götürülür, yoksa yeni
 * sohbet açılır. Gerekçelerin tamamı `lib/dailyBriefPolicy.js`te.
 *
 * ⚠️ Kapı `WarmStart`ınkiyle AYNI olmalı: etiket "Sabah özeti hazırla"
 * derken arkada hiçbir şey ısıtılmıyorsa düğme bir söz veriyor ve
 * tutmuyor demektir. İkisi de `DAILY_BRIEF.audience` okuyor.
 *
 * ⚠️ "Kullanıcı artık başka bir şey sordu" DEPOLANMAZ, DÖKÜMDEN TÜRETİLİR.
 * Ayrı bir bayrak, dökümle çelişebilen ikinci bir gerçek olurdu. Pencerenin
 * başından beri kullanıcının yazdığı mesajlara bakılıyor: özet sorusundan
 * BAŞKA bir şey varsa düğme varsayılana döner.
 */
export function useDailyBriefCta(briefAgent) {
  const { t, locale } = useLocale()
  const isAdmin = useIsInGroup(ADMIN_GROUP_ID) === true

  // ⚠️ SAAT TİKİ ŞART. Saat yalnız RENDER ANINDA okunuyor ve kurulu PWA'da
  // sekme günlerce açık kalıyor: 10:55'te açılan bir sekme 11:30'da hâlâ
  // "Sabah özeti hazırla" derdi — basılınca da pencere kapalı olduğu için
  // hiçbir şey olmazdı. Tik ayrıca rıhtımda sorulan ekstra soruyu da
  // yakalıyor (etiket o an varsayılana dönmeli).
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000)
    const onVis = () => setTick((n) => n + 1)
    document.addEventListener("visibilitychange", onVis)
    return () => {
      clearInterval(id)
      document.removeEventListener("visibilitychange", onVis)
    }
  }, [])

  const brief = useMemo(() => {
    if (!briefAgent) return null
    const audienceOk =
      DAILY_BRIEF.audience === "*" ? true : DAILY_BRIEF.audience === "admins" ? isAdmin : false
    if (!audienceOk) return null
    const now = new Date()
    const win = resolveBriefWindow(now)
    if (!win) return null
    const windowId = briefWindowId(now, win)
    const question = briefPromptFor(briefAgent.name, windowId, locale)
    if (!question) return null
    const msgs = loadChatSession(briefAgent.id)?.messages ?? []
    const from = briefWindowStart(now, win)
    const mine = msgs.filter((m) => m.role === "user" && (m.at ?? 0) >= from)
    if (mine.some((m) => (m.content || "").trim() !== question.trim())) return null
    return {
      windowId,
      question,
      agentName: briefAgent.name,
      // Özet bu pencerede zaten soruldu: düğme hâlâ özeti gösteriyor ama
      // ikinci kez SORMUYOR — yalnız sohbete götürüyor.
      already: mine.length > 0,
    }
    // `tick` bilinçli bir bağımlılık: saat ve döküm zamanla değişiyor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [briefAgent, isAdmin, locale, tick])

  const label = brief
    ? t(`dashboard.hero.cta.${briefWindowName(brief.windowId)}`)
    : t("dashboard.hero.cta")
  const ask = brief ? (brief.already ? { navigateOnly: true } : brief) : undefined
  return { brief, label, ask }
}
