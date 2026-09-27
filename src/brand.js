export const brand = __APP_BRAND_CONFIG__;
export const storageKey = (suffix) => `${brand.id}-${suffix}`;
document.documentElement.dataset.brand = brand.id;
for (const [name, value] of Object.entries(brand.colors)) {
  document.documentElement.style.setProperty(`--brand-${name}`, value);
}
