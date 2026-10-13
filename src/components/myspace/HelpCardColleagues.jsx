import { motion, useReducedMotion } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import AiChat02Icon from "@hugeicons/core-free-icons/AiChat02Icon"
import Award01Icon from "@hugeicons/core-free-icons/Award01Icon"
import BirthdayCakeIcon from "@hugeicons/core-free-icons/BirthdayCakeIcon"
import PartyIcon from "@hugeicons/core-free-icons/PartyIcon"
import { CelebrateMenu } from "@/components/common/CelebrateMenu"
import { PersonAvatar } from "@/components/common/PersonAvatar"
import { PersonPopover } from "@/components/common/PersonPopover"
import { useLocale } from "@/hooks/useLocale"
import { usePeoplePhotos } from "@/hooks/usePeoplePhotos"
import { firstName } from "@/lib/celebrate"
import { requestOpenChat, setPendingAsk } from "@/lib/chatBus"

const GROUP = 5
const ICON = { birthday: BirthdayCakeIcon, anniversary: Award01Icon }
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
const KICKER = "text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-brand"

/**
 * Yakın çevrenin kutlama günü yardım kartını DEVRALIR: başlık çekilir ve
 * kenardaki maskot bir TEBRİK KARTI uzatır (açılışta maskotun arkasından
 * çıkar; hareketi azaltmada düz).
 *
 * Kart dar (1280'de ~176 px'e iner): yan yana sıkıştırmak yerine dikey ve
 * tekrarsız — "Bugün" yalnız üstte, ad tam genişlikte (iki satıra kadar,
 * kesilmez), eylemler kısa: "Kutla" + TYRO simgesi. Son satır maskotun
 * altında kalmasın diye sağdan boşluklu.
 * - Tek kişi: fotoğraf + "BUGÜN EKİBİNDE / 🎂 Doğum günü", ad, eylemler
 *   ("Kutla" Teams · Outlook · WhatsApp sorar — `CelebrateMenu`).
 * - Birden çok: avatar grubu, "Ece, Mert ve 1 kişi daha", "birini seç".
 * Fotoğrafa/ada gelince kişi kartı açılır (`PersonPopover hover`).
 */
export function HelpCardColleagues({ people }) {
  const { t } = useLocale()
  const reduce = useReducedMotion()
  const photos = usePeoplePhotos(people.slice(0, 8).map((p) => p.mail))
  if (!people.length) return null

  const photoOf = (p) => (p.mail ? photos.get(p.mail.trim().toLowerCase()) : undefined)
  const label = (p) =>
    p.kind === "birthday" ? t("special.birthdayToday") : t("feed.cel.years", { count: p.years })
  const card = (p) => ({
    person: { name: p.name, address: p.mail, title: p.title },
    context: {
      kind: p.kind,
      text: p.kind === "birthday" ? t("feed.cel.today") : label(p),
      years: p.years,
    },
  })
  const heading = t(
    people.every((p) => p.circle === "team")
      ? "myspace.help.today.team"
      : "myspace.help.today.department",
  )
  const props = { photoOf, label, card, heading, t }

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, x: 36, y: 44, rotate: 6, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, y: 0, rotate: reduce ? 0 : -1, scale: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 24, delay: 0.2 }}
      style={{ transformOrigin: "100% 100%" }}
      className="pointer-events-auto relative rounded-[1.25rem] bg-popover/95 p-4 text-popover-foreground shadow-[0_20px_40px_-20px_rgb(0_0_0/0.5)] ring-1 ring-black/5 backdrop-blur-sm"
    >
      {people.length === 1 ? (
        <Single p={people[0]} {...props} />
      ) : (
        <Many people={people} {...props} />
      )}
    </motion.div>
  )
}

