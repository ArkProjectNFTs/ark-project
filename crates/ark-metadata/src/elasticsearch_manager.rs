use crate::types::{RequestError, TokenMetadata};
use async_trait::async_trait;
pub struct NoOpElasticsearchManager;

#[cfg(any(test, feature = "mock"))]
use mockall::automock;

#[cfg_attr(any(test, feature = "mock"), automock)]
#[async_trait]
pub trait ElasticsearchManager {
    async fn upsert_token_metadata(
        &self,
        contract_address: &str,
        token_id: &str,
        chain_id: &str,
        metadata: TokenMetadata,
    ) -> Result<(), RequestError>;
}

#[async_trait]
impl ElasticsearchManager for NoOpElasticsearchManager {
    async fn upsert_token_metadata(
        &self,
        _contract_address: &str,
        _token_id: &str,
        _chain_id: &str,
        _metadata: TokenMetadata,
    ) -> Result<(), RequestError> {
        Ok(())
    }
}
