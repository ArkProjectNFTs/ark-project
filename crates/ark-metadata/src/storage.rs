use crate::types::{StorageError, TokenMetadata, TokenWithoutMetadata};
use anyhow::Result;
use async_trait::async_trait;
#[cfg(any(test, feature = "mock"))]
use mockall::automock;

#[cfg_attr(any(test, feature = "mock"), automock)]
#[async_trait]
pub trait Storage {
    async fn register_token_metadata(
        &self,
        contract_address: &str,
        token_id: &str,
        chain_id: &str,
        token_metadata: TokenMetadata,
    ) -> Result<(), StorageError>;

    async fn find_token_ids_without_metadata(
        &self,
        filter: Option<(String, String)>,
    ) -> Result<Vec<TokenWithoutMetadata>, StorageError>;

    async fn update_token_metadata_status(
        &self,
        contract_address: &str,
        token_id: &str,
        chain_id: &str,
        metadata_status: &str,
    ) -> Result<(), StorageError>;
}
