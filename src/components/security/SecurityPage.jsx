import { useMemo, useState } from "react"
import { motion, useReducedMotion } from "motion/react"
import { useSearchParams } from "react-router-dom"
import { HugeiconsIcon } from "@hugeicons/react"
import CheckmarkCircle02Icon from "@hugeicons/core-free-icons/CheckmarkCircle02Icon"
import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon"
import UserGroupIcon from "@hugeicons/core-free-icons/UserGroupIcon"
import Robot01Icon from "@hugeicons/core-free-icons/Robot01Icon"
import DatabaseIcon from "@hugeicons/core-free-icons/DatabaseIcon"
import Key01Icon from "@hugeicons/core-free-icons/Key01Icon"
import UserMultipleIcon from "@hugeicons/core-free-icons/UserMultipleIcon"
import InboxIcon from "@hugeicons/core-free-icons/InboxIcon"
import Settings02Icon from "@hugeicons/core-free-icons/Settings02Icon"
import { useLocale } from "@/hooks/useLocale"
import { useMe } from "@/hooks/useMe"
import { useConfig } from "@/hooks/useConfig"
import { useIsInGroup } from "@/hooks/useIsInGroup"
import { ADMIN_GROUP_ID, IT_MANAGER_KEYS } from "@/lib/constants"
import {
  COPILOT_STUDIO_SCOPE,
  DATAVERSE_URL,
  isMsalConfigured,
  loginRequest,
  msalInstance,
} from "@/lib/msal"
import { isSignedOut } from "@/lib/silentSso"
import { cn } from "@/lib/utils"
import { IdentityCell, ValueChip } from "./primitives"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuthorizationsAdmin } from "@/hooks/useAuthorizationsAdmin"
import {
  AuthorizationsReload,
  AuthorizationsRequestsPanel,
  AuthorizationsUsersPanel,
} from "@/components/admin/AuthorizationsPage"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  GÜVENLİK (`/security`) — erişim modelinin SALT OKUNUR dökümü
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ⚠️ **BU EKRAN BİR ŞEY DEĞİŞTİRMEZ.** Politika kaynakta yazılı (grup
 * kimliği `constants.js`te, kapsamlar `msal.js`te, katalog Dataverse'te) ve
 * değişiklik kod incelemesinden geçiyor. Düzenlemeye açmak o güvenceyi bir
 * forma çevirirdi. Buradaki her satır ÇALIŞMA ANINDA okunuyor: gördüğün şey
 * senin oturumunda gerçekten geçerli olan hâl, bir belge değil.
 *
 * ⚠️ **tyrotrade'in aynı adlı ekranı BURAYA KOPYALANMADI.** Orada 55
 * kişilik bir kütük, sayfa × kişi × masraf merkezi matrisi ve dört mercekli
 * bir usta-detay düzeni var; tyro'da öyle bir kütük YOK. Kopyalasaydım ekran
 * var olmayan bir yetki modelini gösteren, dolayısıyla YALAN söyleyen bir
 * denetim ekranı olurdu. Bunun yerine tyro'nun gerçek modeli yazıldı:
 * bir Entra GRUBU, bir katalog bayrağı ve üç kimlik doğrulama kapsamı.
 *
 * İçerik sonradan zenginleşecek (istek üzerine şimdilik görüntüleme);
 * eklenecek her satırın kuralı aynı: ÇALIŞMA ANINDA okunacak, tahmin
 * yazılmayacak.
 */

/**
 * Üç değerli cevap: evet · hayır · henüz çözülmedi.
 *
 * ⚠️ Çözülmemiş hâl `false` GİBİ ÇİZİLMEZ. Cevabı beklerken "hayır"
 * yazmak, yarım saniyelik bir yalan — ve bu ekranın tek işi doğru söylemek.
 */
function Verdict({ value, yes, no, pending }) {
  if (value === undefined) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[0.78125rem] text-muted-foreground">
        <span
          aria-hidden="true"
          className="size-3.5 shrink-0 animate-pulse rounded-full border border-current opacity-50"
        />
        {pending}
      </span>
    )
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[0.78125rem] font-medium",
        value ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground",
      )}
    >
      <HugeiconsIcon
        icon={value ? CheckmarkCircle02Icon : Alert02Icon}
        className={cn("size-3.5 shrink-0", value ? "" : "opacity-60")}
        strokeWidth={2}
      />
      {value ? yes : no}
    </span>
  )
}

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BÖLÜM — bir SİSTEM, bir kutu
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ⚠️ **GRUPLAMA SİSTEME GÖRE, KONUYA GÖRE DEĞİL.** Eskiden beş kart vardı
 * (Kimlik · Yönetici yetkisi · Asistan erişimi · Kimlik doğrulama ·
 * Tarayıcıda saklananlar) ve hiçbiri "hangi sistemi açıp düzelteceğim"
 * sorusuna cevap vermiyordu: Entra bilgileri üç karta dağılmış, "Kimlik
 * doğrulama" ise bir FİİL adı taşıyıp Copilot kapsamını, Dataverse
 * adresini ve bir çıkış bayrağını akran gibi yan yana koyuyordu. Dört
 * sistem var — Entra · Dataverse · Copilot Studio · bu tarayıcı — ve
 * ekran artık onlara göre bölünüyor.
 *
 * ⚠️ **TEK SÜTUN.** İki sütun, farklı satır sayılı kartlarla kaçınılmaz
 * olarak kırık bir alt hizaya ve sütun başına farklı bir başlangıç
 * yüksekliğine düşüyordu; o kayma göze "iki bağımsız akış" diyor, oysa bu
 * yukarıdan aşağı BİR KEZ okunan bir döküm.
 */
