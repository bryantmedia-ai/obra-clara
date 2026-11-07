CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  revision INTEGER NOT NULL,
  state TEXT NOT NULL CHECK(length(CAST(state AS BLOB)) <= 1800000),
  updated_at TEXT NOT NULL
);

-- Files are stored separately from workspace JSON, in bounded binary chunks.
CREATE TABLE IF NOT EXISTS order_files (
  workspace_id TEXT NOT NULL,
  id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  name TEXT NOT NULL,
  media_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  uploader_role TEXT NOT NULL,
  created_at TEXT NOT NULL,
  ready INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (workspace_id,id)
);
CREATE INDEX IF NOT EXISTS order_files_order ON order_files(workspace_id,order_id);
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
CREATE TABLE IF NOT EXISTS order_file_chunks (
  workspace_id TEXT NOT NULL,
  file_id TEXT NOT NULL,
  part INTEGER NOT NULL,
  data BLOB NOT NULL,
  PRIMARY KEY (workspace_id,file_id,part),
  FOREIGN KEY (workspace_id,file_id) REFERENCES order_files(workspace_id,id)
);
