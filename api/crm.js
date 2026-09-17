import { createHash } from "node:crypto";
import {
  configured,
  auth,
  same,
  session,
  fail,
  readContacts,
  mergeContacts,
  contactToRow,
  sheets,
  redis,
  uaz,
  saveCampaign,
  failedRecipients,
} from "../server/core.js";
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const action =
      req.query?.action ||
      new URL(req.url, "http://localhost").searchParams.get("action");
    let body = req.body || {};
    if (typeof body === "string") body = JSON.parse(body);
    if (
      req.method === "POST" &&
      req.headers.origin &&
      new URL(req.headers.origin).host !== req.headers.host
    )
      throw fail("Origem não autorizada.", 403);
    if (action === "status") {
      if (req.method !== "GET") throw fail("Método não permitido.", 405);
      return res
        .status(200)
        .json({ ...configured(), authenticated: auth(req) });
    }
    if (action === "login") {
      if (req.method !== "POST") throw fail("Método não permitido.", 405);
      if (
        !process.env.PRESENTER_PASSWORD ||
        !same(body.password, process.env.PRESENTER_PASSWORD)
      )
        throw fail("Senha do apresentador inválida.", 401);
      res.setHeader(
        "Set-Cookie",
        `flying_presenter=${session()}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=28800${process.env.VERCEL ? "; Secure" : ""}`,
      );
      return res.status(200).json({ authenticated: true });
    }
    if (!auth(req))
      throw fail(
        "Entre como apresentador para usar as integrações reais.",
        401,
      );
    if (action === "campaign-list" && req.method === "GET") {
      const ids = await redis(["SMEMBERS", "flying:campaigns"]);
      const campaigns = await Promise.all(
        ids.map(async (id) =>
          JSON.parse(await redis(["GET", "flying:campaign:" + id])),
        ),
      );
      return res.status(200).json({ campaigns: campaigns.filter(Boolean) });
    }
    if (action === "sheet-read" && req.method === "GET")
      return res.status(200).json(await readContacts());
    if (action === "sheet-sync" && req.method === "POST") {
      if (!Array.isArray(body.contacts) || body.contacts.length > 999)
        throw fail("Base de contatos inválida.");
      let remote = await readContacts();
      if (remote.conflicts.length) return res.status(409).json(remote);
      let merged = mergeContacts(
        body.contacts,
        remote.contacts,
        body.base || [],
      );
      if (merged.conflicts.length) return res.status(409).json(merged);
      await sheets(
        "/values:batchUpdate",
        {
          valueInputOption: "RAW",
          data: merged.contacts.map((c, i) => ({
            range: `'Contatos'!A${i + 2}:M${i + 2}`,
            values: [contactToRow(c)],
          })),
        },
        "POST",
      );
      return res
        .status(200)
        .json({ ...merged, syncedAt: new Date().toISOString() });
    }
    if (action === "retry-review" && req.method === "POST") {
      const result = await failedRecipients(body.id);
      return res.status(200).json(result);
    }
    if (action === "campaign-retry" && req.method === "POST") {
      const { failedIds, recipients } = await failedRecipients(body.retryOf);
      if (!recipients.length)
        throw fail("Nenhuma falha confirmada para reenviar.");
      const id =
        "retry-" +
        createHash("sha256")
          .update(body.retryOf + failedIds.join(","))
          .digest("hex")
          .slice(0, 40);
      return res
        .status(200)
        .json(await saveCampaign({ ...body, id, recipients }));
    }
    if (action === "campaign-start" && req.method === "POST")
      return res.status(200).json(await saveCampaign(body));
    if (action === "campaign-status" && req.method === "POST") {
      if (!/^[\w-]{16,80}$/.test(body.id || ""))
        throw fail("Campanha inválida.");
      const raw = await redis(["GET", "flying:campaign:" + body.id]);
      if (!raw) throw fail("Campanha não encontrada.", 404);
      let c = JSON.parse(raw);
      if (c.folderId) {
        const [folders, messages] = await Promise.all([
          uaz("/sender/listfolders"),
          uaz("/sender/listmessages", {
            folder_id: c.folderId,
            limit: 1000,
            offset: 0,
          }),
        ]);
        const f = Array.isArray(folders)
          ? folders.find((f) => f.id === c.folderId)
          : null;
        const ms = messages.messages || [];
        c = {
          ...c,
          status: f?.status || c.status,
          messages: ms,
          processed: ms.filter((m) =>
            ["Failed", "Sent", "Delivered", "Read", "Canceled"].includes(
              m.status,
            ),
          ).length,
          failed: ms.filter((m) => m.status === "Failed").length,
        };
        await redis(["SET", "flying:campaign:" + c.id, JSON.stringify(c)]);
      }
      return res.status(200).json(c);
    }
    if (action === "campaign-control" && req.method === "POST") {
      if (!["stop", "continue", "delete"].includes(body.command))
        throw fail("Ação inválida.");
      const raw = await redis(["GET", "flying:campaign:" + body.id]);
      if (!raw) throw fail("Campanha não encontrada.", 404);
      const c = JSON.parse(raw);
      if (!c.folderId) throw fail("A campanha não possui fila confirmada.");
      return res
        .status(200)
        .json(
          await uaz("/sender/edit", {
            folder_id: c.folderId,
            action: body.command,
          }),
        );
    }
    throw fail("Ação não disponível.", 404);
  } catch (e) {
    res
      .status(e.status || 500)
      .json({
        error: e.status
          ? e.message
          : "Falha no servidor. Confira a configuração das integrações.",
      });
  }
}
