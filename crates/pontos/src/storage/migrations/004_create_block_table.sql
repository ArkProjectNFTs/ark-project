-- Up
CREATE TABLE IF NOT EXISTS block (
    id TEXT PRIMARY KEY,
    number INTEGER NOT NULL UNIQUE,
    indexer_version TEXT NOT NULL,
    indexer_identifier TEXT NOT NULL,
    status TEXT NOT NULL,
    indexed_at_block_number INTEGER
);

-- Down
DROP TABLE IF EXISTS block;
