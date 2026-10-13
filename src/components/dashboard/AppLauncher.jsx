import { useConfig } from "@/hooks/useConfig"
import { useAppLock } from "@/hooks/useAuthorizations"
import { HeroSection } from "./LauncherHero"
import { LauncherCatalog } from "./LauncherCatalog"

export function AppLauncher({ onOpenChat, onNewChat }) {
  const { agents } = useConfig()
  // Kilit kancası katalogla PAYLAŞILIYOR (`inflightRow`), yani ikinci çağrı
  // ağa çıkmıyor — gerekçe `useAuthorizations`ta.
  const lock = useAppLock()
  // Özetin sorulacağı asistan = sohbetin AÇACAĞI asistan. Başkası olursa
  // ısıtılan konuşma hiç devralınmaz (ChatScreen kendi ilk açık asistanını
  // açıyor), yani özet hazır olduğu hâlde görünmezdi.
  const briefAgent = lock.ready
    ? (agents.find((a) => !lock.isLocked(a.name)) ?? null)
    : (agents[0] ?? null)

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-4 overflow-y-auto px-3 pb-10 sm:gap-5 sm:px-4 sm:pb-12 lg:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <HeroSection onNewChat={onNewChat} briefAgent={briefAgent} />

      {/* Elegant divider */}
      <div
        aria-hidden="true"
        className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent"
      />

      <LauncherCatalog onOpenChat={onOpenChat} />
    </div>
  )
}
