pub mod storage;
use storage::*;

pub mod event_handler;
use event_handler::EventHandler;

mod orderbook;

use starknet::core::types::{
    BlockId, EmittedEvent, EventFilter, Felt, MaybePendingBlockWithTxHashes,
};
use starknet::macros::selector;
use starknet::providers::{AnyProvider, Provider, ProviderError};
use std::collections::HashMap;
use std::sync::Arc;
use tracing::{error, trace, warn};

use crate::orderbook::Event;

pub type IndexerResult<T> = Result<T, IndexerError>;

#[derive(Debug, thiserror::Error)]
pub enum IndexerError {
    #[error("Event is not formatted as expected")]
    BadEventFormat,
    #[error("Storage error occurred: {0}")]
    StorageError(StorageError),
    #[error("Starknet provider error: {0}")]
    StarknetError(#[from] ProviderError),
}

impl From<StorageError> for IndexerError {
    fn from(e: StorageError) -> Self {
        IndexerError::StorageError(e)
    }
}

pub struct Diri<S: Storage, E: EventHandler> {
    provider: Arc<AnyProvider>,
    storage: Arc<S>,
    event_handler: Arc<E>,
}

impl<S: Storage, E: EventHandler> Diri<S, E> {
    ///
    pub fn new(provider: Arc<AnyProvider>, storage: Arc<S>, event_handler: Arc<E>) -> Self {
        Diri {
            provider: Arc::clone(&provider),
            storage: Arc::clone(&storage),
            event_handler: Arc::clone(&event_handler),
        }
    }

    /// Indexes a range of blocks, including `from` and `to` block.
    ///
    /// # Arguments
    ///
    /// * `from_block` - The first block to index (included).
    /// * `to_block` - The last block to index (included).
    pub async fn index_block_range(
        &self,
        from_block: BlockId,
        to_block: BlockId,
        address: Option<Felt>,
    ) -> IndexerResult<()> {
        let blocks_events = self
            .fetch_events(
                from_block,
                to_block,
                address,
                Some(vec![vec![
                    selector!("OrderPlaced"),
                    selector!("OrderFulfilled"),
                    selector!("OrderCancelled"),
                    selector!("OrderExecuted"),
                    selector!("RollbackStatus"),
                ]]),
            )
            .await?;

        // Handle events sorted by block number
        let mut block_numbers: Vec<&u64> = blocks_events.keys().collect();
        block_numbers.sort();

        for block_number in block_numbers {
            let block_timestamp = self.block_time(BlockId::Number(*block_number)).await?;
            let events = blocks_events.get(block_number).unwrap();
            for any_event in events {
                let orderbook_event: Event = match any_event.clone().try_into() {
                    Ok(ev) => ev,
                    Err(e) => {
                        trace!("Event can't be deserialized: {e}");
                        continue;
                    }
                };

                match orderbook_event {
                    Event::OrderPlaced(ev) => {
                        trace!("OrderPlaced found: {:?}", ev);
                        self.storage
                            .register_placed(*block_number, block_timestamp, &ev.into())
                            .await?;
                    }
                    Event::OrderCancelled(ev) => {
                        trace!("OrderCancelled found: {:?}", ev);
                        self.storage
                            .register_cancelled(*block_number, block_timestamp, &ev.into())
                            .await?;
                    }
                    Event::OrderFulfilled(ev) => {
                        trace!("OrderFulfilled found: {:?}", ev);
                        self.storage
                            .register_fulfilled(*block_number, block_timestamp, &ev.into())
                            .await?;
                    }
                    Event::OrderExecuted(ev) => {
                        trace!("OrderExecuted found: {:?}", ev);
                        self.storage
                            .register_executed(*block_number, block_timestamp, &ev.into())
                            .await?;
                    }
                    Event::RollbackStatus(ev) => {
                        trace!("RollbackStatus found: {:?}", ev);
                        self.storage
                            .status_back_to_open(*block_number, block_timestamp, &ev.into())
                            .await?;
                    }
                    _ => {
                        warn!("Orderbook event not handled: {:?}", orderbook_event)
                    }
                };
            }

            self.event_handler.on_block_processed(*block_number).await;
        }

        Ok(())
    }

    /// Fetches the events with the given keys filter.
    /// This function fetches all the events by auto-following
    /// the continuation token returned by the provider.
    /// This ensures that all the events are returned for the
    /// given block range.
    ///
    /// # Arguments
    ///
    /// * `provider` - The Starknet provider to get events from.
    /// * `from_block` - First block (included) to get event.
    /// * `to_block` - Last block (included) to get event.
    /// * `keys` - The event keys to filter on.
    pub async fn fetch_events(
        &self,
        from_block: BlockId,
        to_block: BlockId,
        address: Option<Felt>,
        keys: Option<Vec<Vec<Felt>>>,
    ) -> Result<HashMap<u64, Vec<EmittedEvent>>, IndexerError> {
        // TODO: setup key filtering here.

        let mut events: HashMap<u64, Vec<EmittedEvent>> = HashMap::new();

        let filter = EventFilter {
            from_block: Some(from_block),
            to_block: Some(to_block),
            address,
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
                    .entry(e.block_number.unwrap())
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

    /// Retrieves the timestamp of the given block.
    async fn block_time(&self, block: BlockId) -> Result<u64, IndexerError> {
        let block = self.provider.get_block_with_tx_hashes(block).await?;

        let timestamp = match block {
            MaybePendingBlockWithTxHashes::Block(block) => block.timestamp,
            MaybePendingBlockWithTxHashes::PendingBlock(block) => block.timestamp,
        };

        Ok(timestamp)
    }
}
