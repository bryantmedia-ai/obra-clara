import assert from "node:assert/strict";
import {createHash, webcrypto} from "node:crypto";
import {spawn, execFile} from "node:child_process";
import {promisify} from "node:util";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import {DatabaseSync} from "node:sqlite";

const exec = promisify(execFile);
const foundry = "/home/ubuntu/.foundry/bin";
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const exports = {};
  cache.set(file, exports);
  const source = fs.readFileSync(file, "utf8");
  vm.runInNewContext(ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true}}).outputText, {
    exports, structuredClone, URL, Request, Response, fetch, TextEncoder, TextDecoder, Uint8Array, console, crypto: webcrypto,
    require: (specifier) => {
      const target = path.normalize(path.join(path.dirname(file), specifier));
      return specifier.endsWith(".json") ? JSON.parse(fs.readFileSync(target, "utf8")) : load(target.endsWith(".ts") ? target : target + ".ts");
    },
  });
  return exports;
}

const catalog = load("components/marketplace-data.ts");
const asset = load("lib/fuji-asset.ts");
const hashing = load("lib/sha256.ts");
const escrow = load("lib/fuji-escrow.ts");
const abi = load("lib/fuji-abi.ts");
const model = load("lib/demo-model.ts");
const worker = load("cloudflare/worker.ts");

assert.equal(hashing.sha256Hex("obra-clara"), createHash("sha256").update("obra-clara").digest("hex"));
const terms = escrow.commercialBase(6);
assert.equal(terms.quantity, 100n);
assert.equal(terms.unitPrice, 50_000n);
assert.equal(terms.amount, 5_000_000n);
const partial = escrow.settlement(5_000_000n, 100n, 80n);
assert.equal(partial.seller, 4_000_000n);
assert.equal(partial.buyer, 1_000_000n);
assert.equal(partial.seller + partial.buyer, 5_000_000n);
const none = escrow.settlement(5_000_000n, 100n, 0n);
const full = escrow.settlement(5_000_000n, 100n, 100n);
const rounded = escrow.settlement(100n, 3n, 1n);
assert.equal(none.seller, 0n); assert.equal(none.buyer, 5_000_000n);
assert.equal(full.seller, 5_000_000n); assert.equal(full.buyer, 0n);
assert.throws(() => escrow.settlement(100n, 3n, 4n));
assert.equal(rounded.seller, 33n); assert.equal(rounded.buyer, 67n);
assert.equal(escrow.approveSteps(0n, 5n).join(","), "5");
assert.equal(escrow.approveSteps(5n, 5n).length, 0);
assert.equal(escrow.approveSteps(1n, 5n).join(","), "0,5");

const pending = asset.readAssetConfig({});
assert.equal(pending.ready, false);
assert.equal(pending.symbol, "USDT");
assert.equal(asset.canMoveOfficialFunds(pending), false);
assert.equal(asset.readAssetConfig({symbol: "USDT", address: asset.MAINNET_USDT, decimals: "6"}).ready, false);
assert.equal(asset.readAssetConfig({symbol: "USDT", address: asset.CIRCLE_FUJI_USDC, decimals: "6"}).ready, false);
const usdc = asset.readAssetConfig({symbol: "USDC", address: asset.CIRCLE_FUJI_USDC, decimals: "6"});
assert.equal(usdc.ready, true);
assert.equal(asset.canMoveOfficialFunds(asset.readAssetConfig({symbol: "USDT", address: "0x1111111111111111111111111111111111111111", decimals: "6", simulation: true})), false);
const cement = catalog.completeMarketplaceCatalog.find(item => item.id === asset.LIVE_CEMENT_OFFER_ID);
assert.equal(cement.unit, "Bolsa de 50 kg");
assert.equal(cement.kg, 50);
assert.ok(cement.stock >= 100);
assert.ok((cement.minimumOrder ?? 1) <= 100);
console.log("PASS asset config blocks mainnet USDT and does not fall back to USDC.");

