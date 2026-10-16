import { useCallback, useMemo, useRef, useState } from "react"
import { SentIcon as AnimatedSentIcon } from "@/components/ui/sent"
import { useLocale } from "@/hooks/useLocale"
import { useConfig } from "@/hooks/useConfig"
import { useFavorites } from "@/hooks/useFavorites"
import { safeExternalUrl } from "@/lib/utils"
import { IconOrLogo } from "@/components/common/IconOrLogo"
import { BrandOrb } from "@/components/brand/BrandOrb"
import { AgentQuickAsk } from "@/components/dashboard/AgentQuickAsk"
import { RequestDetailDialog } from "@/components/dashboard/RequestDetailDialog"
import { notify } from "@/lib/notify"
import { useAppLock, useMyPendingRequests } from "@/hooks/useAuthorizations"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { AGENT_BRAND, agentDisplayName } from "@/lib/agentName"
import { createRequest } from "@/lib/authorizations"
import { isMsalConfigured, msalInstance } from "@/lib/msal"
import { ConfigAlert } from "./ConfigAlert"
import { LauncherCard } from "./LauncherCard"
import { LauncherSection as Section } from "./LauncherSection"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  KATALOG — üç bölüm, kilit, talep, favori, sağ tık hızlı soru
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ⚠️ **İKİ SAYFA, TEK KATALOG.** Önce `AppLauncher`ın gövdesiydi; mySpace de
 * aynı ızgarayı gösterince dışarı alındı. Kopyalamak, kilitli kartın örtüsü,
 * erişim talebi kutusu, talebin dökümü ve sağ tıkla açılan hızlı soru gibi
 * DÖRT ayrı davranışın iki yerde yaşaması demekti — biri düzeltilince öteki
 * eskide kalırdı. Kart, sıralama ve kutular burada; sayfa yalnız ÇERÇEVEYİ
 * çiziyor.
 *
 * `onlyFavorites`: mySpace'in "Favorilerim" süzgeci. Süzgeç kartı SAKLAR,
 * listeyi değiştirmez — favori kaydı `useFavorites`ın, burada yalnız okunur.
 */
