import { cn } from "@/lib/utils"
import { useGreetingHeading } from "./useGreetingHeading"
import { SkyCard } from "./weather/SkyCard"
import "./weatherDialog.css"
import "./skyCard.css"

// Akışım'ın selamlaması. Hava kartı ve penceresi `weather/` klasöründe: `SkyCard`
// (ön yüz) → `WeatherDialog` (`WeatherHero` · `HourlyStrip` · `StatTiles` ·
// `LocationRow` · `DayList`); biçim `weatherFormat`, saf gün mantığı `weatherDays`.
// İki CSS burada ve bu sırada: kural sırası pencere → kart.

const GREETING_TYPE =
  "text-[length:clamp(2.25rem,11.5cqi,3.25rem)] font-medium leading-[1.05] tracking-[-0.035em]"

/**
 * Düz selamlama (hava okunamazken). ⚠️ Satır sonu ZORUNLU DEĞİL: yer varsa
 * selamlama ile ad yan yana, ad sığmazsa alta. Tek kırılma fırsatı virgülden
 * sonraki boşluk, ad ile "!" arasında boşluk YOK — ünlem alt satıra yalnız düşmez.
 */
function GreetingText({ greeting, firstName }) {
  return (
    <>
      {greeting},{" "}
      <span className="bg-gradient-to-r from-brand-text-from via-brand-text-via to-brand-text-to bg-clip-text text-transparent">
        {firstName}
      </span>
      <span className="text-brand">!</span>
    </>
  )
}

/**
 * Akışım'ın selamlama bloğu: hava okunabiliyorsa Astra'nın kartı (selamlama
 * İÇİNDE), değilse düz selamlama. `w` sayfadan gelir (`useWeather`) — kartın
 * varlığı panonun satır düzenini değiştiriyor ve sayfa onu bilmek zorunda.
 * ⚠️ Düz hâlin `mt-7`si: selamlama ızgaranın üst çizgisine yapışınca "çok
 * yukarıda" okunuyordu.
 *
 * ⚠️ **KUTLAMA GÜNÜ TEBRİK BU KARTTA** (uzun afiş yerine). Kişinin kendi doğum
 * günü / iş yıl dönümü (`celebration`, `lib/myCelebration.js`) başlığı değiştirir
 * — "İyi ki doğdun, Doğukan!" · "Birlikte 5 yıl, Doğukan!" —, konum satırının başına
 * rozeti koyar (pasta · altın "15. yıl") ve göğün iki yan bandına konfeti / altın
 * pırıltı serper (`CardParty`). HAVA DURUMU YERİNDE: eski afiş o gün göğü kaldırıp
 * MET'e hiç gitmiyordu; artık gidiyor, kart her gün aynı kart. Hava okunamazsa
 * düz selamlama da kutlama başlığıyla çizilir.
 */
export function WeatherGreeting({
  w,
  greeting,
  firstName,
  celebration = null,
  plain = false,
  className,
}) {
  const heading = useGreetingHeading(greeting, celebration)
  if (w.status === "off" || w.status === "error") {
    return (
      <h2 className={cn("mt-7", GREETING_TYPE)}>
        <GreetingText greeting={heading} firstName={firstName} />
      </h2>
    )
  }
  // `plain`: selamlamasız kart (Pano'nun "Hava durumu"su) — başlık da kutlama yüzü de yok.
  return (
    <div data-slot="weather-pill" className={cn("flex min-w-0 flex-col", className)}>
      <SkyCard
        w={w}
        greeting={plain ? null : heading}
        firstName={firstName}
        celebration={plain ? null : celebration}
      />
    </div>
  )
}
