#[cfg(feature = "sqlxdb")]
pub mod sqlx;
pub mod types;
pub mod utils;
use self::types::TokenSaleEvent;
use crate::storage::types::{
    BlockInfo, ContractInfo, ContractType, StorageError, TokenInfo, TokenMintInfo,
    TokenTransferEvent,
};
use async_trait::async_trait;
#[cfg(test)]
use mockall::automock;
#[cfg(feature = "sqlxdb")]
pub use sqlx::PostgresStorage;

#[async_trait]
#[cfg_attr(test, automock)]
pub trait Storage {
    async fn register_mint(
        &self,
        contract_address: &str,
        token_id_hex: &str,
        token_id: &str,
        info: &TokenMintInfo,
    ) -> Result<(), StorageError>;

    async fn register_token(
        &self,
        token: &TokenInfo,
        block_timestamp: u64,
    ) -> Result<(), StorageError>;

    async fn register_sale_event(
        &self,
        event: &TokenSaleEvent,
        block_timestamp: u64,
    ) -> Result<(), StorageError>;

    async fn register_transfer_event(&self, event: &TokenTransferEvent)
        -> Result<(), StorageError>;

    async fn get_contract_type(
        &self,
        contract_address: &str,
        chain_id: &str,
    ) -> Result<ContractType, StorageError>;

    async fn register_contract_info(
        &self,
        info: &ContractInfo,
        block_timestamp: u64,
    ) -> Result<(), StorageError>;

    /// A block info is only set if the block has a number and a timestamp.
    async fn set_block_info(
        &self,
        block_timestamp: u64,
        info: BlockInfo,
    ) -> Result<(), StorageError>;

    async fn get_block_info(&self, block_number: u64) -> Result<BlockInfo, StorageError>;

    /// The block timestamps is always present. But the number can be missing
    /// for the pending block support.
    async fn clean_block(
        &self,
        block_timestamp: u64,
        block_number: Option<u64>,
    ) -> Result<(), StorageError>;
}
