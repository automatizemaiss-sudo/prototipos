import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
let db;
function database() {
  if (!db) {
    const dir = resolve(".local-data");
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    db = new DatabaseSync(resolve(dir, "crm.sqlite"));
    db.exec(
      "PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS entries (key TEXT PRIMARY KEY, value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS members (key TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY(key,value));",
    );
  }
  return db;
}
export function localCommand([command, key, value, mode]) {
  const db = database();
  switch (command) {
    case "PING":
      return "PONG";
    case "SET": {
      const result =
        mode === "NX"
          ? db
              .prepare("INSERT OR IGNORE INTO entries(key,value) VALUES (?,?)")
              .run(key, value)
          : db
              .prepare(
                "INSERT INTO entries(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
              )
              .run(key, value);
      return result.changes ? "OK" : null;
    }
    case "GET":
      return (
        db.prepare("SELECT value FROM entries WHERE key=?").get(key)?.value ??
        null
      );
    case "SADD":
      return db
        .prepare("INSERT OR IGNORE INTO members(key,value) VALUES (?,?)")
        .run(key, value).changes;
    case "SMEMBERS":
      return db
        .prepare("SELECT value FROM members WHERE key=?")
        .all(key)
        .map((x) => x.value);
    default:
      throw Error("Comando não suportado.");
  }
}
