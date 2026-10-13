import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import AiChat02Icon from "@hugeicons/core-free-icons/AiChat02Icon"
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon"
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon"
import BubbleChatIcon from "@hugeicons/core-free-icons/BubbleChatIcon"
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import ColorsIcon from "@hugeicons/core-free-icons/ColorsIcon"
import DashboardCircleIcon from "@hugeicons/core-free-icons/DashboardCircleIcon"
import FavouriteIcon from "@hugeicons/core-free-icons/FavouriteIcon"
import Mail01Icon from "@hugeicons/core-free-icons/Mail01Icon"
import Robot01Icon from "@hugeicons/core-free-icons/Robot01Icon"
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon"
import UserCircleIcon from "@hugeicons/core-free-icons/UserCircleIcon"
import { Kbd } from "@/components/ui/kbd"
import { useLocale } from "@/hooks/useLocale"
import { usePageAccess } from "@/hooks/usePageAccess"
import { PwaInstallButton } from "@/components/common/PwaInstallButton"
import { cn } from "@/lib/utils"

/**
 * ⚠️ TÜRKÇE ARAMADA `toLowerCase()` TEK BAŞINA YETMEZ.
 *
 * Üç ayrı tuzak var ve üçü de bu sayfanın metinlerinde FİİLEN geçiyor:
 *
 *  1. `"İ".toLowerCase()` → `i` + U+0307 (birleşen nokta). Yani "İzin"
 *     küçültülünce düz `"izin"` ile eşleşmez. Birleşen işaretler bu yüzden
 *     NFD'ye ayrıştırılıp atılıyor.
 *  2. `"I".toLowerCase()` → `i`, ama Türkçe'de karşılığı `ı`. Kullanıcı
 *     klavyesinde İngilizce kip varsa "kisayol" yazar; metinde "kısayol"
 *     geçer. `ı → i` katlaması bu ikisini birleştiriyor.
 *  3. Şapkalı/aksanlı harfler: "gorunum" yazan biri "Görünüm"ü bulamaz.
 *     `ş ğ ü ö ç â î û` hepsi ASCII karşılığına katlanıyor.
 *
 * Katlama SADECE aramada; ekranda yazan metin hiç değişmiyor.
 */
const TR_FOLD = { ı: "i", ş: "s", ğ: "g", ü: "u", ö: "o", ç: "c", â: "a", î: "i", û: "u" }

function norm(value) {
  return (
    (value ?? "")
      // `toLocaleLowerCase("tr")` DEĞİL, sade `toLowerCase()`. Ölçüldü (11
      // sorgu × 8 metin): aşağıdaki katlamadan SONRA ikisi birebir aynı
      // sonucu veriyor — Türkçe kipin tek farkı `I → ı` ve o da zaten
      // `ı → i` ile katlanıyor. Sayfa dört dilde yaşıyor; bir Rus
      // kullanıcının aramasını Türkçe harf kurallarına bağlamak gereksiz.
      .toLowerCase()
      .normalize("NFD")
      // Birleşen işaretleri at (U+0300–U+036F): "İ" küçültmesinin bıraktığı
      // nokta da, Rusça/Arapça harekeler de buraya düşer. Sınıf KAÇIŞ
      // DİZİSİYLE yazılı — kaynağa çıplak birleşen karakter koymak, dosyayı
      // açan editörün onu bir önceki harfe yapıştırmasına açık kapı bırakır.
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[ışğüöçâîû]/g, (c) => TR_FOLD[c] ?? c)
      .trim()
  )
}

function GuideCard({ icon, title, description, index, onOpen }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2 }}
      onClick={onOpen}
      role={onOpen ? "link" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onKeyDown={onOpen ? (e) => (e.key === "Enter" || e.key === " ") && onOpen() : undefined}
      className={cn(
        "group relative flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:border-brand/40 hover:shadow-lg",
        onOpen && "cursor-pointer",
      )}
    >
      <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-on-soft">
        <HugeiconsIcon icon={icon} className="size-5" strokeWidth={1.6} />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold leading-tight">{title}</h3>
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </motion.div>
  )
}

