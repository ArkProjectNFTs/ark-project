mod managers;
use anyhow::Result;
use ark_starknet::client::{StarknetClient, StarknetClientHttp};
use ark_storage::storage_manager::StorageManager;
use ark_storage::types::ContractType;
use ark_storage::types::StorageError;
use managers::{CollectionManager, EventManager, TokenManager};
use starknet::core::types::*;
use std::env;
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

pub struct ArkIndexer<'a, T: StorageManager> {
    sn_client: StarknetClientHttp,
    storage: &'a T,
    event_manager: EventManager<'a, T>,
    collection_manager: CollectionManager<'a, T>,
    token_manager: TokenManager<'a, T>,
    indexer_version: u64,
    indexer_identifier: String,
    from_block: BlockId,
    to_block: BlockId,
}

pub struct ArkIndexerArgs {
    pub rpc_provider: String,
    pub indexer_version: u64,
    pub indexer_identifier: String,
    pub from_block: BlockId,
    pub to_block: BlockId,
}

impl<'a, T: StorageManager> ArkIndexer<'a, T> {
    pub fn new(storage: &'a T, args: ArkIndexerArgs) -> Self {
        let sn_client = StarknetClientHttp::new(&args.rpc_provider.clone())
            .expect("Can't create Starknet client");
        let event_manager = EventManager::new(storage);
        let collection_manager = CollectionManager::new(storage);
        let token_manager = TokenManager::new(storage);

        Self {
            sn_client,
            storage,
            event_manager,
            collection_manager,
            token_manager,
            indexer_version: args.indexer_version,
            indexer_identifier: args.indexer_identifier,
            to_block: args.to_block,
            from_block: args.from_block,
        }
    }

    pub async fn run(&mut self) -> Result<()> {
        let is_head_of_chain = self.to_block == BlockId::Tag(BlockTag::Latest);
        let mut current_u64 = self.sn_client.block_id_to_u64(&self.from_block).await?;
        let mut to_u64 = self.sn_client.block_id_to_u64(&self.to_block).await?;

        loop {
            log::trace!("Indexing block: {} {}", current_u64, to_u64);

            to_u64 = self
                .check_range(current_u64, to_u64, is_head_of_chain)
                .await;

            if current_u64 > to_u64 {
                break;
            }

            if !self.check_candidate(current_u64) {
                continue;
            }

            let block_ts = self
                .sn_client
                .block_time(BlockId::Number(current_u64))
                .await?;

            let blocks_events = self
                .sn_client
                .fetch_events(
                    BlockId::Number(current_u64),
                    BlockId::Number(current_u64),
                    self.event_manager.keys_selector(),
                )
                .await?;

            for (_, events) in blocks_events {
                for e in events {
                    let contract_address = e.from_address;

                    let contract_info = match self
                        .collection_manager
                        .identify_contract(&self.sn_client, contract_address)
                        .await
                    {
                        Ok(info) => info,
                        Err(e) => {
                            log::error!("Can't identify contract {contract_address}: {:?}", e);
                            continue;
                        }
                    };

                    let contract_type = contract_info.r#type;
                    if contract_type == ContractType::Other {
                        continue;
                    }

                    let token_event = match self
                        .event_manager
                        .format_event(&e, contract_type, block_ts)
                        .await
                    {
                        Ok(te) => te,
                        Err(err) => {
                            log::error!("Can't format event {:?}\nevent: {:?}", err, e);
                            continue;
                        }
                    };

                    match self
                        .token_manager
                        .format_token(&self.sn_client, &token_event)
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

            current_u64 += 1;
        }

        Ok(())
    }

    /// Returns true if the given block number must be indexed.
    /// False otherwise.
    pub fn check_candidate(&self, block_number: u64) -> bool {
        // If we are indexing the head of the chain, we don't need to check
        let do_force: &bool = &env::var("FORCE_MODE")
            .unwrap_or("false".to_string())
            .parse()
            .unwrap_or(false);

        if *do_force {
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
