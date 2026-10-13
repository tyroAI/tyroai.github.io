// Sohbete eklenen görselin bir kopyası, kullanıcının kendi girişiyle tyro ortamındaki
// tyro_ChatFile tablosuna yüklenir ve kaydın kimliği mesaja iliştirilir. Neden:
// Copilot Studio sohbete eklenen dosyayı bir MCP aracına geçiremiyor; HR MCP dosyayı bu
// kimlikle tablodan okuyup ERP'deki masraf kaydına ekler (`attach_expense_receipt`) ve
// kaydı siler. Ayrıntı: docs/features/sohbet-ozellikler.md › Masraf fişi.

import { notify } from "@/lib/notify"
import { audienceAllows } from "./audience"
import { sameCatalogName } from "./agentName"
import { DATAVERSE_URL, dataverseRequest, ensureMsalInitialized, msalInstance } from "./msal"

export const CHAT_FILE_STAGING = {
  // Kitle: herkes. Daraltmak gerekirse adres listesi yazılır (["ad@kurum.example"]).
  audience: "*",
  // Masraf aracını taşıyan asistanlar — katalog GUID'i ortamlar arasında değiştiği için adla.
  agents: ["tyro office", "tyro hr"],
  timeoutMs: 20000,
}

export function stagingEnabledFor(agent, upn, policy = CHAT_FILE_STAGING) {
  // Katalog adı önekli ("TYRO Office") ya da öneksiz ("Office") olabilir.
  return (
    policy.agents.some((n) => sameCatalogName(n, agent?.name)) &&
    audienceAllows(policy.audience, { upn })
  )
}

// Asistanın göreceği metin: kullanıcının yazdığı + her dosya için bir satır.
// Biçim HR MCP talimatlarıyla (instructions.md) sözleşmedir; değişirse ikisi birden değişir.
export function withFileMarkers(text, staged) {
  if (!staged?.length) return text
  const lines = staged.map((f) => `[Ekli dosya: ${f.name} · dosya_id=${f.id}]`)
  return [text, lines.join("\n")].filter(Boolean).join("\n\n")
}

export function dataUrlToBytes(dataUrl) {
  const bin = atob(
    String(dataUrl || "")
      .split(",")
      .pop(),
  )
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

// HTTP başlığı yalnız Latin-1 taşır; "fiş.jpg" fetch'i patlatırdı. Asıl ad kaydın
// tyro_name kolonunda durur, başlıktaki ad yalnız dosya kolonunun etiketi.
export function asciiFileName(name) {
  const ascii = String(name || "")
    .replace(/ı/g, "i")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7E]/g, "_")
  return ascii.trim() || "dosya"
}

async function userToken() {
  await ensureMsalInitialized()
  const account = msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0]
  if (!account) return null
  const resp = await msalInstance.acquireTokenSilent({ ...dataverseRequest, account })
  return resp.accessToken
}

// Bir dosya = kayıt aç (POST) + dosyayı yükle (PATCH). Yükleme düşerse kayıt boş kalır;
// HR MCP boş kaydı kullanmaz, gece temizliği (2 gün) siler.
async function stageOne(a, { baseUrl, token, fetchImpl, signal }) {
  const api = `${baseUrl}/api/data/v9.2/tyro_chatfiles`
  const odata = {
    Authorization: `Bearer ${token}`,
    "OData-MaxVersion": "4.0",
    "OData-Version": "4.0",
  }
  const created = await fetchImpl(`${api}?$select=tyro_chatfileid`, {
    method: "POST",
    headers: {
      ...odata,
      "Content-Type": "application/json",
      Accept: "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ tyro_name: a.name, tyro_contenttype: a.contentType }),
    signal,
  })
  if (!created.ok) return null
  const id = (await created.json())?.tyro_chatfileid
  if (!id) return null
  const uploaded = await fetchImpl(`${api}(${id})/tyro_file`, {
    method: "PATCH",
    headers: {
      ...odata,
      "Content-Type": "application/octet-stream",
      "x-ms-file-name": asciiFileName(a.name),
    },
    body: dataUrlToBytes(a.contentUrl),
    signal,
  })
  return uploaded.ok ? { id, name: a.name } : null
}

// `attachments`: filesToAttachments çıktısı ({ name, contentType, contentUrl: data-URI }).
// Başarısız dosya atlanır; dönen `failed` kullanıcıya söylenir, mesaj yine gider.
export async function stageAttachments(attachments, deps = {}) {
  const {
    baseUrl = DATAVERSE_URL,
    getToken = userToken,
    fetchImpl = globalThis.fetch,
    timeoutMs = CHAT_FILE_STAGING.timeoutMs,
  } = deps
  if (!attachments?.length) return { staged: [], failed: 0 }
  let token
  try {
    token = await getToken()
  } catch {
    token = null
  }
  if (!token) return { staged: [], failed: attachments.length }

  const results = await Promise.all(
    attachments.map(async (a) => {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), timeoutMs)
      try {
        return await stageOne(a, { baseUrl, token, fetchImpl, signal: ctrl.signal })
      } catch {
        return null
      } finally {
        clearTimeout(timer)
      }
    }),
  )
  const staged = results.filter(Boolean)
  return { staged, failed: attachments.length - staged.length }
}

// ChatScreen'in tek çağrısı: asistan ya da kullanıcı kapsam dışıysa metin aynen döner.
// Hazırlanamayan dosyada mesaj yine gider (görsel asistana ulaşır), yalnız ERP'ye
// eklenemeyeceği söylenir.
export async function textWithStagedFiles(text, attachments, agent, t) {
  if (!attachments?.length) return text
  await ensureMsalInitialized()
  const account = msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0]
  if (!stagingEnabledFor(agent, account?.username)) return text
  const { staged, failed } = await stageAttachments(attachments)
  if (failed) notify.warning(t("chat.attach.stageFailed"))
  return withFileMarkers(text, staged)
}
