import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { getBrand } from "../config/brands.js";
import { seed, realAudience } from "../src/domain.js";
import { brandEnv, campaignKey } from "../server/brand.js";
import { configured, readReceipt } from "../server/core.js";
import { uazapiConfig } from "../server/demo-config.js";

test("both presentations use the existing shared demonstration and recipient restrictions", () => {
  assert.equal(getBrand().title, "CRM Flying Imports");
  assert.equal(getBrand("futpb").title, "CRM FUTPB");
  assert.throws(() => getBrand("typo"), /APP_BRAND/);
  const data = seed();
  assert.equal(data.contacts.length, 26);
  assert.equal(realAudience(data.contacts).length, 2);
  assert.deepEqual(data.campaigns, []);
});

test("presentation changes preserve credentials, storage keys and signed campaign receipts", () => {
  const before = { ...process.env };
  try {
    Object.assign(process.env, {
      UAZAPI_URL: "https://shared.test",
      UAZAPI_TOKEN: "shared-test-token",
      GOOGLE_SERVICE_ACCOUNT_EMAIL: "shared@test",
      GOOGLE_PRIVATE_KEY: "test-key",
      GOOGLE_SHEET_ID: "shared-sheet",
      UPSTASH_REDIS_REST_URL: "https://shared-redis.test",
      UPSTASH_REDIS_REST_TOKEN: "test-token",
      FUTPB_UAZAPI_TOKEN: "obsolete-token",
      FUTPB_GOOGLE_SHEET_ID: "obsolete-sheet",
      FUTPB_ENABLE_REAL_SENDS: "false",
    });
    delete process.env.CRM_LOCAL_SERVER;
    const payload = Buffer.from(
      JSON.stringify({
        id: "shared-campaign-1234",
        brand: "flying",
        folderId: "folder",
      }),
    ).toString("base64url");
    const receipt =
      payload +
      "." +
      createHmac("sha256", "shared-test-token").update(payload).digest("hex");
    for (const brand of ["flying", "futpb"]) {
      process.env.APP_BRAND = brand;
      assert.equal(brandEnv("GOOGLE_SHEET_ID"), "shared-sheet");
      assert.deepEqual(uazapiConfig(), {
        url: "https://shared.test",
        token: "shared-test-token",
      });
      assert.equal(configured().google, true);
      assert.equal(configured().storage, true);
      assert.equal(configured().whatsapp, true);
      assert.equal(campaignKey("campaigns"), "flying:campaigns");
      assert.equal(
        readReceipt(receipt, "shared-campaign-1234").folderId,
        "folder",
      );
    }
  } finally {
    for (const key of Object.keys(process.env))
      if (!(key in before)) delete process.env[key];
    Object.assign(process.env, before);
  }
});
