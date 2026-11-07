-- Additive. Do not drop or recreate workspaces, order_files or order_file_chunks.
CREATE TABLE IF NOT EXISTS fuji_escrow_receipts (
  workspace_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  status TEXT NOT NULL,
  reason TEXT NOT NULL,
  simulation INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (workspace_id, tx_hash, kind)
);
