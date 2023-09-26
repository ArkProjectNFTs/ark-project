mod managers;
use anyhow::Result;
use ark_starknet::client::{StarknetClient, StarknetClientHttp};
use ark_storage::storage_manager::StorageManager;
use ark_storage::types::ContractType;
use ark_storage::types::StorageError;
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

pub struct ArkIndexer<T: StorageManager> {
    sn_client: StarknetClientHttp,
    storage: Arc<T>,
    event_manager: EventManager<T>,
    collection_manager: CollectionManager<T>,
    token_manager: TokenManager<T>,
    indexer_version: u64,
    indexer_identifier: String,
    from_block: BlockId,
    to_block: BlockId,
    force_mode: bool,
}

pub struct ArkIndexerArgs {
    pub rpc_provider: String,
    pub indexer_version: u64,
    pub indexer_identifier: String,
    pub from_block: BlockId,
    pub to_block: BlockId,
    pub force_mode: bool,
}

impl<T: StorageManager> ArkIndexer<T> {
    pub fn new(storage: T, args: ArkIndexerArgs) -> Self {
        let sn_client =
            StarknetClientHttp::new(&args.rpc_provider).expect("Can't create Starknet client");
        let storage = Arc::new(storage);

        Self {
            sn_client,
            storage: storage,
            event_manager: EventManager::new(storage),
            collection_manager: CollectionManager::new(storage),
            token_manager: TokenManager::new(storage),
            indexer_version: args.indexer_version,
            indexer_identifier: args.indexer_identifier,
            to_block: args.to_block,
            from_block: args.from_block,
            force_mode: args.force_mode,
        }
    }

    pub async fn run(&mut self) -> Result<()> {
        let is_head_of_chain = self.to_block == BlockId::Tag(BlockTag::Latest);
        let mut current_u64 = self.sn_client.block_id_to_u64(&self.from_block).await?;
        let mut to_u64 = self.sn_client.block_id_to_u64(&self.to_block).await?;

        while current_u64 <= to_u64 {
            log::trace!("Indexing block: {} {}", current_u64, to_u64);
            to_u64 = self
                .check_range(current_u64, to_u64, is_head_of_chain)
                .await;

            if self.check_candidate(current_u64) {
                self.process_block(current_u64).await?;
            }

            current_u64 += 1;
        }

        Ok(())
    }

    async fn process_block(&mut self, block_number: u64) -> Result<()> {
        let block_ts = self
            .sn_client
            .block_time(BlockId::Number(block_number))
            .await?;
        let blocks_events = self
            .sn_client
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

    async fn process_event(&mut self, event: &EmittedEvent, block_ts: u64) -> Result<()> {
        let contract_address = event.from_address;
        let contract_info = self
            .collection_manager
            .identify_contract(&self.sn_client, contract_address)
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
            .format_token(&self.sn_client, &token_event)
            .await
            .map_err(|err| {
                log::error!("Can't format token {:?}\ntevent: {:?}", err, token_event);
                err
            })
    }

    /// Returns true if the given block number must be indexed.
    /// False otherwise.
    pub fn check_candidate(&self, block_number: u64) -> bool {
        if self.force_mode {
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
            self.sn_client
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
    use ark_storage::storage_manager::MockStorageManager;
    use mockall::predicate::*;

    #[tokio::test]
    async fn test_check_candidate() {
        let mut mock_storage = MockStorageManager::default();

        // When the block number is 5 and force_mode is false, the function should return true.
        mock_storage
            .expect_get_block_info()
            .with(eq(5))
            .times(1)
            .returning(|_| Err(StorageError::NotFound));

        let args = ArkIndexerArgs {
            rpc_provider: "http://test.net".to_string(),
            indexer_version: 1,
            indexer_identifier: "test-identifier".to_string(),
            from_block: BlockId::Number(0),
            to_block: BlockId::Number(10),
            force_mode: false,
        };

        let indexer = ArkIndexer::<MockStorageManager>::new(mock_storage, args);

        assert_eq!(indexer.check_candidate(5), true);
    }
}
