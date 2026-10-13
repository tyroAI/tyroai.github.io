import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import AiChat02Icon from "@hugeicons/core-free-icons/AiChat02Icon"
import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon"
import Award01Icon from "@hugeicons/core-free-icons/Award01Icon"
import BirthdayCakeIcon from "@hugeicons/core-free-icons/BirthdayCakeIcon"
import PartyIcon from "@hugeicons/core-free-icons/PartyIcon"
import UserAdd01Icon from "@hugeicons/core-free-icons/UserAdd01Icon"
import { PersonActions } from "@/components/common/PersonActions"
import { PersonAvatar } from "@/components/common/PersonAvatar"
import { PersonDetails } from "@/components/common/PersonDetails"
import { useLocale } from "@/hooks/useLocale"
import { useMyIdentity } from "@/hooks/useMyCelebration"
import { isMine } from "@/lib/myCelebration"
import { usePeoplePhotos } from "@/hooks/usePeoplePhotos"
import { usePersonProfile } from "@/hooks/usePersonProfile"
import { usePresence } from "@/hooks/usePresence"
import { firstName } from "@/lib/celebrate"
import { CelebrateMenu } from "@/components/common/CelebrateMenu"
import { requestOpenChat, setPendingAsk } from "@/lib/chatBus"
import { PERSON } from "@/lib/personDirectory"
import { cn } from "@/lib/utils"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  KİŞİ KARTI — Outlook'un kişi kartı gibi (2026-10-02)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * İstek: *"Keşfet sayfasında kişiye tıkladığımızda kişi kartını görelim —
 * doğum günleri, iş yıl dönümleri, maillerdeki kişiler, keza toplantı
 * katılımcıları."*
 *
 * Üstte foto (canlı durum noktasıyla) · ad · ünvan · departman/ofis; bağlam
 * varsa (doğum günü, yıl dönümü, yeni katılan) bir şerit ve Teams'te hazır
 * mesajla açılan bir KUTLA düğmesi; dört eylem (Sohbet · E-posta · Ara ·
 * Toplantı); iletişim satırları; yönetici (basınca kart ONA geçer, geri ok
 * döner); TYRO'ya sor.
 *
 * ⚠️ **EYLEMLER BAĞLANTI, UYGULAMA İÇİ İŞLEM DEĞİL** (`PersonActions`). Kutlama
 * mesajı `message=` ile HAZIR gelir ama GÖNDERİLMEZ — kullanıcı Teams'te görüp
 * kendisi basar.
 *
 * ⚠️ **SORAMADIK ≠ YOK.** Dizin okunamadıysa (izin yok · ağ) kart çağıranın
 * bildiğini (ad, adres) ve eylemleri yine gösterir, altında bir satırla
 * nedenini söyler; "şirket dizininde yok" yalnız dizin gerçekten öyle
 * dediğinde yazılır.
 *
 * ⚠️ **İKİ KULLANIM.** `PersonPopover` bir tetiğe bağlı açılır kart (Keşfet,
 * özel günler); `PersonCard` ise bir kartın İÇİNDE görünüm değiştirmek için
 * (toplantı kartı — fareyle açılan bir kartın içinde ikinci bir açılır kart
 * açmak, imleç ikisinin arasından geçerken ikisini de kapatırdı).
 */

const KIND_ICON = { birthday: BirthdayCakeIcon, anniversary: Award01Icon, joiner: UserAdd01Icon }

/**
 * Kartın kendisi. `onBack` verilirse başta bir geri satırı çizilir
 * (toplantı kartından açıldığında "Toplantıya dön").
 */
