//! Those types are decoupling the actual pontos
//! storage types and the data annotations required
//! for sqlx code generation.

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct TokenData {
    pub contract_id: i32,
    pub contract_address: String,
    pub token_id: String,
    pub token_id_hex: String,
    pub owner: String,
    pub block_timestamp: i64,
    pub mint_address: Option<String>,
    pub mint_timestamp: Option<i64>,
    pub mint_transaction_hash: Option<String>,
}

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct EventData {
    pub block_timestamp: i64,
    pub contract_address: String,
    pub from_address: String,
    pub to_address: String,
    pub transaction_hash: String,
    pub token_id: String,
    pub token_id_hex: String,
    pub contract_type: String,
    pub event_type: String,
    pub event_id: String,
}

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct BlockData {
    pub timestamp: i64,
    #[sqlx(rename = "block_number")]
    pub number: i64,
    pub status: String,
    pub indexer_version: String,
    pub indexer_identifier: String,
}

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct ContractData {
    pub contract_id: i32,
    pub updated_timestamp: i64,
    pub contract_address: String,
    pub contract_type: String,
}
