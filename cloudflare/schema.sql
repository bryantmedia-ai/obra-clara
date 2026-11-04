CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  revision INTEGER NOT NULL,
  state TEXT NOT NULL CHECK(length(CAST(state AS BLOB)) <= 1800000),
  updated_at TEXT NOT NULL
);
