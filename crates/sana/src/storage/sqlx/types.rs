//! Those types are decoupling the actual sana
//! storage types and the data annotations required
//! for sqlx code generation.

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct TokenData {
    pub contract_address: String,
    pub token_id: String,
}

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct EventData {
    pub token_event_id: String,
    pub block_timestamp: i64,
    pub contract_address: String,
    pub from_address: String,
    pub to_address: String,
    pub transaction_hash: String,
    pub token_id: String,
    pub token_id_hex: String,
    pub event_type: String,
}

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct BlockData {
    pub block_timestamp: i64,
    pub block_number: i64,
    pub block_status: String,
    pub indexer_version: String,
    pub indexer_identifier: String,
}

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct ContractData {
    pub contract_address: String,
    pub updated_timestamp: i64,
    pub contract_type: String,
}
