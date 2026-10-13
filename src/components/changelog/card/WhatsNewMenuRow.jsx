import { useNavigate } from "react-router-dom"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { useLocale } from "@/hooks/useLocale"
import { useWhatsNewFeed } from "@/hooks/useWhatsNewFeed"
import { ReadingOrb } from "./ReadingOrb"
import { pick } from "../entryText"

/**
 * YENİLİKLER — kullanıcı menüsündeki satır (2026-09-29, istek: *"yenilik mini
 * kartını profil menüsü içine al, yardım butonunun altına, oraya uyarla; ikon
 * yerine küçük gazeteli orb olsun. Yenilik sayısı varsa profil avatarının
 * üstünde göster, profil resmine tıklaması gerektiğini anlasın"*).
 *
 * Sidebar'ın dibindeki kartın (`SidebarWhatsNew`) yerine geçti. Mini kartın
 * üç parçası menü satırına uyarlandı: küre → solda OKUYAN MASKOT (gazeteli,
 * paletten), kaş → satırın adı ("Yenilikler"), başlık → altında en yeni
 * kaydın manşeti; sayaç sağda, menünün öteki sayacıyla (Güvenlik) aynı yerde.
 * Tıklama mini kartınkiyle AYNI: en yeni kaydın çapası (`/whats-new#id`).
 *
 * ⚠️ **SAYI AVATARDA DA VAR** (`NavUser`): menü kapalıyken yeniliği haber
 * veren şey o. Satırdaki sayı NEREDE olduğunu söylüyor — Güvenlik satırının
 * bekleyen talep deseninin aynısı.
 *
 * ⚠️ **TEMBEL.** Maskotun çizicisi giriş paketine BİNMEMELİ (`MascotOrb`un
 * tembel sınırı, bkz. `ReadingOrb.jsx`); satır bu yüzden kartın parçasında ve
 * `NavUser` onu `lazy` ile, menü açılınca yüklüyor. Avatarın üstüne gelmek
 * parçayı önden indiriyor, yani menü açıldığında satır çoğu zaman hazır.
 *
 * ⚠️ Veri kartın AYNI kancasından (`useWhatsNewFeed`): liste "card"
 * yüzeyinden (düzeltmeler hariç), sayı "page" yüzeyinden — rozetle aynı sayı.
 */
export default function WhatsNewMenuRow({ unread = 0 }) {
  const { t, locale } = useLocale()
  const navigate = useNavigate()
  const feed = useWhatsNewFeed(1)
  const entry = feed.entries[0] ?? null
  const latest = entry ? pick(entry.title, locale) : null

  return (
    // `textValue`: menünün harfle atlaması öğenin METNİNİ okuyor ve gazetenin
    // süs yazısı ("tyro · AI") satırın başında duruyor — "Y"ye basan kişi
    // Yenilikler'e düşmezdi.
    <DropdownMenuItem
      textValue={t("whatsNew.title")}
      onClick={() => navigate(entry ? `/whats-new#${entry.id}` : "/whats-new")}
    >
      <span className="wn-menu-orb" aria-hidden="true">
        <ReadingOrb />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span>{t("whatsNew.title")}</span>
        {/* İki satır tavanı; manşetler 3-4 kelime kuralıyla zaten kısa
            (changelog.js), yani pratikte tek satır. */}
        {latest && (
          <span className="line-clamp-2 text-[0.6875rem] leading-snug text-muted-foreground">
            {latest}
          </span>
        )}
      </span>
      {unread > 0 && (
        /* `!text-…`: menü öğesi odakta bütün çocuklarının rengini
           `accent-foreground`a çekiyor; rozetin rakamı kendi zemininde okunur
           kalmalı. */
        <>
          <span
            aria-hidden="true"
            className="ml-auto grid min-w-[1.125rem] shrink-0 place-items-center rounded-full bg-badge px-1 text-[0.6875rem] font-semibold leading-[1.125rem] tabular-nums !text-badge-foreground"
          >
            {unread > 9 ? "9+" : unread}
          </span>
          {/* Çıplak "1" ekran okuyucuda bir şey söylemez. */}
          <span className="sr-only">{t("user.badge.news", { n: unread })}</span>
        </>
      )}
    </DropdownMenuItem>
  )
}