function Sec({ icon, title, hint, children }) {
  return (
    <section>
      <header className="mb-2 flex items-baseline gap-2 px-1">
        <HugeiconsIcon
          icon={icon}
          aria-hidden="true"
          className="size-3.5 shrink-0 translate-y-0.5 text-muted-foreground/60"
          strokeWidth={1.8}
        />
        <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {title}
        </h2>
      </header>
      <div className="overflow-hidden rounded-xl border border-border bg-card">{children}</div>
      {hint ? (
        <p className="mt-2 px-1 text-[0.71875rem] leading-relaxed text-muted-foreground">{hint}</p>
      ) : null}
    </section>
  )
}

/**
 * Satır. İki şekil var ve aralarındaki fark ÖLÇÜLEBİLİR bir sorunu çözüyor:
 *
 * ⚠️ Eskiden `align` varsayılanı `right` idi ama dört çağrı `align="left"`
 * geçip İÇERİDE `justify-end` yazıyordu — dışı sol, içi sağ. Dokuz kapsam
 * ve on üç asistan adı, oynak bir sol kenara karşı sağa dayanıyordu ve
 * sayfada paylaşılan tek bir sol hiza kalmıyordu, yani hiçbir şey
 * taranamıyordu. Uzun liste taşıyan satır artık YIĞIN: etiket kendi
 * satırında, değer altında tam genişlikte ve soldan hizalı.
 */
function Row({ label, children, stacked }) {
  if (stacked) {
    return (
      <div className="border-b border-border/50 px-4 py-2.5 last:border-b-0 dark:border-white/[0.06]">
        <p className="text-[0.75rem] text-muted-foreground">{label}</p>
        <div className="mt-1.5 text-[0.78125rem] text-foreground">{children}</div>
      </div>
    )
  }
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border/50 px-4 py-2.5 last:border-b-0 dark:border-white/[0.06]">
      <span className="shrink-0 text-[0.75rem] text-muted-foreground">{label}</span>
      <span className="min-w-0 max-w-full text-right text-[0.78125rem] font-medium text-foreground">
        {children}
      </span>
    </div>
  )
}

