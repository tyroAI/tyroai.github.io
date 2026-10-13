import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { HugeiconsIcon } from "@hugeicons/react"
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon"
import Megaphone01Icon from "@hugeicons/core-free-icons/Megaphone01Icon"
import { useLocale } from "@/hooks/useLocale"
import { useIsInGroup } from "@/hooks/useIsInGroup"
import { usePageAccess } from "@/hooks/usePageAccess"
import { ADMIN_GROUP_ID } from "@/lib/constants"
import { hasPendingAsk } from "@/lib/chatBus"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { KindBadge, KindTile } from "./KindBadge"
import {
  entriesSince,
  formatEntryDate,
  hasEntry,
  KIND_ORDER,
  isReturningBrowser,
  latestEntryId,
  pick,
  readSeenId,
  visibleEntries,
  writeSeenId,
} from "./entryText"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  YENİLİKLER PENCERESİ — girişte bir kez, yalnız kesmeye değer kayıtta
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ⚠️ **PENCEREYİ AÇAN ŞEY `notify`, YENİ KAYIT DEĞİL.** Her deploy pencere
 * açsaydı kullanıcı pencereyi refleksle kapatmaya başlar ve büyük yenilik
 * de o refleksle kaçardı. İşaretsiz kayıtlar sessizce birikir; sol
 * menüdeki sayaç ve `/whats-new` sayfası onları taşır.
 *
 * ⚠️ **İKİ FARKLI "İLK ZİYARET" VAR.** Gerçekten yeni kullanıcının
 * yakalayacağı bir geçmiş yok — işaret sessizce kurulur. Uygulamayı zaten
 * kullanan biri ise özelliğin yayına girdiği gün İŞARETSİZDİR ve sessiz
 * kalmak, kimsenin sayfanın varlığını öğrenmemesi demekti: orada pencere
 * BİR KEZ açılır (`catchup`). Ayrımı `isReturningBrowser` yapıyor.
 *
 * ⚠️ **PARK EDİLMİŞ SORU VARSA AÇILMAZ.** Kullanıcı bir karttan ya da bir
 * panelden "TYRO'ya sor" ile geldiyse belirli bir iş yapmaya gelmiştir.
 * Soru TÜKETİLMEZ, yalnız varlığına bakılır (`hasPendingAsk`).
 *
 * ⚠️ **KAPATMAK = OKUNDU.** Ayrı bir "anladım" düğmesi yok: kapatmanın iki
 * anlamı olsaydı (okudum / sonra bakarım) kullanıcı hangisini yaptığını
 * bilemezdi.
 *
 * ⚠️ **TAVAN VE SAYI BİRBİRİNİ YALANLAMAZ.** Tavanı aşan kayıt varsa sayı
 * alt şeritte YAZILIR. Tavan kalkmıyor: üç ay sonra dönen birine 40
 * kartlık modal kaydırtmak özeti arşive çevirirdi.
 */
const MAX_IN_DIALOG = 5

