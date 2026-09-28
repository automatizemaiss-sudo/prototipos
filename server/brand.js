import { getBrand } from "../config/brands.js";
// Visual identity is independent from the shared CRM infrastructure.
export const serverBrand = () => getBrand(process.env.APP_BRAND || "flying");
export const campaignKey = (suffix) => `flying:${suffix}`;
export const brandEnv = (key) => process.env[key]?.trim() || "";
