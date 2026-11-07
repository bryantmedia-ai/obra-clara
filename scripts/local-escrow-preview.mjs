import {createServer} from "node:http";
import {DatabaseSync} from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const exports = {};
  cache.set(file, exports);
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, "utf8"), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true}}).outputText, {
    exports, structuredClone, URL, Request, Response, fetch, TextEncoder, TextDecoder, Uint8Array, console, crypto: globalThis.crypto,
    require: (specifier) => {
      const target = path.normalize(path.join(path.dirname(file), specifier));
      return specifier.endsWith(".json") ? JSON.parse(fs.readFileSync(target, "utf8")) : load(target.endsWith(".ts") ? target : target + ".ts");
    },
  });
  return exports;
}

const worker = load("cloudflare/worker.ts");
const database = new DatabaseSync("/tmp/oc-argt-preview.sqlite");
database.exec(fs.readFileSync("cloudflare/schema.sql", "utf8"));
const env = {
  DB: {prepare(sql) { let values = []; const stmt = {bind(...next) { values = next; return stmt; }, async first() { return database.prepare(sql).get(...values) ?? null; }, async run() { return {meta: {changes: Number(database.prepare(sql).run(...values).changes)}}; }}; return stmt; }},
  OC_ESCROW_RAIL: "avalanche-argt",
  OC_ESCROW_SIMULATION: "1",
  OC_LOCAL_PREVIEW: "1",
  FUJI_ASSET_ADDRESS: "0x2E4e93eCA2E16E4989b894e188B7F7fC0175703B",
  FUJI_ASSET_DECIMALS: "18",
};
const port = Number(process.env.PORT || 8787);
createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) if (value) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
  const response = await worker.handle(new Request("http://127.0.0.1:" + port + req.url, {method: req.method, headers, body: body.length ? body : undefined}), env);
  const bytes = Buffer.from(await response.arrayBuffer());
  res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
  res.end(bytes);
}).listen(port, "127.0.0.1", () => console.log("local escrow preview on " + port));
