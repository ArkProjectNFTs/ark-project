//! Starknet Client implementation using `JsonRpcHttp` provider.

use anyhow::{anyhow, Result};
use async_trait::async_trait;

use regex::Regex;
use starknet::{
    core::types::*,
    providers::{jsonrpc::HttpTransport, AnyProvider, JsonRpcClient, Provider},
};
use std::collections::HashMap;
use url::Url;

use super::StarknetClient;

#[derive(Debug)]
pub struct StarknetClientHttp {
    /// Provider is kept public to allow custom reuse of
    /// the raw provider elsewhere.
    pub provider: AnyProvider,
}

#[async_trait]
impl StarknetClient for StarknetClientHttp {
    ///
    fn new(rpc_url: &str) -> Result<StarknetClientHttp> {
        let rpc_url = Url::parse(rpc_url)?;
        let provider = AnyProvider::JsonRpcHttp(JsonRpcClient::new(HttpTransport::new(rpc_url)));

        Ok(Self { provider })
    }

    /// Transaction receipts don't have `EmittedEvent` but `Event` instead.
    /// This function aims at converting the `Event` into `EmittedEvent` to
    /// be compatible with all the indexing process.
    async fn events_from_tx_receipt(
        &self,
        transaction_hash: FieldElement,
        keys: Option<Vec<Vec<FieldElement>>>,
    ) -> Result<Vec<EmittedEvent>> {
        let receipt = self
            .provider
            .get_transaction_receipt(transaction_hash)
            .await?;
        let mut block_hash = FieldElement::MAX;
        let mut block_number = u64::MAX;

        let events = match receipt {
            // We must assign the block hash and number for every type
            // of transaction because we don't know in advance which
            // type of txs are present in the block.
            MaybePendingTransactionReceipt::Receipt(r) => match r {
                TransactionReceipt::Invoke(inner) => {
                    block_hash = inner.block_hash;
                    block_number = inner.block_number;
                    inner.events
                }
                TransactionReceipt::L1Handler(inner) => {
                    block_hash = inner.block_hash;
                    block_number = inner.block_number;
                    inner.events
                }
                TransactionReceipt::Declare(inner) => {
                    block_hash = inner.block_hash;
                    block_number = inner.block_number;
                    inner.events
                }
                TransactionReceipt::Deploy(inner) => {
                    block_hash = inner.block_hash;
                    block_number = inner.block_number;
                    inner.events
                }
                TransactionReceipt::DeployAccount(inner) => {
                    block_hash = inner.block_hash;
                    block_number = inner.block_number;
                    inner.events
                }
            },
            // For pending, we don't have the block hash or the block number.
            // Default value of MAX is used.
            MaybePendingTransactionReceipt::PendingReceipt(pr) => match pr {
                PendingTransactionReceipt::Invoke(inner) => inner.events,
                PendingTransactionReceipt::L1Handler(inner) => inner.events,
                PendingTransactionReceipt::Declare(inner) => inner.events,
                PendingTransactionReceipt::Deploy(inner) => inner.events,
                PendingTransactionReceipt::DeployAccount(inner) => inner.events,
            },
        };

        let mut emitted_events = vec![];
        for e in events {
            if keys.is_some()
                && !e.keys.is_empty()
                && keys.as_ref().map_or(false, |keys| keys.contains(&e.keys))
            {
                emitted_events.push(EmittedEvent {
                    from_address: e.from_address,
                    keys: e.keys,
                    data: e.data,
                    block_hash,
                    block_number,
                    transaction_hash,
                })
            }
        }

        Ok(emitted_events)
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

    /// Retuns the tx hashes of the asked block + the block timestamp.
    async fn block_txs_hashes(&self, block: BlockId) -> Result<(u64, Vec<FieldElement>)> {
        let block = self.provider.get_block_with_tx_hashes(block).await?;
        let timestamp = match block {
            MaybePendingBlockWithTxHashes::Block(block) => (block.timestamp, block.transactions),
            MaybePendingBlockWithTxHashes::PendingBlock(block) => {
                (block.timestamp, block.transactions)
            }
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
