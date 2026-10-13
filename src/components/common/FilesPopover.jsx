import { useEffect, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon"
import ArrowExpandDiagonal01Icon from "@hugeicons/core-free-icons/ArrowExpandDiagonal01Icon"
import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon"
import Archive02Icon from "@hugeicons/core-free-icons/Archive02Icon"
import Folder01Icon from "@hugeicons/core-free-icons/Folder01Icon"
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon"
import { useMsal } from "@azure/msal-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { useDriveThumbnail } from "@/hooks/useDriveThumbnail"
import { FileBadge } from "@/components/common/FileBadge"
import { formatSize, fileMeta } from "@/lib/fileMeta"
import { FilePreviewDialog } from "@/components/common/FilePreviewDialog"
import { FileMailDialog } from "@/components/common/FileMailDialog"
import { FileAssistMenu } from "@/components/common/FileAssistMenu"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { STATUS, requestGraphScopes } from "@/lib/graph"
import { askTyroAboutFile, sourceUrl } from "@/lib/fileActions"
import { getDateTimeFormat } from "@/lib/intl-cache"
import { useLocale } from "@/hooks/useLocale"
import {
  useDriveItems,
  RECENT,
  ONEDRIVE,
  SITES,
  folderLocation,
  driveLocation,
  siteLocation,
  searchLocation,
} from "@/hooks/useDriveItems"
import { cn } from "@/lib/utils"
import { Archive02Icon as AnimatedArchiveIcon } from "@/components/ui/archive-02"
import { useAnimatedIcon } from "@/hooks/useAnimatedIcon"

const OPTS_DATE = { day: "numeric", month: "short" }

function StateMessage({ icon, title, body, action, onAction }) {
  return (
    <div className="px-6 py-8 text-center">
      {icon && (
        <HugeiconsIcon
          icon={icon}
          className="mx-auto mb-2 size-7 text-muted-foreground/40"
          strokeWidth={1.5}
        />
      )}
      <p className="text-[0.78125rem] font-medium text-foreground/80">{title}</p>
      {body && (
        <p className="mt-1 text-[0.6875rem] leading-relaxed text-muted-foreground">{body}</p>
      )}
      {action && (
        <button
          type="button"
          onClick={onAction}
          className="mt-3 rounded-md border border-border px-2.5 py-1 text-[0.6875rem] font-medium text-foreground/80 transition hover:bg-accent/60 hover:text-foreground"
        >
          {action}
        </button>
      )}
    </div>
  )
}

/**
 * Dosyanın hover önizlemesi.
 *
 * Yalnızca kart açıldığında monte olur, yani listedeki her satır için değil
 * gerçekten bakılan dosya için istek atılır. Küçük resmi olmayan dosyalarda
 * (.zip, .txt, çoğu .csv) uç boş döner; o zaman tür rozeti büyütülür —
 * "önizleme yok" yazan boş bir kutu göstermek, dosya hakkında bildiğimiz
 * şeyleri de saklamak olurdu.
 */
function FilePreview({ item, locale, t, onExpand }) {
  const { url, pending } = useDriveThumbnail(item.driveId, item.itemId, true)
  const meta = fileMeta(item, locale)

  return (
    <div className="w-[17.5rem]">
      <div className="relative">
        <div className="grid h-[10.25rem] place-items-center overflow-hidden rounded-t-lg bg-foreground/[0.04]">
          {url ? (
            // Graph'ın döndürdüğü URL ÖNCEDEN kimlik doğrulanmış ve kısa
            // ömürlü; belirteç taşımadan doğrudan çizilebiliyor.
            <img src={url} alt="" className="h-full w-full object-contain" loading="lazy" />
          ) : pending ? (
            <span className="size-6 animate-spin rounded-full border-2 border-foreground/15 border-t-foreground/40" />
          ) : (
            <FileBadge item={{ ...item, kind: "file" }} size="md" />
          )}
        </div>
        {/* Büyütme. Kartın kendisi bir KİMLİK doğrulamasıdır — bu düğme
            okumak isteyeni tam boy görüntüleyiciye taşır. Marka rengi DÜZ
            dolgudur, gradyan değil: gradyan bu uygulamada TYRO'nun imzası
            (asistan hapı, avatarlar) ve onu buraya da koymak o işareti
            anlamsızlaştırırdı. */}
        <button
          type="button"
          onClick={() => onExpand(item)}
          aria-label={t("files.expand")}
          title={t("files.expand")}
          className="absolute right-2 top-2 grid size-7 place-items-center rounded-lg bg-brand text-background shadow-md shadow-black/20 ring-1 ring-black/5 transition hover:brightness-110 active:scale-95"
        >
          <HugeiconsIcon icon={ArrowExpandDiagonal01Icon} className="size-3.5" strokeWidth={2.2} />
        </button>
      </div>
      <div className="space-y-0.5 p-3">
        <div className="text-[0.78125rem] font-semibold leading-snug [overflow-wrap:anywhere]">
          {item.name}
        </div>
        {meta && <div className="text-[0.6875rem] text-muted-foreground">{meta}</div>}
      </div>
    </div>
  )
}

function Row({ item, locale, onOpen, onAsk, onMail, onExpand, t }) {
  const meta = [
    item.modifiedBy,
    item.modified ? getDateTimeFormat(locale, OPTS_DATE).format(new Date(item.modified)) : "",
    item.kind === "file" ? formatSize(item.size) : "",
    item.kind === "folder" && item.childCount != null
      ? t("files.itemCount", { count: item.childCount })
      : "",
    item.subtitle,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <li className="group/row flex items-center gap-1 pr-1.5 transition-colors hover:bg-accent/50">
      {/* Önizleme YALNIZCA dosyalarda ve yalnızca hover yapabilen
          cihazlarda: klasör/site satırının gösterilecek bir görseli yok ve
          dokunmatikte hover diye bir şey yok — orada dokunmak zaten dosyayı
          açıyor. */}
      <HoverCard openDelay={320} closeDelay={220}>
        <HoverCardTrigger asChild>
          <button
            type="button"
            onClick={() => onOpen(item)}
            className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2 text-left"
          >
            <FileBadge item={item} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.78125rem] font-medium leading-snug text-foreground">
                {item.name}
              </span>
              {meta && (
                <span className="mt-0.5 block truncate text-[0.65625rem] leading-snug text-muted-foreground">
                  {meta}
                </span>
              )}
            </span>
          </button>
        </HoverCardTrigger>
        {item.kind === "file" && (
          <HoverCardContent
            side="left"
            align="start"
            data-files-layer=""
            className="hidden w-auto p-0 [@media(hover:hover)]:block"
          >
            <FilePreview item={item} locale={locale} t={t} onExpand={onExpand} />
          </HoverCardContent>
        )}
      </HoverCard>

      {/* TYRO devri YALNIZCA dosyalarda — bir klasörü özetlemek diye bir şey
          yok. Dosyalarda ise HER ZAMAN görünür, üstüne gelince değil:
          dokunmatikte hover yok, ama daha önemlisi bu satırın asıl teklifi
          ve gizlenmiş bir teklif keşfedilmiyor. */}
      {item.kind === "file" && <FileAssistMenu item={item} onAsk={onAsk} onMail={onMail} />}
    </li>
  )
}

