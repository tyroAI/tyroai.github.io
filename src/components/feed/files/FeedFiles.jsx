import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { useMsal } from "@azure/msal-react"
import { FilePreviewDialog } from "@/components/common/FilePreviewDialog"
import { FileMailDialog } from "@/components/common/FileMailDialog"
import { ImageLightbox } from "@/components/common/ImageLightbox"
import { useLocale } from "@/hooks/useLocale"
import { useMyDrive } from "@/hooks/useMyDrive"
import { useFilesSearch } from "@/hooks/useFilesSearch"
import { useFilesListing } from "@/hooks/useFilesListing"
import { useMineRung, useRecentFiles } from "@/hooks/useRecentFiles"
import { useLocationMeta } from "@/hooks/useLocationMeta"
import { usePolicyFolder } from "@/hooks/usePolicyFolder"
import { STATUS } from "@/lib/graph"
import { othersAvailable } from "@/lib/filesIdentity"
import { firstDayOfWeek } from "@/lib/weekStart"
import { FILES_PAGE } from "@/lib/filesPolicy"
import { ORG_CHART_URL } from "@/data/companyDocs"
import { CDN_FOLDERS, CDN_IMAGE_COUNT, POLICY_ITEMS, searchCorporate } from "@/lib/corporateFiles"
import { decodeLoc, listingFor, tokenFor } from "@/lib/filesLocation"
import { lastQuery, rememberMeta, rememberQuery, rememberStep, trailFor } from "@/lib/filesNav"
import { spRootFrom } from "@/lib/filesPaths"
import { resolveScope } from "@/lib/filesScope"
import {
  activeFilterCount,
  facetFolders,
  matchesFilters,
  matchesText,
  parseFilterParams,
  pathKql,
  typeCounts,
  writeFilterParams,
} from "@/lib/filesQuery"
import { BrowseView } from "./BrowseView"
import { FilesHome } from "./FilesHome"
import { FilesSearchBar } from "./FilesSearchBar"
import { SortMenu } from "./FilesToolbar"
import { SearchView } from "./SearchView"
import { FILES } from "./filesShared"
import { useFileActions } from "./useFileActions"
import { useFilePlace } from "./useFilePlace"
import { useFilesCrumbs } from "./useFilesCrumbs"
import { useFilesRefresh } from "./useFilesRefresh"
import "./files.css"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  KEŞFET › DOSYALARIM — OneDrive + SharePoint + şirket belgeleri, tek yer
 * ═══════════════════════════════════════════════════════════════════════
 *
 *   KUTU    her zaman en üstte; bulunduğun yerin İÇİNDE arar (alt klasörler
 *           dahil — `path:`), "Tüm dosyalarında ara" tek dokunuş.
 *   ŞERİT   Tümü · OneDrive · SharePoint · Şirket — kapsam, gezinme değil.
 *   KONUM   klasöre girmek GEZİNME (geçmişe yazılır, geri tuşu üst klasör).
 *   SÜZGEÇ  Tür · Tarih · Kişi; sıralama görünümün başlığında, YALNIZ
 *           sıralanabilen yerde (D-15).
 *   AÇILIŞ  sık klasörler + son dosyaların; liste çizilemezse sebep ve çare
 *           listenin yerinde (`FilesHome`).
 *
 * ⚠️ **KAPI KURALI (D-12):** bir çip, kutucuk ya da bağlantı bir YER açar →
 * `floc` PUSH (geri tuşu panoya döner); şerit ve süzgeçler REPLACE. Tür
 * çipleri bir süzgeç kapısı (`door`): süzgeci kurar, sonuç başlığına odaklanır.
 * ⚠️ **"TEKRAR DENE" ≠ "BAĞLAN" (D-1):** `retry` yalnız sayacı artırır;
 * izin penceresi yalnız `denied` hâlinin "Bağlan"ı açar.
 *
 * Kurallar: "soramadık ≠ dosya yok" (her kaynak kendi durumunu çizer); adreste
 * yalnız opak belirteç (`lib/filesLocation.js`), adlar ve arama metni
 * bellekte (`lib/filesNav.js`); hiçbir önbellek diske yazılmaz; hover'a bağlı
 * bilgi yok; kapsayıcı sorguları (`@container/files`), `lg:` DEĞİL.
 *
 * Parçalar: görünümler `SearchView` · `BrowseView` (`SitesRootView`) · `FilesHome`;
 * arama satırı `FilesSearchBar`; kancalar `useFileActions` · `useFilesCrumbs` ·
 * `useFilePlace` · `useFilesRefresh`; kapsam `lib/filesScope.js` (saf, testli).
 */