const database = new DatabaseSync(":memory:");
database.exec(fs.readFileSync("cloudflare/schema.sql", "utf8"));
const env = {DB: {prepare(sql) { let values = []; const stmt = {bind(...valuesIn) { values = valuesIn; return stmt; }, async first() { return database.prepare(sql).get(...values) ?? null; }, async run() { return {meta: {changes: Number(database.prepare(sql).run(...values).changes)}}; }}; return stmt; }}, FUJI_RPC_URL: "http://127.0.0.1:8545", FUJI_ALLOW_LOCAL_CHAIN: "1", FUJI_ASSET_SIMULATION: "1", FUJI_ASSET_SYMBOL: "USDT", FUJI_ASSET_ADDRESS: "", FUJI_ASSET_DECIMALS: "6"};
const token = "d".repeat(64);
function request(command, {path = "/api/demo", fresh = false, method = command ? "POST" : "GET"} = {}) {
  return worker.handle(new Request("https://api.example" + path, {method, headers: {Origin: "https://obra-clara-comprador.vercel.app", Authorization: "Bearer " + token, ...(fresh ? {"X-OC-New-Workspace": "1"} : {}), ...(command ? {"Content-Type": "application/json"} : {})}, body: command ? JSON.stringify(command) : undefined}), env);
}
let response = await request(null, {fresh: true});
assert.equal(response.status, 200);
const initial = await response.json();
const project = initial.projects[0];
const delivery = {address: project.address, contactName: "Recepcion de obra", contactPhone: "1140001000", requestedDate: "", timeWindow: "08:00 a 12:00", notes: ""};
const seller = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";
const walletBefore = initial.finance.wallet;
response = await request({id: "cement-100", type: "fuji.checkout", payload: {mode: "partial", offerId: asset.LIVE_CEMENT_OFFER_ID, quantity: 100, projectId: project.id, seller, deadline: Math.floor(Date.now() / 1000) + 86400, delivery, phase: "reservada", amount: "1"}});
assert.equal(response.status, 200, await response.clone().text());
let state = await response.json();
const order = state.orders.find(item => item.requestId === "cement-100");
assert.equal(order.escrow.phase, "activo pendiente");
assert.equal(order.escrow.amount, "");
assert.equal(order.status, "Pendiente");
assert.equal(state.finance.wallet, walletBefore);
assert.equal((await request({id: "cement-100", type: "fuji.checkout", payload: order.escrow})).status, 200);
response = await request({id: "fake-confirm", type: "fuji.confirm", payload: {orderId: order.id, phase: "reservada"}});
assert.equal(response.status, 400);
response = await request({id: "early-dispatch", type: "fuji.dispatch", payload: {orderId: order.id}});
assert.equal(response.status, 400);
const sellerView = await (await request(null, {path: "/api/demo"})).json();
assert.equal(sellerView.orders.find(item => item.id === order.id).status, "Pendiente");
const blocked = await (await request({action: "verify", orderId: order.id, txHash: "0x" + "ab".repeat(32), kind: "fund"}, {path: "/api/fuji-escrow"})).json();
assert.equal(blocked.verdict.status, "rejected");
assert.match(blocked.verdict.reason, /USDT/);
console.log("PASS shared order does not reserve funds and a client cannot mark it confirmed.");