export function PersonCard({
  person,
  context,
  extraAction,
  onBack,
  backLabel,
  onDone,
  focusBack = false,
}) {
  const { t } = useLocale()
  // Yöneticiye geçiş bir YIĞIN: geri ok bir önceki kişiye, en baştaysa çağırana döner.
  const [stack, setStack] = useState([])
  const current = stack.length ? stack[stack.length - 1] : person
  const isRoot = stack.length === 0
  const back = isRoot ? onBack : () => setStack((s) => s.slice(0, -1))

  return (
    <div className="text-[0.75rem]">
      {back && (
        <button
          type="button"
          // Basılan katılımcı düğmesi söküldü; odak boşa düşmesin, geri satırına gelsin.
          autoFocus={focusBack && isRoot}
          onClick={back}
          className="flex w-full items-center gap-1.5 border-b border-border/70 px-3.5 py-2 text-left text-[0.71875rem] font-semibold text-muted-foreground transition hover:bg-accent/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40 [@media(pointer:coarse)]:min-h-11"
        >
          <HugeiconsIcon
            icon={ArrowLeft01Icon}
            className="size-3.5"
            strokeWidth={2}
            aria-hidden="true"
          />
          {isRoot ? (backLabel ?? t("person.back")) : t("person.back")}
        </button>
      )}
      <PersonBody
        // Kişi değişince iç durum (kopyalandı işareti) sıfırlansın.
        key={`${current.address ?? ""}|${current.name ?? ""}`}
        person={current}
        context={isRoot ? context : null}
        extraAction={isRoot ? extraAction : null}
        onManager={(m) =>
          setStack((s) => [...s, { name: m.name, address: m.address, title: m.title }])
        }
        onDone={onDone}
      />
    </div>
  )
}

