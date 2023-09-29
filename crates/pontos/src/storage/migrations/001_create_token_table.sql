-- Up
CREATE TABLE IF NOT EXISTS token (
    id TEXT PRIMARY KEY,
    address TEXT NOT NULL,
    token_id TEXT NOT NULL,
    padded_token_id TEXT NOT NULL,
    owner TEXT NOT NULL,
    mint_address TEXT,
    mint_timestamp INTEGER,
    mint_transaction_hash TEXT,
    mint_block_number INTEGER,
    indexer_version TEXT,
    indexed_at_block_number INTEGER,
    UNIQUE(address, token_id)
);

-- Down
DROP TABLE IF EXISTS token;
