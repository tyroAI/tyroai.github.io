import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import Award01Icon from "@hugeicons/core-free-icons/Award01Icon"
import BirthdayCakeIcon from "@hugeicons/core-free-icons/BirthdayCakeIcon"
import ChartUpIcon from "@hugeicons/core-free-icons/ChartUpIcon"
import UserAdd01Icon from "@hugeicons/core-free-icons/UserAdd01Icon"
import { PersonAvatar } from "@/components/common/PersonAvatar"
import { PersonPopover } from "@/components/common/PersonPopover"
import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon"
import { Skeleton } from "@/components/ui/skeleton"
import { useLocale } from "@/hooks/useLocale"
import { usePeoplePhotos } from "@/hooks/usePeoplePhotos"
import { usePeopleTitles } from "@/hooks/usePeopleTitles"
import { useMyIdentity } from "@/hooks/useMyCelebration"
import { isMine } from "@/lib/myCelebration"
import { formatAgo } from "@/lib/date"
import { deriveHighlights, peopleRows } from "@/lib/feed"
import { accentColor, FEED_SOURCES } from "@/lib/feedPolicy"
import { cn } from "@/lib/utils"

/**
 * Sağ ray — gündem etiketleri ve akıştan türeyen iki kişi paneli.
 *
 * ⚠️ **KİŞİ PANELLERİ DİZİNDEN OKUMUYOR.** `/users` sorgusu `User.Read.All`
 * isterdi; bu depo yönetici onaylı kapsamları `loginRequest`e KOYMUYOR, çünkü
 * onaysız tek bir kapsam bütün girişi "Approval required" duvarına çeviriyor
 * (msal.js'te yazılı). Üstelik `birthday` alanı Exchange'de çoğu hesapta boş.
 * Paneller bu yüzden AKIŞIN KENDİSİNE bakan bir mercek.
 *
 * ⚠️ **KALIP TUTMAZSA PANEL ÇİZİLMEZ** — "yeni katılan yok" demek,
 * duyurunun nasıl yazıldığını bilmediğimiz hâlde kimsenin katılmadığını
 * iddia etmek olurdu ("soramadık ≠ veri yok").
 *
 * ⚠️ Ray GÖRÜNTÜ ALANI kırılımıyla değil KAPSAYICI sorgusuyla açılıyor
 * (`@[64rem]/feed`): sohbet rıhtımı sayfayı 340px'e kadar daraltabiliyor.
 *
 * ⚠️ **2026-09-20'DE ZENGİNLEŞTİRİLDİ** (istek: *"çok düz ve sade kaldı,
 * kategorileri trendtopic hashtagli yap, daha twitter ve instagram vari…
 * kullanıcıyı boğmadan"*). Eklenen her şey VERİDEN geliyor, süs değil:
 * hashtag etiketin kendi adı, oran çubuğu o etiketin akıştaki payı, avatar
 * duyurunun konusundan okunan ad. YENİ KUTU AÇILMADI — zenginlik satırın
 * içinde, çünkü dört kutuluk bir ray tam da "boğmak" olurdu.
 */

/** "İnsan Kaynakları" → "#İnsanKaynakları" — dört dilde de boşluk sökmek yeter. */
/**
 * Postadan türeyen kişi listesinin HAM tavanı — bir affordans değil, bir
 * emniyet supabı. Görünen tavan üçtür ve gerisi düğmeyle açılır.
 */
const MAX_PEOPLE_ROWS = 50

/**
 * ⚠️ Sonraki kelimelerin baş harfi büyür (`#SanaÖzel`, `#ДляВас`): düz
 * birleştirme "Sana özel"i `#Sanaözel` diye okunmaz yapıyordu. Harf dilin
 * kuralıyla büyür — Türkçede `i` → `İ`.
 */
function hashtag(label, locale) {
  const words = String(label ?? "")
    .trim()
    .split(/\s+/)
  return `#${words.map((w, i) => (i === 0 ? w : w.charAt(0).toLocaleUpperCase(locale) + w.slice(1))).join("")}`
}

