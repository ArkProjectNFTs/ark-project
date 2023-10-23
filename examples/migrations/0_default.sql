-- SQL default migration with simple tables.
--
-- TODO: investigate why sqlx is complaining for
-- NULL not being compatible with `Option<T>`...
-- Supposed to be fixed in older versions of sqlx.

CREATE TABLE token (
       contract_address TEXT NOT NULL,
       token_id TEXT NOT NULL,
       token_id_hex TEXT NOT NULL,
       owner TEXT NOT NULL,
       mint_address TEXT DEFAULT '',
       mint_timestamp BIGINT DEFAULT 0,
       mint_transaction_hash TEXT DEFAULT '',
       block_timestamp BIGINT NOT NULL,

       PRIMARY KEY (contract_address, token_id_hex)
);

CREATE TABLE event (
       block_timestamp BIGINT NOT NULL,
       from_address TEXT NOT NULL,
       to_address TEXT NOT NULL,
       contract_address TEXT NOT NULL,
       transaction_hash TEXT NOT NULL,
       token_id TEXT NOT NULL,
       token_id_hex TEXT NOT NULL,
       contract_type TEXT NOT NULL,
       event_type TEXT NOT NULL,
       event_id TEXT NOT NULL,

       PRIMARY KEY (event_id)
);

CREATE TABLE block (
       ts BIGINT NOT NULL,
       num BIGINT NOT NULL,
       status TEXT NOT NULL,
       indexer_version TEXT NOT NULL,
       indexer_identifier TEXT NOT NULL,

       PRIMARY KEY (ts)
);

CREATE TABLE contract (
       contract_address TEXT NOT NULL,
       contract_type TEXT NOT NULL,
       block_timestamp BIGINT NOT NULL,

       PRIMARY KEY (contract_address)
);
