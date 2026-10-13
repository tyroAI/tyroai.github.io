import { useRef } from "react"
import { motion } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon"
import ViewIcon from "@hugeicons/core-free-icons/ViewIcon"
import SquareLock01Icon from "@hugeicons/core-free-icons/SquareLock01Icon"
import { Diamond02Icon as AnimatedDiamondIcon } from "@/components/ui/diamond-02"
import { EyeIcon as AnimatedEyeIcon } from "@/components/ui/eye"
import { FavouriteIcon as AnimatedFavouriteIcon } from "@/components/ui/favourite"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"
import { IconOrLogo } from "@/components/common/IconOrLogo"

export function LauncherCard({
  iconName,
  logo,
  title,
  brand = null,
  subtitle,
  onClick,
  // Kilitli kart AÇILMAZ: tıklama app'i değil TALEBİ tetikler. Kilidin ne
  // olduğu ve neyi gerçekten engellediği `lib/appLockPolicy.js`te yazılı.
  locked = false,
  onRequest,
  // Bu app icin acik talep varsa SATIRIN KENDISI gelir (tarih + notlar),
  // yalniz bir bayrak degil: ortadaki dugme ona tiklayinca talebin
  // detayini acıyor ve ikinci bir sorgu atmadan gostermeli.
  request = null,
  onShowRequest,
  index = 0,
  accent = "brand",
  onContextMenu,
  // Favori durumu YUKARIDAN gelir: useFavorites'ı her kart ayrı çağırsaydı
  // her kart tüm favori listesini yeniden çözerdi. AppLauncher bir kez
  // çağırır, kart yalnızca kendi bayrağını alır.
  favorite = false,
  onToggleFavorite,
}) {
  const { t } = useLocale()
  const pending = Boolean(request)
  // Animasyon KONTROLDEN tetikleniyor: ref takılınca ikon kendi
  // enter/leave'ini bağlamayı bırakıyor ve bu üç düğme tek tetikleyici
  // oluyor (bkz. `hooks/useAnimatedIcon.jsx` başındaki gerekçe).
  const askRef = useRef(null)
  const eyeRef = useRef(null)
  const heartRef = useRef(null)
  // Üç bölüm, üç AYRI muamele — hepsi paletin kendi renklerinden:
  //   asistanlar   → marka gradyanı, beyaz ikon (en baskın; sayfanın kahramanı)
  //   AI çözümler  → AÇIK marka zemini, koyu marka mürekkebi
  //   iş uygulama  → dolu koyu marka, beyaz ikon
  // Ortadaki bölümün açık olması ritmi kuran şey: koyu → açık → koyu. Eskiden
  // orta bölüm `color-mix(brand-via 60%, brand-deep 40%)` ile koyu bir karışım
  // taşıyordu, yani üçüncü bölümün dolgusuna çok benziyordu ve iki bölüm tek
  // liste gibi okunuyordu. tyroTrade'de aynı sorun aynı şekilde çözüldü.
  //
  // Orta bölüm için ÜÇÜNCÜ bir koyu renk aranmadı: paletlerde öyle bir token
  // yok ve `--brand-deep`in beyazla kontrastı 14 paletin 2'sinde 3:1'in
  // altında (amber, sky — ölçüldü). Açık zemin + koyu mürekkep hem farkı hem
  // okunurluğu çözüyor; mürekkep `--brand-on-soft`, çünkü tek renkli
  // paletlerde zemin koyu temada koyuya dönüyor (bkz. index.css).
  const accentClass =
    accent === "brand"
      ? "bg-gradient-to-br from-brand-from via-brand-via to-brand-to"
      : accent === "business"
        ? "bg-brand-fill-deep"
        : accent === "ai"
          ? "bg-brand-soft text-brand-on-soft"
          : ""
  // Kalp kartın İÇİNDE değil, KARDEŞİ: buton içinde buton geçersiz HTML ve
  // tarayıcı iç tıklamayı dıştakine de yolluyor — kalbe basınca uygulama da
  // açılırdı. Sarmalayıcı div artık ızgara hücresi, kart ve kalp onun içinde
  // iki ayrı buton.
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2 }}
      className="group relative h-full"
    >
      <button
        type="button"
        onClick={locked ? undefined : onClick}
        onContextMenu={locked ? undefined : onContextMenu}
        aria-disabled={locked || undefined}
        className={cn(
          "flex h-full w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left sm:p-5 @max-[34rem]/launcher:gap-3 @max-[34rem]/launcher:p-3",
          // Telefonda kalp HEP görünür ve sağ üst köşede; kısa kartta ortalı
          // oka biniyordu (ölçüldü, 390px). Ok onun sütunundan çekilir.
          !locked && onToggleFavorite && "max-md:pr-11",
          "transition-all duration-200",
          // Kilitli kart SİLİK, renksiz değil: marka rengi app'in kimliği,
          // onu düşürmek kartı tanınmaz yapıyordu. Tek kademe opaklık +
          // kesikli kenarlık farkı zaten anlatıyor.
          locked
            ? "cursor-default border-dashed opacity-[0.72] @max-[34rem]/launcher:pe-36"
            : "hover:border-brand/40 hover:shadow-lg",
        )}
      >
        <div
          className={cn(
            "grid size-12 shrink-0 place-items-center self-start overflow-hidden rounded-xl text-white shadow-sm sm:size-14 sm:self-center sm:rounded-2xl @max-[34rem]/launcher:size-10 @max-[34rem]/launcher:self-center",
            accentClass,
          )}
        >
          <IconOrLogo iconName={iconName} logo={logo} className="size-5 sm:size-6" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {/* Marka bir kez, adın ÜSTÜNDE: katalog adı önekli ("tyroOffice",
              "tyroSign") ve kart onu öneksiz gösteriyor — marka kaybolmuyor,
              yer değiştiriyor. Wordmark olduğu için `uppercase` sınıfı yok:
              Türkçe büyütme kuralı ona dokunmasın. */}
          {brand && (
            <span className="text-[0.6875rem] font-semibold leading-none tracking-[0.12em] text-muted-foreground">
              {brand}
            </span>
          )}
          <h3
            className={cn(
              "truncate font-semibold leading-tight",
              brand ? "text-base sm:text-[1.0625rem]" : "text-sm sm:text-base",
            )}
          >
            {title}
          </h3>
          <p className="text-xs leading-snug text-muted-foreground line-clamp-2 @max-[34rem]/launcher:line-clamp-1">
            {subtitle}
          </p>
          {/* Rozet İLK BAKIŞTA ne olduğunu söyler: talep yoksa "Kilitli",
              varsa "Talep inceleniyor". İkincisi kilidin yerine GEÇER, yanına
              gelmez — talep açmış biri için "Kilitli" artık işin durumu
              değil, sadece başlangıç noktası; ikisini birlikte göstermek
              kullanıcıya hâlâ hiçbir şey yapmamış gibi hissettiriyordu.
              Eski "Beklemede" metni de bu turda gitti: neyin beklediğini
              söylemiyordu. */}
          {locked && (
            <span
              className={cn(
                "mt-1.5 inline-flex w-fit items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-medium",
                pending
                  ? "bg-amber-500/12 text-amber-700 dark:text-amber-400"
                  : "bg-foreground/[0.06] text-foreground/[0.55]",
              )}
            >
              {/* Rozet ETKİLEŞİMSİZ: burada durağan glif duruyor, animasyonlu
                  bileşen değil. Aynı göz, örtüdeki düğmede canlanıyor. */}
              <HugeiconsIcon
                icon={pending ? ViewIcon : SquareLock01Icon}
                className="size-3"
                strokeWidth={2}
              />
              {pending ? t("lock.reviewing") : t("lock.badge")}
            </span>
          )}
        </div>
        {/* Kilitliyken burada HİÇBİR glif yok: ok "aç beni" derdi ve
            yalan olurdu, kilit ise alttaki rozetin tekrarı olurdu. */}
        {!locked && (
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            className="size-4 shrink-0 text-muted-foreground/40 transition group-hover:translate-x-0.5 group-hover:text-brand"
          />
        )}
      </button>
      {/* ═══════════════════════════════════════════════════════════════
          KİLİTLİ KARTIN ÖRTÜSÜ — üstüne gelince kart bulanır, eylem çıkar
          ═══════════════════════════════════════════════════════════════

          Önceden sağ üstte küçük bir düğme vardı ve kartın alt rozeti aynı
          durumu ikinci kez yazıyordu ve kaldırıldı:
          dört kartlık bir ızgarada aynı cümle sekiz kez okunuyordu.

          ⚠️ `backdrop-blur` KARTIN KENDİSİNİ bulanıklaştırır, örtünün içini
          değil — bu yüzden eylem örtünün İÇİNDE durabiliyor ve net kalıyor.
          Bir `filter: blur` kartın üstünde olsaydı düğme de bulanırdı.

          ⚠️ DOKUNMATİKTE HOVER YOK, bu yüzden kaba işaretçide örtü HER ZAMAN
          açık (`[@media(pointer:coarse)]:`, bu depoda tekrar eden ders —
          sınıf adı ŞABLON İFADESİYLE değil TAM yazılır, yoksa Tailwind onu
          hiç üretmez). Orada kartın başlığını bir kademe okunur bırakmak
          için bulanıklık daha düşük: kilitli kartta okunacak asıl şey zaten
          hangi app olduğu ve ne yapılacağı.

          ⚠️ Örtü `pointer-events-none`, düğme değil: görünmezken kartın
          ortasındaki tıklamaları yutmasın. Klavyeyle gelindiğinde
          `group-focus-within` örtüyü açıyor — görünmeyen bir düğmeye
          basmak zorunda kalan kimse olmasın. */}
      {locked && (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-2xl p-3",
            "bg-card/60 backdrop-blur-[3px] dark:bg-card/65",
            "opacity-0 transition-opacity duration-200",
            "group-hover:opacity-100 group-focus-within:opacity-100",
            "[@media(pointer:coarse)]:opacity-100 [@media(pointer:coarse)]:bg-card/45",
            "[@media(pointer:coarse)]:backdrop-blur-[1.5px]",
            // Telefonda (dar kap) eylem sağda ve örtü saydam: asistanın adı okunur kalır,
            // metin `pe-36` ile düğmenin altına girmez.
            "@max-[34rem]/launcher:justify-items-end @max-[34rem]/launcher:bg-transparent",
            "@max-[34rem]/launcher:backdrop-blur-none @max-[34rem]/launcher:[@media(pointer:coarse)]:bg-transparent",
            "@max-[34rem]/launcher:[@media(pointer:coarse)]:backdrop-blur-none",
          )}
        >
          {pending ? (
            /* DURUM DEĞİL, KAPI: "Talep inceleniyor" tıklanabilir ve
               gönderilen talebin kendisini açıyor (ne, ne zaman, gerekçe,
               yöneticinin notu). Talebi gönderdikten sonra kullanıcının
               sorduğu ilk soru "ne yazmıştım / ne oldu" ve cevabı başka
               hiçbir ekranda yok. */
            <button
              type="button"
              onClick={onShowRequest}
              onMouseEnter={() => eyeRef.current?.startAnimation?.()}
              onMouseLeave={() => eyeRef.current?.stopAnimation?.()}
              className={cn(
                "pointer-events-auto inline-flex max-w-full items-center gap-1.5 rounded-full pointer-coarse:min-h-11",
                "border border-amber-500/35 bg-amber-500/[0.14] px-3 py-1.5",
                "text-[0.75rem] font-medium text-amber-700 dark:text-amber-300",
                "shadow-sm transition hover:bg-amber-500/25",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            >
              <AnimatedEyeIcon ref={eyeRef} size={15} className="shrink-0" aria-hidden="true" />
              <span className="min-w-0 truncate">{t("lock.reviewing")}</span>
            </button>
          ) : (
            /* ⚠️ KİLİT DEĞİL GÖNDERİM İKONU: düğme bir DURUM değil bir
               EYLEM, ve kilitli olduğu kartın rozetinde zaten yazıyor. */
            <button
              type="button"
              onClick={onRequest}
              onMouseEnter={() => askRef.current?.startAnimation?.()}
              onMouseLeave={() => askRef.current?.stopAnimation?.()}
              className={cn(
                "pointer-events-auto inline-flex max-w-full items-center gap-1.5 rounded-full pointer-coarse:min-h-11",
                "bg-brand-fill-deep px-3 py-1.5 text-[0.75rem] font-medium text-white",
                "shadow-sm transition hover:brightness-110",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            >
              <AnimatedDiamondIcon ref={askRef} size={15} className="shrink-0" aria-hidden="true" />
              <span className="min-w-0 truncate">{t("lock.requestCta")}</span>
            </button>
          )}
        </div>
      )}
      {!locked && onToggleFavorite && (
        <motion.button
          type="button"
          onClick={onToggleFavorite}
          onMouseEnter={() => heartRef.current?.startAnimation?.()}
          onMouseLeave={() => heartRef.current?.stopAnimation?.()}
          whileTap={{ scale: 0.82 }}
          aria-pressed={favorite}
          aria-label={favorite ? t("favorites.remove") : t("favorites.add")}
          title={favorite ? t("favorites.remove") : t("favorites.add")}
          className={cn(
            "absolute right-2 top-2 z-10 grid size-7 place-items-center rounded-full",
            "transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            // Dokunmatik ekranda hover yok: küçük ekranlarda kalp HER ZAMAN
            // görünür, yalnızca md üstünde hover'a saklanır. Favori olan
            // kalp de her boyutta görünür kalır — durumu gizlemek, kartın
            // favoride olduğunu görünmez yapardı.
            favorite
              ? "text-brand"
              : "text-muted-foreground/50 hover:text-brand md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100",
          )}
        >
          {/* ⚠️ Animasyonlu bileşen `fill` PROP'U ALMIYOR — svg'si `fill="none"`
              sabit ve `...props` sarmalayıcı div'e gidiyor, path'e değil.
              Favori DOLU kalple gösteriliyor ve bu bilgi kaybolamaz, o
              yüzden dolgu sınıfla veriliyor: sarmalayıcıdan içerideki
              path'e ulaşan bir varyant. */}
          <AnimatedFavouriteIcon
            ref={heartRef}
            size={15}
            className={cn("shrink-0", favorite && "[&_path]:fill-current")}
            aria-hidden="true"
          />
        </motion.button>
      )}
    </motion.div>
  )
}
