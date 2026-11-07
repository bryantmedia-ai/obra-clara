// Verified buyer for this demo: given name and role only.
// Company, tax id, email and address stay empty.
// The balance address was read from Avalanche on 7 Nov 2026. It is not linked
// until José connects Core in his own browser. Nothing here rotates an owner.
export const verifiedArgtBalanceWallet = "0x621c700f27c2a9631468be51ad7daebe97879b92";

export const buyerProfile = {
  name: "José",
  role: "Contratista",
  initials: "J",
  company: "",
  taxId: "",
  email: "",
  address: "",
  coreWallet: "",
  beloOriginArs: 45000,
} as const;

export function buyerPartyLabel() {
  return buyerProfile.name + " · " + buyerProfile.role;
}
