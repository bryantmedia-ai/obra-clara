-- Additive and empty of data changes.
-- Fuji receipts and workspace JSON keep the chainId they already stored.
-- ARGt orders record 43114 inside the same document. Nothing here retargets old rows.
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
