import { defineConfig, loadEnv } from "vite";
import { getBrand } from "./config/brands.js";
import handler from "./api/crm.js";
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  Object.assign(process.env, env);
  const brand = getBrand(env.APP_BRAND || "flying");
  return {
    define: { __APP_BRAND_CONFIG__: JSON.stringify(brand) },
    plugins: [
      {
        name: "brand-html",
        transformIndexHtml(html) {
          return html
            .replace("CRM Flying Imports", brand.title)
            .replace("#111111", brand.colors.theme)
            .replace(
              "</head>",
              `${brand.favicon ? `<link rel="icon" href="${brand.favicon}" />` : ""}</head>`,
            );
        },
      },
      {
        name: "local-crm-api",
        configureServer(server) {
          process.env.CRM_LOCAL_SERVER = "1";
          server.middlewares.use("/api/crm", async (req, res) => {
            try {
              let raw = "";
              for await (const chunk of req) {
                raw += chunk;
                if (raw.length > 1000000) {
                  res.statusCode = 413;
                  res.end();
                  return;
                }
              }
              req.body = raw ? JSON.parse(raw) : {};
              res.status = (code) => {
                res.statusCode = code;
                return res;
              };
              res.json = (value) => {
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(value));
              };
              await handler(req, res);
            } catch {
              res.statusCode = 400;
              res.end('{"error":"Requisição inválida"}');
            }
          });
        },
      },
    ],
  };
});
