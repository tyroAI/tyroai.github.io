import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import Notification03Icon from "@hugeicons/core-free-icons/Notification03Icon"
import Settings02Icon from "@hugeicons/core-free-icons/Settings02Icon"
import { notify } from "@/lib/notify"
import { Button } from "@/components/ui/button"
import {
  getPermission,
  notificationsSupported,
  requestNotificationPermission,
  showNotification,
} from "@/lib/notify/browserNotify"
import { osNotificationSettings } from "@/lib/notify/osSettings"
import { useLocale } from "@/hooks/useLocale"
import { CardHead, ProfileCard } from "./primitives"
import { cn } from "@/lib/utils"

/**
 * ⚠️ KABA İŞARETÇİ SINIFLARI LİTERAL YAZILIR, DEĞİŞKENDEN KURULMAZ.
 *
 * Tailwind kaynağı METİN olarak tarar: `${COARSE}:min-h-9` gibi bir şablon
 * ifadesi hiçbir sınıf üretmez ve kural SESSİZCE ÖLÜ kalır. `pointer-coarse:`
 * varyantı Tailwind v4'te YOK, o yüzden bu dosyadaki
 * `[@media(pointer:coarse)]:` önekleri elle ve tam olarak yazılıdır
 * (tyroTrade'de ölçülmüş bir tuzak).
 */

/**
 * "Bildirimler" — izin durumu + test.
 *
 * Ayarlar → Genel'in bir bölümüydü (`GeneralTab`'in `NotificationSection`'ı) ve
 * buraya TAŞINDI, kopyalanmadı (istek üzerine, 2026-09-08; tyroTrade'de de
 * aynı taşıma yapılmıştı). Ayarlar'da bırakılmadı: aynı izni yöneten iki yüzey
 * kullanıcıya "hangisi asıl?" diye sordurur — ve /settings'in Genel sekmesi
 * uygulamanın KENDİSİNİ (sürüm, yerel depolama dökümü) anlatıyor, kişinin
 * bildirim tercihini değil.
 *
 * Teşhis mantığı ve `settings.notify.*` anahtarları satır satır aynı bırakıldı;
 * çeviriler bozulmasın diye anahtarlar yeniden adlandırılmadı.
 *
 * ── VAR OLMA SEBEBİ TEŞHİS ─────────────────────────────────────────────
 *
 * "Hiç bildirim gelmiyor" en az üç farklı arızanın ortak görüntüsü: site izni
 * verilmemiş, tarayıcı engellemiş, ya da işletim sistemi tarayıcının
 * bildirimlerini tümden kapatmış (macOS'te çok yaygın: Chrome'un site izni
 * "granted" olsa bile Sistem Ayarları kapalıysa hiçbir şey görünmez ve bunu
 * JS'ten anlamanın yolu yok).
 *
 * Test düğmesi bu üçünü ayırıyor: sohbetin koşullarını (sekme arkada mı, panel
 * kapalı mı) tamamen atlayıp doğrudan bir bildirim gösteriyor. Görünürse OS
 * tarafı sağlam demektir; görünmezse arıza tarayıcının dışında.
 *
 * Ayrıca gerçek bir boşluğu kapatıyor: composer üstündeki teklif şeridi bir kez
 * kapatılınca bir daha çıkmıyordu, yani izni sonradan açmanın arayüzde hiçbir
 * yolu yoktu.
 */
