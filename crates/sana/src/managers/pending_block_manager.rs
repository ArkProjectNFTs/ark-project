use log::{debug, error, info, warn};
use starknet::core::types::{BlockId, BlockTag, EmittedEvent, EventFilter};
use starknet::providers::jsonrpc::HttpTransport;
use starknet::providers::{JsonRpcClient, Provider};
use std::collections::HashSet;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::time::Duration;
use url::Url;

use crate::IndexerError;
use crate::IndexerResult;

pub struct FetchPendingEvents {
    provider: JsonRpcClient<HttpTransport>,
    interval: Duration,
    latest_processed_block: Arc<AtomicU64>,
    event_cache: Arc<RwLock<HashSet<String>>>,
    pending_continuation_token: Arc<RwLock<Option<String>>>,
}

impl FetchPendingEvents {
    pub fn new(rpc_url: &str, interval: Duration) -> IndexerResult<Self> {
        let url = Url::parse(rpc_url).map_err(|e| IndexerError::Anyhow(e.to_string()))?;
        let provider = JsonRpcClient::new(HttpTransport::new(url));

        Ok(Self {
            provider,
            interval,
            latest_processed_block: Arc::new(AtomicU64::new(0)),
            event_cache: Arc::new(RwLock::new(HashSet::new())),
            pending_continuation_token: Arc::new(RwLock::new(None)),
        })
    }

    pub async fn run(&self) -> IndexerResult<()> {
        info!("Starting to fetch pending events");

        loop {
            if let Err(e) = self.process_events().await {
                error!("Error in process_events: {:?}", e);
            }
            tokio::time::sleep(self.interval).await;
        }
    }

    async fn process_events(&self) -> IndexerResult<()> {
        let current_block = self.provider.block_number().await?;
        let last_processed_block = self.latest_processed_block.load(Ordering::Relaxed);

        if last_processed_block == 0 {
            // First run: start with the current pending block
            info!("First run: starting with the current pending block");
            self.process_pending_events(current_block + 1).await?;
            self.latest_processed_block
                .store(current_block, Ordering::Relaxed);
        } else if current_block > last_processed_block {
            // New block detected
            info!(
                "New block detected: {} (previous: {})",
                current_block, last_processed_block
            );

            debug!("Process the newly finalized block (previously pending) for missing events");
            // Process the newly finalized block (previously pending)
            self.process_new_blocks(last_processed_block, current_block)
                .await?;

            debug!("Reset the continuation token for the new pending block");
            // Reset the continuation token for the new pending block
            *self.pending_continuation_token.write().await = None;

            // Process the new pending block
            self.process_pending_events(current_block + 1).await?;
        } else {
            // No new block, continue processing pending events
            self.process_pending_events(current_block + 1).await?;
        }

        Ok(())
    }

    async fn fetch_events_for_block(&self, block_id: BlockId) -> IndexerResult<Vec<EmittedEvent>> {
        let filter = EventFilter {
            from_block: Some(block_id),
            to_block: Some(block_id),
            address: None,
            keys: None,
        };

        let mut new_events = Vec::new();
        let mut continuation_token = None;

        loop {
            debug!(
                "Fetching events for block {:?} with continuation token: {:?}",
                block_id, continuation_token
            );

            let event_page = self
                .provider
                .get_events(filter.clone(), continuation_token.clone(), 200)
                .await?;

            for event in event_page.events {
                let tx_hash = event.transaction_hash.to_string();
                if !self.event_cache.read().await.contains(&tx_hash) {
                    new_events.push(event);
                }
            }

            if let Some(token) = event_page.continuation_token {
                continuation_token = Some(token);
            } else {
                break;
            }
        }

        info!(
            "Fetched {} new events for block {:?}",
            new_events.len(),
            block_id
        );
        Ok(new_events)
    }

    async fn fetch_pending_events(&self) -> IndexerResult<Vec<EmittedEvent>> {
        let filter = EventFilter {
            from_block: Some(BlockId::Tag(BlockTag::Pending)),
            to_block: Some(BlockId::Tag(BlockTag::Pending)),
            address: None,
            keys: None,
        };

        let mut new_events = Vec::new();
        let mut continuation_token = self.pending_continuation_token.read().await.clone();

        loop {
            debug!(
                "Fetching pending events with continuation token: {:?}",
                continuation_token
            );

            let event_page = match self
                .provider
                .get_events(filter.clone(), continuation_token.clone(), 200)
                .await
            {
                Ok(page) => page,
                Err(e) => {
                    error!("Error fetching pending events: {:?}", e);
                    // Reset the continuation token on error
                    *self.pending_continuation_token.write().await = None;
                    return Err(IndexerError::Provider(e));
                }
            };

            let mut cache = self.event_cache.write().await;
            for event in event_page.events {
                let tx_hash = event.transaction_hash.to_string();
                if !cache.contains(&tx_hash) {
                    new_events.push(event);
                    cache.insert(tx_hash);
                }
            }

            if let Some(token) = event_page.continuation_token {
                continuation_token = Some(token.clone());
                *self.pending_continuation_token.write().await = Some(token);
            } else {
                break;
            }

            // If we've collected a significant number of new events, process them
            if new_events.len() >= 1000 {
                break;
            }
        }

        info!("Fetched {} new pending events", new_events.len());
        Ok(new_events)
    }

    async fn process_event(&self, event: &EmittedEvent) -> IndexerResult<()> {
        let tx_hash = event.transaction_hash.to_string();
        debug!("Processing event: TX Hash 0x{}", tx_hash);

        // Add your custom logic to handle the event here

        // After processing, add the event to the cache
        self.event_cache.write().await.insert(tx_hash);
        Ok(())
    }

    async fn process_new_blocks(&self, from_block: u64, to_block: u64) -> IndexerResult<()> {
        for block_number in from_block + 1..=to_block {
            info!("Processing finalized block: {}", block_number);
            let events = self
                .fetch_events_for_block(BlockId::Number(block_number))
                .await?;
            for event in events {
                self.process_event(&event).await?;
            }
            self.latest_processed_block
                .store(block_number, Ordering::Relaxed);
        }
        Ok(())
    }

    async fn process_pending_events(&self, pending_block: u64) -> IndexerResult<()> {
        info!("Processing pending block: {}", pending_block);
        let events = self.fetch_pending_events().await?;
        for event in events {
            self.process_event(&event).await?;
        }
        Ok(())
    }
}
