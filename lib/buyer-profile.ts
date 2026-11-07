// Verified buyer for this demo: given name and role only.
// Company, tax id, email, address and Core wallet are unknown and stay empty.
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