/**
 * Takvimin gün bandının aynısı: yapışkan, gri, sağda sayaç. Panelin üç
 * yüzeyi (posta, takvim, dosyalar) aynı bandı kullanınca üçü de aynı
 * uygulamanın parçası gibi okunuyor.
 */
function SectionBand({ label, count, accent = false }) {
  return (
    <h4
      className={cn(
        "sticky top-0 z-10 flex items-baseline gap-1.5 border-b border-border/40 bg-muted/80 px-3 py-1.5 text-[0.6875rem] backdrop-blur",
        accent ? "text-brand" : "text-foreground/75",
      )}
    >
      <span className="font-semibold [&::first-letter]:uppercase">{label}</span>
      {count != null && (
        <span className="ml-auto text-[0.625rem] font-medium tabular-nums opacity-70">{count}</span>
      )}
    </h4>
  )
}

/**
 * Listeyi bölümlere ayırır.
 *
 * "Son kullanılanlar" ZAMANA göre gruplanır (Bugün / Dün / Daha önce) —
 * postanın yaptığının aynısı, çünkü o listede kullanıcının aradığı şey
 * "dün açtığım dosya"dır. Klasör içi ise TÜRE göre: önce klasörler, sonra
 * dosyalar — Finder'ın ve OneDrive'ın sırası, ve gezinmeyi hızlandırır.
 */
