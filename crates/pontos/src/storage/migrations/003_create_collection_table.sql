-- Up
CREATE TABLE IF NOT EXISTS collection (
    id TEXT PRIMARY KEY,
    contract_address TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,
    indexer_version TEXT,
    indexed_at_block_number INTEGER
);

-- Down
DROP TABLE IF EXISTS collection;
