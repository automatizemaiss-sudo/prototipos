import { getBrand } from "../config/brands.js";
export const serverBrand = () => getBrand(process.env.APP_BRAND || "flying");
export const campaignKey = (suffix) => `${serverBrand().id}:${suffix}`;
// FUTPB never falls back to the active store's unprefixed credentials.
export function brandEnv(key) {
  const brand = serverBrand();
  const value =
    process.env[brand.id === "futpb" ? `FUTPB_${key}` : key]?.trim() || "";
  if (
    brand.id === "futpb" &&
    key === "GOOGLE_SHEET_ID" &&
    (value === getBrand("flying").sheetId ||
      (value && value === process.env.GOOGLE_SHEET_ID))
  ) {
    throw new Error("A FUTPB exige uma planilha separada da Flying.");
  }
  return value;
}
export const realSendingEnabled = () =>
  serverBrand().id === "flying" || brandEnv("ENABLE_REAL_SENDS") === "true";