function groupItems(loc, items, t) {
  // Arama sonucu tek bölümdür: tarih ya da tür kırılımı burada yanıltıcı,
  // çünkü sonuçlar zaten alakaya göre sıralı geliyor ve o sırayı bozmak
  // en iyi eşleşmeyi listenin ortasına atardı.
  if (loc.kind === "search") {
    return items.length
      ? [{ id: "results", label: t("files.searchResults"), accent: true, items }]
      : []
  }
  if (loc.kind === "recent") {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yest = new Date(today)
    yest.setDate(yest.getDate() - 1)
    const b = { today: [], yesterday: [], earlier: [] }
    for (const it of items) {
      const d = it.modified ? new Date(it.modified) : null
      if (d && d >= today) b.today.push(it)
      else if (d && d >= yest) b.yesterday.push(it)
      else b.earlier.push(it)
    }
    return [
      { id: "today", label: t("files.today"), accent: true, items: b.today },
      { id: "yesterday", label: t("files.yesterday"), items: b.yesterday },
      { id: "earlier", label: t("files.earlier"), items: b.earlier },
    ].filter((s) => s.items.length > 0)
  }

  const navs = items.filter((i) => i.kind !== "file")
  const files = items.filter((i) => i.kind === "file")
  return [
    { id: "folders", label: t("files.secFolders"), items: navs },
    { id: "files", label: t("files.secFiles"), items: files },
  ].filter((s) => s.items.length > 0)
}

const TABS = [
  { id: "recent", loc: RECENT, key: "files.tabRecent" },
  { id: "onedrive", loc: ONEDRIVE, key: "files.tabOneDrive" },
  { id: "sites", loc: SITES, key: "files.tabSites" },
]

/**
 * SharePoint / OneDrive paneli — posta ve takvimin yanındaki üçüncü yüzey.
 *
 * Gezinme bir YIĞINDIR, tek bir "geçerli klasör" değil: kullanıcı site →
 * kitaplık → klasör → alt klasör diye indiğinde geri düğmesinin tek adım
 * geri gitmesi gerekiyor, sekmeye sıfırlanması değil. Yığın panel kapanınca
 * KORUNUR — kullanıcı dosyayı açıp geri döndüğünde aynı klasörde olur.
 *
 * Arama kutusu SUNUCUYA gitmez, yüklenmiş listeyi süzer. Graph'ın arama ucu
 * POST'tur ve `graphGet` yalnızca GET yapar; gerçek arama ayrı bir iş
 * (bkz. `/search/query`). Kutu bunu "bu klasörde ara" diyerek söyler,
 * yoksa kullanıcı tüm SharePoint'te aradığını sanırdı.
 */
/**
 * @param {object} props
 * @param {boolean} [props.open] Dışarıdan kontrol — verilmezse kendi
 *   durumunu tutar. Header telefonda paneli "⋯" menüsünden açıyor ve
 *   menü kapandığında panel açık kalmak zorunda; iç içe iki popover
 *   olsaydı dıştaki, içtekinin portalını "dışarı tıklama" sayıp ikisini
 *   birden kapatırdı.
 * @param {(next: boolean) => void} [props.onOpenChange]
 * @param {string} [props.triggerClassName] Tetikleyiciye eklenir. Telefonda
 *   düğme satırdan çekilir ama DOM'da kalır: Radix paneli ona göre
 *   konumlandırıyor, `display:none` bir tetikleyici paneli ekranın sol
 *   üstüne düşürürdü.
 */
