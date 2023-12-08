use async_trait::async_trait;

pub mod types;
use types::{CancelledData, ExecutedData, FulfilledData, PlacedData};

pub type StorageResult<T> = Result<T, StorageError>;

#[derive(Debug, thiserror::Error)]
pub enum StorageError {
    #[error("Transport error: {0}")]
    TransportError(String),
    #[error("Provider error: {0}")]
    ProviderError(String),
}

#[async_trait]
pub trait Storage {
    async fn register_placed(
        &self,
        block_id: u64,
        block_timestamp: u64,
        order: &PlacedData,
    ) -> StorageResult<()>;

    async fn register_cancelled(
        &self,
        block_id: u64,
        block_timestamp: u64,
        order: &CancelledData,
    ) -> StorageResult<()>;

    async fn register_fulfilled(
        &self,
        block_id: u64,
        block_timestamp: u64,
        order: &FulfilledData,
    ) -> StorageResult<()>;

    async fn register_executed(
        &self,
        block_id: u64,
        block_timestamp: u64,
        order: &ExecutedData,
    ) -> StorageResult<()>;
}
