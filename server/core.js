import { createSign, createHmac, timingSafeEqual } from "node:crypto";
import {
  normalizePhone,
  realAudience,
  validateCampaign,
} from "../src/domain.js";
export const HEADERS = [
  "nome",
  "telefone",
  "cidade",
  "estado",
  "origem",
  "times_interesse",
  "tipos_camisa",
  "tamanho",
  "ja_comprou",
  "ultima_compra",
  "observacoes",
  "atualizado_em",
  "demonstrativo",
];
const localStorageEnabled = () =>
  process.env.CRM_LOCAL_SERVER === "1" && !process.env.VERCEL;
export const configured = () => ({
  google: !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY &&
    process.env.GOOGLE_SHEET_ID
  ),
  whatsapp: !!(process.env.UAZAPI_URL && process.env.UAZAPI_TOKEN),
  storage:
    localStorageEnabled() ||
    !!(
      process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ),
  storageMode: localStorageEnabled()
    ? "local"
    : process.env.UPSTASH_REDIS_REST_URL
      ? "redis"
      : "direct",
});
export const fail = (message, status = 400) =>
  Object.assign(new Error(message), { status });
export async function redis(command) {
  if (localStorageEnabled()) {
    const { localCommand } = await import("./local-store.js");
    return localCommand(command);
  }
  if (!configured().storage)
    throw fail("Configure o armazenamento persistente no servidor.", 503);
  const r = await fetch(process.env.UPSTASH_REDIS_REST_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(12000),
  });
  if (!r.ok) throw fail("Armazenamento indisponível.", 503);
  const d = await r.json();
  if (d.error) throw fail("Erro no armazenamento persistente.", 503);
  return d.result;
}
export async function uaz(path, body) {
  if (!configured().whatsapp) throw fail("uAzapi não configurada.", 503);
  const base = new URL(process.env.UAZAPI_URL);
  if (base.protocol !== "https:")
    throw fail("A URL da uAzapi deve usar HTTPS.", 503);
  const r = await fetch(new URL(path, base), {
    method: body ? "POST" : "GET",
    headers: {
      token: process.env.UAZAPI_TOKEN,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok)
    throw fail(
      `A uAzapi retornou HTTP ${r.status}. Verifique a instância.`,
      502,
    );
  return r.json();
}
let tokenCache;
async function googleToken() {
  if (tokenCache?.expires > Date.now()) return tokenCache.token;
  if (!configured().google)
    throw fail("Google Sheets não configurado no servidor.", 503);
  const now = Math.floor(Date.now() / 1000);
  const enc = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
  const input =
    enc({ alg: "RS256", typ: "JWT" }) +
    "." +
    enc({
      iss: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    });
  const signer = createSign("RSA-SHA256");
  signer.update(input);
  const assertion =
    input +
    "." +
    signer.sign(
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      "base64url",
    );
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok)
    throw fail(
      "Não foi possível autenticar no Google. Confira as credenciais.",
      502,
    );
  const d = await r.json();
  tokenCache = { token: d.access_token, expires: Date.now() + 3000000 };
  return d.access_token;
}
export async function sheets(path = "", body, method = "GET") {
  const token = await googleToken();
  const r = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${process.env.GOOGLE_SHEET_ID}${path}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!r.ok)
    throw fail(
      `Google Sheets retornou HTTP ${r.status}. Confira o compartilhamento com a conta de serviço.`,
      502,
    );
  return r.json();
}
export function rowToContact(row, index) {
  let o = Object.fromEntries(HEADERS.map((h, i) => [h, String(row[i] ?? "")]));
  const phone = normalizePhone(o.telefone);
  return {
    id: "sheet-" + phone,
    name: o.nome,
    phone,
    city: o.cidade,
    state: o.estado,
    origin: o.origem,
    teams: o.times_interesse
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean),
    types: o.tipos_camisa
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean),
    size: o.tamanho,
    bought: o.ja_comprou.toLowerCase() === "sim",
    lastPurchase: o.ultima_compra,
    notes: o.observacoes,
    updatedAt: o.atualizado_em,
    demo:
      !["+5542999883017", "+5511981205438"].includes(phone) ||
      o.demonstrativo.toLowerCase() !== "não",
    sheetRow: index + 2,
  };
}
export const contactToRow = (c) => [
  c.name,
  c.phone,
  c.city,
  c.state,
  c.origin,
  c.teams.join("; "),
  c.types.join("; "),
  c.size,
  c.bought ? "sim" : "não",
  c.bought ? c.lastPurchase : "",
  c.notes,
  c.updatedAt,
  c.demo ? "sim" : "não",
];
export async function readContacts() {
  const result = await sheets(
    "/values/" +
      encodeURIComponent("'Contatos'!A1:M1000") +
      "?valueRenderOption=FORMATTED_VALUE",
  );
  const rows = result.values || [];
  if (JSON.stringify(rows[0]) !== JSON.stringify(HEADERS))
    throw fail(
      "Cabeçalhos da aba Contatos não correspondem ao formato esperado.",
      409,
    );
  let contacts = [],
    conflicts = [],
    seen = new Map();
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i].some(Boolean)) continue;
    try {
      let c = rowToContact(rows[i], i - 1);
      if (seen.has(c.phone)) {
        conflicts.push({
          phone: c.phone,
          message: `Telefone duplicado nas linhas ${seen.get(c.phone)} e ${i + 1}. Revise na planilha.`,
        });
      } else {
        seen.set(c.phone, i + 1);
        contacts.push(c);
      }
    } catch {
      conflicts.push({
        message: `Telefone inválido na linha ${i + 1}. Revise na planilha.`,
      });
    }
  }
  return { contacts, conflicts };
}
export const contactFingerprint = (c) =>
  JSON.stringify(contactToRow({ ...c, updatedAt: "" }));
