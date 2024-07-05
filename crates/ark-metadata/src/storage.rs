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
        metadata: TokenMetadata,
    ) -> Result<(), StorageError>;

    async fn find_tokens_without_metadata(
        &self,
        filter: Option<(String, String)>,
        refresh_collection: bool,
    ) -> Result<Vec<TokenWithoutMetadata>, StorageError>;

    async fn update_all_token_metadata_status(
        &self,
        contract_address: &str,
        chain_id: &str,
        metadata_status: &str,
    ) -> Result<(), StorageError>;

    async fn update_token_metadata_status(
        &self,
        contract_address: &str,
        token_id: &str,
        chain_id: &str,
        status: &str,
    ) -> Result<(), StorageError>;

    async fn set_contract_refreshing_status(
        &self,
        contract_address: &str,
        chain_id: &str,
        is_refreshing: bool,
    ) -> Result<(), StorageError>;
}