/** `trigger`/`side`/`align`: bkz. MailPopover — çentik aynı paneli soldan açar. */
export function FilesPopover({
  open: openProp,
  onOpenChange,
  triggerClassName,
  trigger,
  side,
  align,
} = {}) {
  // Çentikle AYNI ikon ve AYNI hareket (archive-02): iki yüzey ayrışmasın.
  const { icon: archiveIcon, hoverProps: archiveHover } = useAnimatedIcon({
    icon: Archive02Icon,
    animatedIcon: AnimatedArchiveIcon,
  })
  const { t, locale } = useLocale()
  const { instance, accounts } = useMsal()
  const [openSelf, setOpenSelf] = useState(false)
  const open = openProp ?? openSelf
  const setOpen = onOpenChange ?? setOpenSelf
  const [tab, setTab] = useState("recent")
  const [stack, setStack] = useState([RECENT])
  const [q, setQ] = useState("")
  // Büyütülen dosya. Panelin DIŞINDA tutuluyor (bkz. FilePreviewDialog):
  // pencere popover'ın çocuğu olsaydı popover kapanınca onunla sökülürdü.
  const [expanded, setExpanded] = useState(null)
  // Postası yazılan dosya. Pencere yine panelin DIŞINDA — bkz. `expanded`.
  const [mailFor, setMailFor] = useState(null)
  const [nonce, setNonce] = useState(0)

  const [typed, setTyped] = useState("")

  // Sunucuya her tuşta gitmeyiz. 350ms, yazmayı bitirmiş biriyle hâlâ
  // yazmakta olan birini ayırt etmeye yetiyor ve arama ucu POST — ucuz değil.
  useEffect(() => {
    const id = setTimeout(() => setQ(typed.trim()), 350)
    return () => clearTimeout(id)
  }, [typed])

  const loc = stack[stack.length - 1]
  // İki harften kısa sorgu ARANMAZ: "a" kiracıdaki her şeyi döndürür ve
  // kullanıcı henüz ne aradığını söylememiştir.
  const searching = q.length >= 2
  const activeLoc = searching ? searchLocation(q) : loc
  const { status, items, hasMore, loadingMore, loadMore, scopes } = useDriveItems(
    open ? activeLoc : null,
    nonce,
  )

  const refresh = () => setNonce((n) => n + 1)

  async function connect() {
    const ok = await requestGraphScopes(instance, accounts[0], scopes)
    if (ok) refresh()
  }

  function goTab(next) {
    setTab(next.id)
    setStack([next.loc])
    setTyped("")
    setQ("")
  }

  function open_(item) {
    if (item.kind === "site") return push(siteLocation({ siteId: item.siteId, name: item.name }))
    if (item.kind === "drive")
      return push(driveLocation({ driveId: item.driveId, name: item.name }))
    if (item.kind === "folder")
      return push(folderLocation({ driveId: item.driveId, itemId: item.itemId, name: item.name }))
    // `sourceUrl` (`web=1`): çıplak dosya yolu Office belgelerinde İNDİRİYORDU.
    if (item.webUrl) window.open(sourceUrl(item), "_blank", "noopener,noreferrer")
  }

  function push(next) {
    setStack((s) => [...s, next])
    setTyped("")
    setQ("")
  }
  function back() {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s))
    setTyped("")
    setQ("")
  }

  // Devrin kuralı (adres gider, metin değil) `lib/fileActions.js`te.
  function ask(item, mode) {
    askTyroAboutFile(item, mode, t)
    setOpen(false)
  }

  // Yığının ilk halkası bir SEKMEDİR ve `name` taşımaz; etiketi sekme
  // tanımından gelir. Gerisi klasör/kitaplık adlarıdır.
  const pathLabel = stack
    .slice(0, -1)
    .map((l, i) =>
      i === 0 ? t(TABS.find((x) => x.loc.kind === l.kind)?.key ?? "files.title") : l.name,
    )
    .join(" › ")

  // Popover'ı AÇIK TUTMA kuralı. Hover kartı ve büyük önizleme, panelin DOM
  // ağacında değil portalda yaşıyor; Radix onlara yapılan tıklamayı "dışarı"
  // sayıp paneli kapatırdı — kullanıcı büyütme düğmesine basar basmaz altındaki
  // liste kaybolurdu. İki katman `data-files-layer` ile işaretli, pencere
  // açıkken de kapanma bastırılıyor (kapatınca kullanıcı listesine döner).
  const keepOpen = (e) => {
    if (expanded || mailFor) return e.preventDefault()
    const el = e.detail?.originalEvent?.target
    if (el instanceof Element && el.closest("[data-files-layer]")) e.preventDefault()
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        {trigger ? (
          <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("files.title")}
                  // Posta düğmesiyle BİREBİR aynı sınıflar. `text-muted-foreground`
                  // yok — komşular renk sınıfı taşımıyor ve onu eklemek bu düğmeyi
                  // yanlarında sönük gösteriyordu. İkona da boyut sınıfı VERİLMEZ:
                  // ölçü buradaki `[&_svg]:!size-5`ten gelsin ki üçü tek yerden
                  // ayarlansın ve ayrışamasınlar.
                  {...archiveHover}
                  className={cn("size-9 rounded-xl [&_svg]:!size-5", triggerClassName)}
                >
                  {archiveIcon}
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>{t("files.title")}</TooltipContent>
          </Tooltip>
        )}

        <PopoverContent
          side={side}
          align={align ?? "end"}
          sideOffset={side ? 14 : 8}
          collisionPadding={24}
          onInteractOutside={keepOpen}
          onFocusOutside={keepOpen}
          /* Ölçü tarifi MailPopover.jsx'te yazılı — DÖRT panel aynı reçeteyi
           paylaşır ve ayrışmamalı. */
          className="flex max-h-[min(26rem,calc(100dvh-8rem))] sm:max-h-[min(36rem,calc(100dvh-5rem))] w-[min(23rem,calc(100vw-3rem))] flex-col gap-0 overflow-hidden p-0"
        >
          <div className="flex items-center gap-1.5 px-3 py-2.5">
            {stack.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("files.back")}
                onClick={back}
                className="size-7 rounded-lg [&_svg]:!size-4"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} />
              </Button>
            ) : (
              <HugeiconsIcon icon={Folder01Icon} className="size-4 text-brand" strokeWidth={1.8} />
            )}
            {/* Ad + YOL. Tek bir "geri" düğmesi üç kademe inen kullanıcıya
              nerede olduğunu söylemiyordu; yol satırı Finder'ın adres
              çubuğunun işini görür ve bir satır yer kaplar. */}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.8125rem] font-semibold leading-tight">
                {stack.length > 1 ? loc.name : t("files.title")}
              </span>
              {stack.length > 1 && (
                <span className="mt-0.5 block truncate text-[0.65625rem] leading-tight text-muted-foreground">
                  {pathLabel}
                </span>
              )}
            </span>
          </div>

          {/* Sekmeler yalnızca KÖKTE: bir klasörün içindeyken "OneDrive"a
            basmak gezinme yığınını sessizce atardı. */}
          {stack.length === 1 && (
            <div className="flex gap-1 px-3 pb-2">
              {TABS.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => goTab(x)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[0.6875rem] font-medium transition",
                    tab === x.id
                      ? "bg-brand/12 text-brand-deep"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                  )}
                >
                  {t(x.key)}
                </button>
              ))}
            </div>
          )}

          <div className="px-3 pb-2">
            <div className="flex items-center gap-1.5 rounded-lg bg-foreground/[0.04] px-2 py-1.5">
              <HugeiconsIcon
                icon={Search01Icon}
                className="size-3.5 shrink-0 text-muted-foreground"
                strokeWidth={1.8}
              />
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={t("files.searchHere")}
                className="min-w-0 flex-1 bg-transparent text-[0.75rem] outline-none placeholder:text-muted-foreground/70"
              />
            </div>
          </div>

          <Separator className="shrink-0" />

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-foreground/15">
            {status === "loading" && (
              <div className="space-y-3 px-4 py-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="size-8 rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-2.5 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {status === STATUS.denied && (
              <StateMessage
                icon={Alert02Icon}
                title={t("files.permissionTitle")}
                body={t("files.permissionBody")}
                // Her zaman "Bağlan": izin KİRACIDA verilmiş durumda, dolayısıyla
                // buraya düşmenin baskın sebebi bu tarayıcıdaki oturumun izinden
                // eski olması (bkz. graph.js — sessiz yenileme gizli iframe'e
                // düşüyor ve üçüncü taraf çerez kuralları onu kesiyor). Tıklamayla
                // açılan onay bundan muaf. İzin gerçekten yoksa aynı düğme gerçek
                // hatayı yüzeye çıkarır; sessizce "yenile" demek onu gizlerdi.
                action={t("files.connect")}
                onAction={connect}
              />
            )}
            {status === STATUS.error && (
              <StateMessage
                icon={Alert02Icon}
                title={t("files.error")}
                body={t("files.errorBody")}
                action={t("files.retry")}
                onAction={refresh}
              />
            )}
            {status === STATUS.unauthenticated && <StateMessage title={t("files.signedOut")} />}

            {status === "ready" && items.length === 0 && (
              <StateMessage title={searching ? t("files.noMatch") : t("files.empty")} />
            )}
            {typed.trim().length === 1 && <StateMessage title={t("files.searchShort")} />}

            {status === "ready" &&
              groupItems(activeLoc, items, t).map((sec) => (
                <section key={sec.id}>
                  <SectionBand label={sec.label} count={sec.items.length} accent={sec.accent} />
                  <ul className="divide-y divide-border/30">
                    {sec.items.map((item) => (
                      <Row
                        key={`${item.kind}:${item.id}`}
                        item={item}
                        locale={locale}
                        onOpen={open_}
                        onAsk={ask}
                        onMail={setMailFor}
                        onExpand={setExpanded}
                        t={t}
                      />
                    ))}
                  </ul>
                </section>
              ))}

            {/* Sayfalama kullanıcının elinde. İlk sayfa hemen gelir; büyük bir
              kitaplıkta on sayfayı otomatik çekmek paneli saniyelerce boş
              bırakırdı ve aranan dosya çoğu zaman ilk sayfadadır. Düğmenin
              VARLIĞI aynı zamanda "dahası var" bilgisidir — sessiz kırpma
              olmuyor. */}
            {status === "ready" && hasMore && (
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full border-t border-border/40 px-3 py-2.5 text-[0.71875rem] font-medium text-brand transition hover:bg-accent/50 disabled:opacity-60"
              >
                {loadingMore ? t("files.loadingMore") : t("files.loadMore")}
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <FilePreviewDialog item={expanded} onClose={() => setExpanded(null)} />
      <FileMailDialog item={mailFor} onClose={() => setMailFor(null)} />
    </>
  )
}
