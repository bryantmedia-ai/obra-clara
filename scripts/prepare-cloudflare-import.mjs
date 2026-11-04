import fs from 'node:fs';
import path from 'node:path';

// Input must be the original persisted Blob JSON, not a snapshot API response:
// snapshots omit command IDs and subtract reservations from stock.
const [directory, output] = process.argv.slice(2);
if (!directory || !output) throw new Error('Usage: node scripts/prepare-cloudflare-import.mjs <private-export-directory> <private-output.sql>');
const files = fs.readdirSync(directory).filter(file => /^[a-f0-9]{64}\.json$/.test(file));
if (!files.length) throw new Error('No persisted workspace exports found. Nothing was generated.');
const quote = value => "'" + String(value).replaceAll("'", "''") + "'";
const statements = ['-- Private workspace data. Never commit this file.'];
for (const file of files) {
  const raw = fs.readFileSync(path.join(directory, file), 'utf8');
  const state = JSON.parse(raw);
  if (!Number.isSafeInteger(state.revision) || state.revision < 0 || !['providers', 'offers', 'projects', 'orders', 'commands'].every(key => Array.isArray(state[key]))) throw new Error('Invalid persisted export: ' + file);
  if (Buffer.byteLength(raw) > 1_800_000) throw new Error('Workspace needs a larger data model before migration: ' + file);
  statements.push(`INSERT OR IGNORE INTO workspaces (id, revision, state, updated_at) VALUES (${quote(file.slice(0,-5))}, ${state.revision}, ${quote(JSON.stringify(state))}, ${quote(new Date().toISOString())});`);
}
fs.mkdirSync(path.dirname(output), {recursive: true});
fs.writeFileSync(output, statements.join('\n') + '\n', {mode: 0o600});
console.log(`Prepared ${files.length} workspace imports. Existing Cloudflare rows will not be overwritten.`);
