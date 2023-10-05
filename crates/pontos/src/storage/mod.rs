pub mod types;
pub mod utils;

use crate::storage::types::{
    BlockInfo, ContractInfo, ContractType, StorageError, TokenEvent, TokenInfo,
};
use async_trait::async_trait;

#[cfg(test)]
use mockall::automock;

#[async_trait]
#[cfg_attr(test, automock)]
pub trait Storage {
    async fn register_mint(&self, token: &TokenInfo, block_number: u64)
        -> Result<(), StorageError>;

    async fn register_token(
        &self,
        token: &TokenInfo,
        block_number: u64,
    ) -> Result<(), StorageError>;

    async fn register_event(
        &self,
        event: &TokenEvent,
        block_number: u64,
    ) -> Result<(), StorageError>;

    async fn get_contract_type(&self, contract_address: &str)
        -> Result<ContractType, StorageError>;

    async fn register_contract_info(&self, info: &ContractInfo) -> Result<(), StorageError>;

    async fn set_block_info(&self, block_number: u64, info: BlockInfo) -> Result<(), StorageError>;

    async fn get_block_info(&self, block_number: u64) -> Result<BlockInfo, StorageError>;

    async fn clean_block(&self, block_number: u64) -> Result<(), StorageError>;

    /// A block that was pending is now the latest block.
    /// When pending, the only data we have to identify the block is the timestamp.
    /// This function aims at updating all database record that were inserted with pending
    /// state with the new block number. The timestamp is used as primary key here.
    async fn update_last_pending_block(
        &self,
        block_number: u64,
        block_timestamp: u64,
    ) -> Result<(), StorageError>;
}