export function WhatsNewDialog() {
  const { t, locale } = useLocale()
  const navigate = useNavigate()
  // ⚠️ ÜÇ DEĞERLİ: `undefined` = üyelik cevabı HENÜZ gelmedi. `=== true`
  // ile ezip geçmek burada `/whats-new`dekiyle aynı arızayı üretiyordu ve
  // bu pencere DAHA kötü yeri vuruyor, çünkü işareti KENDİSİ yazıyor:
  //
  //   1. kare — cevap yok, isAdmin false → dar liste → işaret en yeniye
  //      yazılır ve pencere 1 kayıtla açılır;
  //   2. kare — cevap `true` gelir, `seen === latest` → efekt erken döner.
  //
  // Sonuç: yöneticiye özel kayıtlar ve düzeltmeler hiç duyurulmadan
  // okunmuş sayılır. Ölçüldü (bugünkü katalog, işaret 09-10'da):
  // yarışla 1 kayıtlık pencere ve sonrasında 0 okunmamış; yarışsız 3
  // kayıtlık pencere.
  const adminVerdict = useIsInGroup(ADMIN_GROUP_ID)
  const isAdmin = adminVerdict === true
  // Rota kapısı (`visibleEntries` › `canOpen`). Bugünkü iki kitle UPN listesi
  // ve eşzamanlı okunuyor, yani yukarıdaki yarışa yeni bir yarış eklemiyor;
  // bir gün `"admins"` kitlesine geçilirse karar aynı `adminVerdict`ten
  // geliyor ve aşağıdaki bekleme onu da kapsıyor.
  const { canOpen } = usePageAccess()
  // ⚠️ TEK STATE, iki alan. `entries` ve `mode` ayrı state olduğunda efekt
  // ikisini birden yazıyor ve `react-hooks/set-state-in-effect` iki ihlal
  // sayıyor; ikisi zaten aynı kararın parçası.
  const [shown, setShown] = useState(null)

  // Pencerenin LİSTESİ: düzeltmeler hiç girmez (bkz. `visibleEntries`).
  const visible = useMemo(
    () => visibleEntries({ isAdmin, surface: "dialog", canOpen }),
    [isAdmin, canOpen],
  )
  // ⚠️ İŞARET BAŞKA LİSTEDEN. Okundu işareti "sayfada görebileceğim her
  // şeyle başa başım" demek; pencerenin kendi (düzeltmesiz) listesinden
  // yazılsaydı işaret bir düzeltmenin GERİSİNDE kalır ve o düzeltme
  // yöneticinin sayfasında sonsuza dek "yeni" görünürdü. Tersi de doğru:
  // işaret bir düzeltmeye yazılıp kart onu bulamazsa rozet bir daha hiç
  // yanmaz — gerekçenin tamamı `visibleEntries` başında.
  const marker = useMemo(() => visibleEntries({ isAdmin, canOpen }), [isAdmin, canOpen])

  useEffect(() => {
    // Cevap gelmeden HİÇBİR ŞEY yazılmaz ve pencere açılmaz: bu efektin
    // her dalı işaretle oynuyor.
    if (adminVerdict === undefined) return
    const latest = latestEntryId(marker)
    if (!latest) return
    const seen = readSeenId()
    if (!seen) {
      if (isReturningBrowser() && visible.some((e) => e.notify)) {
        // ⚠️ Park edilmiş soru BURADA da keser ve işaret KURULMAZ:
        // kurulsaydı o kullanıcı yayın penceresini bir daha hiç göremezdi.
        if (hasPendingAsk()) return
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShown({ mode: "catchup", items: visible })
      }
      writeSeenId(latest)
      return
    }
    if (seen === latest) return
    // Gösterilecek olanlar pencere yüzeyinden: sayı ile liste birbirini
    // yalanlamasın ("3 yenilik var" deyip 2 kart çizmek).
    const fresh = entriesSince(seen, visible)
    // ⚠️ İŞARET KATALOGDA YOKSA ONAR. Kayıt silinmiş ya da kimliği
    // değiştirilmişse işaret öksüz kalır ve o tarayıcıda sayaç bir daha hiç
    // yanmazdı — tek bir yazım hatasının özelliği sessizce öldürmesi.
    //
    // ⚠️ Soru KATALOĞA sorulur (`hasEntry`), bu yüzeyin listesine DEĞİL.
    // Süzülmüş listeye sormak, yalnızca burada gizlenen bir kaydı silinmiş
    // sanıp işareti GERİYE çekerdi: yönetici sayfayı açıp işaretini bir
    // düzeltmeye yazdırır, ertesi oturumda grup sorgusu düşerse (fail-closed
    // `UNKNOWN`) o düzeltme listede olmaz ve işaret okunmuş bir kaydın
    // üstüne geri alınırdı — rozet yeniden yanar, hatta pencere yeniden
    // açılırdı ("kapattım ama gitmiyor").
    if (!fresh.length) {
      if (!hasEntry(seen)) writeSeenId(latest)
      return
    }
    if (!fresh.some((e) => e.notify)) return
    if (hasPendingAsk()) return
    setShown({ mode: "new", items: fresh })
    // Sekme başına bir kez: pencere açılır açılmaz okundu sayılır. Sekmeyi
    // yenileyince aynı pencerenin bir daha çıkması "kapattım ama gitmiyor"
    // hissi verirdi.
    writeSeenId(latest)
  }, [visible, marker, adminVerdict])

  if (!shown?.items?.length) return null
  const { mode } = shown
  /**
   * ⚠️ **PENCEREDE ÖNCE YENİLİK, SONRA İYİLEŞTİRME.**
   *
   * Liste ham dosya sırasıyla geliyordu ve dosya sırası GELİŞTİRME sırası:
   * bir iyileştirme, bir yenilik, bir iyileştirme daha. Sayfada bu sıra
   * gün içinde düzeltilmişti ama pencere ondan habersizdi.
   *
   * ⚠️ Sıralama burada GÜNE BAKMADAN, listenin tamamında yapılıyor — ve
   * fark bilinçli. Sayfa bir ZAMAN ÇİZGİSİ, orada günün sırası bozulamaz;
   * pencere ise "son ziyaretinden beri ne oldu" özeti, yani bir zaman
   * çizgisi değil bir ÖNEM sırası. Beş satırlık bir kesintide okunacak ilk
   * şey, kullanıcının KAZANDIĞI şey olmalı.
   *
   * ⚠️ Sıralama yalnız ÇİZİM sırası: okundu işareti `marker` listesinden
   * hesaplanıyor (bkz. yukarısı), bu diziye hiç bakmıyor. `sort` kararlı,
   * yani aynı tür içinde yeniden eskiye sıra korunuyor.
   *
   * ⚠️ Kırpma (`MAX_IN_DIALOG`) sıralamadan SONRA: tavanı aşan şey artık
   * "en eski" değil "en az öncelikli" oluyor, ki alttaki "+N" da onu
   * söylüyor.
   */
  const items = [...shown.items].sort(
    (a, b) => (KIND_ORDER[a.kind] ?? 99) - (KIND_ORDER[b.kind] ?? 99),
  )
  // ⚠️ Alt şeritteki tarih SIRALAMADAN ÖNCEKİ ilk kayıttan okunuyor. Liste
  // geldiğinde yeniden eskiye sıralı, yani `shown.items[0]` en yeni olan.
  // `items[0]` demek, tarihin "en yeni değişiklik" değil "en yeni YENİLİK"
  // olması demekti — o gün bir iyileştirme çıktıysa şerit dünü gösterirdi.
  const newestDate = shown.items[0].date
  const go = (to) => {
    setShown(null)
    navigate(to)
  }

  return (
    <Dialog open onOpenChange={() => setShown(null)}>
      {/* ⚠️ `sm:max-w-xl`, çıplak `max-w-xl` DEĞİL: `DialogContent`in
          varsayılanı `sm:` önekli ve tailwind-merge farklı VARYANTLARI
          tekilleştiremiyor — medya sorgusu olan kazanır ve pencere dar
          kalırdı. */}
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-xl">
        {/* Marka tonlu kaş: pencere uygulamanın kendi sesiyle konuşsun.
            Gradyan `--brand-soft`tan zemine iniyor, yani her palette ve iki
            temada da kendiliğinden doğru renkte. */}
        <DialogHeader className="space-y-0 border-b border-border bg-gradient-to-b from-brand-soft/50 to-card px-5 py-4 text-left">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-xl bg-card text-brand shadow-sm ring-1 ring-brand/15"
            >
              <HugeiconsIcon icon={Megaphone01Icon} className="size-4.5" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-[0.9375rem] leading-tight tracking-[-0.01em]">
                {t("whatsNew.title")}
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-[0.78125rem] leading-snug">
                {mode === "catchup"
                  ? t("whatsNew.dialog.introSubtitle")
                  : t("whatsNew.dialog.subtitle").replace("{n}", String(items.length))}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ul className="max-h-[55vh] divide-y divide-border overflow-y-auto overflow-x-hidden">
          {items.slice(0, MAX_IN_DIALOG).map((e) => (
            <li key={e.id} className="flex items-start gap-3 px-5 py-3.5">
              <KindTile kind={e.kind} className="mt-0.5 size-7" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2.5">
                  <span className="text-[0.84375rem] font-semibold leading-snug tracking-[-0.01em] text-foreground">
                    {pick(e.title, locale)}
                  </span>
                  <KindBadge kind={e.kind} />
                </div>
                <p className="mt-1 text-[0.78125rem] leading-relaxed text-muted-foreground">
                  {pick(e.body, locale)}
                </p>
                {/* "Git bak": bir yeniliği ANLATMAK ile GÖSTERMEK arasındaki
                    fark. Pencere kapanır ve kullanıcı o ekrana düşer. */}
                {e.to && (
                  <button
                    type="button"
                    onClick={() => go(e.to)}
                    className="mt-1.5 inline-flex items-center gap-1 text-[0.75rem] font-medium text-brand transition hover:gap-1.5 [@media(pointer:coarse)]:min-h-9"
                  >
                    {t("whatsNew.goLook")}
                    <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" strokeWidth={2.2} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/30 px-5 py-2.5">
          <span className="text-[0.71875rem] tabular-nums text-muted-foreground">
            {formatEntryDate(newestDate)}
          </span>
          <button
            type="button"
            onClick={() => go("/whats-new")}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[0.75rem] font-medium text-foreground transition hover:bg-accent/60 [@media(pointer:coarse)]:min-h-9"
          >
            {t("whatsNew.seeAll")}
            {/* ⚠️ AŞAN SAYI ALT ŞERİTTE, LİSTENİN İÇİNDE DEĞİL: kaydırmanın
                dibinde kalan bir satır, tam da görünmeyen yerde olurdu. */}
            {items.length > MAX_IN_DIALOG && (
              <span className="rounded-full bg-brand-soft/70 px-1.5 text-[0.6875rem] font-semibold tabular-nums text-brand">
                +{items.length - MAX_IN_DIALOG}
              </span>
            )}
            <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" strokeWidth={2.2} />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
