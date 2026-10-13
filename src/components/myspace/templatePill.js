import { cn } from "@/lib/utils"

/* Alanın hapı. Boşken kesik çerçeveli ETİKET ("başlangıç"), doluyken değer —
   ikisi de paletin tonunda, özet balonunun vurgusuyla aynı mürekkep.
   ⚠️ `items-baseline` + simgeler `self-center` (istek: *"burada bir
   kayma, orantısızlık, antisimetri var"*): `items-center` iken tarih hapının
   İLK öğesi takvim simgesiydi ve satır içi esnek kutunun taban çizgisi o
   SİMGENİN alt kenarından sentezleniyordu — tarih hapları cümleden 1,8 px
   yukarıda, "yıllık izin" 0,6 px aşağıda duruyordu (ölçüldü). Artık her hapın
   taban çizgisi kendi YAZISININ. Yatay pay YOK: `mx-0.5` satıra sarılan her hapı
   satırın sol kenarından 2 px içeride başlatıyor, alt satırın metniyle hizasını
   kaydırıyordu; haplar ile kelimeler arasını cümlenin kendi boşlukları açıyor. */
export function pillClass(filled) {
  return cn(
    "inline-flex items-baseline gap-1 rounded-lg px-1.5 align-baseline font-medium leading-6 outline-none transition",
    "text-[color-mix(in_oklch,var(--brand-via)_72%,var(--foreground))] focus-visible:ring-2 focus-visible:ring-brand/30",
    "data-[state=open]:bg-brand/[0.18]",
    filled
      ? "bg-brand/[0.10] hover:bg-brand/[0.16]"
      : "border border-dashed border-brand/45 bg-brand/[0.04] hover:bg-brand/[0.10]",
  )
}
