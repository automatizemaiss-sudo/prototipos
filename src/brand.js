import { getBrand } from "../config/brands.js";
export const initialBrand = __APP_BRAND_CONFIG__;
export function loadBrand() {
  try {
    return getBrand(
      localStorage.getItem("crm-visual-brand") || initialBrand.id,
    );
  } catch {
    return initialBrand;
  }
}
export function saveBrand(id) {
  const brand = getBrand(id);
  localStorage.setItem("crm-visual-brand", brand.id);
  return brand;
}
// Keep existing Flying data and histories when changing presentation.
export const storageKey = (suffix) => `flying-${suffix}`;
export function applyBrand(id) {
  const brand = getBrand(id);
  document.documentElement.dataset.brand = brand.id;
  document.title = brand.title;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", brand.colors.theme);
  let favicon = document.querySelector('link[rel="icon"]');
  if (!favicon) {
    favicon = document.createElement("link");
    favicon.rel = "icon";
    document.head.appendChild(favicon);
  }
  favicon.href = brand.favicon;
  for (const [name, value] of Object.entries(brand.colors)) {
    document.documentElement.style.setProperty(`--brand-${name}`, value);
  }
  return brand;
}
applyBrand(loadBrand().id);