/** Çip listesi — hep soldan, hep aynı ölçüde. */
function Chips({ items }) {
  if (!items?.length) return <span className="text-muted-foreground">—</span>
  return (
    <span className="flex flex-wrap gap-1">
      {items.map((x) => (
        <ValueChip key={x}>{x}</ValueChip>
      ))}
    </span>
  )
}

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  DURUM ŞERİDİ — sayfanın TEK görüşü
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ⚠️ **ÜÇ KUTUCUĞUN YERİNE GEÇTİ, ve o üçü SİLİNDİ.** Onlar bir özet
 * değil, birebir KOPYAydı: "Kimlik" başlığı hem kutucukta hem kartta,
 * "Yönetici yetkisi" hem kutucukta hem kartın satırında — aynı `Verdict`,
 * aynı dört prop, iki kez. Bir güvenlik ekranında bu, elde edilebilecek en
 * kötü belirsizlik: okuyan kişi iki yerin TEK bir olguyu mu yoksa bugün
 * tesadüfen uyuşan İKİ olguyu mu gösterdiğini ayırt edemiyor.
 *
 * ⚠️ **SAĞLAMKEN SESSİZ.** Yalnız "dikkat" hâli renk alıyor. Sürekli yeşil
 * duran bir şerit, insanı onu okumamaya alıştırır; rengi hak etmesi
 * gerekiyor.
 *
 * ⚠️ Tarayıcıdaki hesap sayısının >1 olması şeridi DÖNDÜRMEZ: birden çok
 * hesaplı bir tarayıcı bir arıza değil ve onun için renk yakmak, şeridin
 * yalancı çoban olması demekti.
 */
