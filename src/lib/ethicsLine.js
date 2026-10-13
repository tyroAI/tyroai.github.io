import { graphPostNoContent, STATUS } from "@/lib/graph"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  ETİK HATTI — Keşfet'in sağ alt köşesindeki bildirim yolu
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Kullanıcı bir cümle yazar, posta gider. Ekranda görünen TEK alan o
 * cümledir: alıcı ve konu burada, POLİTİKADA yazılıdır ve arayüzden
 * değiştirilemez.
 *
 * ── NEDEN POLİTİKA AYRI DOSYADA ────────────────────────────────────────
 * Adres tek satır: `ETHICS_LINE.to`. Bileşenin içine gömülseydi onu
 * değiştirmek arayüz koduna dokunmak zorunda kalırdı — nitekim değişti:
 * hat 2026-09-23'te denemeyle açıldı (kişisel bir adres), aynı gün
 * doğrulanıp kurumsal `compliance@` kutusuna alındı ve o tur TEK SATIR
 * oldu.
 *
 * ── KONU ARKADA KURULUR ────────────────────────────────────────────────
 * `Etik Bildirimi - <Ad Soyad>`. Kullanıcıya gösterilmez (istek üzerine);
 * gösterilseydi düzenlenebilir olurdu ve etik kurulunun gelen kutusunda
 * konu satırı her bildirimde başka bir şey söylerdi. Ad MSAL hesabından
 * gelir — yazdırılmaz: kendi adını yanlış yazan bir bildirim, kurulun
 * tek sıralama anahtarını bozardı.
 *
 * ⚠️ **KONU DİLE BAĞLI DEĞİL.** `t()` kullanılmıyor: posta ALICININ
 * kutusuna düşüyor ve alıcı hep aynı kurul. Bildirim yazanın arayüz dili
 * İngilizceyse konunun da İngilizce gitmesi, aynı kutuda iki farklı
 * kalıp demekti.
 *
 * ── GÖNDEREN KULLANICININ KENDİSİDİR (bilinen ve yazılı sınır) ──────────
 * Uygulama tamamen istemci tarafı; elimizdeki tek gönderim yolu
 * `/me/sendMail`, yani posta bildirimi yazanın KENDİ kutusundan çıkar.
 * **Bu hat ANONİM DEĞİLDİR** ve panel bunu bir satırla söyler — söylemeyen
 * bir etik hattı, kullanıcıya vermediği bir sözü vermiş olurdu. Anonim
 * gönderim sunucu tarafında bir uygulama kimliği ister (tyrotrade'in
 * haftalık uyarı postasında olduğu gibi) ve bu deponun kapsamı dışında.
 *
 * ⚠️ **KOPYA GÖNDERİLMİŞ ÖĞELER'E YAZILMAZ** (`keepCopy: false`).
 * Bildirimin kendisi hassas; yazanın kutusunda duran bir kopya, o kutuya
 * vekâleti olan herkes için okunabilir hâle gelir. Gönderim yine de
 * kullanıcıya bildiriliyor (toast) — yani "gitti mi" sorusu cevapsız
 * kalmıyor. Geri istenirse tek satır.
 */
export const ETHICS_LINE = {
  /**
   * Kapatmak tek satır: hat çizilmez, panel açılmaz.
   * ⚠️ 2026-10-02'den beri KAPALI (istek: *"etik hattı butonunu gizle keşfet
   * sayfasında"*). Kod, alıcı ve metinler duruyor; geri açmak `true`.
   */
  enabled: false,
  /**
   * Etik kurulunun kutusu. ⚠️ **KİŞİSEL BİR ADRES YAZILMAZ**: bildirimler
   * bir KİŞİYE değil bir GÖREVE gidiyor; kişi ayrılırsa ya da izne çıkarsa
   * kutu sahipsiz kalmamalı. Değişirse burası tek satır.
   */
  to: "compliance@vegaglobal.example",
  /** Konunun sabit başı; arkasına bildirimi yazanın adı gelir. */
  subjectPrefix: "Etik Bildirimi",
  /** Gövde tavanı. Metin kutusu da bu sayıyı `maxLength` olarak uygular. */
  maxChars: 4000,
  /** Gönderilmiş Öğeler'e kopya — yukarıdaki gerekçeyle kapalı. */
  keepCopy: false,
}

export const ETHICS_MAIL_SCOPES = ["Mail.Send"]

/** `Etik Bildirimi - Ad Soyad`. Ad yoksa yalnız ön ek. */
export function ethicsSubject(reporter) {
  const name = String(reporter ?? "").trim()
  return name ? `${ETHICS_LINE.subjectPrefix} - ${name}` : ETHICS_LINE.subjectPrefix
}

/**
 * Bildirimi gönderir.
 *
 * @returns {Promise<{ok: true} | {ok: false, reason: string, detail?: string}>}
 *   `reason`: "empty" | "denied" | "unauthenticated" | "send"
 *   Hiçbir durumda FIRLATMAZ — `graph.js`in sözleşmesinin aynısı.
 */
export async function sendEthicsReport(instance, account, { reporter, message }) {
  const text = String(message ?? "").trim()
  if (!text) return { ok: false, reason: "empty" }

  const res = await graphPostNoContent(instance, account, {
    path: "/me/sendMail",
    scopes: ETHICS_MAIL_SCOPES,
    body: {
      message: {
        subject: ethicsSubject(reporter),
        // Düz metin: gövdeyi kullanıcı yazıyor. HTML'e çevirmek yazdığı
        // "<" işaretini yutar ya da satır sonlarını kaybederdi
        // (`sendFileMail.js`te bir kez verilmiş kararın aynısı).
        body: { contentType: "Text", content: text },
        toRecipients: [{ emailAddress: { address: ETHICS_LINE.to } }],
      },
      saveToSentItems: ETHICS_LINE.keepCopy,
    },
  })

  if (res.status === STATUS.ready) return { ok: true }
  return {
    ok: false,
    reason:
      res.status === STATUS.denied
        ? "denied"
        : res.status === STATUS.unauthenticated
          ? "unauthenticated"
          : "send",
    // Graph'ın kendi cümlesi teşhis için tek kaynak: olduğu gibi taşınır.
    detail: res.error ?? String(res.httpStatus ?? ""),
  }
}