const chainToken = "e".repeat(64);
function chainRequest(command, options = {}) {
  return worker.handle(new Request("https://api.example" + (options.path || "/api/demo"), {method: command ? "POST" : "GET", headers: {Origin: "https://obra-clara-proveedor.vercel.app", Authorization: "Bearer " + chainToken, "X-OC-New-Workspace": "1", ...(command ? {"Content-Type": "application/json"} : {})}, body: command ? JSON.stringify(command) : undefined}), env);
}
const anvil = spawn(path.join(foundry, "anvil"), ["--port", "8545", "--silent", "--chain-id", "31337"], {stdio: "ignore"});
process.on("exit", () => anvil.kill());
await new Promise((resolve, reject) => {
  const started = Date.now();
  const timer = setInterval(async () => {
    try { await fetch("http://127.0.0.1:8545", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({jsonrpc: "2.0", id: 1, method: "eth_chainId", params: []})}); clearInterval(timer); resolve(); }
    catch (error) { if (Date.now() - started > 10000) { clearInterval(timer); reject(error); } }
  }, 100);
});
const buyer = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const employee = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
async function cast(args) {
  const bin = args[0] === "inspect" ? "forge" : "cast";
  const {stdout} = await exec(path.join(foundry, bin), args, {cwd: "/workspace", env: {...process.env, PATH: foundry + ":" + process.env.PATH}});
  return stdout.trim();
}
const units = (output) => BigInt(output.split(" ")[0]);
async function send(args) {
  const out = await cast(["send", "--rpc-url", "http://127.0.0.1:8545", "--unlocked", "--json", ...args]);
  return JSON.parse(out);
}
const tokenCode = (await cast(["inspect", "LocalSimulationERC20", "bytecode"])).trim() + (await cast(["abi-encode", "constructor(uint8)", "6"])).slice(2);
const tokenDeploy = await send(["--from", buyer, "--create", tokenCode]);
const tokenAddress = tokenDeploy.contractAddress;
env.FUJI_ASSET_ADDRESS = tokenAddress;
await send(["--from", buyer, tokenAddress, "mint(address,uint256)", buyer, "20000000"]);
const escrowCode = (await cast(["inspect", "ObraClaraPartialEscrow", "bytecode"])).trim() + (await cast(["abi-encode", "constructor(address,uint8,uint256)", tokenAddress, "6", "31337"])).slice(2);
const escrowDeploy = await send(["--from", buyer, "--create", escrowCode]);
const escrowAddress = escrowDeploy.contractAddress;
assert.equal((await chainRequest(null)).status, 200);
let verified = await (await chainRequest({action: "verify", txHash: escrowDeploy.transactionHash, kind: "deployment"}, {path: "/api/fuji-escrow"})).json();
assert.equal(verified.verdict.status, "confirmed", JSON.stringify(verified));
assert.match(verified.verdict.reason, /Simulación local/);
const fundedResponse = await chainRequest({id: "cement-funded", type: "fuji.checkout", payload: {mode: "partial", offerId: asset.LIVE_CEMENT_OFFER_ID, quantity: 100, projectId: project.id, seller, deadline: Math.floor(Date.now() / 1000) + 86400, delivery, amount: "1", token: asset.CIRCLE_FUJI_USDC, phase: "reservada", simulation: false}});
assert.equal(fundedResponse.status, 200, await fundedResponse.clone().text());
const funded = await fundedResponse.json();
const live = funded.orders.find(item => item.requestId === "cement-funded");
assert.equal(live.escrow.phase, "sin reserva");
assert.equal(live.escrow.amount, "5000000");
assert.equal(live.escrow.simulation, true);
assert.equal(live.escrow.token, tokenAddress.toLowerCase());
assert.equal(live.lines[0].quantity, 100);
assert.match(live.lines[0].name, /Bolsa de 50 kg/);
const data = abi.encodeFund({orderId: live.escrow.orderId, seller, quantity: 100n, unitPrice: 50_000n, amount: 5_000_000n, deadline: BigInt(live.escrow.deadline), asset: tokenAddress});
const castData = await cast(["calldata", "fund(bytes32,address,uint256,uint256,uint256,uint64,address)", live.escrow.orderId, seller, "100", "50000", "5000000", live.escrow.deadline, tokenAddress]);
assert.equal(data.toLowerCase(), castData.toLowerCase());
const artifact = JSON.parse(fs.readFileSync("lib/fuji-escrow-artifact.json", "utf8"));
const encodedDeploy = abi.encodeDeploy(artifact.bytecode, tokenAddress, 6, 43113n);
const deployArgs = await cast(["abi-encode", "constructor(address,uint8,uint256)", tokenAddress, "6", "43113"]);
assert.equal(encodedDeploy.toLowerCase(), (artifact.bytecode + deployArgs.slice(2)).toLowerCase());
assert.ok(artifact.bytecode.startsWith("0x"));
await send(["--from", buyer, tokenAddress, "approve(address,uint256)", escrowAddress, "20000000"]);
const sellerBefore = units(await cast(["call", tokenAddress, "balanceOf(address)(uint256)", seller]));
const fundTx = await send(["--from", buyer, escrowAddress, data]);
verified = await (await chainRequest({action: "verify", orderId: live.id, txHash: fundTx.transactionHash, kind: "fund"}, {path: "/api/fuji-escrow"})).json();
assert.equal(verified.verdict.status, "confirmed", JSON.stringify(verified));
assert.equal(verified.order.escrow.phase, "reservada");
const again = await (await chainRequest({action: "verify", orderId: live.id, txHash: fundTx.transactionHash, kind: "fund"}, {path: "/api/fuji-escrow"})).json();
assert.equal(again.order.escrow.phase, "reservada");
const dispatched = await (await chainRequest({id: "dispatch-cement", type: "fuji.dispatch", payload: {orderId: live.id}})).json();
assert.equal(dispatched.orders.find(item => item.id === live.id).status, "Despachada");
async function readAs(origin) {
  const res = await worker.handle(new Request("https://api.example/api/demo", {headers: {Origin: origin, Authorization: "Bearer " + chainToken}}), env);
  return (await res.json()).orders.find(item => item.id === live.id);
}
const buyerOrder = await readAs("https://obra-clara-comprador.vercel.app");
const sellerOrder = await readAs("https://obra-clara-proveedor.vercel.app");
assert.equal(buyerOrder.status, "Despachada");
assert.equal(sellerOrder.status, "Despachada");
assert.equal(buyerOrder.escrow.phase, sellerOrder.escrow.phase);
assert.equal(buyerOrder.lines[0].name, sellerOrder.lines[0].name);
const injected = await chainRequest({action: "verify", orderId: live.id, txHash: fundTx.transactionHash, kind: "fund", phase: "liquidada"}, {path: "/api/fuji-escrow"});
assert.equal(injected.status, 400);
const strict = await worker.handle(new Request("https://api.example/api/fuji-escrow", {method: "POST", headers: {Origin: "https://obra-clara-comprador.vercel.app", Authorization: "Bearer " + chainToken, "Content-Type": "application/json"}, body: JSON.stringify({action: "verify", orderId: live.id, txHash: fundTx.transactionHash, kind: "fund"})}), {...env, FUJI_ALLOW_LOCAL_CHAIN: ""});
const strictBody = await strict.json();
assert.equal(strictBody.verdict.status, "rejected");
assert.match(strictBody.verdict.reason, /Fuji/);
assert.equal((await readAs("https://obra-clara-comprador.vercel.app")).escrow.phase, "reservada");
assert.equal(units(await cast(["call", tokenAddress, "balanceOf(address)(uint256)", seller])), sellerBefore);
const authTx = await send(["--from", buyer, escrowAddress, "authorizeDelegate(bytes32,address)", live.escrow.orderId, employee]);
verified = await (await chainRequest({action: "verify", orderId: live.id, txHash: authTx.transactionHash, kind: "authorize"}, {path: "/api/fuji-escrow"})).json();
assert.equal(verified.order.escrow.delegate, employee.toLowerCase(), JSON.stringify(verified));
const badAuth = await cast(["calldata", "authorizeDelegate(bytes32,address)", live.escrow.orderId, seller]);
const badHash = await cast(["rpc", "--rpc-url", "http://127.0.0.1:8545", "eth_sendTransaction", JSON.stringify({from: buyer, to: escrowAddress, data: badAuth})]);
const badReceipt = JSON.parse(await cast(["rpc", "--rpc-url", "http://127.0.0.1:8545", "eth_getTransactionReceipt", badHash]));
assert.equal(badReceipt.status, "0x0");
const sellerTry = await (await chainRequest({action: "verify", orderId: live.id, txHash: badHash, kind: "authorize"}, {path: "/api/fuji-escrow"})).json();
assert.notEqual(sellerTry.verdict?.status, "confirmed");
assert.equal((await readAs("https://obra-clara-proveedor.vercel.app")).escrow.delegate, employee.toLowerCase());
const settleTx = await send(["--from", employee, escrowAddress, "settle(bytes32,uint256)", live.escrow.orderId, "80"]);
verified = await (await chainRequest({action: "verify", orderId: live.id, txHash: settleTx.transactionHash, kind: "settle"}, {path: "/api/fuji-escrow"})).json();
assert.equal(verified.verdict.status, "confirmed", JSON.stringify(verified));
assert.equal(verified.order.escrow.phase, "liquidada");
assert.equal(verified.order.escrow.received, "80");
assert.equal(verified.order.escrow.sellerAmount, "4000000");
assert.equal(verified.order.escrow.buyerRefund, "1000000");
assert.equal(verified.order.status, "Recibida");
assert.equal(units(await cast(["call", tokenAddress, "balanceOf(address)(uint256)", seller])), 4_000_000n);
assert.equal(units(await cast(["call", tokenAddress, "balanceOf(address)(uint256)", escrowAddress])), 0n);
const replay = await (await chainRequest({action: "verify", orderId: live.id, txHash: settleTx.transactionHash, kind: "settle"}, {path: "/api/fuji-escrow"})).json();
assert.equal(replay.order.escrow.sellerAmount, "4000000");
console.log("PASS local chain receipt: 80 received, 4 paid, 1 refunded, dispatch did not pay, replay did not double.");

