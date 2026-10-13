# tyroAI — Demo (Claude Code rehberi)

Kurumsal AI platformu TYRO'nun **çevrimdışı demo** kopyası; canlı adres
https://tyroai.github.io (GitHub Pages, `tyroAI/tyroai.github.io`, `gh-pages` dalı).
React 19 + Vite 8, JS/JSX, alias `@/` → `src/`.

## Kesin kurallar

- **Hiçbir gerçek bağlantı yok.** Giriş `src/demo/fakeMsal.js`'teki sahte örnek;
  aynı köken dışındaki her `fetch` `src/demo/router.js`'te yakalanır ve
  `src/demo/handlers/*` cevaplar. Eşleşmeyen istek 404 döner ve konsola
  `[demo] karşılığı yok: …` yazar — gerçek ağa asla düşmez. Yeni bir özellik yeni
  bir uç çağırıyorsa ilgili handler dosyasına kayıt eklenir.
- **Tüm veriler kurgusal.** Kişi/şirket/adres gerçek olamaz; e-posta ve URL'ler
  `.example` / `.invalid` alan adlarını kullanır. Demo kişisi: Deniz Arslan,
  Sales Manager, "Vega Global" (`src/demo/persona.js`).
- **Marka TYRO** (ürün adı `tyroAI`); asistanlar TYRO Office · TYRO Sales · TYRO HR.
- **i18n:** görünen her metin `t("ns.key")`; anahtar `src/data/strings.{tr,en,ru,ar}.js`
  dördüne birden eklenir.
- Tarihler isteğin geldiği ana göre hesaplanır — demo her gün güncel görünmeli.

## Komutlar

`npm run dev` · `npm run build` · `npm run lint`