export function FeedFiles({ scrollerRef, now }) {
  const { t, locale } = useLocale()
  const { instance, accounts } = useMsal()
  const account = accounts[0] ?? null
  const upn = account?.username ?? ""
  const me = useMemo(
    () =>
      account
        ? {
            id: account.localAccountId,
            upn: account.username,
            email: account.username,
            name: account.name,
          }
        : null,
    [account],
  )
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [nonce, setNonce] = useState(0)
  // Sürücü de "Tekrar dene"yi duyar: okunamayan OneDrive kökü yeniden sorulsun (D-3).
  const myDrive = useMyDrive({ nonce })
  const myRoot = myDrive.webUrl
  const spRoot = useMemo(() => spRootFrom(myRoot), [myRoot])

  const token = params.get("floc")
  const loc = useMemo(() => decodeLoc(token), [token])
  const rawSource = params.get("fsrc")
  const filters = useMemo(() => parseFilterParams(params), [params])

  /* ── metin (adreste DEĞİL, bellekte) ── */
  const [text, setText] = useState(() => lastQuery())
  const [q, setQ] = useState(() => lastQuery().trim())
  useEffect(() => {
    rememberQuery(text)
    const id = setTimeout(() => setQ(text.trim()), FILES_PAGE.debounceMs)
    return () => clearTimeout(id)
  }, [text])
  const inputRef = useRef(null)
  const titleRef = useRef(null)

  const hasText = q.length >= FILES_PAGE.minQuery
  const contentFilters =
    filters.types.length > 0 || Boolean(filters.date) || Boolean(filters.person)
  const searching = hasText || contentFilters
  const staticOnly = loc?.kind === "cdnRoot" || loc?.kind === "cdnFolder"

  /* ── konum ── */
  const meta = useLocationMeta(loc, nonce)
  const policy =
    loc?.kind === "policy" ? (POLICY_ITEMS.find((p) => p.policyId === loc.policyId) ?? null) : null
  const policyFolder = usePolicyFolder(policy, nonce)
  const cdnFolder =
    loc?.kind === "cdnFolder"
      ? (CDN_FOLDERS.find((f) => f.cdnFolderId === loc.cdnFolderId) ?? null)
      : null
  const { source, scopeUrl, scopeReady, scopeFailure } = resolveScope({
    loc,
    rawSource,
    meta,
    myDrive,
    myRoot,
    spRoot,
    policy,
    policyFolder,
  })

  /* ── sıralama ── */
  const sortOptions = searching
    ? hasText
      ? ["relevance", "modified", "name", "size"]
      : ["modified", "name", "size"]
    : ["name", "modified", "size"]
  const sort = sortOptions.includes(filters.sort) ? filters.sort : sortOptions[0]

  /* ── veri ── */
  const scopeKql = scopeUrl ? [pathKql(scopeUrl)] : []
  const searchReq =
    searching && !staticOnly && scopeReady
      ? {
          text: hasText ? q : "",
          scope: scopeKql,
          kind: "files",
          types: filters.types,
          date: filters.date,
          person: filters.person,
          upn,
          sort: sort === "relevance" ? "" : sort,
          withAggregations: !filters.types.length,
        }
      : null
  const results = useFilesSearch(searchReq, { nonce })
  // Klasör isteği kişi kısıtı TAŞIMAZ (§12.10): "Sen" süzgeci dosyaları
  // daraltır; klasörü kimin değiştirdiği aradığın şeyin yerini söylemez.
  const folderReq =
    hasText && q.length >= 3 && !filters.types.length && !filters.date && !staticOnly && scopeReady
      ? { text: q, scope: scopeKql, kind: "folders" }
      : null
  const folderHits = useFilesSearch(folderReq, { nonce, firstPage: FILES_PAGE.folderBand })

  const home = !searching && !loc && source === "all"
  const recent = useRecentFiles({ enabled: home, upn, myRoot, nonce })
  // Ekipler yalnız SharePoint kökünde (§7.6: açılış ≤ 4 istek); kök ve takip
  // okuması iki görünümde aynı parça önbelleğinden.
  const spHome = (!loc && !searching && source === "sharepoint") || loc?.kind === "sites"
  const sitesList = useFilesListing(
    spHome ? { kind: "sites", teams: true } : home ? { kind: "sites" } : null,
    { nonce },
  )

  const listingLoc = searching
    ? null
    : loc?.kind === "policy"
      ? policyFolder.status === STATUS.ready && policyFolder.driveId
        ? { kind: "folder", driveId: policyFolder.driveId, itemId: policyFolder.itemId }
        : null
      : loc
        ? loc.kind === "sites"
          ? null
          : listingFor(loc)
        : source === "onedrive"
          ? { kind: "onedrive" }
          : null
  const listing = useFilesListing(listingLoc, { sort, nonce })
  // ⚠️ SIRALAMA YALNIZ SIRALANABİLEN YERDE (D-5 · D-15): SharePoint kökü, sitenin
  // kitaplık listesi ve kurumsal kökler sıralamayı yok sayıyordu — menü
  // değişiyor, liste değişmiyordu.
  const showSort = searching ? !staticOnly : Boolean(listingLoc) && loc?.kind !== "site"

  /* ── kimlik basamağı: OneDrive basamağında "Başkaları" sorulamaz ── */
  const mineRung = useMineRung()
  const canOthers = othersAvailable(mineRung)
  const personOptions = canOthers ? ["any", "me", "others"] : ["any", "me"]
  useEffect(() => {
    if (canOthers || filters.person !== "others") return
    setParams(writeFilterParams(params, { ...filters, person: "" }), { replace: true })
  }, [canOthers, filters, params, setParams])

  /* ── adres yazıcıları ── */
  const hrefWith = useCallback(
    (patch) => {
      const p = new URLSearchParams(params)
      p.set("sec", "docs")
      p.delete("post")
      for (const [k, v] of Object.entries(patch)) {
        if (v == null || v === "") p.delete(k)
        else p.set(k, v)
      }
      return `${location.pathname}?${p.toString()}`
    },
    [params, location.pathname],
  )
  const hrefFor = useCallback(
    (item) => {
      const tk = tokenFor(item)
      return tk ? hrefWith({ floc: tk, fsrc: null }) : null
    },
    [hrefWith],
  )
  const hrefs = useMemo(
    () => ({
      policy: hrefWith({ floc: "c~pol", fsrc: null }),
      cdn: hrefWith({ floc: "c~img", fsrc: null }),
      org: ORG_CHART_URL,
      // Yer kapıları: bir YER açar → push (D-12).
      onedrive: hrefWith({ floc: "od", fsrc: null }),
      spRoot: hrefWith({ floc: "sp", fsrc: null }),
      corporate: hrefWith({ floc: "c", fsrc: null }),
      policyCount: POLICY_ITEMS.length,
      imageCount: CDN_IMAGE_COUNT,
    }),
    [hrefWith],
  )
  function setFilter(patch) {
    const next = writeFilterParams(params, { ...filters, ...patch })
    setParams(next, { replace: true })
  }
  function clearAll() {
    setText("")
    setQ("")
    setParams(writeFilterParams(params, { types: [], date: "", person: "", sort: "" }), {
      replace: true,
    })
  }
  function setSource(s) {
    const p = new URLSearchParams(params)
    p.delete("floc")
    if (s === "all") p.delete("fsrc")
    else p.set("fsrc", s)
    setParams(p, { replace: true })
  }
  function widen() {
    const p = new URLSearchParams(params)
    p.delete("floc")
    p.delete("fsrc")
    setParams(p, { replace: false })
  }
  /**
   * Süzgeç KAPISI (panonun tür çipleri): süzgeci kurar (replace — bir süzgeç
   * gezinme değil), sonuç görünümü çizilince başa kaydırır ve başlığa
   * odaklanır; ekran okuyucu nereye gelindiğini duyar.
   */
  const pendingFocus = useRef(false)
  function door(patch) {
    pendingFocus.current = true
    setFilter(patch)
  }
  useEffect(() => {
    if (!pendingFocus.current || !searching) return
    pendingFocus.current = false
    scrollerRef?.current?.scrollTo({ top: 0 })
    titleRef.current?.focus({ preventScroll: true })
  }, [searching, scrollerRef])

  const { current, crumbs, upHref } = useFilesCrumbs({
    loc,
    source,
    policy,
    cdnFolder,
    meta,
    hrefWith,
    t,
  })

  /* ── gezinme yan etkileri ── */
  const onNavigate = useCallback(
    (item) => {
      const tk = tokenFor(item)
      if (!tk) return
      rememberMeta(tk, { name: item.name, webUrl: item.webUrl })
      if (current) rememberStep(current, { token: tk, name: item.name })
      // Bir klasöre girmek "burayı gez" demek: arama metni temizlenir,
      // süzgeçler kalır (süzgeç + klasör = o klasörün altını süz).
      setText("")
      setQ("")
    },
    [current, setText, setQ],
  )
  const prevToken = useRef(token)
  useEffect(() => {
    if (prevToken.current === token) return
    prevToken.current = token
    scrollerRef?.current?.scrollTo({ top: 0 })
    titleRef.current?.focus({ preventScroll: true })
  }, [token, scrollerRef])

  // Tek kitaplıklı site doğrudan kitaplığa: bir tık az, geri tuşu da sekmez (replace).
  useEffect(() => {
    if (loc?.kind !== "site" || listing.status !== STATUS.ready || listing.items.length !== 1)
      return
    const lib = listing.items[0]
    const tk = tokenFor(lib)
    if (!tk) return
    rememberMeta(tk, { name: meta?.name || lib.name, webUrl: lib.webUrl })
    for (const c of trailFor(loc.token)) rememberStep(c, { token: tk, name: lib.name })
    navigate(hrefWith({ floc: tk }), { replace: true })
  }, [loc, listing.status, listing.items, meta, navigate, hrefWith])

  // `/` kutuya atlar (HelpPage'in dinleyicisi: yazı alanında ve değiştiricide karışmaz).
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target
      const tag = el?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) return
      e.preventDefault()
      inputRef.current?.focus()
      inputRef.current?.scrollIntoView({ block: "nearest" })
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const {
    preview,
    setPreview,
    mailItem,
    setMailItem,
    lightbox,
    setLightbox,
    pendingFolder,
    openItem,
    ask,
    copyLink,
    goToFolderOf,
    searchIn,
    openGroup,
    connect,
    retry,
  } = useFileActions({
    t,
    instance,
    account,
    navigate,
    hrefWith,
    hrefFor,
    onNavigate,
    setText,
    setQ,
    setNonce,
    inputRef,
  })

  /* ── konum satırı ("OneDrive'ım › Finans") ── */
  const placeOf = useFilePlace({ sitesItems: sitesList.items, myRoot, t })

  /* ── görünümün verisi ── */
  const firstDay = firstDayOfWeek(locale)
  // ⚠️ BAYAT SONUÇ SOLUK (D-7): yeni sorgu yoldayken önceki hazır sonuç yerinde
  // kalır ve soluklaşır — her tuşta iskelete düşüp listeyi zıplatmak yerine.
  const view = results.status === "loading" && results.stale && scopeReady ? results.stale : results
  const dimmed = view !== results
  const fileHits = useMemo(
    () =>
      view.items.filter(
        (it) =>
          it.kind === "file" &&
          matchesFilters(it, filters, {
            me,
            now,
            keepFolders: false,
            personApplied: Boolean(view.personApplied),
          }),
      ),
    [view.items, view.personApplied, filters, me, now],
  )
  const folderView =
    folderHits.status === "loading" && folderHits.stale ? folderHits.stale : folderHits
  const corporateMatches = useMemo(() => {
    if (
      !hasText ||
      !(source === "all" || source === "corporate") ||
      (loc && !["corporate", "policyRoot", "cdnRoot"].includes(loc.kind))
    )
      return null
    return searchCorporate(q, {
      orgLabel: t("docs.org.title"),
      policyLabel: t("docs.policy.title"),
      imagesLabel: t("docs.corporate.title"),
    })
  }, [hasText, source, loc, q, t])
  const staticItems = useMemo(() => {
    if (!staticOnly) return null
    const pool =
      loc.kind === "cdnFolder" ? (cdnFolder?.items ?? []) : CDN_FOLDERS.flatMap((f) => f.items)
    return pool.filter(
      (it) =>
        (!hasText || matchesText(it, q)) &&
        matchesFilters(it, filters, { me, now, keepFolders: false }),
    )
  }, [staticOnly, loc, cdnFolder, hasText, q, filters, me, now])
  const facet = useMemo(
    () => (searching && !staticOnly ? facetFolders(fileHits, FILES_PAGE.resultFolders) : []),
    [searching, staticOnly, fileHits],
  )

  /* ── yenile ── */
  const active = searching
    ? results
    : home
      ? recent
      : listingLoc
        ? listing
        : loc?.kind === "sites" || (!loc && source === "sharepoint")
          ? sitesList
          : null
  const { rf, onRefresh } = useFilesRefresh({ active, nonce, setNonce, t })

  /* ── yer tutucu ── */
  const placeholder = loc
    ? t("myfiles.search.in", { place: current?.name || "…" })
    : t(`myfiles.search.placeholder.${source}`)
  const showPerson = source !== "onedrive" && !staticOnly && !(loc && source === "corporate")
  const activeCount = activeFilterCount(filters) + (hasText ? 1 : 0)

  const rowProps = {
    now,
    me,
    query: hasText ? q : "",
    onNavigate,
    onAsk: ask,
    onMail: setMailItem,
    onCopy: copyLink,
    onReveal: (it) => goToFolderOf(it),
    onSearchIn: searchIn,
    onOpenGroup: openGroup,
    ownDriveId: myDrive.id,
  }

  // Tür sayıları (§12.16): aramada sunucunun kümelemesinden ya da yüklenenlerden;
  // gezinmede klasörün yüklenen satırlarından. Açılışta YOK (D-6): menü
  // "Son 25 dosyandan" sayardı ama süzgeç bütün dosyaları süzüyor — sayılar
  // açılışın kendi tür çiplerinde, ne saydıklarını söyleyerek.
  const hasListing = Boolean(listingLoc)
  const listingCounts = useMemo(
    () =>
      hasListing && listing.status === STATUS.ready ? typeCounts({ items: listing.items }) : null,
    [hasListing, listing.status, listing.items],
  )
  const counts = searching
    ? view.status === STATUS.ready
      ? view.typeCounts
      : null
    : home
      ? null
      : listingCounts
  const sortMenu = showSort ? (
    <SortMenu sort={sort} options={sortOptions} onSort={(s) => setFilter({ sort: s })} />
  ) : null

  /* ── çizim ── */
  const toolbar = (
    <FilesSearchBar
      {...{ t, text, setText, setQ, placeholder, inputRef, source, setSource }}
      {...{ filters, setFilter, clearAll, showPerson, personOptions, counts, activeCount }}
      busy={searching && results.status === "loading"}
      showRefresh={Boolean(active)}
      refreshing={rf.refreshing}
      onRefresh={onRefresh}
    />
  )

  const shared = {
    t,
    locale,
    now,
    rowProps,
    placeOf,
    hrefFor,
    hrefs,
    openItem,
    connect,
    retry,
    titleRef,
    pendingFolder,
    freshKeys: rf.fresh,
    sortMenu,
    onNavigate,
  }
  let body
  let canvas
  if (searching) {
    canvas = "search"
    body = (
      <SearchView
        {...shared}
        {...{
          q,
          hasText,
          filters,
          sort,
          results,
          view,
          dimmed,
          folderView,
          fileHits,
          corporateMatches,
          staticItems,
          facet,
          loc,
          source,
          current,
          scopeReady,
          scopeFailure,
          firstDay,
          widen,
          clearAll,
          setFilter,
          goToFolderOf,
        }}
      />
    )
  } else if (home) {
    canvas = "home"
    body = (
      <FilesHome
        {...{
          recent,
          now,
          nonce,
          firstDay,
          hrefs,
          rowProps,
          placeOf,
          openItem,
          goToFolderOf,
          pendingFolder,
          retry,
        }}
        onDoor={door}
        connectFiles={() => connect(FILES)}
        fresh={rf.fresh}
        ownDriveId={myDrive.id}
      />
    )
  } else {
    canvas = "browse"
    body = (
      <BrowseView
        {...shared}
        {...{
          loc,
          source,
          current,
          crumbs,
          upHref,
          meta,
          listing,
          sitesList,
          policy,
          policyFolder,
          cdnFolder,
          myRoot,
          spRoot,
          myDrive,
        }}
      />
    )
  }

  return (
    <div className="@container/files flex min-w-0 flex-col gap-5">
      {toolbar}
      {/* Tuval görünüm değişince kısa bir geçişle gelir (yazarken değil — aynı görünümde anahtar sabit). */}
      <div
        key={canvas}
        className="min-w-0 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200"
      >
        {body}
      </div>
      <FilePreviewDialog item={preview} onClose={() => setPreview(null)} />
      <FileMailDialog item={mailItem} onClose={() => setMailItem(null)} />
      <ImageLightbox
        items={lightbox.items}
        activeId={lightbox.id}
        onActiveIdChange={(id) => setLightbox((l) => ({ ...l, id }))}
        onClose={() => setLightbox({ items: [], id: null })}
      />
      {/* Etik Hattı hapı sağ alt köşede: son satırın ⋯'u onun altında kalmasın. */}
      <div aria-hidden="true" className="h-16 [@media(pointer:coarse)]:h-20" />
    </div>
  )
}