function FaqItem({ question, answer, isOpen, onToggle, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className="border-b border-border last:border-b-0"
    >
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex w-full min-h-11 items-center justify-between gap-3 py-4 text-left transition",
          "hover:text-brand",
        )}
      >
        <span className="text-sm font-medium leading-snug">{question}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"
        >
          <HugeiconsIcon icon={ArrowDown01Icon} className="size-3.5" strokeWidth={2} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-5 pr-2 text-sm leading-relaxed text-muted-foreground sm:pr-12">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function HelpPage() {
  const { t, locale } = useLocale()
  const [openFaq, setOpenFaq] = useState(0)
  const [query, setQuery] = useState("")
  // Aramada eşleşenlerin hepsi AÇIK gelir; kullanıcı bir tanesini yine de
  // kapatabilsin diye açık olanı değil, KAPATILANI tutuyoruz. Sorgu
  // değişince sıfırlanır — yeni bir arama, önceki aramanın kapattığı
  // satırları miras almamalı.
  const [collapsed, setCollapsed] = useState(() => new Set())
  const inputRef = useRef(null)

  function handleQuery(next) {
    setQuery(next)
    setCollapsed(new Set())
  }

  /** Çipten gelen arama: kutuyu doldur ve odağı da oraya taşı. */
  function searchFor(term) {
    handleQuery(term)
    inputRef.current?.focus()
  }

  // `/` kutuya atlar. `useHotkey` BİLEREK kullanılmadı: o kanca
  // `preventDefault()`u koşulsuz çağırıyor ve yazı alanlarını ayırt etmiyor,
  // yani /help açıkken sohbet dock'unun bestecisine (ki dock bu sayfanın
  // YANINDA açık olabilir) "/" yazmak imkânsız hâle gelirdi. Buradaki
  // dinleyici hedef bir yazı alanıysa hiç karışmıyor ve değiştirici tuş
  // basılıysa da (Ctrl+/ gibi tarayıcı kısayolları) çekiliyor.
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return
      const el = event.target
      const tag = el?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) return
      event.preventDefault()
      inputRef.current?.focus()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const navigate = useNavigate()
  const { canOpen } = usePageAccess()

  // Kılavuzlar bugünkü uygulamayı anlatıyor: sohbet + yan panel, başlatıcı,
  // favoriler, Graph panelleri, katalog yönetimi, arama/kısayollar, görünüm
  // ve profil. Bir SAYFAYI anlatan kart o sayfaya GİDİYOR — yalnızca
  // uygulamadan bahseden bir yardım sayfası, okuyanı yolu kendi bulmaya
  // zorlar (tyroTrade'den alınan kural, 2026-09-08).
  //
  // Rotası olmayan iki kart bilinçli: takvim/posta/dosya panelleri ve arama
  // header'da yaşıyor, ayrı bir adresleri yok. Onlara sahte bir hedef
  // vermektense tıklanmaz bırakmak dürüst.
  const guides = [
    {
      icon: AiChat02Icon,
      to: "/chat",
      title: t("help.guides.chat.title"),
      description: t("help.guides.chat.body"),
    },
    {
      icon: DashboardCircleIcon,
      to: "/dashboard",
      title: t("help.guides.launcher.title"),
      description: t("help.guides.launcher.body"),
    },
    {
      icon: FavouriteIcon,
      to: "/dashboard",
      title: t("help.guides.favorites.title"),
      description: t("help.guides.favorites.body"),
    },
    {
      icon: Calendar03Icon,
      title: t("help.guides.panels.title"),
      description: t("help.guides.panels.body"),
    },
    // Katalog yönetimi artık Profilim → Asistanlar sekmesinde (yalnız
    // yönetici). Kart /settings'e gidiyordu; o adres bugün yalnız bir
    // yönlendirme, doğrudan hedefe gitmek bir tur atlatıyor.
    {
      icon: Robot01Icon,
      to: "/profile?tab=catalog",
      title: t("help.guides.agents.title"),
      description: t("help.guides.agents.body"),
    },
    {
      icon: Search01Icon,
      title: t("help.guides.search.title"),
      description: t("help.guides.search.body"),
    },
    // Görünüm & Dil artık bir SAYFAYA gidiyor: üç tercihin (tema, palet, dil)
    // hepsi Profilim → Tercihler'de bir arada duruyor, header'daki üç küçük
    // ikon da aynı yere yazıyor.
    {
      icon: ColorsIcon,
      to: "/profile?tab=preferences",
      title: t("help.guides.theme.title"),
      description: t("help.guides.theme.body"),
    },
    {
      icon: UserCircleIcon,
      to: "/profile",
      title: t("help.guides.profile.title"),
      description: t("help.guides.profile.body"),
    },
  ]

  const faqs = [
    { question: t("help.faq.q1"), answer: t("help.faq.a1") },
    { question: t("help.faq.q2"), answer: t("help.faq.a2") },
    { question: t("help.faq.q3"), answer: t("help.faq.a3") },
    { question: t("help.faq.q4"), answer: t("help.faq.a4") },
    { question: t("help.faq.q5"), answer: t("help.faq.a5") },
    { question: t("help.faq.q6"), answer: t("help.faq.a6") },
    { question: t("help.faq.q7"), answer: t("help.faq.a7") },
    { question: t("help.faq.q8"), answer: t("help.faq.a8") },
    { question: t("help.faq.q9"), answer: t("help.faq.a9") },
  ]

  // POPÜLER çipleri: tek tıkla kutuyu dolduran aramalar. Rastgele seçilmiş
  // kelimeler DEĞİL — beşinin de sonuç döndürdüğü dört dilde tek tek
  // ölçüldü, çünkü sonuç döndürmeyen bir "popüler" çipi kullanıcıya
  // aramanın bozuk olduğunu söyler. "bildirim" ölçümde 0 dönüyordu ve
  // düzeltmesi çipi atmak değil EKSİĞİ KAPATMAK oldu: 9. SSS (yanıt
  // bildirimleri → Profilim → Bildirimler) bu turda eklendi.
  const popular = [1, 2, 3, 4, 5].map((i) => t(`help.popular.${i}`))

  // Arama BAŞLIK + GÖVDE üzerinde çalışıyor, yalnızca başlık üzerinde değil:
  // "Mail.Read" ya da "?authdebug=1" gibi aranacak şeylerin hepsi cevabın
  // İÇİNDE geçiyor, sorunun içinde değil. Boşlukla ayrılmış her kelime
  // ayrı ayrı aranıyor ve HEPSİ tutmalı (AND) — "kilitli asistan" iki
  // kelimeyle daralsın, iki katı sonuç getirmesin.
  const terms = norm(query).split(/\s+/).filter(Boolean)
  const searching = terms.length > 0
  const matches = (text) => terms.every((term) => norm(text).includes(term))

  // Kapalı sayfayı anlatan kılavuz (ör. yalnız yöneticilere açık Çözümler) gösterilmez.
  const shownGuides = guides.filter(
    (g) => (!g.to || canOpen(g.to)) && (!searching || matches(`${g.title} ${g.description}`)),
  )
  const indexedFaqs = faqs.map((f, i) => ({ ...f, key: i }))
  const shownFaqs = searching
    ? indexedFaqs.filter((f) => matches(`${f.question} ${f.answer}`))
    : indexedFaqs

  const hits = shownGuides.length + shownFaqs.length

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-10 overflow-y-auto px-3 pb-12 pt-6 sm:gap-12 sm:px-4 sm:pb-16 sm:pt-8 lg:px-6">
      {/* Hero */}
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-4"
      >
        <div className="space-y-2">
          {/* Kaş başlık. Anahtar (`help.eyebrow`) dört sözlükte de vardı ama
              hiçbir yerde çizilmiyordu. `lang` ŞART: CSS ile büyütülen
              "Yardım Merkezi" Türkçe kipte "YARDIM MERKEZİ" olmalı. */}
          <p
            lang={locale}
            className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70"
          >
            {t("help.eyebrow")}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
            {t("help.title")}
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
            {t("help.subtitle")}
          </p>
        </div>

        {/* ── ARAMA ──────────────────────────────────────────────────────
            Sayfa sekiz kılavuz + sekiz SSS taşıyor ve cevapların çoğu
            AÇILMAMIŞ bir akordeonun içinde: "Mail.Read" ya da "?authdebug=1"
            arayan biri Ctrl+F ile bile bulamıyordu, çünkü kapalı akordeonun
            metni DOM'da yok. O yüzden arama gövdeleri de tarıyor ve eşleşen
            SSS'i AÇIK getiriyor.

            Header'daki aramanın yerine geçmiyor: o SAYFALARA gider, bu sayfa
            İÇİNDE arar. İkisi farklı sorular. */}
        <div className="max-w-2xl space-y-2.5">
          <div className="relative">
            <HugeiconsIcon
              icon={Search01Icon}
              className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              strokeWidth={1.8}
            />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => handleQuery(e.target.value)}
              aria-label={t("help.search.aria")}
              aria-describedby="help-search-hint"
              placeholder={t("help.search.placeholder")}
              // text-base (16px): iOS Safari daha küçük bir yazı tipinde
              // odaklanınca sayfayı otomatik yakınlaştırıyor.
              className={cn(
                "h-14 w-full rounded-2xl border border-border bg-card pl-11 pr-12 text-base outline-none transition sm:text-[0.9375rem]",
                "placeholder:text-muted-foreground/70",
                "focus-visible:border-brand/50 focus-visible:ring-2 focus-visible:ring-brand/20",
                // Safari'nin kendi temizleme çarpısı bizimkinin üstüne biniyordu.
                "[&::-webkit-search-cancel-button]:hidden",
              )}
            />
            {query ? (
              <button
                type="button"
                onClick={() => handleQuery("")}
                aria-label={t("help.search.clear")}
                className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition hover:bg-foreground/[0.06] hover:text-foreground"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="size-4" strokeWidth={2} />
              </button>
            ) : (
              // Kısayol rozeti yalnızca kutu BOŞKEN görünür; doluyken aynı
              // yeri temizleme düğmesi alıyor ve iki şeyi üst üste koymak
              // ikisini de okunmaz yapardı. `aria-hidden`: kısayolun sözlü
              // karşılığı zaten ipucu satırında ve o satır input'a
              // `aria-describedby` ile bağlı.
              <Kbd
                aria-hidden="true"
                className="absolute right-3 top-1/2 hidden -translate-y-1/2 border border-border/70 bg-muted/60 sm:inline-flex"
              >
                /
              </Kbd>
            )}
          </div>

          {/* İpucu satırı: aramanın NEYİ taradığını ve kısayolu söyler.
              Kutunun içine sığmaz, ama input ona `aria-describedby` ile
              bağlı olduğu için ekran okuyucu odakta bunu da okur. */}
          <p id="help-search-hint" className="text-xs text-muted-foreground/80">
            {t("help.search.hint")}
          </p>

          {/* POPÜLER — boş bir arama kutusu "ne yazsam?" sorusunu doğuruyor;
              çipler o soruyu tek tıkla cevaplıyor ve aynı zamanda sayfanın
              NE kapsadığını da gösteriyor. Arama yapılırken gizleniyor:
              sonuçların üstünde duran bir öneri şeridi, sonucu okumaya
              çalışan kullanıcıyı yeniden başa çağırır. */}
          {!searching ? (
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <span
                lang={locale}
                className="text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60"
              >
                {t("help.popular")}
              </span>
              {popular.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => searchFor(term)}
                  className={cn(
                    "rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground/80 transition",
                    "hover:border-brand/40 hover:bg-brand-soft/30 hover:text-brand-on-soft",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
                  )}
                >
                  {term}
                </button>
              ))}
            </div>
          ) : (
            <p aria-live="polite" className="text-xs text-muted-foreground">
              {t("help.search.count", { count: hits })}
            </p>
          )}
        </div>
      </motion.header>

      {/* Arama hiçbir şey tutmadıysa: bölümleri boş başlıklarla bırakmak
          yerine tek bir açık cümle. Destek bölümü AŞAĞIDA duruyor — cevabı
          bulunamayan kullanıcının gideceği yer, aramanın filtreleyip
          gizleyeceği son şey olmalı. */}
      {searching && hits === 0 ? (
        <section className="rounded-2xl border border-dashed border-border bg-card/40 px-5 py-8 text-center">
          <p className="text-sm font-medium">{t("help.search.empty")}</p>
          <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-muted-foreground">
            {t("help.search.emptyHint")}
          </p>
        </section>
      ) : null}

      {/* Quick guides */}
      {shownGuides.length > 0 ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-base font-semibold tracking-tight">{t("help.sections.guides")}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("help.sections.guidesSubtitle")}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {shownGuides.map(({ to, ...g }, i) => (
              <GuideCard
                key={g.title}
                {...g}
                index={i}
                onOpen={to ? () => navigate(to) : undefined}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* FAQ */}
      {shownFaqs.length > 0 ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-base font-semibold tracking-tight">{t("help.sections.faq")}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{t("help.sections.faqSubtitle")}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card px-5">
            {shownFaqs.map((f, i) => (
              <FaqItem
                key={f.key}
                question={f.question}
                answer={f.answer}
                // Aramada eşleşen satır AÇIK gelir: kullanıcı zaten cevabın
                // içindeki bir kelimeyi aradı, kapalı bir başlık ona
                // "bulundu" demez, bir tık daha ister. Arama yokken eski
                // davranış — yalnızca seçili olan açık.
                isOpen={searching ? !collapsed.has(f.key) : openFaq === f.key}
                onToggle={() => {
                  if (!searching) {
                    setOpenFaq(openFaq === f.key ? -1 : f.key)
                    return
                  }
                  setCollapsed((prev) => {
                    const next = new Set(prev)
                    if (next.has(f.key)) next.delete(f.key)
                    else next.add(f.key)
                    return next
                  })
                }}
                index={i}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Support — arama ne olursa olsun DURUR, bkz. yukarıdaki gerekçe. */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight">{t("help.sections.support")}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("help.sections.supportSubtitle")}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SupportCard
            icon={Mail01Icon}
            title={t("help.support.email.title")}
            value={t("help.support.email.value")}
            href={`mailto:${t("help.support.email.value")}`}
          />
          {/* Teams, Slack değil — deeplink destek kutusuyla bir sohbet açıyor,
              yani kart bir şey YAPIYOR. Önceki Slack kartı `href="#"` idi ve
              bu tenant'ta hiç var olmamış bir kanalı işaret ediyordu. */}
          <SupportCard
            icon={BubbleChatIcon}
            title={t("help.support.teams.title")}
            value={t("help.support.teams.value")}
            href={`https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(t("help.support.email.value"))}`}
          />
        </div>
        <PwaInstallButton className="mt-3" />
      </section>
    </div>
  )
}

function SupportCard({ icon, title, value, href }) {
  return (
    <motion.a
      href={href}
      whileHover={{ y: -2 }}
      className="group flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:border-brand/40 hover:shadow-lg"
    >
      <div className="flex items-center gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-from via-brand-via to-brand-to text-brand-on-brand shadow-sm">
          <HugeiconsIcon icon={icon} className="size-5" strokeWidth={1.6} />
        </div>
        <div className="space-y-0.5">
          <p className="text-sm font-semibold leading-tight">{title}</p>
          <p className="text-xs text-muted-foreground">{value}</p>
        </div>
      </div>
      <HugeiconsIcon
        icon={ArrowRight01Icon}
        className="size-4 text-muted-foreground/40 transition group-hover:translate-x-0.5 group-hover:text-brand"
      />
    </motion.a>
  )
}
