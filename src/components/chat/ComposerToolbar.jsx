import { HugeiconsIcon } from "@hugeicons/react"
import ArrowUp01Icon from "@hugeicons/core-free-icons/ArrowUp01Icon"
import AtIcon from "@hugeicons/core-free-icons/AtIcon"
import Attachment01Icon from "@hugeicons/core-free-icons/Attachment01Icon"
import Idea01Icon from "@hugeicons/core-free-icons/Idea01Icon"
import Mic01Icon from "@hugeicons/core-free-icons/Mic01Icon"
import MicOff01Icon from "@hugeicons/core-free-icons/MicOff01Icon"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"
import { AgentSelect } from "./AgentSelect"

/** Bestecinin alt satırı: ek · asistan | referans · istem laboratuvarı · mikrofon · gönder. */
export function ComposerToolbar({
  agent,
  onAgentChange,
  disabled,
  onAttach,
  refOpen,
  onRefToggle,
  onOpenPromptLab,
  promptLabOpen,
  micUsable,
  listening,
  onMic,
  canSend,
  onSend,
  // Alanlı hazır soru açıkken yazı alanı yok: referans ve dikte yazacak yer bulamaz.
  locked = false,
}) {
  const { t } = useLocale()
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 sm:px-5 sm:py-2.5 @max-3xl/chat:px-2.5 @max-3xl/chat:py-1.5">
      <div className="flex items-center gap-1 sm:gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onAttach}
              className="size-9 text-muted-foreground hover:text-foreground @max-3xl/chat:size-8"
              aria-label={t("chat.attach")}
            >
              <HugeiconsIcon icon={Attachment01Icon} className="size-[1.125rem]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={6}>
            {t("chat.attach")}
          </TooltipContent>
        </Tooltip>
        <AgentSelect value={agent} onChange={onAgentChange} />
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Referans ekle — dokunmatikte "/" yazmanın keşfedilebilir hâli.
            Klavyeli kullanıcı bölü işaretini yazar; telefonda kimse onu
            denemez, o yüzden düğme her genişlikte durur. */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled || locked}
              onClick={onRefToggle}
              aria-label={t("ref.button")}
              aria-pressed={refOpen}
              className={cn(
                "size-9 rounded-full text-muted-foreground transition-colors hover:text-foreground @max-3xl/chat:size-8",
                refOpen && "bg-brand-via/15 text-brand-ink hover:text-brand-ink",
              )}
            >
              <HugeiconsIcon icon={AtIcon} className="size-[1.125rem]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={6}>
            {t("ref.button")}
          </TooltipContent>
        </Tooltip>
        {/* İstem Laboratuvarı — mikrofonun SOLUNDA. Sohbet başladıktan
            sonra karşılama çipleri ekranda kalmıyor; hazır istemlere
            buradan dönülür. */}
        {onOpenPromptLab && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onOpenPromptLab}
                aria-label={t("prompts.labTitle")}
                aria-pressed={Boolean(promptLabOpen)}
                // Pencere ekranın ORTASINDA açılıyor; düğme basılı
                // görünmezse kullanıcı onun nereden geldiğini göremiyor.
                className={cn(
                  "size-9 rounded-full text-muted-foreground transition-colors hover:text-foreground @max-3xl/chat:size-8",
                  promptLabOpen && "bg-brand-via/15 text-brand-ink hover:text-brand-ink",
                )}
              >
                <HugeiconsIcon icon={Idea01Icon} className="size-[1.125rem]" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6}>
              {t("prompts.labTitle")}
            </TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onMic}
              disabled={disabled || locked}
              aria-label={
                !micUsable
                  ? t("chat.mic.unsupported")
                  : listening
                    ? t("chat.mic.stop")
                    : t("chat.mic.start")
              }
              aria-pressed={listening}
              data-mic-state={!micUsable ? "unsupported" : listening ? "listening" : "idle"}
              className={cn(
                "relative size-9 rounded-full text-muted-foreground transition-colors hover:text-foreground @max-3xl/chat:size-8",
                listening && "bg-brand-via/15 text-brand-deep hover:text-brand-deep",
                !micUsable && "opacity-50 cursor-not-allowed hover:text-muted-foreground",
              )}
            >
              {listening ? (
                <span aria-hidden="true" className="mic-bars relative z-[1]">
                  <span />
                  <span />
                  <span />
                  <span />
                </span>
              ) : (
                <HugeiconsIcon
                  icon={micUsable ? Mic01Icon : MicOff01Icon}
                  className="relative z-[1] size-[1.125rem]"
                />
              )}
              {listening && <span aria-hidden="true" className="mic-listening-pulse" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={6}>
            {!micUsable
              ? t("chat.mic.unsupported")
              : listening
                ? t("chat.tooltip.micStop")
                : t("chat.tooltip.mic")}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              onClick={onSend}
              disabled={disabled || !canSend}
              aria-label={t("chat.send")}
              className={cn(
                "size-10 rounded-full bg-gradient-to-br from-brand-from via-brand-via to-brand-to p-0 text-brand-on-brand shadow-sm @max-3xl/chat:size-8",
                "duration-200 ease-linear hover:brightness-110 hover:text-brand-on-brand",
                "disabled:opacity-40 disabled:cursor-not-allowed",
              )}
            >
              <HugeiconsIcon icon={ArrowUp01Icon} className="size-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={6}>
            {t("chat.send")}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
