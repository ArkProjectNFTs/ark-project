pub mod http;
pub use http::StarknetClientHttp;

use async_trait::async_trait;
#[cfg(any(test, feature = "mock"))]
use mockall::automock;
use starknet::core::{types::FieldElement, types::*};
use starknet::providers::ProviderError;
use std::collections::HashMap;
use std::marker::Sized;

/// Generic errors for starknet client.
#[derive(Debug, thiserror::Error)]
pub enum StarknetClientError {
    #[error("A contract error occurred: {0}")]
    Contract(String),
    #[error("Entry point not found: {0}")]
    EntrypointNotFound(String),
    #[error("Input too long for arguments")]
    InputTooLong,
    #[error("Input too short for arguments")]
    InputTooShort,
    #[error("Invalid value conversion: {0}")]
    Conversion(String),
    #[error("Starknet-rs provider error: {0}")]
    Provider(ProviderError),
    #[error("Other error: {0}")]
    Other(String),
}

/// Starknet client interface with required methods
/// for arkproject capabilities only.
#[cfg_attr(any(test, feature = "mock"), automock)]
#[async_trait]
pub trait StarknetClient {
    ///
    fn new(rpc_url: &str) -> Result<Self, StarknetClientError>
    where
        Self: Sized;

    ///
    async fn events_from_tx_receipt(
        &self,
        transaction_hash: FieldElement,
        keys: Option<Vec<Vec<FieldElement>>>,
    ) -> Result<Vec<EmittedEvent>, StarknetClientError>;

    ///
    async fn block_txs_hashes(
        &self,
        block: BlockId,
    ) -> Result<(u64, Vec<FieldElement>), StarknetClientError>;

    ///
    async fn block_id_to_u64(&self, id: &BlockId) -> Result<u64, StarknetClientError>;

    ///
    fn parse_block_range(
        &self,
        from: &str,
        to: &str,
    ) -> Result<(BlockId, BlockId), StarknetClientError>;

    ///
    fn parse_block_id(&self, id: &str) -> Result<BlockId, StarknetClientError>;

    ///
    async fn block_time(&self, block: BlockId) -> Result<u64, StarknetClientError>;

    ///
    async fn block_number(&self) -> Result<u64, StarknetClientError>;

    /// On Starknet, a chunk size limits the maximum number of events
    /// that can be retrieved with one call.
    /// To ensure all events are fetched, we must ensure all events pages
    /// are correctly fechted.
    ///
    /// TODO: for now this version is ok, but it can be RAM consuming
    /// as the events are accumulated before this function returns.
    /// We can think of an other version that returns each page, and let
    /// the caller process the pages.
    async fn fetch_events(
        &self,
        from_block: BlockId,
        to_block: BlockId,
        keys: Option<Vec<Vec<FieldElement>>>,
    ) -> Result<HashMap<u64, Vec<EmittedEvent>>, StarknetClientError>;

    /// Call a contract trying all the given selectors.
    /// All selector must accept the same arguments.
    async fn call_contract(
        &self,
        contract_address: FieldElement,
        selector: FieldElement,
        calldata: Vec<FieldElement>,
        block: BlockId,
    ) -> Result<Vec<FieldElement>, StarknetClientError>;
}
