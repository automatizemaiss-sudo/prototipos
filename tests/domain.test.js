import test from "node:test";
import assert from "node:assert/strict";
import {
  seed,
  normalizePhone,
  inactive,
  matches,
  realAudience,
  validateCampaign,
} from "../src/domain.js";
import { mergeContacts } from "../server/core.js";
test("telefones com formatação diferente convergem à mesma chave", () => {
  assert.equal(
    normalizePhone("(42) 99988-3017"),
    normalizePhone("+55 42 99988-3017"),
  );
  assert.throws(() => normalizePhone("123"));
});
test("contato sem compra não é inativo", () => {
  assert.equal(inactive({ bought: false, lastPurchase: "" }), false);
  assert.equal(inactive({ bought: true, lastPurchase: "" }), false);
  assert.equal(
    inactive(
      { bought: true, lastPurchase: "2026-01-01" },
      new Date("2026-09-17"),
    ),
    true,
  );
});
test("filtros combinam e suportam múltiplos interesses", () => {
  const c = seed().contacts[0];
  assert.ok(matches(c, { team: "Palmeiras", type: "Retrô", bought: "no" }));
  assert.equal(matches(c, { team: "Palmeiras", type: "Jogador" }), false);
  assert.equal(matches(c, { from: "2026-01-01" }), false);
});
test("servidor limita público real e remove duplicação por telefone", () => {
  const cs = seed().contacts;
  assert.equal(realAudience([...cs, ...cs]).length, 2);
  assert.equal(realAudience([{ ...cs[24], demo: true }]).length, 0);
  assert.equal(
    realAudience([{ ...cs[24], phone: "+5511999999999" }]).length,
    0,
  );
});
test("intervalos inválidos são rejeitados", () => {
  assert.throws(() =>
    validateCampaign({ name: "Teste", message: "Oi", min: 30, max: 10 }),
  );
  assert.throws(() =>
    validateCampaign({ name: "Teste", message: "Oi", min: "abc", max: 30 }),
  );
  assert.doesNotThrow(() =>
    validateCampaign({ name: "Teste", message: "Oi", min: 15, max: 30 }),
  );
});
test("sincronização não sobrescreve conflitos", () => {
  const c = seed().contacts[0],
    local = { ...c, name: "Local" },
    remote = { ...c, name: "Remoto" };
  assert.equal(mergeContacts([local], [remote], [c]).conflicts.length, 1);
  assert.equal(mergeContacts([local], [c], [c]).contacts[0].name, "Local");
  assert.equal(mergeContacts([c], [remote], [c]).contacts[0].name, "Remoto");
  assert.equal(mergeContacts([c, c], [c], [c]).conflicts.length, 1);
});
test("rota real exige autenticação antes de qualquer chamada externa", async () => {
  const { default: handler } = await import("../api/crm.js");
  let status, body;
  const res = {
    setHeader() {},
    status(s) {
      status = s;
      return this;
    },
    json(v) {
      body = v;
    },
  };
  await handler(
    {
      method: "POST",
      headers: {},
      query: { action: "campaign-start" },
      body: { recipients: seed().contacts },
    },
    res,
  );
  assert.equal(status, 401);
  assert.match(body.error, /apresentador/);
});
test("reserva persistente evita duas filas para a mesma campanha", async () => {
  const { saveCampaign } = await import("../server/core.js");
  const originalFetch = globalThis.fetch;
  const keys = [
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "UAZAPI_URL",
    "UAZAPI_TOKEN",
  ];
  const old = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  Object.assign(process.env, {
    UPSTASH_REDIS_REST_URL: "https://redis.test",
    UPSTASH_REDIS_REST_TOKEN: "test",
    UAZAPI_URL: "https://uaz.test",
    UAZAPI_TOKEN: "test",
  });
  const memory = new Map();
  let sends = 0;
  globalThis.fetch = async (url, opt) => {
    if (String(url).startsWith("https://redis.test")) {
      const [cmd, key, value, mode] = JSON.parse(opt.body);
      let result;
      if (cmd === "SET") {
        if (mode === "NX" && memory.has(key)) result = null;
        else {
          memory.set(key, value);
          result = "OK";
        }
      } else if (cmd === "GET") result = memory.get(key);
      else if (cmd === "SADD") result = 1;
      return new Response(JSON.stringify({ result }), { status: 200 });
    }
    sends++;
    const payload = JSON.parse(opt.body);
    assert.equal(payload.messages.length, 2);
    assert.deepEqual(
      payload.messages.map((m) => m.number),
      ["5542999883017", "5511981205438"],
    );
    return new Response(
      JSON.stringify({ folder_id: "folder-test", count: 2, status: "queued" }),
      { status: 200 },
    );
  };
  try {
    const draft = {
      id: "test-idempotency-12345",
      name: "Teste",
      message: "Olá {nome}",
      min: 2,
      max: 3,
      recipients: seed().contacts,
    };
    const first = await saveCampaign(draft),
      second = await saveCampaign(draft);
    assert.equal(sends, 1);
    assert.equal(first.folderId, second.folderId);
  } finally {
    globalThis.fetch = originalFetch;
    for (const k of keys) {
      if (old[k] === undefined) delete process.env[k];
      else process.env[k] = old[k];
    }
  }
});
