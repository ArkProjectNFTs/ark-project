mod managers;
use anyhow::Result;
use ark_starknet::client::StarknetClient;
use ark_storage::storage_manager::StorageManager;
use ark_storage::types::ContractType;
use ark_storage::types::StorageError;
use async_trait::async_trait;
use managers::{CollectionManager, EventManager, TokenManager};
use starknet::core::types::*;
use std::sync::Arc;
use tokio::time::{self, Duration};
use tracing::{span, Level};
use tracing_subscriber::{fmt, layer::SubscriberExt, EnvFilter, Registry};

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

#[async_trait]
pub trait IndexerObserver {
    fn notify_status(&self, progression: u64, status: String);
}

#[derive(Default)]
pub struct DefaultIndexerObserver {}

#[async_trait]
impl IndexerObserver for DefaultIndexerObserver {
    fn notify_status(&self, progression: u64, status: String) {
        println!("Progression changed: {}", progression);
    }
}

pub struct ArkIndexer<A: StorageManager, B: StarknetClient, C: IndexerObserver> {
    client: Arc<B>,
    storage: Arc<A>,
    observer: Arc<C>,
    event_manager: EventManager<A, B>,
    collection_manager: CollectionManager<A, B>,
    token_manager: TokenManager<A, B>,
    indexer_version: u64,
    indexer_identifier: String,
}

pub struct ArkIndexerArgs {
    pub indexer_version: u64,
    pub indexer_identifier: String,
}

impl<A: StorageManager, B: StarknetClient, C: IndexerObserver> ArkIndexer<A, B, C> {
    pub fn new(storage: Arc<A>, client: Arc<B>, observer: Arc<C>, args: ArkIndexerArgs) -> Self {
        Self {
            client: Arc::clone(&client),
            storage: Arc::clone(&storage),
            observer: Arc::clone(&observer),
            event_manager: EventManager::new(Arc::clone(&storage), Arc::clone(&client)),
            collection_manager: CollectionManager::new(Arc::clone(&storage), Arc::clone(&client)),
            token_manager: TokenManager::new(Arc::clone(&storage), Arc::clone(&client)),
            indexer_version: args.indexer_version,
            indexer_identifier: args.indexer_identifier,
        }
    }

    pub async fn run(
        &self,
        from_block: BlockId,
        to_block: BlockId,
        force_mode: bool,
    ) -> Result<()> {
        let is_head_of_chain = to_block == BlockId::Tag(BlockTag::Latest);
        let mut current_u64 = self.client.block_id_to_u64(&from_block).await?;
        let mut to_u64 = self.client.block_id_to_u64(&to_block).await?;

        while current_u64 <= to_u64 {
            let _ = self
                .observer
                .notify_status(current_u64, String::from("running"));

            to_u64 = self
                .check_range(current_u64, to_u64, is_head_of_chain)
                .await;

            if self.check_candidate(current_u64, force_mode) {
                self.process_block(current_u64).await?;
            }

            current_u64 += 1;
        }

        Ok(())
    }

    async fn process_block(&self, block_number: u64) -> Result<()> {
        let block_ts = self
            .client
            .block_time(BlockId::Number(block_number))
            .await?;
        let blocks_events = self
            .client
            .fetch_events(
                BlockId::Number(block_number),
                BlockId::Number(block_number),
                self.event_manager.keys_selector(),
            )
            .await?;

        for (_, events) in blocks_events {
            for event in events {
                self.process_event(&event, block_ts).await?;
            }
        }

        Ok(())
    }

    async fn process_event(&self, event: &EmittedEvent, block_ts: u64) -> Result<()> {
        let contract_address = event.from_address;
        let contract_info = self
            .collection_manager
            .identify_contract(contract_address)
            .await
            .map_err(|e| {
                log::error!("Can't identify contract {contract_address}: {:?}", e);
                e
            })?;

        if contract_info.r#type == ContractType::Other {
            return Ok(());
        }

        let token_event = self
            .event_manager
            .format_event(&event, contract_info.r#type, block_ts)
            .await
            .map_err(|err| {
                log::error!("Can't format event {:?}\nevent: {:?}", err, event);
                err
            })?;

        self.token_manager
            .format_token(&token_event)
            .await
            .map_err(|err| {
                log::error!("Can't format token {:?}\ntevent: {:?}", err, token_event);
                err
            })
    }

    /// Returns true if the given block number must be indexed.
    /// False otherwise.
    pub fn check_candidate(&self, block_number: u64, force_mode: bool) -> bool {
        if force_mode {
            return self.storage.clean_block(block_number).is_ok();
        }

        match self.storage.get_block_info(block_number) {
            Ok(info) => {
                if self.indexer_version > info.indexer_version {
                    self.storage.clean_block(block_number).is_ok()
                } else {
                    false
                }
            }
            Err(StorageError::NotFound) => true,
            Err(_) => false,
        }
    }

    async fn check_range(&self, current: u64, to: u64, poll_head_of_chain: bool) -> u64 {
        if current >= to {
            if !poll_head_of_chain {
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

#[cfg(test)]
mod tests {
    use super::*;
    use ark_starknet::client::MockStarknetClient;
    use ark_storage::storage_manager::MockStorageManager;
    use mockall::predicate::*;

    // #[tokio::test]
    // async fn test_check_candidate() {
    //     let mut mock_storage = Arc::new(MockStorageManager::default());
    //     let client = Arc::new(MockStarknetClient::default());

    //     // When the block number is 5 and force_mode is false, the function should return true.
    //     mock_storage
    //         .expect_get_block_info()
    //         .with(eq(5))
    //         .times(1)
    //         .returning(|_| Err(StorageError::NotFound));

    //     let args = ArkIndexerArgs {
    //         indexer_version: 1,
    //         indexer_identifier: "test-identifier".to_string(),
    //     };

    //     let indexer =
    //         ArkIndexer::<MockStorageManager, MockStarknetClient>::new(mock_storage, client, args);

    //     assert_eq!(indexer.check_candidate(5, true), true);
    // }
}
