import test from "node:test";
import assert from "node:assert/strict";
import { getBrand } from "../config/brands.js";
import { seed } from "../src/domain.js";
import { brandEnv, campaignKey } from "../server/brand.js";
import { configured, saveCampaign, readReceipt } from "../server/core.js";
import { uazapiConfig } from "../server/demo-config.js";
import { createHmac } from "node:crypto";

test("brand selection fails closed and preserves Flying defaults", () => {
  assert.equal(getBrand().title, "CRM Flying Imports");
  assert.throws(() => getBrand("typo"), /APP_BRAND/);
  assert.equal(seed().contacts.length, 26);
  const futpb = seed("futpb");
  assert.equal(futpb.contacts.length, 24);
  assert.ok(futpb.contacts.every((c) => c.demo && c.phone.startsWith("+5500")));
  assert.deepEqual(futpb.campaigns, []);
});

test("FUTPB ignores Flying credentials and rejects sends before any network access", async () => {
  const before = { ...process.env };
  const fetchBefore = global.fetch;
  try {
    Object.assign(process.env, {
      APP_BRAND: "futpb",
      UAZAPI_URL: "https://flying.test",
      UAZAPI_TOKEN: "flying",
      GOOGLE_SHEET_ID: "flying-sheet",
      GOOGLE_PRIVATE_KEY: "flying-key",
      GOOGLE_SERVICE_ACCOUNT_EMAIL: "flying@test",
      UPSTASH_REDIS_REST_URL: "https://flying-redis.test",
      UPSTASH_REDIS_REST_TOKEN: "flying",
    });
    delete process.env.CRM_LOCAL_SERVER;
    for (const key of Object.keys(process.env))
      if (key.startsWith("FUTPB_")) delete process.env[key];
    global.fetch = () => {
      throw Error("Unexpected network request");
    };
    assert.equal(configured().google, false);
    assert.equal(configured().storage, false);
    assert.equal(configured().whatsapp, false);
    assert.equal(configured().sheetUrl, null);
    assert.equal(campaignKey("campaigns"), "futpb:campaigns");
    assert.deepEqual(uazapiConfig(), { url: "", token: "" });
    await assert.rejects(saveCampaign({}), /desativados/);
    process.env.FUTPB_GOOGLE_SHEET_ID = getBrand("flying").sheetId;
    assert.throws(() => brandEnv("GOOGLE_SHEET_ID"), /separada/);
    process.env.FUTPB_GOOGLE_SHEET_ID = "flying-sheet";
    assert.throws(() => brandEnv("GOOGLE_SHEET_ID"), /separada/);
    process.env.FUTPB_GOOGLE_SHEET_ID = "separate-sheet";
    assert.equal(brandEnv("GOOGLE_SHEET_ID"), "separate-sheet");
    process.env.FUTPB_UAZAPI_URL = "https://futpb.test";
    process.env.FUTPB_UAZAPI_TOKEN = "separate-token";
    assert.equal(configured().whatsapp, false);
    process.env.FUTPB_ENABLE_REAL_SENDS = "true";
    assert.equal(configured().whatsapp, true);
    const payload = Buffer.from(
      JSON.stringify({ id: "test-campaign-1234", brand: "flying" }),
    ).toString("base64url");
    const receipt =
      payload +
      "." +
      createHmac("sha256", "separate-token").update(payload).digest("hex");
    assert.throws(
      () => readReceipt(receipt, "test-campaign-1234"),
      /não corresponde/,
    );
  } finally {
    global.fetch = fetchBefore;
    for (const key of Object.keys(process.env))
      if (!(key in before)) delete process.env[key];
    Object.assign(process.env, before);
  }
});
