import { useMemo } from "react"
import { BrandOrb } from "@/components/brand/BrandOrb"
import { useLocale } from "@/hooks/useLocale"
import { useOrbStyle } from "@/hooks/useOrbStyle"
import { startOfDay } from "@/lib/calendarRange"
import { cn } from "@/lib/utils"
import { CelebrationNote } from "./CelebrationNote"
import { DaySummary } from "./DaySummary"
import { pendingInvites } from "@/lib/calendarInvites"

/**
 * Özet balonu — referansın konuşma balonu: asistanın ağzından günün özeti,
 * CÜMLE olarak; anahtar veri vurgulu ve açılır (`DaySummary`, tyroforecast'in
 * "Yönetici Özeti" deseni).
 *
 * ⚠️ Konuşan BİZİM küremiz (`BrandOrb`, kullanıcının seçtiği görünüm) ve
 * SAĞINDAKİ cümleyi OKUYOR (`reading`: profilden sağa döner, gözler satırları
 * yukarıdan aşağı tarar). Uygulamanın yönü her dilde `ltr`, yani metin her
 * dilde kürenin sağında.
 * ⚠️ `inert` + `aria-hidden`: küre görünümünün kökü bir `<button>` — burada
 * basılacak bir şey yokken sekme sırasına boş bir durak koyardı. Pay görünüme
 * göre (maskotun kutusu küreden ~%29, kürenin halesiyle ~%78 büyük): küre
 * metnin ilk satırıyla hizalı dursun.
 *
 * `compact`: sağ ızgaranın dar kartı — yazı bir kademe küçük.
 */
export function BriefBubble({
  className,
  compact = false,
  celebration,
  cal,
  mail,
  now,
  focus,
  feedFresh,
  feedOpen,
  todoOpen,
}) {
  const { t } = useLocale()
  const orbStyle = useOrbStyle()

  // Bugün BİTMEMİŞ toplantılar — kendi takvimin, reddedilmemiş, tüm gün değil.
  // Liste (sayı değil): özetin ipucu ilk üçünün saatini ve konusunu yazıyor.
  const meetingsToday = useMemo(() => {
    const end = new Date(now)
    end.setHours(23, 59, 59, 999)
    return (cal.events ?? [])
      .filter(
        (e) =>
          !e.owner &&
          !e.isAllDay &&
          e.myResponse !== "declined" &&
          e.end.getTime() > now &&
          e.start.getTime() <= end.getTime(),
      )
      .sort((a, b) => a.start - b.start)
  }, [cal.events, now])

  // Yanıt bekleyen davetler — aynı takvim okumasından, Graph'a ek istek yok.
  const invites = useMemo(() => pendingInvites(cal.events, now), [cal.events, now])

  // Header rozetiyle AYNI küme: bugün gelen ve okunmamış (`useMailMessages`in
  // `unread` sayısının tanımı). İpucu bu listenin ilk üçünü yazıyor.
  const unreadMail = useMemo(() => {
    const start = startOfDay(new Date(now)).getTime()
    return (mail.messages ?? []).filter(
      (m) => !m.isRead && m.received && m.received.getTime() >= start,
    )
  }, [mail.messages, now])

  return (
    <div
      role="group"
      data-tour="brief"
      aria-label={t("myspace.brief.title")}
      className={cn("ms-surface flex min-w-0 flex-col rounded-[1.75rem] p-5", className)}
    >
      {/* Kutlama günü: balonun başında AYRI blok, ince bir ayraç, sonra her
          zamanki özet. */}
      {celebration && (
        <>
          <CelebrationNote celebration={celebration} compact={compact} />
          <div
            aria-hidden="true"
            className={cn(
              "h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent",
              compact ? "my-3" : "my-3.5",
            )}
          />
        </>
      )}
      {/* ⚠️ KÜRE + GİRİŞ CÜMLESİ, ALTINDA MADDELER: küre yanındaki cümleyi
          okuyor (`reading`); maddeler kartın tam genişliğinde.
          ⚠️ KUTLAMA GÜNÜ GİRİŞ SATIRI YOK: o gün balonu kutlama bloğu açıyor;
          küre + giriş satırı balonu 285 px'e çıkarıp sağdaki toplantı ve odak
          kartlarını boşlukla gererdi (ölçüldü; sıradan gün 232). */}
      {!celebration && (
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            inert={true}
            className={cn(
              "pointer-events-none shrink-0",
              orbStyle === "mascot" ? "-mx-1.5 -my-2" : "-m-4",
            )}
          >
            {/* `mascotState="idle"`: panelin uyku döngüsünü atlar — uyuyan bir
                küre gözlerini kapatır ve cümleye bakamazdı. */}
            <BrandOrb
              surface="dashboard"
              state="idle"
              mascotState="idle"
              size={compact ? 40 : 44}
              reading
            />
          </span>
          <p
            className={cn(
              "min-w-0 flex-1 font-medium text-foreground/85",
              compact ? "text-[0.9375rem] leading-[1.35]" : "text-[1.0625rem] leading-[1.4]",
            )}
          >
            {t("myspace.sum.intro")}
          </p>
        </div>
      )}
      {/* ⚠️ MADDELER KARTIN BOYUNA YAYILIR: kart satırın boyunu alıyor (hava
          kartı ve komşuları); maddeler üstte toplansa altta ~45 px boş bir
          şerit kalırdı (1728'de ölçüldü). Liste kalan yüksekliği alır ve
          maddeler eşit aralıkla dağılır; yer yokken aralık `gap`e iner. */}
      <div
        className={cn(
          "flex flex-1 flex-col",
          celebration ? undefined : compact ? "mt-3" : "mt-3.5",
        )}
      >
        <DaySummary
          cal={cal}
          meetings={meetingsToday}
          invites={invites}
          mail={mail}
          unreadMail={unreadMail}
          tasks={focus.tasks}
          tasksLoading={focus.loading}
          tasksSource={focus.mode}
          feedOpen={feedOpen}
          feedUnread={feedFresh.count}
          feedItems={feedFresh.items}
          todoOpen={todoOpen}
          compact={compact}
        />
      </div>
    </div>
  )
}
