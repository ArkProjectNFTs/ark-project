pub mod http;
pub use http::StarknetClientHttp;

use anyhow::Result;
use async_trait::async_trait;
use starknet::core::{types::FieldElement, types::*};
use std::collections::HashMap;
use std::marker::Sized;

/// Starknet client interface with required methods
/// for arkproject capabilities only.
#[async_trait]
pub trait StarknetClient {
    ///
    fn new(rpc_url: &str) -> Result<Self>
    where
        Self: Sized;

    ///
    async fn block_id_to_u64(&self, id: &BlockId) -> Result<u64>;

    ///
    fn parse_block_range(&self, from: &str, to: &str) -> Result<(BlockId, BlockId)>;

    ///
    fn parse_block_id(&self, id: &str) -> Result<BlockId>;

    ///
    async fn block_time(&self, block: BlockId) -> Result<u64>;

    ///
    async fn block_number(&self) -> Result<u64>;

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
    ) -> Result<HashMap<u64, Vec<EmittedEvent>>>;

    /// Call a contract trying all the given selectors.
    /// All selector must accept the same arguments.
    async fn call_contract(
        &self,
        contract_address: FieldElement,
        selector: FieldElement,
        calldata: Vec<FieldElement>,
        block: BlockId,
    ) -> Result<Vec<FieldElement>>;
}
