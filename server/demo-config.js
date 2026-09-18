// Credenciais temporárias de demonstração incluídas por solicitação explícita.
// Remover este fallback quando a instância de demonstração for desativada.
// Este módulo é utilizado somente pela API, nunca pelo aplicativo no navegador.
export const DEMO_UAZAPI_URL = "https://automatizemais.uazapi.com";
export const DEMO_UAZAPI_TOKEN = "9f704896-732e-4581-8683-99f93c1a69fb";
export const uazapiConfig = () => ({
  url: process.env.UAZAPI_URL?.trim() || DEMO_UAZAPI_URL,
  token: process.env.UAZAPI_TOKEN?.trim() || DEMO_UAZAPI_TOKEN,
});
