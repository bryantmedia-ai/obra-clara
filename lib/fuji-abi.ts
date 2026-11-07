export const escrowSelectors = {
  fund: "504a6e00",
  authorizeDelegate: "5bcfdf38",
  settle: "79f48d4c",
  refundExpired: "cc3e049b",
  order: "e80160ab",
  token: "fc0c546a",
  tokenDecimals: "3b97e856",
  chainId: "9a8a0592",
} as const;

export const escrowTopics = {
  funded: "0x3394f16134d70933b6d63abbbbf7e72913899ff905902e9cfef45b95f1c4e9cb",
  authorized: "0x45eae3251ff1b0a03f2da7b653109bc2346724cb2b0600a55ff4afc56e9e649e",
  settled: "0xee7884191419bdb8ec9d946daea882cde371014f132b8a51c14cf8a788e1481c",
  refunded: "0x5573a774401f48f00a6daf92475b23c21e67cb0de431cf3d63cd0558188d155c",
} as const;

export function word(value: string | bigint) {
  const hex = typeof value === "bigint" ? value.toString(16) : value.toLowerCase().replace(/^0x/, "");
  if (!/^[a-f0-9]*$/.test(hex) || hex.length > 64) throw new Error("Valor ABI inválido.");
  return hex.padStart(64, "0");
}

export function encodeFund(args: {orderId: string; seller: string; quantity: bigint; unitPrice: bigint; amount: bigint; deadline: bigint; asset: string}) {
  return "0x" + escrowSelectors.fund + [args.orderId, args.seller, args.quantity, args.unitPrice, args.amount, args.deadline, args.asset].map(word).join("");
}

export function encodeAuthorize(orderId: string, delegate: string) {
  return "0x" + escrowSelectors.authorizeDelegate + word(orderId) + word(delegate);
}

export function encodeSettle(orderId: string, received: bigint) {
  return "0x" + escrowSelectors.settle + word(orderId) + word(received);
}

export function encodeRefund(orderId: string) {
  return "0x" + escrowSelectors.refundExpired + word(orderId);
}

export function encodeDeploy(bytecode: string, token: string, decimals: number, chainId: bigint) {
  const prefix = bytecode.startsWith("0x") ? bytecode : "0x" + bytecode;
  return prefix + word(token) + word(BigInt(decimals)) + word(chainId);
}

export function encodeApprove(spender: string, amount: bigint) {
  return "0x095ea7b3" + word(spender) + word(amount);
}

export function encodeOrder(orderId: string) {
  return "0x" + escrowSelectors.order + word(orderId);
}

export function wordsOf(data: string) {
  const hex = data.toLowerCase().replace(/^0x/, "");
  if (hex.length % 64 !== 0) throw new Error("Datos ABI incompletos.");
  const words: string[] = [];
  for (let i = 0; i < hex.length; i += 64) words.push(hex.slice(i, i + 64));
  return words;
}

export function addressOf(wordValue: string) {
  return "0x" + wordValue.toLowerCase().replace(/^0x/, "").slice(-40);
}

export function uintOf(wordValue: string) {
  return BigInt("0x" + wordValue);
}

export function decodeFund(data: string) {
  const hex = data.toLowerCase().replace(/^0x/, "");
  if (!hex.startsWith(escrowSelectors.fund)) throw new Error("La transacción no llama a fund.");
  const words = wordsOf("0x" + hex.slice(8));
  if (words.length !== 7) throw new Error("La llamada fund no tiene los términos esperados.");
  return {
    orderId: "0x" + words[0],
    seller: addressOf(words[1]),
    quantity: uintOf(words[2]),
    unitPrice: uintOf(words[3]),
    amount: uintOf(words[4]),
    deadline: uintOf(words[5]),
    asset: addressOf(words[6]),
  };
}
