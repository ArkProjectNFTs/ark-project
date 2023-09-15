use anyhow::{anyhow, Result};
use async_trait::async_trait;
#[cfg(any(test, feature = "mock"))]
use mockall::automock;
use regex::Regex;
use starknet::{
    core::{types::FieldElement, types::*},
    providers::{jsonrpc::HttpTransport, AnyProvider, JsonRpcClient, Provider},
};
use std::collections::HashMap;
use url::Url;

#[cfg_attr(any(test, feature = "mock"), automock)]
#[async_trait]
pub trait StarknetClient {
    ///
    fn new(rpc_url: &str) -> Result<StarknetClientHttp>;

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

#[derive(Debug)]
pub struct StarknetClientHttp {
    provider: AnyProvider,
}

#[async_trait]
impl StarknetClient for StarknetClientHttp {
    ///
    fn new(rpc_url: &str) -> Result<StarknetClientHttp> {
        let rpc_url = Url::parse(rpc_url)?;
        let provider = AnyProvider::JsonRpcHttp(JsonRpcClient::new(HttpTransport::new(rpc_url)));

        Ok(Self { provider })
    }

    ///
    async fn block_id_to_u64(&self, id: &BlockId) -> Result<u64> {
        match id {
            BlockId::Tag(BlockTag::Latest) => Ok(self.provider.block_number().await?),
            BlockId::Number(n) => Ok(*n),
            _ => Err(anyhow!("BlockID can´t be converted to u64")),
        }
    }

    ///
    fn parse_block_range(&self, from: &str, to: &str) -> Result<(BlockId, BlockId)> {
        let from_block = self.parse_block_id(from)?;
        let to_block = self.parse_block_id(to)?;

        Ok((from_block, to_block))
    }

    ///
    fn parse_block_id(&self, id: &str) -> Result<BlockId> {
        let regex_block_number = Regex::new("^[0-9]{1,}$").unwrap();

        if id == "latest" {
            Ok(BlockId::Tag(BlockTag::Latest))
        } else if id == "pending" {
            Ok(BlockId::Tag(BlockTag::Pending))
        } else if regex_block_number.is_match(id) {
            Ok(BlockId::Number(id.parse::<u64>()?))
        } else {
            Ok(BlockId::Hash(FieldElement::from_hex_be(id)?))
        }
    }

    ///
    async fn block_time(&self, block: BlockId) -> Result<u64> {
        let block = self.provider.get_block_with_tx_hashes(block).await?;
        let timestamp = match block {
            MaybePendingBlockWithTxHashes::Block(block) => block.timestamp,
            MaybePendingBlockWithTxHashes::PendingBlock(block) => block.timestamp,
        };

        Ok(timestamp)
    }

    ///
    async fn block_number(&self) -> Result<u64> {
        Ok(self.provider.block_number().await?)
    }

    ///
    async fn fetch_events(
        &self,
        from_block: BlockId,
        to_block: BlockId,
        keys: Option<Vec<Vec<FieldElement>>>,
    ) -> Result<HashMap<u64, Vec<EmittedEvent>>> {
        let mut events: HashMap<u64, Vec<EmittedEvent>> = HashMap::new();

        let filter = EventFilter {
            from_block: Some(from_block),
            to_block: Some(to_block),
            address: None,
            keys,
        };

        let chunk_size = 1000;
        let mut continuation_token: Option<String> = None;

        loop {
            let event_page = self
                .provider
                .get_events(filter.clone(), continuation_token, chunk_size)
                .await?;

            event_page.events.iter().for_each(|e| {
                events
                    .entry(e.block_number)
                    .and_modify(|v| v.push(e.clone()))
                    .or_insert(vec![e.clone()]);
            });

            continuation_token = event_page.continuation_token;

            if continuation_token.is_none() {
                break;
            }
        }

        Ok(events)
    }

    ///
    async fn call_contract(
        &self,
        contract_address: FieldElement,
        selector: FieldElement,
        calldata: Vec<FieldElement>,
        block: BlockId,
    ) -> Result<Vec<FieldElement>> {
        Ok(self
            .provider
            .call(
                FunctionCall {
                    contract_address,
                    entry_point_selector: selector,
                    calldata,
                },
                block,
            )
            .await?)
    }
}