export function NotificationsCard() {
  const { t } = useLocale()
  const [permission, setPermission] = useState(getPermission)
  const [testing, setTesting] = useState(false)
  // null → sorulmadı · "ask" → "göründü mü?" · "help" → görünmedi, tarif göster
  const [verify, setVerify] = useState(null)
  const osTarget = osNotificationSettings()

  const supported = notificationsSupported()

  const statusLabel = {
    granted: t("settings.notify.status.granted", "İzin verildi"),
    default: t("settings.notify.status.default", "İzin istenmedi"),
    denied: t("settings.notify.status.denied", "Tarayıcı engelledi"),
    unsupported: t("settings.notify.status.unsupported", "Bu tarayıcı desteklemiyor"),
  }[supported ? permission : "unsupported"]

  async function handleAllow() {
    const next = await requestNotificationPermission()
    setPermission(next)
    if (next === "granted") notify.success(t("chat.notify.enabled", "Bildirimler açıldı"))
  }

  async function handleTest() {
    setTesting(true)
    setVerify(null)
    try {
      const shown = await showNotification({
        title: t("settings.notify.testTitle", "TYRO test bildirimi"),
        body: t("settings.notify.testBody", "Bunu görüyorsanız bildirimler doğru çalışıyor."),
        tag: "tyro-notify-test",
      })
      // shown:true yalnızca "tarayıcı kabul etti" demek — işletim sistemi onu
      // sessizce yutmuş olabilir ve bunu okumanın yolu yok. O yüzden cevabı
      // kullanıcıdan alıyoruz.
      setVerify(shown ? "ask" : "help")
      if (!shown) notify.error(t("settings.notify.testFailed", "Bildirim gösterilemedi."))
    } finally {
      setTesting(false)
    }
  }

  return (
    <ProfileCard>
      <CardHead
        icon={Notification03Icon}
        title={t("settings.notify.sectionTitle", "Bildirimler")}
        subtitle={t("settings.notify.sectionSubtitle", "Yanıt geldiğinde haber alın")}
      />

      <div className="space-y-3 px-5 py-4">
        <div className="rounded-xl border border-border/60 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
              <HugeiconsIcon icon={Notification03Icon} className="size-4.5" strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {t("settings.notify.rowTitle", "Yanıt bildirimleri")}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    permission === "granted" && supported
                      ? "bg-emerald-500"
                      : "bg-muted-foreground/40",
                  )}
                />
                {statusLabel}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              {supported && permission === "default" && (
                <Button
                  type="button"
                  size="sm"
                  // ⚠️ `size="sm"` bu uygulamada h-8 ve bu, sekmenin BİRİNCİL
                  // eylemi. Kaba işaretçide 36px'e çıkıyor; primitifin
                  // kendisine dokunulmadı, çünkü `size="sm"` uygulamanın her
                  // yerinde kullanılıyor ve orada bir tasarım kararı.
                  className="[@media(pointer:coarse)]:h-9 [@media(pointer:coarse)]:px-4"
                  onClick={handleAllow}
                >
                  {t("chat.notify.allow", "İzin ver")}
                </Button>
              )}
              {supported && permission === "granted" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="[@media(pointer:coarse)]:h-9 [@media(pointer:coarse)]:px-4"
                  disabled={testing}
                  onClick={handleTest}
                >
                  {t("settings.notify.test", "Test bildirimi gönder")}
                </Button>
              )}
            </div>
          </div>

          {permission === "denied" && (
            <p className="mt-3 border-t border-border/50 pt-3 text-[0.6875rem] leading-relaxed text-muted-foreground">
              {t(
                "settings.notify.deniedHelp",
                "Tarayıcı bu site için bildirimleri engelledi. Adres çubuğundaki kilit simgesinden izni geri açabilirsiniz.",
              )}
            </p>
          )}

          {/* Testten sonra cevabı kullanıcıdan alıyoruz: bildirimi işletim
              sisteminin gerçekten gösterip göstermediğini JS'ten okumak mümkün
              değil. Bu, izni çoktan vermiş olan kullanıcının da doğrulamayı
              istediği zaman tekrar çalıştırabildiği tek yer — composer
              üstündeki şerit bir kez kapatılınca geri gelmiyor. */}
          {verify === "ask" && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/50 pt-3">
              <span className="min-w-0 flex-1 text-[0.71875rem] text-foreground/80">
                {t("chat.notify.verify.q", "Deneme bildirimi gönderdik — ekranınızda göründü mü?")}
              </span>
              <Button
                type="button"
                size="sm"
                className="h-7 px-2.5 text-[0.6875rem] [@media(pointer:coarse)]:h-9 [@media(pointer:coarse)]:px-3"
                onClick={() => {
                  setVerify(null)
                  notify.success(t("chat.notify.enabled", "Bildirimler açıldı"))
                }}
              >
                {t("chat.notify.verify.yes", "Göründü")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-[0.6875rem] [@media(pointer:coarse)]:h-9 [@media(pointer:coarse)]:px-3"
                onClick={() => setVerify("help")}
              >
                {t("chat.notify.verify.no", "Görünmedi")}
              </Button>
            </div>
          )}

          <div className="mt-3 space-y-2 border-t border-border/50 pt-3">
            <p
              className={cn(
                "text-[0.6875rem] leading-relaxed",
                verify === "help" ? "text-foreground/90" : "text-muted-foreground/80",
              )}
            >
              {t(osTarget.hintKey, t("settings.notify.osHint", ""))}
            </p>
            {osTarget.url && (
              // Doğrudan doğru panele götürür. Şema resmî olarak belgelenmiş
              // değil ve tarayıcı onay ister — bu yüzden yazılı tarif üstte
              // duruyor, düğme tek yol değil.
              <a
                href={osTarget.url}
                className="inline-flex items-center gap-1.5 py-0.5 text-[0.6875rem] font-medium text-brand hover:underline [@media(pointer:coarse)]:py-2"
              >
                <HugeiconsIcon icon={Settings02Icon} className="size-3.5" strokeWidth={2} />
                {t("chat.notify.help.open", "Bildirim ayarlarını aç")}
              </a>
            )}
          </div>
        </div>

        <p className="text-[0.6875rem] leading-relaxed text-muted-foreground/80">
          {t("profile.notify.scopeNote")}
        </p>
      </div>
    </ProfileCard>
  )
}
