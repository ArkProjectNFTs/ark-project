use async_trait::async_trait;

pub mod types;
use types::NewOrderData;

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
    /// Adds to the storage a order newly placed.
    /// This event happens exactly once for any order.
    async fn add_new_order(&self, block_id: u64, order: &NewOrderData) -> StorageResult<()>;
}