const expiryResponse = await chainRequest({id: "cement-expiry", type: "fuji.checkout", payload: {mode: "expiry", offerId: asset.LIVE_CEMENT_OFFER_ID, quantity: 100, projectId: project.id, seller, deadline: Math.floor(Date.now() / 1000) + 90, delivery, amount: "9"}});
assert.equal(expiryResponse.status, 200, await expiryResponse.clone().text());
const expiry = (await expiryResponse.json()).orders.find(item => item.requestId === "cement-expiry");
assert.equal(expiry.lines[0].quantity, 100);
assert.match(expiry.lines[0].name, /Bolsa de 50 kg/);
const rebound = await (await chainRequest({action: "verify", orderId: expiry.id, txHash: fundTx.transactionHash, kind: "fund"}, {path: "/api/fuji-escrow"})).json();
assert.notEqual(rebound.verdict.status, "confirmed");
assert.equal(rebound.order.escrow.phase, "sin reserva");
assert.equal(rebound.order.lines[0].quantity, 100);
const expiryData = abi.encodeFund({orderId: expiry.escrow.orderId, seller, quantity: 100n, unitPrice: 50_000n, amount: 5_000_000n, deadline: BigInt(expiry.escrow.deadline), asset: tokenAddress});
const expiryFund = await send(["--from", buyer, escrowAddress, expiryData]);
verified = await (await chainRequest({action: "verify", orderId: expiry.id, txHash: expiryFund.transactionHash, kind: "fund"}, {path: "/api/fuji-escrow"})).json();
assert.equal(verified.order.escrow.phase, "reservada");
await cast(["rpc", "--rpc-url", "http://127.0.0.1:8545", "evm_increaseTime", "120"]);
await cast(["rpc", "--rpc-url", "http://127.0.0.1:8545", "evm_mine"]);
const refundTx = await send(["--from", seller, escrowAddress, "refundExpired(bytes32)", expiry.escrow.orderId]);
verified = await (await chainRequest({action: "verify", orderId: expiry.id, txHash: refundTx.transactionHash, kind: "refund"}, {path: "/api/fuji-escrow"})).json();
assert.equal(verified.order.escrow.phase, "reembolsada", JSON.stringify(verified));
assert.equal(verified.order.status, "Cancelada");
assert.equal(units(await cast(["call", tokenAddress, "balanceOf(address)(uint256)", escrowAddress])), 0n);
anvil.kill();
console.log("PASS expiry without receipt refunds the full locked amount.");