export function mergeContacts(local, remote, base = []) {
  let conflicts = [],
    merged = [],
    l = new Map(),
    r = new Map(remote.map((c) => [c.phone, c])),
    b = new Map(base.map((c) => [c.phone, c]));
  for (const c of local) {
    let p = normalizePhone(c.phone);
    if (l.has(p))
      conflicts.push({ phone: p, message: "Telefone duplicado no CRM." });
    l.set(p, { ...c, phone: p });
  }
  for (const p of new Set([...l.keys(), ...r.keys()])) {
    let lc = l.get(p),
      rc = r.get(p),
      bc = b.get(p);
    if (!lc) {
      merged.push(rc);
      continue;
    }
    if (!rc) {
      if (bc) {
        conflicts.push({
          phone: p,
          message: "Contato removido da planilha. Revise antes de sincronizar.",
        });
      } else merged.push(lc);
      continue;
    }
    const lf = contactFingerprint(lc),
      rf = contactFingerprint(rc),
      bf = bc && contactFingerprint(bc);
    if (lf === rf || rf === bf) merged.push(lc);
    else if (lf === bf) merged.push({ ...rc, id: lc.id });
    else
      conflicts.push({
        phone: p,
        name: lc.name,
        message: "Dados diferentes no CRM e na planilha.",
        local: lc,
        remote: rc,
      });
  }
  return { contacts: merged, conflicts };
}
export async function saveCampaign(draft) {
  validateCampaign(draft);
  const recipients = realAudience(draft.recipients || []);
  if (!recipients.length) throw fail("Nenhum destinatário real autorizado.");
  if (draft.mediaType)
    throw fail(
      "O primeiro teste real aceita texto. Mídia será habilitada após validar os limites da instância.",
    );
  const id = draft.id;
  if (!/^[\w-]{16,80}$/.test(id || ""))
    throw fail("Identificador de campanha inválido.");
  const key = "flying:campaign:" + id;
  const record = {
    id,
    name: draft.name,
    message: draft.message,
    min: +draft.min,
    max: +draft.max,
    recipients,
    status: "submitting",
    createdAt: new Date().toISOString(),
    total: recipients.length,
  };
  if (!configured().storage) return directCampaign(record);
  const acquired = await redis(["SET", key, JSON.stringify(record), "NX"]);
  if (!acquired) return JSON.parse(await redis(["GET", key]));
  await redis(["SADD", "flying:campaigns", id]);
  try {
    const result = await uaz("/sender/advanced", {
      delayMin: record.min,
      delayMax: record.max,
      info: `Flying CRM ${id} · ${record.name}`,
      messages: recipients.map((c) => ({
        number: normalizePhone(c.phone).slice(1),
        type: "text",
        text: draft.message.replaceAll("{nome}", c.name.split(" ")[0]),
      })),
    });
    if (!result.folder_id)
      throw fail("A API não retornou o identificador da fila.", 502);
    Object.assign(record, {
      folderId: result.folder_id,
      status: "queued",
      apiAccepted: result.count,
    });
  } catch (e) {
    record.status = "unknown";
    record.error =
      "Resultado incerto. Não reenviar. Confira a fila da instância antes de qualquer nova tentativa.";
  }
  await redis(["SET", key, JSON.stringify(record)]);
  return record;
}
export async function failedRecipients(id) {
  if (!/^[\w-]{16,80}$/.test(id || "")) throw fail("Campanha inválida.");
  const raw = await redis(["GET", "flying:campaign:" + id]);
  if (!raw) throw fail("Campanha não encontrada.", 404);
  const campaign = JSON.parse(raw);
  if (!campaign.folderId)
    throw fail(
      "Resultado incerto. Verifique a fila antes de tentar novamente.",
      409,
    );
  const result = await uaz("/sender/listmessages", {
    folder_id: campaign.folderId,
    limit: 1000,
    offset: 0,
  });
  const messages = result.messages || [];
  if (
    messages.some(
      (m) =>
        !["Failed", "Sent", "Delivered", "Read", "Canceled"].includes(m.status),
    )
  )
    throw fail("Aguarde o término dos envios antes de tentar novamente.", 409);
  const failed = messages.filter((m) => m.status === "Failed");
  const phones = failed.map((m) => {
    try {
      return normalizePhone(String(m.chatid).split("@")[0]);
    } catch {
      return null;
    }
  });
  return {
    campaign,
    failedIds: failed.map((m) => m.id).sort(),
    recipients: campaign.recipients.filter((c) => phones.includes(c.phone)),
  };
}

