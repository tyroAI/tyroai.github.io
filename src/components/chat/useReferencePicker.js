import { useLayoutEffect, useRef, useState } from "react"

/** Sorgu bu uzunluğu aşarsa kullanıcı referans seçmiyor, cümle yazıyor. */
const MAX_REF_QUERY = 32

/** Textarea'nın imleç konumu; alan yoksa metnin sonu. */
function caretOf(ta, value) {
  return ta?.selectionStart ?? value.length
}

/**
 * Referans seçici ("/") durumu. Açıkken `refAt` o "/"nin konumunu tutar;
 * sorgu o "/" ile imleç arasındaki metin. Sorguyu değerden türetmek, dikte ve
 * yapıştırma gibi metni dışarıdan değiştiren yolların da doğru çalışmasını
 * sağlıyor. `listening`: dikte sürerken seçici kapalı.
 */
export function useReferencePicker({ value, onChange, taRef, disabled, listening }) {
  const [refAt, setRefAt] = useState(null)
  const pickerRef = useRef(null)
  // Kapatılan "/" işaretinin yeri. Escape ya da dışarı tıklama menüyü
  // kapattığında imleç hâlâ o "/"nin hemen sağında duruyor; bu iz olmadan
  // bir sonraki tuş bırakma olayı menüyü ANINDA geri açardı, yani Escape
  // hiçbir işe yaramazdı.
  const dismissedRef = useRef(null)
  // Düğmeyle mi açıldı, "/" yazılarak mı? Odağın nereye gideceğini bu belirler.
  const [refFromButton, setRefFromButton] = useState(false)
  // Panelde ok tuşlarıyla gezilen satırın id'si — ekran okuyucuya
  // `aria-activedescendant` ile duyurulur. Odak textarea'da kaldığı için
  // satırın kendisi odak almıyor ve bu bağ olmadan seçim hiç okunmazdı.
  const [activeOption, setActiveOption] = useState(null)
  // Ekleme sonrası imlecin gideceği yer. Textarea tam kontrollü olduğu için
  // konum ancak yeni değer DOM'a işlendikten sonra uygulanabilir.
  const caretRef = useRef(null)

  // Sorgu DURUMDA tutulur, render sırasında imleçten okunmaz: imleç ok tuşu
  // ya da tıklamayla taşındığında React yeniden çizmiyor ve panel eski
  // listeyi göstermeye devam ederdi — Enter da o eski aralığı silerdi.
  const [refQuery, setRefQuery] = useState("")
  const pickerOpen = refAt != null && !listening

  useLayoutEffect(() => {
    const pos = caretRef.current
    if (pos == null) return
    caretRef.current = null
    const ta = taRef.current
    if (!ta) return
    ta.focus()
    try {
      ta.setSelectionRange(pos, pos)
    } catch {
      /* seçim desteklemeyen tipler */
    }
  }, [value, taRef])

  /**
   * "/" yazıldı mı, sorgu hâlâ geçerli mi?
   *
   * Tetik SADECE satır başında ya da boşluktan sonra: bu muhafız olmadan
   * "21/08", "3/4", "c/o", yapıştırılan URL ve dosya yolu sürekli pencere
   * açardı. Kapanma da aynı ölçüde önemli — kullanıcı gerçekten bölü işareti
   * yazıyor olabilir.
   */
  function syncPicker(text, caret) {
    if (disabled || listening) return closePicker(false)
    // Kapatılan "/" hâlâ yerinde mi? Metin değişip o konumdaki karakter
    // başkalaştıysa iz ÖLÜR. Bu olmadan bir kez kapatılan konum kalıcı
    // olarak ölürdü: mesaj gönderilip besteci boşalınca kullanıcının
    // yazdığı yeni "/" de aynı konumda kalıyor ve menü bir daha açılmazdı.
    if (dismissedRef.current != null && text[dismissedRef.current] !== "/") {
      dismissedRef.current = null
    }
    if (refAt == null) {
      const prev = text[caret - 1]
      if (prev !== "/") return
      if (dismissedRef.current === caret - 1) return
      const before = text[caret - 2]
      if (before !== undefined && !/\s/.test(before)) return
      dismissedRef.current = null
      setRefFromButton(false)
      setRefQuery("")
      return setRefAt(caret - 1)
    }
    if (text[refAt] !== "/" || caret <= refAt) return closePicker(false)
    const q = text.slice(refAt + 1, caret)
    if (q.includes("\n") || q.length > MAX_REF_QUERY) return closePicker(false)
    if (q === " ") return closePicker(false)
    setRefQuery(q)
  }

  /**
   * Menüyü kapatır.
   *
   * `dismiss` ile aynı "/" üzerinde geri açılması engellenir.
   *
   * Düğmenin YAZDIĞI "/" burada geri alınır. Aksi halde her kapanış metinde
   * bir bölü işareti bırakır ve düğmeye üst üste basan kullanıcı "/ / /"
   * biriktirirdi: dışarı tıklama `pointerdown`'da kapatıyor, ardından gelen
   * `click` yeni bir "/" yazıyor ve öncekini kimse toplamıyor.
   * Kullanıcının KENDİ yazdığı "/" korunur — o bilerek yazılmış bir karakter.
   */
  function closePicker(dismiss = true) {
    const at = refAt
    const undoSlash = refFromButton && refQuery === "" && at != null && value[at] === "/"
    if (dismiss && at != null && !undoSlash) dismissedRef.current = at
    setRefAt(null)
    setRefQuery("")
    if (undoSlash) {
      caretRef.current = at
      dismissedRef.current = null
      onChange?.(value.slice(0, at) + value.slice(at + 1))
    }
    // Odak panelin arama kutusuna geçmiş olabilir; kapanınca kullanıcı
    // cümlesini yazmaya devam etmek istiyor, besteci onu beklemeli.
    // Yalnızca odak PANELİN İÇİNDEYSE geri alınır: dışarı tıklayan kullanıcı
    // başka bir alana geçmiş olabilir ve odağı ondan çalmak kabalık olurdu.
    if (document.activeElement?.closest?.("[data-ref-layer]")) taRef.current?.focus()
  }

  function insertReference(row) {
    if (refAt == null) return
    // Silinecek aralık: "/" + o an panelin süzdüğü sorgu. İmleçten okumak,
    // odak panelin arama kutusundayken yanlış yeri silerdi.
    const end = refAt + 1 + refQuery.length
    const head = value.slice(0, refAt)
    const tail = value.slice(end)
    const glue = head && !/\s$/.test(head) ? " " : ""
    const text = `${glue}${row.token} `
    caretRef.current = (head + text).length
    dismissedRef.current = null
    onChange?.(head + text + tail)
    setRefAt(null)
  }

  /**
   * "Referans ekle" düğmesi — dokunmatikte "/" yazmanın keşfedilebilir hâli.
   * Açıksa KAPATIR: `aria-pressed` düğmeyi geçiş düğmesi olarak duyuruyor;
   * ikinci basış metne bir "/" daha yazmamalı. Düğmenin yazdığı "/" boş
   * sorguyla kapanırken geri alınır — kullanıcı bir şey yazmadıysa metinde iz
   * kalmasın.
   */
  function toggleFromButton() {
    if (pickerOpen) {
      closePicker()
      return
    }
    const caret = caretOf(taRef.current, value)
    const head = value.slice(0, caret)
    // Tetik kuralı burada da geçerli: gerekiyorsa önüne boşluk konur, yoksa
    // "abc/" yazıp menüyü açmayan bir düğme olurdu.
    const glue = head && !/\s$/.test(head) ? " " : ""
    caretRef.current = head.length + glue.length + 1
    dismissedRef.current = null
    setRefFromButton(true)
    setRefQuery("")
    onChange?.(`${head}${glue}/${value.slice(caret)}`)
    setRefAt(head.length + glue.length)
  }

  return {
    pickerOpen,
    pickerRef,
    refQuery,
    refFromButton,
    activeOption,
    setActiveOption,
    syncPicker,
    closePicker,
    insertReference,
    toggleFromButton,
    // Gönderimde: seçici izsiz kapanır.
    reset: () => setRefAt(null),
  }
}
