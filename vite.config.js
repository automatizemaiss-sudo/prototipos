import { defineConfig, loadEnv } from "vite";
import handler from "./api/crm.js";
export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
  return {
    plugins: [
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
