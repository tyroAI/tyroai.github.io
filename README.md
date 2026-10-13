# tyroAI — Demo

**Canlı:** https://tyroai.github.io/tyroAI/

TYRO kurumsal AI çalışma alanının **tanıtım (demo) sürümü**. Arayüz gerçek
ürünle aynıdır; ancak hiçbir gerçek sisteme bağlanmaz ve **tüm kişi, şirket ve
veriler kurgusaldır**.

- Oturum açan kişi: **Deniz Arslan — Sales Manager**, kurgusal şirket **Vega Global**
- Asistanlar: **TYRO Office**, **TYRO Sales**, **TYRO HR** (cevaplar demo senaryolarıdır)
- İş uygulamaları: SAP, Salesforce, Jira, ServiceNow, Power BI… (yalnız bağlantı)
- Giriş ekranındaki **Bağlan** düğmesi doğrudan demo oturumunu açar; Microsoft
  hesabı gerekmez.

## Nasıl çalışır

Gerçek üründeki Microsoft Entra ID girişi, Microsoft Graph (posta, takvim, dosya,
To Do), Dataverse ve Copilot Studio çağrıları `src/demo/` altındaki bir katmanla
değiştirilmiştir:

| dosya | görevi |
|---|---|
| `src/demo/fakeMsal.js` | Microsoft girişinin yerine yerel, sahte bir oturum |
| `src/demo/router.js` | tarayıcının `fetch`ini sarar; aynı köken dışındaki **her** isteği demo verisinden cevaplar, hiçbirini dışarı çıkarmaz |
| `src/demo/handlers/*` | uç uç demo cevapları (Graph, Dataverse, İK, hava durumu, kur…) |
| `src/demo/copilot/*` | asistanların demo sohbet motoru |
| `src/demo/persona.js` | demo kişisi, ekibi, müşterileri |

## Geliştirme

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/
npm run lint
```

Node 24 gerekir (`.nvmrc`).

## Yayın

Site GitHub Pages'te `gh-pages` dalından yayınlanır. `npm run deploy` derler,
SPA için `404.html` kopyasını ekler ve `dist/`i bu dala gönderir.

---

© TTECH Business Solutions · TYRO AI
