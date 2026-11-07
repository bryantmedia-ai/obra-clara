import assert from "node:assert/strict";
import fs from "node:fs";

const profile = fs.readFileSync("lib/buyer-profile.ts", "utf8");
for (const piece of ["name: \"José\"", "role: \"Contratista\"", "initials: \"J\"", "company: \"\"", "taxId: \"\"", "email: \"\"", "address: \"\"", "coreWallet: \"\"", "beloOriginArs: 45000"]) {
  assert.match(profile, new RegExp(piece.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}

const buyerShell = fs.readFileSync("components/saas-app.tsx", "utf8");
assert.match(buyerShell, /José/);
assert.match(buyerShell, /Contratista/);
assert.doesNotMatch(buyerShell, /Jazmín M\./);
const providerShell = fs.readFileSync("components/provider-app.tsx", "utf8");
assert.match(providerShell, /\{provider\.name\}/);
assert.doesNotMatch(providerShell, /José/);
const settings = fs.readFileSync("components/company-settings.tsx", "utf8");
assert.doesNotMatch(settings, /Constructora Madero/);
assert.doesNotMatch(settings, /30-71234567-9/);
assert.match(settings, /sin asignar/);
const finance = fs.readFileSync("lib/finance-model.ts", "utf8");
assert.match(finance, /Jazmín M\./);
console.log("PASS buyer profile is José, contratista, with no invented identity and seller shell unchanged.");