function Single({ p, photoOf, label, card, heading, t }) {
  const askTyro = () => {
    setPendingAsk({
      question: t(`myspace.help.cel.prompt.${p.kind}`, { name: p.name, years: p.years ?? "" }),
    })
    requestOpenChat({ focusComposer: true })
  }
  return (
    <PersonPopover hover {...card(p)}>
      {(trigger) => (
        <>
          <div className="flex items-center gap-3">
            <button {...trigger} aria-label={p.name} className={`shrink-0 rounded-full ${FOCUS}`}>
              <span className="grid rounded-full ring-2 ring-brand/60 ring-offset-2 ring-offset-popover">
                <PersonAvatar
                  name={p.name}
                  photo={photoOf(p)}
                  className="size-10 text-[0.8125rem]"
                />
              </span>
            </button>
            <div className="min-w-0">
              <p className={KICKER}>{heading}</p>
              <p className="mt-1 flex items-center gap-1 text-[0.75rem] text-muted-foreground">
                <HugeiconsIcon
                  icon={ICON[p.kind]}
                  className="size-3.5 shrink-0 text-brand"
                  strokeWidth={2}
                  aria-hidden="true"
                />
                <span className="truncate">{label(p)}</span>
              </p>
            </div>
          </div>
          <button
            {...trigger}
            lang="tr"
            className={`mt-3 block w-full rounded-md text-start text-[1.0625rem] font-semibold leading-snug tracking-[-0.01em] hover:underline hover:decoration-brand/40 hover:underline-offset-4 ${FOCUS}`}
          >
            <span className="line-clamp-2 [overflow-wrap:anywhere]">{p.name}</span>
          </button>
          <div className="mt-3.5 flex items-center gap-1.5 pe-14">
            {p.mail && (
              // Kutla: Teams · Outlook · WhatsApp seçimi (kişi kartıyla aynı menü).
              <CelebrateMenu
                person={{ name: p.name, address: p.mail }}
                kind={p.kind}
                years={p.years}
              >
                <button
                  type="button"
                  title={t(`person.celebrate.${p.kind}`)}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-full bg-brand px-3.5 text-[0.75rem] font-semibold text-white shadow-sm transition hover:brightness-110 aria-expanded:brightness-110 ${FOCUS}`}
                >
                  <HugeiconsIcon
                    icon={PartyIcon}
                    className="size-3.5"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                  {t("myspace.help.cel.celebrate")}
                </button>
              </CelebrateMenu>
            )}
            <button
              type="button"
              onClick={askTyro}
              aria-label={t("myspace.help.cel.write")}
              title={t("myspace.help.cel.write")}
              className={`grid size-8 shrink-0 place-items-center rounded-full bg-brand/10 text-brand transition hover:bg-brand/15 ${FOCUS}`}
            >
              <HugeiconsIcon
                icon={AiChat02Icon}
                className="size-4"
                strokeWidth={2}
                aria-hidden="true"
              />
            </button>
          </div>
        </>
      )}
    </PersonPopover>
  )
}

function Many({ people, photoOf, label, card, heading, t }) {
  const shown = people.slice(0, GROUP)
  const extra = people.length - shown.length
  const [a, b] = people.map((p) => firstName(p.name))
  const names =
    people.length === 2
      ? t("myspace.help.cel.namesTwo", { a, b })
      : t("myspace.help.cel.namesMore", { a, b, n: people.length - 2 })
  return (
    <>
      <p className={KICKER}>{heading}</p>
      {/* Avatar grubu: her fotoğraf öncekinin yarısına biner; üstüne gelinen öne çıkar.
          Halka avatarın KENDİSİNDE, düğme `grid`: fotoğraflı avatarda satır payı düğmeyi
          uzatıyor, halka boşluğa sarkıyordu (çift halka; docs/features/anasayfa-kutlamalar.md). */}
      <div className="mt-3 flex items-center -space-x-3">
        {shown.map((p) => (
          <PersonPopover key={`${p.kind}:${p.key}`} hover {...card(p)}>
            {(trigger) => (
              <button
                {...trigger}
                aria-label={`${p.name} · ${label(p)}`}
                title={`${p.name} · ${label(p)}`}
                className="relative grid shrink-0 place-items-center rounded-full transition-[filter] hover:z-10 hover:brightness-95 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <PersonAvatar
                  name={p.name}
                  photo={photoOf(p)}
                  className="block size-9 rounded-full text-[0.6875rem] ring-2 ring-popover"
                />
              </button>
            )}
          </PersonPopover>
        ))}
        {extra > 0 && (
          <span className="relative grid size-9 place-items-center rounded-full bg-muted text-[0.6875rem] font-semibold text-muted-foreground ring-2 ring-popover">
            +{extra}
          </span>
        )}
      </div>
      <p lang="tr" className="mt-3 line-clamp-2 text-[0.9375rem] font-semibold leading-snug">
        {names}
      </p>
      <p className="mt-1 pe-14 text-[0.75rem] leading-snug text-muted-foreground">
        {t("myspace.help.cel.pick")}
      </p>
    </>
  )
}
