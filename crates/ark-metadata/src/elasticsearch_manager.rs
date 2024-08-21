use crate::types::{RequestError, TokenMetadata};
use async_trait::async_trait;

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