export function LauncherCatalog({ onOpenChat, onlyFavorites = false, id = "apps" }) {
  const { t, locale } = useLocale()
  const { agents, aiApps, businessApps, error: configError } = useConfig()
  // Tek çağrı, üç bölüm: kartların her biri kendi bayrağını prop olarak alır.
  const { isFavorite, toggle } = useFavorites()
  // Sağ tıkla açılan hazır soru kutusu: hangi asistan ve imlecin nerede
  // olduğu. Tek bir kutu var, çünkü aynı anda iki kart üzerinde açık
  // olması anlamsız.
  const [quickAsk, setQuickAsk] = useState(null)

  // App kilidi. Kapalıyken `isLocked` her zaman false döner ve bu blok
  // ekrana tek piksel eklemez (bkz. lib/appLockPolicy.js).
  const lock = useAppLock()
  const pendingReq = useMyPendingRequests(lock.enabled)
  const [requesting, setRequesting] = useState(null)
  // Talep TEK TIKLA gitmiyor: kart tıklaması app'i açmaya alışkın bir jest
  // ve kilitliyken aynı yere basmak istemeden talep açardı. Eylem sağ
  // üstteki düğmede, gönderim de bir onaydan sonra.
  // ⚠️ Ad DEĞİL app'in KENDİSİ tutuluyor: kutu app'in ikonunu da gösteriyor
  // ve yalnız adla ikonu bulmak için katalogda ikinci bir arama gerekirdi.
  const [confirmApp, setConfirmApp] = useState(null)
  // Gönderilmiş talebin dökümü. Kutu `app` + `request` birlikte taşıyor:
  // ikonu katalogdan, tarihi ve notları satırdan okuyor.
  const [detailReq, setDetailReq] = useState(null)
  // Kullanıcının gerekçesi. Kutuyu her açışta SIFIRLANIR — bir önceki
  // app için yazılmış bir cümlenin ikincisine taşınması, kullanıcının
  // farkında olmadan yanlış gerekçeyi göndermesi demekti.
  const [note, setNote] = useState("")
  const sendRef = useRef(null)

  function openRequest(app) {
    setNote("")
    setConfirmApp(app)
  }

  async function sendRequest(name) {
    if (requesting) return
    // Talep KİMİN adına açılıyorsa onun GİRİŞ adresiyle (UPN) — yetki
    // tablosu da o adresle eşleşiyor, posta adresiyle değil.
    const upn = isMsalConfigured ? (msalInstance.getActiveAccount()?.username ?? null) : null
    if (!upn) return
    setRequesting(name)
    try {
      const { created, row } = await createRequest(upn, name, note)
      // Iki durumda da inceleniyor: yeni yazildi ya da zaten acik bir
      // talebi vardi. Kart her iki halde de eylem sunmamali.
      // `row` sunucunun yazdığı satır — tarih damgası oradan gelir,
      // tarayıcı saatinden değil.
      pendingReq.markPending(name, row)
      notify.success(created ? t("lock.requested") : t("lock.alreadyRequested"))
    } catch {
      notify.error(t("lock.requestFailed"))
    } finally {
      setRequesting(null)
      setConfirmApp(null)
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════
   *  ERİŞİM DURUMUNA GÖRE SIRA — açık → inceleniyor → kilitli
   * ═══════════════════════════════════════════════════════════════════
   *
   * Katalog sırası yönetim ekranından geliyor ve
   * herkes için aynı; erişim ise kişiye göre. İkisi karışınca kullanıcının
   * KULLANABİLDİĞİ iki kart arasına açamadığı üç kart giriyordu — ızgara
   * soldan sağa okunuyor, yani her satırda gözün atlaması gereken bir
   * boşluk oluyordu.
   *
   * ⚠️ **SIRA DEĞİŞİYOR, LİSTE DEĞİL.** Kilitli kart ELENMİYOR, sona
   * gidiyor: talebin açıldığı tek yer o kart (sidebar'da ise hiç
   * görünmüyor — iki yüzeyin iki farklı sorusu, bkz. `NavApps`).
   *
   * ⚠️ **KOVA İÇİNDE KATALOG SIRASI KORUNUR.** `sort` kararlı, yani üç
   * kova da yönetim ekranındaki sırasını aynen taşıyor — kişiye göre
   * değişen tek şey kovaların hangisinde durduğun.
   *
   * ⚠️ Kilit çözülene kadar herkes 0'ıncı kovada (`isLocked` beklerken
   * false döner), yani ızgara bir kez yerleşiyor. Bunu beklemek kartları
   * geciktirmek olurdu; sonradan yerleşmesi ise tek seferlik.
   */
  // ⚠️ Bağımlılık `pendingReq` DEĞİL `pendingReq.isPending`. Kanca her
  // render'da YENİ bir nesne döndürüyor (içindeki geri çağrılar
  // `useCallback`li ama sarmalayıcı nesne değil), yani `pendingReq`e
  // bakmak sıralamayı her render'da yeniden hesaplatırdı. `useAppLock`
  // ise `useMemo`lu ve kimliği kararlı, o doğrudan verilebiliyor.
  const { isPending } = pendingReq
  const rankByAccess = useCallback(
    (name) => {
      if (!lock.isLocked(name)) return 0
      return isPending(name) ? 1 : 2
    },
    [lock, isPending],
  )

  const orderedAgents = useMemo(
    () => [...agents].sort((a, b) => rankByAccess(a.name) - rankByAccess(b.name)),
    [agents, rankByAccess],
  )
  const orderedAiApps = useMemo(
    () => [...aiApps].sort((a, b) => rankByAccess(a.name) - rankByAccess(b.name)),
    [aiApps, rankByAccess],
  )
  // İş uygulamaları kilit kapsamı dışında (bkz. `appLockPolicy.appliesTo`),
  // yani orada sıralanacak bir durum farkı yok.

  const agentSubtitle =
    locale === "tr" ? "Sohbet başlat ve sorularını sor" : "Start a chat and ask your questions"

  // Favori süzgeci — kart SAKLANIR, sıralama aynı kalır.
  const shownAgents = onlyFavorites
    ? orderedAgents.filter((a) => isFavorite("agent", a))
    : orderedAgents
  const shownAiApps = onlyFavorites
    ? orderedAiApps.filter((a) => isFavorite("aiApp", a))
    : orderedAiApps
  const shownBusiness = onlyFavorites
    ? businessApps.filter((a) => isFavorite("businessApp", a))
    : businessApps
  const nothingShown = !shownAgents.length && !shownAiApps.length && !shownBusiness.length

  return (
    <>
      <div id={id} className="flex flex-col gap-10 scroll-mt-20">
        {/* ⚠️ Süzgeç boşken SESSİZ bir boşluk bırakılmaz: favorisi olmayan
            kişi "katalog boş" sanardı. Cümle kalbin nerede olduğunu söylüyor. */}
        {onlyFavorites && nothingShown && (
          <p className="rounded-2xl border border-dashed px-4 py-6 text-center text-[0.8125rem] text-muted-foreground">
            {t("myspace.apps.noFavorites")}
          </p>
        )}
        {(shownAgents.length > 0 || (configError && !onlyFavorites)) && (
          <Section
            first
            title={t("launcher.agents.title")}
            subtitle={t("launcher.agents.subtitle")}
          >
            {configError && <ConfigAlert error={configError} />}
            {shownAgents.map((agent, i) => (
              <LauncherCard
                key={agent.id}
                iconName={agent.iconName}
                logo={agent.logo}
                title={agentDisplayName(agent.name)}
                brand={AGENT_BRAND}
                subtitle={agent.description || agentSubtitle}
                onClick={() => onOpenChat?.(agent.id)}
                locked={lock.isLocked(agent.name)}
                request={pendingReq.getRequest(agent.name)}
                onRequest={() => openRequest(agent)}
                onShowRequest={() =>
                  setDetailReq({ app: agent, request: pendingReq.getRequest(agent.name) })
                }
                // Sağ tık: sohbeti açmadan soruyu buracıkta yaz.
                onContextMenu={(e) => {
                  e.preventDefault()
                  setQuickAsk({ agent, anchor: { x: e.clientX, y: e.clientY } })
                }}
                index={i}
                favorite={isFavorite("agent", agent)}
                onToggleFavorite={() => toggle("agent", agent)}
              />
            ))}
          </Section>
        )}

        {shownAiApps.length > 0 && (
          <Section title={t("launcher.aiApps.title")} subtitle={t("launcher.aiApps.subtitle")}>
            {shownAiApps.map((app, i) => (
              <LauncherCard
                key={app.id}
                iconName={app.iconName}
                logo={app.logo}
                title={agentDisplayName(app.name)}
                brand={AGENT_BRAND}
                subtitle={app.description}
                onClick={() => {
                  const safe = safeExternalUrl(app.url)
                  if (safe !== "#") window.open(safe, "_blank", "noopener,noreferrer")
                }}
                comingSoon={safeExternalUrl(app.url) === "#"}
                locked={safeExternalUrl(app.url) !== "#" && lock.isLocked(app.name)}
                request={pendingReq.getRequest(app.name)}
                onRequest={() => openRequest(app)}
                onShowRequest={() =>
                  setDetailReq({ app, request: pendingReq.getRequest(app.name) })
                }
                index={i}
                accent="ai"
                favorite={isFavorite("aiApp", app)}
                onToggleFavorite={() => toggle("aiApp", app)}
              />
            ))}
          </Section>
        )}

        {/* ⚠️ İŞ UYGULAMALARI KİLİT KAPSAMINDA DEĞİL: ERP, Power BI ve Jira kendi kapılarını taşıyor —
            Microsoft hesabı, lisans ve kendi yetki kontrolleri. Buraya kilit
            koymak hiçbir şey eklemiyordu: adresi bilen zaten tarayıcıdan
            giriyor, giremeyen de bizim kartımız yüzünden değil o sistemin
            kendi kapısı yüzünden giremiyor. Kilit asistanlarda (tek kapı
            burası) ve AI uygulamalarında kalıyor. */}
        {shownBusiness.length > 0 && (
          <Section
            title={t("launcher.businessApps.title")}
            subtitle={t("launcher.businessApps.subtitle")}
          >
            {shownBusiness.map((app, i) => (
              <LauncherCard
                key={app.id}
                iconName={app.iconName}
                logo={app.logo}
                title={app.name}
                subtitle={app.description}
                onClick={() => {
                  const safe = safeExternalUrl(app.url)
                  if (safe !== "#") window.open(safe, "_blank", "noopener,noreferrer")
                }}
                index={i}
                accent="business"
                favorite={isFavorite("businessApp", app)}
                onToggleFavorite={() => toggle("businessApp", app)}
              />
            ))}
          </Section>
        )}
      </div>

      {/* Portal ile <body>'ye çiziliyor (bkz. AgentQuickAsk), yani
          launcher'ın kaydırma kabının taşma kırpmasından etkilenmiyor. */}
      {/* ⚠️ RENKLERİN TAMAMI PALETTEN: `--brand-soft`, `--brand`,
          `--brand-fill-deep`. Sabit bir hex ya da shadcn'in `--primary`si
          kullanılmadı — kullanıcı paleti değiştirdiğinde kutu da onunla
          dönmeli, aksi hâlde uygulamanın tek palet-dışı yüzeyi olurdu.
          Marka GRADYANI bilinçli olarak kullanılmadı: beyaz metinle
          kontrastı iki palette 4,5'in altına düşüyor (ölçülü), düz
          `--brand-fill-deep` ise her palette okunuyor. */}
      <Dialog open={!!confirmApp} onOpenChange={(o) => !o && setConfirmApp(null)}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-lg">
          <div className="flex flex-col items-stretch sm:flex-row">
            {/* Orb sütunu. Telefonda üstte ve kısa, geniş ekranda solda.
                Durum ANLAMLI: istek uçarken `thinking`, beklerken `idle` —
                sabit bir durum, kutunun gerçekten bir iş yaptığı anı
                söylemezdi. */}
            <div className="relative flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-brand-soft/70 via-brand-soft/25 to-transparent py-4 sm:w-[10rem] sm:py-0">
              <BrandOrb
                surface="dashboard"
                state={requesting ? "thinking" : "idle"}
                expressive
                size={104}
              />
            </div>

            <div className="min-w-0 flex-1 p-5">
              <DialogHeader className="space-y-1.5 text-left">
                <DialogTitle className="text-[1.0625rem] leading-tight tracking-[-0.01em]">
                  {t("lock.confirm.title")}
                </DialogTitle>
                <DialogDescription className="text-[0.8125rem] leading-snug">
                  {t("lock.confirm.body")}
                </DialogDescription>
              </DialogHeader>

              {/* Hangi app olduğu ADIYLA DEĞİL KENDİSİYLE: kartta hangi
                  ikonu gördüyse kutuda da onu görüyor. */}
              {confirmApp && (
                <div className="mt-3.5 inline-flex max-w-full items-center gap-2 rounded-xl border border-brand/20 bg-brand-soft/40 py-1.5 pl-1.5 pr-3">
                  <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-brand-from via-brand-via to-brand-to text-white">
                    <IconOrLogo
                      iconName={confirmApp.iconName}
                      logo={confirmApp.logo}
                      className="size-3.5"
                    />
                  </span>
                  <span className="min-w-0 truncate text-[0.8125rem] font-semibold text-brand-on-soft">
                    {confirmApp.name}
                  </span>
                </div>
              )}

              {/* ⚠️ GEREKÇE ZORUNLU DEĞİL. Zorunlu olsaydı, yazacak sözü
                  olmayan ("bu app bana lazım") kişi kutuyu doldurmak için
                  bir şey uydururdu ve yönetici okuduğu her notu değersiz
                  saymaya başlardı. İsteğe bağlı bir alan, yalnızca
                  söyleyecek şeyi olanın yazdığı alandır. */}
              <div className="mt-4 space-y-1.5">
                <label
                  htmlFor="lock-request-note"
                  className="block text-[0.75rem] font-medium text-foreground/[0.78]"
                >
                  {t("lock.note.label")}
                </label>
                <Textarea
                  id="lock-request-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={!!requesting}
                  rows={3}
                  maxLength={2000}
                  placeholder={t("lock.note.placeholder")}
                  className="resize-none text-[0.8125rem]"
                />
                <p className="text-[0.6875rem] leading-snug text-muted-foreground">
                  {t("lock.note.hint")}
                </p>
              </div>

              <DialogFooter className="mt-5 gap-2 sm:gap-2">
                <Button
                  variant="outline"
                  onClick={() => setConfirmApp(null)}
                  disabled={!!requesting}
                >
                  {t("lock.confirm.cancel")}
                </Button>
                <Button
                  onClick={() => sendRequest(confirmApp?.name)}
                  onMouseEnter={() => sendRef.current?.startAnimation?.()}
                  onMouseLeave={() => sendRef.current?.stopAnimation?.()}
                  disabled={!!requesting}
                  className="gap-1.5 bg-brand-fill-deep text-white hover:bg-brand-fill-deep hover:brightness-110"
                >
                  <AnimatedSentIcon
                    ref={sendRef}
                    size={15}
                    className="shrink-0"
                    aria-hidden="true"
                  />
                  {t("lock.confirm.send")}
                </Button>
              </DialogFooter>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <RequestDetailDialog detail={detailReq} onClose={() => setDetailReq(null)} />

      {quickAsk && (
        <AgentQuickAsk
          agent={quickAsk.agent}
          anchor={quickAsk.anchor}
          onClose={() => setQuickAsk(null)}
        />
      )}
    </>
  )
}
