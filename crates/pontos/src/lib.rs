pub mod event_handler;
pub mod managers;
pub mod storage;

use anyhow::Result;
use ark_starknet::client::StarknetClient;
use event_handler::EventHandler;
use managers::{BlockManager, CollectionManager, EventManager, TokenManager};
use starknet::core::types::*;
use std::sync::Arc;
use storage::Storage;
use storage::types::{BlockIndexingStatus, ContractType, StorageError};
use tokio::sync::RwLock as AsyncRwLock;
use tokio::time::{self, Duration};
use tracing::{span, Level};
use tracing_subscriber::{fmt, layer::SubscriberExt, EnvFilter, Registry};

pub type IndexerResult<T> = Result<T, IndexerError>;

/// Generic errors for Pontos.
#[derive(Debug, thiserror::Error)]
pub enum IndexerError {
    #[error("Storage error occurred")]
    StorageError(StorageError),
    #[error("An error occurred")]
    Anyhow(String),
}

impl From<StorageError> for IndexerError {
    fn from(e: StorageError) -> Self {
        IndexerError::StorageError(e)
    }
}

impl From<anyhow::Error> for IndexerError {
    fn from(e: anyhow::Error) -> Self {
        IndexerError::Anyhow(e.to_string())
    }
}

pub struct PontosConfig {
    pub indexer_version: u64,
    pub indexer_identifier: String,
}

pub struct Pontos<S: Storage, C: StarknetClient, E: EventHandler> {
    client: Arc<C>,
    event_handler: Arc<E>,
    config: PontosConfig,
    block_manager: Arc<BlockManager<S>>,
    event_manager: Arc<EventManager<S>>,
    token_manager: Arc<TokenManager<S, C>>,
    collection_manager: Arc<AsyncRwLock<CollectionManager<S, C>>>,
}

impl<S: Storage, C: StarknetClient, E: EventHandler + Send + Sync> Pontos<S, C, E> {
    ///
    pub fn new(
        client: Arc<C>,
        storage: Arc<S>,
        event_handler: Arc<E>,
        config: PontosConfig,
    ) -> Self {
        init_tracing();

        Pontos {
            config,
            client: Arc::clone(&client),
            event_handler: Arc::clone(&event_handler),
            block_manager: Arc::new(BlockManager::new(Arc::clone(&storage))),
            event_manager: Arc::new(EventManager::new(Arc::clone(&storage))),
            token_manager: Arc::new(TokenManager::new(Arc::clone(&storage), Arc::clone(&client))),
            // Collection manager has internal cache, so some functions are using `&mut self`.
            // For this reason, we must protect the write operations in order to share
            // the cache with any possible thread using `index_block_range` of this instance.
            collection_manager: Arc::new(AsyncRwLock::new(CollectionManager::new(
                Arc::clone(&storage),
                Arc::clone(&client),
            ))),
        }
    }

    ///
    pub async fn index_block_range(
        &self,
        from_block: BlockId,
        to_block: BlockId,
        do_force: bool,
    ) -> IndexerResult<()> {
        let is_head_of_chain = to_block == BlockId::Tag(BlockTag::Latest);
        log::debug!(
            "Indexing range: {:?} {:?} (head of chain: {}) (force: {})",
            from_block,
            to_block,
            is_head_of_chain,
            do_force,
        );

        let mut current_u64 = self.client.block_id_to_u64(&from_block).await?;
        let mut to_u64 = self.client.block_id_to_u64(&to_block).await?;

        loop {
            log::trace!("Indexing block range: {} {}", current_u64, to_u64);

            to_u64 = self
                .check_range(current_u64, to_u64, is_head_of_chain)
                .await;
            if current_u64 > to_u64 {
                continue;
            }

            if !self
                .block_manager
                .check_candidate(current_u64, self.config.indexer_version, do_force)
                .await
            {
                current_u64 += 1;
                continue;
            }

            // Set block as pending
            self.block_manager
                .set_block_info(
                    current_u64,
                    self.config.indexer_version,
                    &self.config.indexer_identifier,
                    BlockIndexingStatus::Processing,
                )
                .await?;

            let block_ts = self.client.block_time(BlockId::Number(current_u64)).await?;

            let blocks_events = self
                .client
                .fetch_events(
                    BlockId::Number(current_u64),
                    BlockId::Number(current_u64),
                    self.event_manager.keys_selector(),
                )
                .await?;

            for (_, events) in blocks_events {
                for e in events {
                    let contract_address = e.from_address;

                    let contract_type = match self
                        .collection_manager
                        .write()
                        .await
                        .identify_contract(contract_address, current_u64)
                        .await
                    {
                        Ok(info) => info,
                        Err(e) => {
                            log::error!(
                                "Error while identifying contract {}: {:?}",
                                contract_address,
                                e
                            );
                            continue;
                        }
                    };

                    if contract_type == ContractType::Other {
                        continue;
                    }

                    let token_event = match self
                        .event_manager
                        .format_and_register_event(&e, contract_type, block_ts)
                        .await
                    {
                        Ok(te) => te,
                        Err(err) => {
                            log::error!("Error while registering event {:?}\n{:?}", err, e);
                            continue;
                        }
                    };

                    match self
                        .token_manager
                        .format_and_register_token(&token_event)
                        .await
                    {
                        Ok(()) => (),
                        Err(err) => {
                            log::error!("Can't format token {:?}\ntevent: {:?}", err, token_event);
                            continue;
                        }
                    }
                }
            }

            self.block_manager
                .set_block_info(
                    current_u64,
                    self.config.indexer_version,
                    &self.config.indexer_identifier,
                    BlockIndexingStatus::Terminated,
                )
                .await?;

            self.event_handler
                .on_block_processed(
                    current_u64,
                    self.config.indexer_version,
                    &self.config.indexer_identifier,
                )
                .await;

            current_u64 += 1;
        }
    }

    async fn check_range(&self, current: u64, to: u64, is_head_of_chain: bool) -> u64 {
        if current >= to {
            if !is_head_of_chain {
                // TODO: can print some stats here if necessary.
                log::info!("End of indexing block range");
                std::process::exit(0);
            }

            // TODO: make this duration configurable (DELAY_HEAD_OF_CHAIN).
            // But we are at HOC, so for now the block interval is 3 min.
            // However, we want the block as soon as it's mined.
            time::sleep(Duration::from_secs(1)).await;

            // Head of the chain requested -> check the last block and continue
            // indexing loop.
            self.client
                .block_number()
                .await
                .expect("Can't fetch last block number")
        } else {
            to
        }
    }
}

fn init_tracing() {
    // Initialize the LogTracer to convert `log` records to `tracing` events
    tracing_log::LogTracer::init().expect("Setting log tracer failed.");

    // Create the layers
    let env_filter = EnvFilter::from_default_env();
    let fmt_layer = fmt::layer();

    // Combine layers and set as global default
    let subscriber = Registry::default().with(env_filter).with(fmt_layer);

    tracing::subscriber::set_global_default(subscriber)
        .expect("Setting default subscriber failed.");

    let main_span = span!(Level::TRACE, "main");
    let _main_guard = main_span.enter();
}
