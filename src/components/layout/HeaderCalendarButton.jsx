import CalendarAdd01Icon from "@hugeicons/core-free-icons/CalendarAdd01Icon"
import { Button } from "@/components/ui/button"
import { CalendarAdd01Icon as AnimatedCalendarIcon } from "@/components/ui/calendar-add-01"
import { useAnimatedIcon } from "@/hooks/useAnimatedIcon"

/**
 * Çentik ekranda DEĞİLKEN header'a geri gelen ajanda takvimi düğmesi.
 *
 * ⚠️ Posta düğmesinin tarifinin aynısı (ghost · size-9 · rounded-xl ·
 * hareketli glif): aynı satırdaki iki kardeş düğme farklı boyda olamaz.
 * Tooltip YOK ve bu bilinçli — `CalendarPopover` tetikleyiciyi
 * `<PopoverTrigger asChild>` ile klonluyor, araya bir `Tooltip` kökü
 * koymak iki `asChild` zincirini iç içe geçirirdi; ad `aria-label`da.
 */
export function HeaderCalendarButton({ label, ref, ...props }) {
  const { icon, hoverProps } = useAnimatedIcon({
    icon: CalendarAdd01Icon,
    animatedIcon: AnimatedCalendarIcon,
  })
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      ref={ref}
      aria-label={label}
      {...props}
      {...hoverProps}
      className="size-9 rounded-xl [&_svg]:!size-5 relative pointer-coarse:after:absolute pointer-coarse:after:-inset-1"
    >
      {icon}
    </Button>
  )
}