function receiptFor(record) {
  const payload = Buffer.from(JSON.stringify(record)).toString("base64url");
  return (
    payload +
    "." +
    createHmac("sha256", process.env.UAZAPI_TOKEN).update(payload).digest("hex")
  );
}
export function readReceipt(value, id) {
  if (
    typeof value !== "string" ||
    value.length > 30000 ||
    !process.env.UAZAPI_TOKEN
  )
    throw fail("Comprovante da campanha indisponível.", 409);
  const [payload, signature] = value.split(".");
  const expected = createHmac("sha256", process.env.UAZAPI_TOKEN)
    .update(payload)
    .digest("hex");
  if (
    !signature ||
    signature.length !== expected.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  )
    throw fail("Comprovante inválido.", 403);
  const record = JSON.parse(Buffer.from(payload, "base64url").toString());
  if (record.id !== id)
    throw fail("Comprovante não corresponde à campanha.", 403);
  return { ...record, receipt: value };
}
const directInFlight = new Map();
async function directCampaign(record) {
  if (directInFlight.has(record.id)) return directInFlight.get(record.id);
  const run = (async () => {
    const marker = `Flying CRM ${record.id} · `;
    const folders = await uaz("/sender/listfolders");
    if (!Array.isArray(folders))
      throw fail("Não foi possível verificar a fila da uAzapi.", 502);
    const existing = folders.find((f) => f.info?.startsWith(marker));
    const result = { ...record, direct: true };
    if (existing) {
      Object.assign(result, {
        folderId: existing.id,
        status: existing.status,
        apiAccepted: existing.log_total,
      });
    } else {
      try {
        const queued = await uaz("/sender/advanced", {
          delayMin: record.min,
          delayMax: record.max,
          info: marker + record.name,
          messages: record.recipients.map((c) => ({
            number: normalizePhone(c.phone).slice(1),
            type: "text",
            text: record.message.replaceAll("{nome}", c.name.split(" ")[0]),
          })),
        });
        if (!queued.folder_id) throw Error("Identificador ausente");
        Object.assign(result, {
          folderId: queued.folder_id,
          status: "queued",
          apiAccepted: queued.count,
        });
      } catch {
        Object.assign(result, {
          status: "unknown",
          error:
            "Resposta incerta da uAzapi. Confira a fila da instância antes de criar outro disparo; não há reenvio automático.",
        });
      }
    }
    return { ...result, receipt: receiptFor(result) };
  })();
  directInFlight.set(record.id, run);
  try {
    return await run;
  } finally {
    directInFlight.delete(record.id);
  }
}
export async function loadCampaign(id, receipt) {
  if (!/^[\w-]{16,80}$/.test(id || "")) throw fail("Campanha inválida.");
  if (receipt) return readReceipt(receipt, id);
  const raw = await redis(["GET", "flying:campaign:" + id]);
  if (!raw) throw fail("Campanha não encontrada.", 404);
  return JSON.parse(raw);
}
