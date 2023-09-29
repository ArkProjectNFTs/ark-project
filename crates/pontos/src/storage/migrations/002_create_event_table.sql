-- Up
CREATE TABLE IF NOT EXISTS event (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL UNIQUE,
    timestamp INTEGER NOT NULL,
    from_address TEXT NOT NULL,
    to_address TEXT NOT NULL,
    contract_address TEXT NOT NULL,
    transaction_hash TEXT NOT NULL,
    token_id TEXT NOT NULL,
    padded_token_id TEXT NOT NULL,
    block_number INTEGER NOT NULL,
    contract_type TEXT NOT NULL,
    event_type TEXT NOT NULL,
    indexer_version TEXT,
    indexed_at_block_number INTEGER
);

-- Down
DROP TABLE IF EXISTS event;
