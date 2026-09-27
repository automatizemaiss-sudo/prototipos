import { brandEnv, serverBrand, realSendingEnabled } from "./brand.js";
// Credenciais temporárias de demonstração incluídas por solicitação explícita.
// Remover este fallback quando a instância de demonstração for desativada.
// Este módulo é utilizado somente pela API, nunca pelo aplicativo no navegador.
export const DEMO_UAZAPI_URL = "https://automatizemais.uazapi.com";
export const DEMO_UAZAPI_TOKEN = "9f704896-732e-4581-8683-99f93c1a69fb";
export const uazapiConfig = () => {
  if (serverBrand().id === "futpb")
    return realSendingEnabled()
      ? { url: brandEnv("UAZAPI_URL"), token: brandEnv("UAZAPI_TOKEN") }
      : { url: "", token: "" };
  return {
    url: brandEnv("UAZAPI_URL") || DEMO_UAZAPI_URL,
    token: brandEnv("UAZAPI_TOKEN") || DEMO_UAZAPI_TOKEN,
  };
};
