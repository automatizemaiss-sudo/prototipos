export async function request(action, body) {
  const r = await fetch("/api/crm?action=" + action, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : {},
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let d;
  try {
    d = await r.json();
  } catch {
    throw Error(
      "Servidor indisponível. Execute com npm run dev ou publique na Vercel.",
    );
  }
  if (!r.ok) {
    const e = Error(d.error || "Existem conflitos que precisam ser revisados.");
    e.conflicts = d.conflicts;
    throw e;
  }
  return d;
}