function PersonBody({ person, context, extraAction, onManager, onDone }) {
  const { t, locale } = useLocale()
  const res = usePersonProfile(person, true)
  const ready = res.status === PERSON.ready
  const loading = res.status === PERSON.loading
  const p = ready ? res.profile : null

  const name = p?.name || person.name || person.address || ""
  const address = p?.address || String(person.address ?? "").toLowerCase()
  const upn = p?.upn || address
  const title = p?.title ?? (ready ? null : (person.title ?? null))
  const where = [p?.department, p?.office].filter(Boolean).join(" · ")

  // Küçük foto modül önbelleğinden ANINDA (satırın avatarıyla aynı kayıt);
  // büyüğü profil gelince yerine geçer.
  const small = usePeoplePhotos(address ? [address] : [])
  const photo = p?.photo ?? small.get(address)
  const presence = usePresence(upn ? [upn] : []).get(upn)

  const given = p?.givenName || firstName(name)
  // ⚠️ KENDİ KARTINDA "KUTLA" YOK: kişi kendi gününde tarih hapında ve
  // Keşfet'te kendini görüyor ve düğme ona kendisiyle bir Teams sohbeti
  // açıyordu. Yerinde "Senin günün" yazar.
  const ids = useMyIdentity()
  const self = isMine(ids, address) || isMine(ids, upn)

  function ask() {
    setPendingAsk({
      question: t("person.askPrompt", { who: address ? `${name} (${address})` : name }),
      agent: "tyro office",
    })
    onDone?.()
    requestOpenChat({ focusComposer: true })
  }

  const note =
    !ready && !loading
      ? res.status === PERSON.notFound
        ? t("person.notFound")
        : res.status === PERSON.ambiguous
          ? t("person.ambiguous")
          : res.status === PERSON.unauthenticated
            ? null
            : t("person.error")
      : p?.limited
        ? t("person.limited")
        : null
  const canRetry = res.status === PERSON.error || res.status === PERSON.denied

  return (
    <div>
      {/* BAŞ — paletin hafif bir yıkaması: kart bir kişiyi anlatıyor, bir
          duyuruyu değil; marka tonu yalnız zeminde ve gliflerde. */}
      <div className="relative bg-gradient-to-b from-brand/[0.09] to-transparent px-4 pb-3 pt-4">
        <div className="flex items-start gap-3">
          <PersonAvatar
            name={name}
            photo={photo}
            presence={presence}
            presenceLabel={presence ? t(`calendar.presence.${presence}`) : undefined}
            className="size-14 text-[0.9375rem] [&>span:first-of-type]:text-[0.9375rem]"
          />
          <div className="min-w-0 flex-1 pt-0.5">
            <p
              lang="tr"
              className="text-[0.9375rem] font-semibold leading-snug tracking-[-0.01em] [overflow-wrap:anywhere]"
            >
              {name}
            </p>
            {loading ? (
              <span
                aria-hidden="true"
                className="ms-skeleton mt-1.5 block h-3 w-36 max-w-full rounded-full"
              />
            ) : (
              title && (
                <p
                  lang="tr"
                  className="mt-0.5 text-[0.75rem] leading-snug text-foreground/75 [overflow-wrap:anywhere]"
                >
                  {title}
                </p>
              )
            )}
            {loading ? (
              <span
                aria-hidden="true"
                className="ms-skeleton mt-1.5 block h-2.5 w-28 max-w-full rounded-full"
              />
            ) : (
              where && (
                <p
                  lang="tr"
                  className="mt-0.5 text-[0.6875rem] leading-snug text-muted-foreground [overflow-wrap:anywhere]"
                >
                  {where}
                </p>
              )
            )}
            {presence && (
              <p className="mt-1 flex items-center gap-1.5 text-[0.6875rem] font-medium text-foreground/70">
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-2 rounded-full",
                    presence === "available"
                      ? "bg-emerald-500"
                      : presence === "busy"
                        ? "bg-destructive"
                        : presence === "away"
                          ? "bg-amber-400"
                          : "bg-muted-foreground",
                  )}
                />
                {t(`calendar.presence.${presence}`)}
              </p>
            )}
          </div>
        </div>

        {context && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-card/80 px-2.5 py-2 ring-1 ring-foreground/[0.06]">
            <HugeiconsIcon
              icon={KIND_ICON[context.kind] ?? PartyIcon}
              className="size-4 shrink-0 text-brand"
              strokeWidth={2}
              aria-hidden="true"
            />
            <span lang={locale} className="min-w-0 flex-1 text-[0.71875rem] leading-snug">
              <span className="font-semibold">{t(`person.ctx.${context.kind}`)}</span>
              {self ? (
                <span className="text-muted-foreground"> · {t("person.selfDay")}</span>
              ) : (
                context.text && <span className="text-muted-foreground"> · {context.text}</span>
              )}
            </span>
          </div>
        )}
        {context && address && !self && (
          // Kutla: Teams · Outlook · WhatsApp seçimi, üçü de hazır mesajla.
          <CelebrateMenu
            person={{ name, address, upn, givenName: given, mobile: p?.mobile ?? null }}
            kind={context.kind}
            years={context.years}
          >
            <button
              type="button"
              title={t("person.celebrateTitle")}
              className="mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-brand-fill-deep px-3 text-[0.75rem] font-semibold text-brand-on-brand ring-1 ring-foreground/10 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 aria-expanded:brightness-110 [@media(pointer:coarse)]:h-11"
            >
              <HugeiconsIcon
                icon={PartyIcon}
                className="size-4"
                strokeWidth={2}
                aria-hidden="true"
              />
              {t(`person.celebrate.${context.kind}`)}
            </button>
          </CelebrateMenu>
        )}
      </div>

      {/* DÖRT EYLEM — adla bulunamayan kişide (adres yok) hiç çizilmez. */}
      <PersonActions address={address} upn={upn} className="px-3 pb-3" />

      {/* İLETİŞİM ve YÖNETİCİ — yönetici satırına basınca kart ONA geçer. */}
      <PersonDetails
        profile={p}
        address={address}
        onManager={onManager}
        className="border-t border-border/70 px-2 py-2"
      />

      <div className="flex flex-col gap-1.5 border-t border-border/70 p-3">
        {extraAction && (
          <button
            type="button"
            onClick={extraAction.onClick}
            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 text-[0.75rem] font-semibold text-foreground/85 transition hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [@media(pointer:coarse)]:h-11"
          >
            {extraAction.icon && (
              <HugeiconsIcon
                icon={extraAction.icon}
                className="size-3.5"
                strokeWidth={2}
                aria-hidden="true"
              />
            )}
            {extraAction.label}
          </button>
        )}
        <button
          type="button"
          onClick={ask}
          className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-brand/[0.09] px-3 text-[0.75rem] font-semibold text-brand-ink transition hover:bg-brand/[0.15] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [@media(pointer:coarse)]:h-11"
        >
          <HugeiconsIcon
            icon={AiChat02Icon}
            className="size-3.5"
            strokeWidth={2}
            aria-hidden="true"
          />
          {t("person.ask")}
        </button>
        {note && (
          <p className="flex flex-wrap items-center justify-center gap-x-1.5 pt-0.5 text-center text-[0.6875rem] leading-snug text-muted-foreground">
            <span>{note}</span>
            {canRetry && (
              <button
                type="button"
                onClick={res.retry}
                className="font-semibold text-brand-ink underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 rounded"
              >
                {t("person.retry")}
              </button>
            )}
          </p>
        )}
      </div>
    </div>
  )
}