function RailSection({ title, icon, meta, children, accentTop }) {
  const { locale } = useLocale()
  return (
    <section className="ms-surface relative overflow-hidden rounded-[1.5rem] p-4">
      {/* Marka saç çizgisi: rayı sayfadan ayıran ve paleti buraya taşıyan
          tek işaret. İkon karesi DEĞİL — Güvenlik sayfasında ölçülmüştü,
          tekrar eden marka karesi hiyerarşiyi düzlüyor. */}
      {accentTop && (
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-brand-from via-brand-via to-brand-to opacity-70"
        />
      )}
      <div className="flex items-center justify-between gap-2">
        <h2
          lang={locale}
          className="flex min-w-0 items-center gap-2 text-[0.9375rem] font-bold tracking-[-0.01em] text-foreground"
        >
          {icon && (
            <HugeiconsIcon
              icon={icon}
              className="size-4 shrink-0 text-muted-foreground"
              strokeWidth={1.9}
            />
          )}
          <span className="truncate">{title}</span>
        </h2>
        {meta != null && (
          <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[0.625rem] font-semibold tabular-nums text-foreground/70">
            {meta}
          </span>
        )}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  )
}

/**
 * Gündem — kanallar hashtag olarak, paylarıyla ve ÇOKTAN AZA sıralı.
 *
 * ⚠️ **SIRA KATALOĞUN DEĞİL SAYININ.** Sabit sıralı bir "trend" listesi
 * trend değildir. Eşitlikte katalog sırası korunur (`sort` kararlı), yani
 * boş bir akışta liste yine tanıdık.
 *
 * ⚠️ **ORAN ÇUBUĞU SÜS DEĞİL ÖLÇÜ** — çentiğin halkasıyla aynı kural.
 * Payda akışta GÖRÜNEN gönderilerin toplamı (her gönderi tam bir etiket
 * taşıyor), yani çubuklar toplamda %100 eder. Sayı yoksa çubuk da yok.
 */
/**
 * ⚠️ **"SANA ÖZEL" DE BİR SATIR** (2026-09-30, sahada: *"sana özel olarak
 * işaretlenmiş akıştaki maddeleri trendler kutusunda göremiyorum"*). Akışım
 * artık işaretli postaları da taşıyor ve kutu yalnız kanalları sayıyordu —
 * listede görünen her dört karttan biri kutuda hiçbir satıra düşmüyordu.
 * Satır bir KANAL değil: süzgeç açmaz, Sana özel bölümüne götürür (orada
 * yeniden basmak Akışım'a döndürür). Çubuğu tek bir kanal tonu değil paletin
 * gradyanı — yeni hue yok, ama kanallarla karışmıyor. Sayısı paydaya girer,
 * yani çubuklar yine %100 eder; sayı yoksa ve bölümde değilsen çizilmez.
 */