function StatusStrip({ session, source, isAdmin, onCopy, copied, t }) {
  const reasons = []
  if (session.signedOutMarker) reasons.push(t("security.health.sso"))
  if (source !== "dataverse") reasons.push(t("security.health.catalog"))
  if (!isMsalConfigured) reasons.push(t("security.health.mock"))
  const pending = isAdmin === undefined
  const attention = reasons.length > 0

  return (
    <div
      className={cn(
        "flex flex-wrap items-start gap-x-3 gap-y-2 rounded-xl border px-4 py-3",
        attention
          ? "border-amber-500/30 bg-amber-500/[0.06] dark:border-amber-400/25 dark:bg-amber-400/[0.06]"
          : "border-border bg-card",
      )}
    >
      {pending ? (
        <span
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 animate-pulse rounded-full border border-current opacity-40"
        />
      ) : (
        <HugeiconsIcon
          icon={attention ? Alert02Icon : CheckmarkCircle02Icon}
          aria-hidden="true"
          className={cn(
            "mt-0.5 size-4 shrink-0",
            attention
              ? "text-amber-600 dark:text-amber-400"
              : "text-emerald-600 dark:text-emerald-400",
          )}
          strokeWidth={2}
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[0.8125rem] font-medium leading-snug">
          {pending
            ? t("security.health.pending")
            : attention
              ? t("security.health.attention")
              : t("security.health.ok")}
        </p>
        <IdentityCell upn={session.upn} size="sm" className="mt-0.5" />
        {attention && (
          <ul className="mt-1.5 space-y-0.5">
            {reasons.map((r) => (
              <li key={r} className="text-[0.75rem] leading-snug text-foreground/[0.78]">
                · {r}
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* ⚠️ Kopyala bir SÜS DEĞİL: bu dökümün varlık sebebi bir destek
          turunda paylaşılması ve ekran görüntüsünde küçük-L / büyük-i
          karışıklığı fark edilmiyor (aynı gerekçe `AccessCard`ta da
          yazılı). Düz metin, harf harf okunabilir olan tek biçim. */}
      <button
        type="button"
        onClick={onCopy}
        className="shrink-0 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[0.75rem] font-medium transition-colors hover:bg-foreground/[0.04] [@media(pointer:coarse)]:min-h-9"
      >
        {copied ? t("security.copied") : t("security.copy")}
      </button>
    </div>
  )
}

/**
 * ── Sekme 3: uygulama yetkileri ───────────────────────────────────────
 *
 * ⚠️ **KAPISI ÖTEKİ İKİ SEKMEDEN FARKLI, ve bu SÖYLENİYOR.** Burası Entra
 * GRUBU üyeliğine bakar ("BT ekibinden misin"); Kullanıcı yetkileri ile
 * Yetki talepleri ise tablonun kendi `tyro_isadmin` bayrağına ("app
 * yetkilerini yönetebilir misin"). Yani `tyro_isadmin` yöneticisi olup
 * Entra grubunda OLMAYAN biri ilk iki sekmeyi açıyor, bu sekmede duvara
 * çarpıyordu — ve duvar sebebini söylemiyordu. Artık söylüyor.
 */
function AppPermissionsPanel() {
  const { t } = useLocale()
  const me = useMe()
  const { agents, allAgents, source } = useConfig()
  const isAdmin = useIsInGroup(ADMIN_GROUP_ID)
  const [copied, setCopied] = useState(false)

  const session = useMemo(() => {
    const account = isMsalConfigured
      ? (msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0] ?? null)
      : null
    return {
      upn: account?.username ?? me.email ?? "—",
      name: account?.name ?? me.fullName ?? "—",
      tenantId: account?.tenantId ?? "—",
      accounts: isMsalConfigured ? msalInstance.getAllAccounts().length : 0,
      signedOutMarker: isSignedOut(),
    }
  }, [me.email, me.fullName])

  const openAgents = agents.length
  const totalAgents = allAgents?.length ?? openAgents

  async function copyDump() {
    const lines = [
      `${t("security.sec.entra")}`,
      `  ${t("security.identity.upn")}: ${session.upn}`,
      `  ${t("security.identity.name")}: ${session.name}`,
      `  ${t("security.identity.tenant")}: ${session.tenantId}`,
      `  ${t("security.admin.group")}: ${ADMIN_GROUP_ID} (${isAdmin === true ? t("security.yes") : t("security.no")})`,
      `  ${t("security.auth.login")}: ${loginRequest.scopes.join(" ")}`,
      `  ${t("security.auth.silentSso")}: ${session.signedOutMarker ? t("security.auth.silentSso.off") : t("security.auth.silentSso.on")}`,
      `${t("security.sec.dataverse")}`,
      `  ${t("security.storage.catalogSource")}: ${source}`,
      `  ${t("security.auth.dataverse")}: ${DATAVERSE_URL}`,
      `  ${t("security.agents.open")}: ${openAgents} / ${totalAgents}`,
      `${t("security.sec.copilot")}`,
      `  ${t("security.auth.copilot")}: ${COPILOT_STUDIO_SCOPE}`,
      `${t("security.sec.browser")}`,
      `  ${t("security.identity.accounts")}: ${session.accounts}`,
    ]
    try {
      await navigator.clipboard.writeText(lines.join("\n"))
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Pano reddederse sessiz: kullanıcının istemediği bir konuda uyarı
      // çıkarmak, kopyalayamamaktan daha kötü.
    }
  }

  if (isAdmin !== true) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-[0.8125rem] leading-relaxed text-muted-foreground">
        {isAdmin === undefined ? t("security.gate.pending") : t("security.gate.appTab")}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <StatusStrip
        session={session}
        source={source}
        isAdmin={isAdmin}
        onCopy={copyDump}
        copied={copied}
        t={t}
      />

      <Sec icon={UserGroupIcon} title={t("security.sec.entra")} hint={t("security.sec.entra.hint")}>
        <Row label={t("security.identity.upn")}>
          <ValueChip>{session.upn}</ValueChip>
        </Row>
        <Row label={t("security.identity.name")}>{session.name}</Row>
        <Row label={t("security.identity.tenant")}>
          <ValueChip>{session.tenantId}</ValueChip>
        </Row>
        {/* ⚠️ HANGİ GRUP + ÜYE MİSİN = TEK OLGU, tek satır. İkiye bölmek,
            özet kutucuğunun bir şey ekliyormuş gibi görünmesinin sebebiydi. */}
        <Row label={t("security.admin.group")}>
          <span className="flex flex-wrap items-center justify-end gap-2">
            <ValueChip>{ADMIN_GROUP_ID}</ValueChip>
            <Verdict
              value={isAdmin}
              yes={t("security.yes")}
              no={t("security.no")}
              pending={t("security.pending")}
            />
          </span>
        </Row>
        <Row label={t("security.admin.unlocks")} stacked>
          {t("security.admin.unlocks.value")}
        </Row>
        <Row label={t("security.auth.login")} stacked>
          <Chips items={loginRequest.scopes} />
        </Row>
        <Row label={t("security.auth.silentSso")}>
          <Verdict
            value={!session.signedOutMarker}
            yes={t("security.auth.silentSso.on")}
            no={t("security.auth.silentSso.off")}
            pending={t("security.pending")}
          />
        </Row>
        <Row label={t("security.admin.itChain")} stacked>
          <Chips items={IT_MANAGER_KEYS} />
        </Row>
      </Sec>

      <Sec
        icon={DatabaseIcon}
        title={t("security.sec.dataverse")}
        hint={t("security.sec.dataverse.hint")}
      >
        {/* ⚠️ KATALOĞUN KAYNAĞI EN ÜSTTE, eskiden son kartın son satırıydı.
            Bu, sayfanın en çok yük taşıyan olgusu: "dataverse" değilse
            yukarıdaki her şey canlı gerçek değil, önbellekten okunan bir
            geçmiş. Dört localStorage açıklamasının altına gömülmüştü. */}
        <Row label={t("security.storage.catalogSource")}>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 font-medium",
              source === "dataverse"
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-amber-700 dark:text-amber-400",
            )}
          >
            <HugeiconsIcon
              icon={source === "dataverse" ? CheckmarkCircle02Icon : Alert02Icon}
              className="size-3.5"
              strokeWidth={2}
            />
            {source}
          </span>
        </Row>
        <Row label={t("security.auth.dataverse")}>
          <ValueChip>{DATAVERSE_URL}</ValueChip>
        </Row>
        <Row label={t("security.agents.open")}>
          <span className="tabular-nums">
            {openAgents} / {totalAgents}
          </span>
        </Row>
        <Row label={t("security.agents.gate")} stacked>
          {t("security.agents.gate.value")}
        </Row>
        <Row label={t("security.agents.list")} stacked>
          <Chips items={agents.map((a) => a.name)} />
        </Row>
      </Sec>

      <Sec
        icon={Robot01Icon}
        title={t("security.sec.copilot")}
        hint={t("security.sec.copilot.hint")}
      >
        <Row label={t("security.auth.copilot")} stacked>
          <ValueChip>{COPILOT_STUDIO_SCOPE}</ValueChip>
        </Row>
      </Sec>

      <Sec icon={Key01Icon} title={t("security.sec.browser")} hint={t("security.sec.browser.hint")}>
        <Row label={t("security.identity.accounts")}>
          <span className="tabular-nums">{session.accounts}</span>
        </Row>
        <Row label={<ValueChip>tyro-config-v1</ValueChip>} stacked>
          {t("security.storage.config")}
        </Row>
        <Row label={<ValueChip>tyro-chat-session-*</ValueChip>} stacked>
          {t("security.storage.chat")}
        </Row>
        <Row label={<ValueChip>tyro-changelog-seen-v1</ValueChip>} stacked>
          {t("security.storage.changelog")}
        </Row>
        <Row label={<ValueChip>tyro-signed-out · tyro-sso-attempted</ValueChip>} stacked>
          {t("security.storage.sso")}
        </Row>
      </Sec>

      <p className="px-1 text-[0.71875rem] leading-relaxed text-muted-foreground">
        {t("security.readonly")}
      </p>
    </div>
  )
}

/** Başlık altındaki canlı sayı: rakam mürekkepte, etiketi sessiz. */
function Stat({ n, label }) {
  return (
    <span>
      <span className="font-medium tabular-nums text-foreground/80">{n}</span> {label}
    </span>
  )
}

function Sep() {
  return <span className="text-muted-foreground/40">·</span>
}

const TABS = ["users", "requests", "app"]

export function SecurityPage() {
  const { t, locale } = useLocale()
  const [params, setParams] = useSearchParams()
  const reduceMotion = useReducedMotion()
  const requested = params.get("tab")
  const tab = TABS.includes(requested) ? requested : TABS[0]

  // Kanca SAYFADA BİR KEZ: iki panel aynı veriyi ve aynı "Yenile"
  // düğmesini paylaşıyor (gerekçe `useAuthorizationsAdmin` başında).
  const authz = useAuthorizationsAdmin()

  // ⚠️ **SAYFA BÜTÜN OLARAK YÖNETİCİYE AÇIK** (2026-09-17, istek üzerine:
  // "güvenlik sayfasını sadece adminler görür"). Önce sekmeler herkese
  // çiziliyordu ve her biri içeride "yetkin yok" diyordu — yönetici
  // olmayana üç sekmelik bir kabuk göstermek, kapalı olduğunu üç kez
  // söylemekti. Artık kapı tek ve sayfanın başında.
  //
  // İKİ KAPIDAN BİRİ yeter, çünkü her biri farklı bir sekmeyi açıyor
  // (gerekçe aşağıdaki tabloda). Bu bir birleştirme DEĞİL: sekmeler kendi
  // kapılarını ayrıca kontrol ediyor, buradaki yalnızca "bu kişinin
  // burada işi var mı" sorusunun cevabı.
  const pageAdmin = useIsInGroup(ADMIN_GROUP_ID)
  const allowed = pageAdmin === true || authz.allowed
  // ⚠️ ÜÇ DURUM, ÜÇ AYRI CÜMLE — ve "hayır" en sonda gelir.
  //
  // İlk hâli iki kapının İKİSİNİN de çözülmemiş olmasını arıyordu
  // (`&&`) ve bu yanlıştı: Entra cevabı hızlı gelip "hayır" derken
  // Dataverse kapısı hâlâ bekliyorsa ekran "yetkin yok" yazıyor, yarım
  // saniye sonra sayfa açılıyordu. Biri bile hâlâ bekliyorsa cevap
  // BEKLİYOR'dur.
  //
  // "Soramadık" da ayrı: `UNKNOWN` fail-closed bir sentinel (ağ/Dataverse
  // hatası). Ona "yetkin yok" demek, arızayı bir yetki kararı gibi
  // göstermek olurdu — bu deponun tekrar eden kuralı.
  const stillAsking = pageAdmin === undefined || authz.gateState === "pending"
  const couldNotAsk = authz.gateState === "unknown"
  const gateMessage = stillAsking
    ? t("security.gate.pending")
    : couldNotAsk
      ? t("authz.gate.unknown")
      : t("security.gate.denied")

  function selectTab(next) {
    const nextParams = new URLSearchParams(params)
    nextParams.set("tab", next)
    setParams(nextParams, { replace: true })
  }

  // ⚠️ Rozet BEKLEYENİ sayar, toplamı değil: tamamlanmış talepler listede
  // duruyor (iz bırakmak için) ama yapılacak iş değil. Sayının anlamı
  // "senden kaç cevap bekleniyor".
  const pendingRequests = authz.requests.filter((r) => !r.isCompleted).length

  const tabDefs = [
    { value: "users", icon: UserMultipleIcon, label: t("security.tabs.users") },
    {
      value: "requests",
      icon: InboxIcon,
      label: t("security.tabs.requests"),
      badge: pendingRequests,
    },
    { value: "app", icon: Settings02Icon, label: t("security.tabs.app") },
  ]

  return (
    // ⚠️ KAPSAYICI, VIEWPORT DEĞİL (`@container/security`): sohbet dock'u
    // bir KOLON, yani geniş pencerede panel açıkken `md:` hâlâ tutuyor ama
    // sayfaya çok daha az yer kalıyor (ProfilePage'de ölçülen aynı tuzak).
    <div className="@container/security mx-auto flex h-full w-full max-w-4xl flex-col gap-4 overflow-y-auto overflow-x-hidden px-4 pb-12 pt-5 sm:px-6">
      {/* ⚠️ **MARKA İKON KARESİ KALDIRILDI.** Bu sayfada YEDİ kez tekrar
          ediyordu (sayfa başlığı + bölüm başlığı + beş kart başlığı) ve
          "çok düz ve sıkıcı" şikâyetinin asıl sebebi buydu: renk azlığı
          değil, HİYERARŞİSİZ TEKRAR. Yedi özdeş kare, yedi şeyi de aynı
          derecede önemli gösteriyordu — yani hiçbirini.

          Yerine gelen şey dekorasyon değil BİLGİ: başlığın altında canlı
          sayılar. Yöneticinin bu sayfayı açınca ilk merak ettiği şey o ve
          şu ana kadar hiçbir yerde yazmıyordu. */}
      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1
            lang={locale}
            className="text-[1.375rem] font-semibold leading-[1.15] tracking-[-0.02em] @[560px]/security:text-2xl"
          >
            {t("security.title")}
          </h1>
          <p className="mt-0.5 text-[0.8125rem] leading-snug text-muted-foreground">
            {t("security.subtitle")}
          </p>
          {allowed && tab !== "app" && authz.authorizations.length > 0 && (
            <p className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 text-[0.75rem] text-muted-foreground">
              <Stat n={authz.authorizations.length} label={t("security.meta.records")} />
              <Sep />
              <Stat
                n={authz.authorizations.filter((r) => r.isAdmin).length}
                label={t("security.meta.admins")}
              />
              <Sep />
              <Stat n={pendingRequests} label={t("security.meta.pending")} />
            </p>
          )}
        </div>
        {/* Yenile yalnız veri ÇEKEN iki sekmede: üçüncü sekme her satırı
            zaten çalışma anında okuyor, orada tazelenecek bir kayıt yok. */}
        {allowed && tab !== "app" && <AuthorizationsReload ctx={authz} />}
      </header>

      {!allowed ? (
        // Sessizce başka bir yere ATILMIYOR: yer imi koymuş ya da
        // bağlantıyla gelen kişi uygulamayı bozuk sanmasın (bu deponun
        // her kapıda tekrarlanan kuralı).
        <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-[0.8125rem] text-muted-foreground">
          {gateMessage}
        </p>
      ) : (
        <Tabs value={tab} onValueChange={selectTab} className="flex-1">
          {/* Segment kontrolü /profile ve /settings ile BİREBİR aynı: gömülü
            track + yüzen aktif düğme (macOS'un segmented control'ü).
            Üçüncü bir sekme imzası yaratmak, aynı uygulamada üç ayrı sekme
            dili demekti. */}
          <TabsList
            className={cn(
              "h-auto w-full rounded-3xl bg-muted/60 px-0 py-2",
              "shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]",
              "flex gap-1",
              "overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              "@[720px]/security:overflow-visible",
              "dark:bg-white/[0.04] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]",
            )}
          >
            {tabDefs.map((tabDef) => (
              <TabsTrigger
                key={tabDef.value}
                value={tabDef.value}
                aria-label={tabDef.badge > 0 ? `${tabDef.label} (${tabDef.badge})` : tabDef.label}
                className={cn(
                  // `min-w-0` + `whitespace-normal` ŞART — gerekçesi
                  // ProfilePage'in aynı şeridinde ölçülerek yazılı.
                  // ⚠️ `isolate` ŞART: hap `-z-10` taşıyor ve tetik bir yığın bağlamı
                  // kurmazsa o eksi indeks tetikten KAÇIP `TabsList`in
                  // `bg-muted/60` zemininin de arkasına düşüyor — hap hiç
                  // görünmüyordu. `isolate` onu tetiğin içinde tutuyor:
                  // içeriğin arkasında, listenin önünde.
                  "group relative isolate flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border-0 bg-transparent px-2 text-[0.8125rem] font-medium whitespace-normal sm:h-10 sm:px-3",
                  "text-muted-foreground transition-colors duration-200 ease-out",
                  "hover:text-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-0",
                  // ⚠️ **TABANIN ZEMİNİ AYNI YAZIMLA SUSTURULUR.**
                  // `ui/tabs.jsx` reçetesi `data-active:bg-background` ve
                  // `dark:data-active:bg-input/30` yazıyor; bu sayfa ise
                  // `data-[state=active]:` yazıyordu. İkisi FARKLI varyant
                  // yazımı ve tailwind-merge onları tekilleştirmiyor — yani
                  // sınıfı buradan silmek tabanı susturmaz, zemin kayan
                  // hapın ALTINDA anında yanardı. Susturma bu yüzden tabanın
                  // kendi yazımıyla.
                  "data-active:bg-transparent dark:data-active:bg-transparent",
                  "data-active:text-foreground dark:data-active:text-white",
                )}
              >
                {/* ⚠️ **AKTİF HAP KAYAR (macOS segmented control).** Zemin ve
                  gölge artık tetiğin kendi sınıfı değil, yalnız AKTİF
                  tetiğin içinde çizilen paylaşılan bir katman. `layoutId`
                  aynı olduğu için motion onu iki sekme arasında taşıyor.
                  Durgun hâl piksel piksel eskisiyle aynı; değişen tek şey
                  geçişin kendisi.

                  ⚠️ Yay değerleri Apple'ın segmentinden: hızlı, tek yönlü,
                  GÖRÜNÜR bir taşma yok — kontrol hapı zıplarsa oyuncak
                  gibi durur.

                  ⚠️ Hareketi azalt tercihinde hap hiç taşınmaz (`layout`
                  kapanır), yalnız yerinde belirir. */}
                {tab === tabDef.value && (
                  <motion.span
                    layoutId="security-tab-pill"
                    aria-hidden="true"
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 420, damping: 36, mass: 0.85 }
                    }
                    className={cn(
                      "absolute inset-0 -z-10 rounded-xl bg-background",
                      "shadow-[0_1px_2px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.06)]",
                      "dark:bg-neutral-800 dark:shadow-[0_1px_0_rgba(255,255,255,0.1)_inset,0_2px_8px_rgba(0,0,0,0.45)]",
                    )}
                  />
                )}
                <HugeiconsIcon
                  icon={tabDef.icon}
                  className="relative size-[1.125rem] shrink-0 opacity-70 transition group-data-[state=active]:opacity-100 sm:size-[0.9375rem]"
                  strokeWidth={1.6}
                />
                <span className="relative hidden text-center leading-[1.15] [overflow-wrap:anywhere] @[560px]/security:line-clamp-2">
                  {tabDef.label}
                </span>
                {/* ⚠️ Rozet DAR EKRANDA DA çizilir (etiket gizliyken bile):
                  telefonda sekmeler yalnız ikon ve bekleyen talebin tek
                  görünür işareti bu. 0 ise hiç çizilmez — "0" bir haber
                  değil, yalnız gürültü. */}
                {tabDef.badge > 0 && (
                  <span
                    aria-hidden="true"
                    className="grid min-w-[1.125rem] shrink-0 place-items-center rounded-full bg-amber-500/20 px-1 text-[0.625rem] font-semibold leading-[1.125rem] tabular-nums text-amber-700 dark:text-amber-300"
                  >
                    {tabDef.badge}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Telefonda sekmelerde yalnızca ikon var; hangi sekmede olduğunu
            track'in altındaki bu satır söylüyor. `lang` ŞART: CSS ile
            büyütülen "Yetki talepleri" Türkçe kipte doğru büyüsün. */}
          <p
            lang={locale}
            className="mt-3 text-center text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-muted-foreground @[560px]/security:hidden"
            aria-hidden="true"
          >
            {tabDefs.find((d) => d.value === tab)?.label}
          </p>

          <TabsContent value="users" className="mt-5">
            <AuthorizationsUsersPanel ctx={authz} />
          </TabsContent>
          <TabsContent value="requests" className="mt-5">
            <AuthorizationsRequestsPanel ctx={authz} />
          </TabsContent>
          <TabsContent value="app" className="mt-5">
            <AppPermissionsPanel />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
