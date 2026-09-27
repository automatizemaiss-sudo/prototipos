export const brands = {
  flying: {
    id: "flying",
    name: "Flying Imports",
    title: "CRM Flying Imports",
    footer: "Feito para conectar quem vive o futebol.",
    footerLabel: "FLYING IMPORTS",
    label: "FLYING IMPORTS",
    initials: "FI",
    tagline: "RELACIONAMENTO EM JOGO",
    logo: "/flying-imports-logo.png",
    favicon: "/flying-imports-logo.png",
    greeting: "Olá, {nome}! Tudo bem? Aqui é da Flying Imports. ⚽",
    exportName: "flying-imports-demo.json",
    campaignPrefix: "Flying CRM",
    sheetId: "1np85HlBvIbnVI1eVLWEnTKqzR4tLpMti_fS1OfCYea4",
    colors: {
      theme: "#111111",
      accent: "#202122",
      surface: "#f7f8fa",
      sidebar: "#151618",
    },
  },
  futpb: {
    id: "futpb",
    name: "FUTPB",
    title: "CRM FUTPB",
    label: "CRM FUTPB",
    footer: "Ambiente demonstrativo",
    footerLabel: "FUTPB",
    initials: "F",
    tagline: "AMBIENTE DEMONSTRATIVO",
    logo: "/futpb-logo.png",
    favicon: "/futpb-logo.png",
    greeting: "Olá, {nome}! Tudo bem? Aqui é da FUTPB.",
    exportName: "futpb-demo.json",
    campaignPrefix: "FUTPB CRM",
    sheetId: "",
    colors: {
      theme: "#000000",
      accent: "#12432b",
      surface: "#ffffff",
      sidebar: "#000000",
    },
  },
};
export function getBrand(id = "flying") {
  if (!Object.hasOwn(brands, id))
    throw new Error("APP_BRAND deve ser flying ou futpb.");
  return brands[id];
}