export function FeedDiscover({ counts, tag, onTagChange, personal, className }) {
  const { t, locale } = useLocale()
  const [expanded, setExpanded] = useState(false)
  const personalCount = personal ? (counts.personal ?? 0) : 0
  const rows = FEED_SOURCES.map((s) => ({ ...s, count: counts[s.tag] ?? 0 }))
  if (personal && (personalCount > 0 || personal.active))
    rows.push({ tag: "personal", personal: true, count: personalCount })
  const total = rows.reduce((sum, s) => sum + s.count, 0)
  const ranked = rows.sort((a, b) => b.count - a.count)
  /**
   * ⚠️ **İLK ÜÇ KANAL, GERİSİ DÜĞMEYLE** (istek, 2026-09-22) — öteki üç
   * kartın kuralının aynısı, dördüncü kart da aynı dili konuşsun diye.
   *
   * ⚠️ **SIRA ÇOKTAN AZA OLDUĞU İÇİN KIRPMAK GÜVENLİ**: kapalı kartta
   * gizlenenler HER ZAMAN en az gönderisi olan kanallar. Katalog sırasıyla
   * kırpılsaydı gizlenen kanal rastgele olurdu.
   *
   * ⚠️ **SEÇİLİ KANAL GİZLENMEZ.** Bir etiket süzgeci açıkken o kanalın
   * sayısı 0 olabiliyor (sayaçlar yalnız süzgeçsizken hesaplanıyor) ve
   * listenin dibine düşüyor; seçili olduğu hâlde görünmeyen bir satır,
   * kullanıcının hangi süzgeçte olduğunu ekrandan silerdi.
   */
  const isActive = (s) => (s.personal ? Boolean(personal?.active) : tag === s.tag)
  // Sana özel de seçili kanal gibi GİZLENMEZ: istenen şey tam olarak onu görmek.
  const visible = expanded ? ranked : ranked.filter((s, i) => i < 3 || isActive(s) || s.personal)
  const hidden = ranked.length - visible.length

  return (
    <RailSection
      title={t("feed.discover")}
      icon={ChartUpIcon}
      meta={total > 0 ? total : null}
      accentTop
    >
      <ul
        className={cn(
          "flex flex-col gap-0.5",
          expanded && "max-h-[20rem] overflow-y-auto",
          className,
        )}
      >
        {visible.map((s) => {
          const active = isActive(s)
          // Sana özel'deyken "Sana özel" satırı SESSİZ: sayı ve çubuk Akışım'daki
          // kartları sayıyor, o sekmenin kendi sayısıyla karışmasın (satır ve
          // `aria-pressed` duruyor; basmak Akışım'a döndürür).
          const quiet = Boolean(s.personal && active)
          const share = total > 0 ? Math.round((s.count / total) * 100) : 0
          return (
            <li key={s.tag}>
              <button
                type="button"
                onClick={() =>
                  s.personal ? personal.onSelect() : onTagChange(active ? null : s.tag)
                }
                aria-pressed={active}
                className={cn(
                  "w-full rounded-xl px-2 py-1.5 text-left transition",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
                  "[@media(pointer:coarse)]:min-h-11",
                  active ? "bg-brand-soft text-brand-on-soft" : "hover:bg-accent/60",
                )}
              >
                <span className="flex items-baseline gap-2">
                  <span
                    lang={locale}
                    className={cn(
                      "min-w-0 flex-1 truncate text-[0.8125rem] font-semibold tracking-[-0.01em]",
                      !active && "text-foreground/90",
                    )}
                  >
                    {hashtag(
                      t(s.personal ? "feed.section.important" : `feed.tag.${s.tag}`),
                      locale,
                    )}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-[0.6875rem] tabular-nums",
                      active ? "text-brand-on-soft/80" : "text-muted-foreground",
                    )}
                  >
                    {s.count > 0 && !quiet ? s.count : ""}
                  </span>
                </span>
                {/* 3px: ray dar, çubuk okunur olmalı ama satırı büyütmemeli. */}
                {s.count > 0 && !quiet && (
                  <span
                    aria-hidden="true"
                    className="mt-1 block h-[3px] w-full overflow-hidden rounded-full bg-border/70"
                  >
                    <span
                      className="block h-full rounded-full transition-[width] duration-500"
                      style={{
                        width: `${Math.max(share, 4)}%`,
                        background: s.personal
                          ? "linear-gradient(90deg, var(--brand-from), var(--brand-via), var(--brand-to))"
                          : accentColor(s.accent),
                      }}
                    />
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
      {(hidden > 0 || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          lang={locale}
          className="mt-1 w-full rounded-lg px-2 py-1.5 text-[0.6875rem] font-medium text-muted-foreground transition hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [@media(pointer:coarse)]:min-h-9"
        >
          {expanded ? t("feed.cel.showLess") : t("feed.cel.showMore", { count: hidden })}
        </button>
      )}
      {/* Süzgeç açıkken ÇIKIŞI söyleyen satır: etikete ikinci kez basmak da
          temizliyor ama o görünmez bir bilgi.
          ⚠️ Bu düğme "daha fazla göster"in ALTINDA kalır: biri kanal SEÇME
          işine, öteki süzgeçten ÇIKMA işine ait ve ikincisi sonuçtur. */}
      {tag && (
        <button
          type="button"
          onClick={() => onTagChange(null)}
          className="mt-1.5 w-full rounded-lg px-2 py-1 text-left text-[0.6875rem] font-medium text-brand transition hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [@media(pointer:coarse)]:min-h-9"
        >
          {t("feed.showAll")}
        </button>
      )}
    </RailSection>
  )
}

/**
 * "Aramıza yeni katılanlar" / "Doğum günleri".
 *
 * ⚠️ **AD VARSA KİŞİ, YOKSA KONU** (`peopleRows`). Konudan ad ayıklamak uzun
 * süre reddedilmişti; kalıp 2026-09-20'de ÖLÇÜLDÜ ve ayıklama
 * HEPSİ-YA-DA-HİÇBİRİ kuralına bağlandı (`namesFromSubject`). Kalıp
 * tutmayan duyuru eskisi gibi kendi cümlesiyle çiziliyor — bu
 * zenginleştirme hiçbir hâlde bilgi UYDURMUYOR.
 *
 * ⚠️ Avatar tonu `PersonAvatar`ın SABİT paletinden, markadan DEĞİL: aynı
 * kişi palet değişince renk değiştirirse avatar kimlik ipucu olmaktan çıkar.
 */
export function FeedPeople({ kind, posts, now, onOpen }) {
  const { t, locale } = useLocale()
  const [expanded, setExpanded] = useState(false)
  // ⚠️ `now` PROP: `deriveHighlights`in varsayılanı `Date.now()` ve render'da
  // okumak bu depoda yasak (gerekçe FeedPage'te).
  const items = deriveHighlights(posts, kind, now)
  /**
   * ⚠️ **TAVAN `FEED.people.limit` (6) DEĞİL ARTIK** (istek, 2026-09-22:
   * *"aramıza yeni katılanları da ilk 3'ü göster diğer kartlar gibi"*).
   * Kart üç satır gösterip gerisini düğmeyle açıyor, yani altıda kesmenin
   * bir sebebi kalmadı — 6'da kesmek, açılan listeyi de altıyla sınırlardı.
   * `MAX_PEOPLE_ROWS` yalnızca patolojik bir duyuru yığınına karşı tavan.
   * ⚠️ `FEED.people.limit` DOKUNULMADI: `FeedPage`in "hiç kart var mı"
   * kapısı hâlâ onu okuyor ve orada anlamı farklı.
   */
  const all = peopleRows(items, MAX_PEOPLE_ROWS)
  const rows = expanded ? all : all.slice(0, 3)
  const hidden = all.length - rows.length
  // ⚠️ Kanca KOŞULSUZ çağrılır — `rows` boşken de. Erken dönüşün ardına
  // konan bir hook, kural gereği (ve pratikte: liste dolunca sıra
  // değişiyor) React'i düşürürdü.
  // ⚠️ Ünvan yalnız GÖRÜNEN satırlar için sorulur: kapalı kartta altı kişinin
  // dizin sorgusunu ödemenin karşılığı yok.
  const titles = usePeopleTitles(rows.filter((r) => r.isPerson).map((r) => r.label))
  // ⚠️ Boşken HİÇ çizilmez. "Tebrikler" sekmesinde İKİ blok yan yana
  // yaşıyor ve ikisi de boş olabiliyor; orada TEK bir boş durum kartı
  // çağıranda çiziliyor — blok başına bir kart, aynı cümleyi iki kez
  // yazmak olurdu.
  if (!all.length) return null
  const birthday = kind === "birthday"
  return (
    <RailSection
      title={t(birthday ? "feed.birthdays" : "feed.joiners")}
      icon={birthday ? BirthdayCakeIcon : UserAdd01Icon}
      meta={all.length}
    >
      <ul className={cn("flex flex-col gap-0.5", expanded && "max-h-[20rem] overflow-y-auto")}>
        {rows.map((row) => (
          <li key={row.key}>
            {/* ⚠️ KİŞİ SATIRI KİŞİ KARTINI AÇAR, DUYURUYU DEĞİL (2026-10-02,
                istek: *"kişiye tıkladığımızda kişi kartını görelim"*).
                Duyuru kaybolmadı: kartın altındaki "Duyuruyu aç" düğmesi.
                Konu satırı (kişi adı ayıklanamayan duyuru) eskisi gibi
                duyuruyu açar. Adres YOK — kart kişiyi dizinde ADLA arar ve
                tek bir kayda inmezse ayrıntı göstermez. */}
            <PersonPopover
              person={{ name: row.label }}
              side="left"
              context={
                row.isPerson
                  ? {
                      kind: birthday ? "birthday" : "joiner",
                      text: t("person.announced", { when: formatAgo(row.received, locale) }),
                    }
                  : undefined
              }
              extraAction={{
                label: t("person.openPost"),
                icon: ArrowUpRight01Icon,
                onClick: () => onOpen(row.postId),
              }}
            >
              {(trigger) => (
                <button
                  {...(row.isPerson
                    ? trigger
                    : { type: "button", onClick: () => onOpen(row.postId) })}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 aria-expanded:bg-accent/60 [@media(pointer:coarse)]:min-h-11"
                >
                  {/* ⚠️ HALKA YOK. `ring-2` buraya konunca KARE çiziliyordu:
                      `PersonAvatar`ın kökü rozeti konumlandırmak için
                      `relative inline-block` ve yuvarlaklık İÇTEKİ elemanda —
                      yani halka avatarın değil o kutunun kenarını takip ediyordu
                      (sahada görüldü). Yuvarlak avatar zaten yeterli. */}
                  {row.isPerson && (
                    <PersonAvatar name={row.label} className="size-8 shrink-0 text-[0.6875rem]" />
                  )}
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span
                      lang={locale}
                      className={cn(
                        "text-[0.75rem] leading-snug text-foreground/90",
                        row.isPerson
                          ? "truncate font-semibold tracking-[-0.01em]"
                          : "font-medium [overflow-wrap:anywhere]",
                      )}
                    >
                      {row.label || t("feed.noSubject")}
                    </span>
                    {/* ⚠️ ÜNVAN VARSA TARİHİN YERİNE GEÇMEZ, ÜSTÜNE gelir ve
                        tarih bir kademe geriye düşer: "ne iş yapıyor" ile "ne
                        zaman katıldı" iki ayrı soru. Ünvan gelmediyse (kapsam
                        onaylı değil, ad dizinde eşleşmedi) satır bugünküyle
                        birebir aynı kalır. */}
                    {titles.get(row.label) && (
                      <span className="truncate text-[0.6875rem] leading-snug text-muted-foreground">
                        {titles.get(row.label)}
                      </span>
                    )}
                    <span className="text-[0.625rem] text-muted-foreground/80">
                      {formatAgo(row.received, locale)}
                    </span>
                  </span>
                </button>
              )}
            </PersonPopover>
          </li>
        ))}
      </ul>
      {(hidden > 0 || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          lang={locale}
          className="mt-1 w-full rounded-lg px-2 py-1.5 text-[0.6875rem] font-medium text-muted-foreground transition hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [@media(pointer:coarse)]:min-h-9"
        >
          {expanded ? t("feed.cel.showLess") : t("feed.cel.showMore", { count: hidden })}
        </button>
      )}
    </RailSection>
  )
}

/**
 * "Doğum günleri" / "Aramıza yeni katılanlar" — İK ENTITYSİNDEN.
 *
 * ⚠️ **`FeedPeople` İLE AYNI GÖRSEL DİL, AYRI KAYNAK.** Öteki bileşen
 * postaların KONUSUNDAN ad ayıklıyor (bir tahmin); bu, İKnın kendi
 * kütüğünden okuyor (bir olgu). İkisi aynı anda çizilmez — çağıran, veri
 * gelmişse bunu, gelmemişse ötekini gösterir. İkinci bir satır tasarımı
 * yazmak, aynı çekmecede iki görsel dil olurdu.
 *
 * ⚠️ **SATIR KİŞİ KARTINI AÇAR** (2026-10-02). Bir tur "açılacak posta yok,
 * tıklanmaz" diye düz bırakılmıştı; açılacak şey artık kişinin kendisi
 * (`PersonPopover` — ünvan, iletişim, yönetici, Teams'te hazır kutlama).
 *
 * ⚠️ **DOĞUM YILI YOK** — veri katmanı zaten taşımıyor (gerekçe orada).
 */
export function CelebrationPeople({ kind, people }) {
  const { t, locale } = useLocale()
  const [expanded, setExpanded] = useState(false)
  // Gerçek yüzler: görünen satırların fotoğrafı (kişi kartının küçük fotoğrafıyla
  // aynı önbellek). Kanca erken dönüşten ÖNCE — kural gereği.
  const shown = expanded ? (people ?? []) : (people ?? []).slice(0, 3)
  const photos = usePeoplePhotos(shown.map((p) => p.mail).filter(Boolean))
  const photoOf = (mail) => (mail ? photos.get(String(mail).toLowerCase()) : undefined)
  const ids = useMyIdentity()
  if (!people?.length) return null
  const birthday = kind === "birthday"
  const anniversary = kind === "anniversary"
  /**
   * ⚠️ **ÖNCE ÜÇ SATIR, GERİSİ DÜĞMEYLE** (istek, 2026-09-22). Ölçülen
   * pencerede 25 doğum günü olabiliyor; üç kart alt alta durduğu için
   * tamamını açık çizmek ekranı tek karta veriyordu.
   *
   * ⚠️ **DÜĞME İKİNCİ BİR İSTEK ATMAZ — ÖLÇÜLDÜ.** "Önce azını çek, sonra
   * gerisini" denendi ve YANLIŞLANDI: aynı filtreyle 3 günlük pencere
   * 5.396 ms, 14 günlük pencere 5.112 ms — yani maliyet dönen SATIRDA
   * değil, sorgunun 55 yıl-aralığı koşulunda. İkinci bir çekim ikinci bir
   * ~3 saniye olurdu. Veri zaten elde; düğme yalnızca GÖSTERİYOR.
   */
  const rows = expanded ? people : people.slice(0, 3)
  const hidden = people.length - rows.length
  return (
    <RailSection
      title={t(anniversary ? "feed.anniversaries" : birthday ? "feed.birthdays" : "feed.joiners")}
      icon={anniversary ? Award01Icon : birthday ? BirthdayCakeIcon : UserAdd01Icon}
      meta={people.length}
    >
      {/* ⚠️ Tavan YALNIZ açıkken: kapalıyken üç satır zaten kısa, orada bir
          tavan yalnız gereksiz kaydırma çubuğu üretirdi (bir kez ölçüldü).
          ⚠️ `overscroll-contain` YOK — dibe gelince sayfa devam etmeli. */}
      <ul className={cn("flex flex-col gap-0.5", expanded && "max-h-[20rem] overflow-y-auto")}>
        {rows.map((person) => (
          <li key={person.key} className="shrink-0">
            {/* ⚠️ SATIR ARTIK TIKLANIR — kişi kartını açar (2026-10-02). Eski
                "açılacak bir şey yok, tıklanmaz" kuralının gerekçesi kalktı:
                açılacak şey kişinin kendisi. Kart adresle (İK kütüğünün
                `mserp_mail`i) dizine sorar ve kutlama düğmesi bağlamdan gelir. */}
            <PersonPopover
              person={{ name: person.name, address: person.mail, title: person.title }}
              side="left"
              context={{ kind, text: celebrationWhen(t, person, kind), years: person.years }}
            >
              {(trigger) => (
                <button
                  {...trigger}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 aria-expanded:bg-accent/60 [@media(pointer:coarse)]:min-h-11"
                >
                  <PersonAvatar
                    name={person.name}
                    photo={photoOf(person.mail)}
                    className="size-8 shrink-0 text-[0.6875rem]"
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span
                        lang="tr"
                        className="truncate text-[0.75rem] font-semibold leading-snug tracking-[-0.01em] text-foreground/90"
                      >
                        {person.name}
                      </span>
                      {/* Kişinin KENDİSİ (2026-10-02): kartında "Kutla" yerine
                          "Senin günün" yazar — bkz. `PersonCard`. */}
                      {isMine(ids, person.mail) && (
                        <span
                          lang={locale}
                          className="shrink-0 rounded-full bg-brand/[0.1] px-1.5 py-px text-[0.5625rem] font-semibold uppercase tracking-[0.04em] text-brand-text"
                        >
                          {t("person.you")}
                        </span>
                      )}
                    </span>
                    {person.title && (
                      <span
                        lang="tr"
                        className="truncate text-[0.6875rem] leading-snug text-muted-foreground"
                      >
                        {person.title}
                      </span>
                    )}
                    <span lang={locale} className="text-[0.625rem] text-muted-foreground/80">
                      {isMine(ids, person.mail) && person.inDays === 0 && kind !== "joiner"
                        ? kind === "anniversary"
                          ? `${t("feed.cel.years", { count: person.years })} · ${t("person.selfDay")}`
                          : t("person.selfDay")
                        : celebrationWhen(t, person, kind)}
                    </span>
                  </span>
                </button>
              )}
            </PersonPopover>
          </li>
        ))}
      </ul>
      {(hidden > 0 || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          lang={locale}
          className="mt-1 w-full rounded-lg px-2 py-1.5 text-[0.6875rem] font-medium text-muted-foreground transition hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [@media(pointer:coarse)]:min-h-9"
        >
          {expanded ? t("feed.cel.showLess") : t("feed.cel.showMore", { count: hidden })}
        </button>
      )}
    </RailSection>
  )
}

/**
 * Satırın tarih cümlesi.
 *
 * ⚠️ **SAYIDAN BAĞIMSIZ KALIP YOK — 0 ve 1 KENDİ CÜMLESİNİ ALIYOR.** Sözlükte
 * çoğul motoru yok; "in 1 days" yazmamanın yolu bugün ve yarını ayrı
 * anahtarlara bağlamak, kalan n her iki dilde de çoğul.
 */
function celebrationWhen(t, person, kind) {
  if (kind === "joiner") {
    const n = person.agoDays
    if (n === 0) return t("feed.cel.joinedToday")
    if (n === 1) return t("feed.cel.joinedYesterday")
    return t("feed.cel.joinedAgo", { count: n })
  }
  const n = person.inDays
  const when =
    n === 0
      ? t("feed.cel.today")
      : n === 1
        ? t("feed.cel.tomorrow")
        : t("feed.cel.inDays", { count: n })
  // ⚠️ Yıl dönümünde KAÇINCI YIL asıl haber, tarih onun niteleyicisi —
  // o yüzden yıl ÖNCE yazılıyor ("15. yıl · 3 gün sonra").
  return kind === "anniversary" ? `${t("feed.cel.years", { count: person.years })} · ${when}` : when
}

/**
 * Tebrikler kartlarının YÜKLENİYOR hâli.
 *
 * ⚠️ **NEDEN VAR — ÖLÇÜLMÜŞ SÜRE.** İK sanal entity'si 530 satırı ~12
 * saniyede döndürüyor (ilk koşuda ~171). O süre boyunca kart HİÇ
 * çizilmiyordu ve veri gelince ekran birden değişiyordu: kullanıcının
 * gördüğü "çok geç geliyor" tam olarak bu sessiz bekleme.
 *
 * ⚠️ **İSKELET, POSTADAN TÜRETİLEN LİSTE DEĞİL.** Yedek liste yalnız yetki
 * REDDEDİLDİĞİNDE çiziliyor; yüklenirken onu gösterip sonra İK listesiyle
 * DEĞİŞTİRMEK, aynı kartta iki farklı kişi kümesi göstermek olurdu.
 *
 * ⚠️ İskelet `aria-hidden`: ekran okuyucuya boş satır saydırmanın anlamı
 * yok, durumu çağıranın `aria-live` bölgesi söylüyor.
 */
export function CelebrationSkeleton({ kind }) {
  const { t } = useLocale()
  const anniversary = kind === "anniversary"
  const birthday = kind === "birthday"
  return (
    <RailSection
      title={t(anniversary ? "feed.anniversaries" : birthday ? "feed.birthdays" : "feed.joiners")}
      icon={anniversary ? Award01Icon : birthday ? BirthdayCakeIcon : UserAdd01Icon}
    >
      <div className="flex flex-col gap-0.5" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2.5 px-2 py-1.5">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-2.5 w-28" />
              <Skeleton className="h-2 w-20" />
            </div>
          </div>
        ))}
      </div>
    </RailSection>
  )
}
