mod managers;

use anyhow::Result;
use ark_starknet::client::{StarknetClient, StarknetClientHttp};
use ark_storage::storage_manager::StorageManager;
use ark_storage::types::{BlockIndexingStatus, ContractType};
use dotenv::dotenv;
use managers::{BlockManager, CollectionManager, EventManager, TokenManager};
use starknet::core::types::*;
use std::env;
use tokio::time::{self, Duration};
use tracing::{span, Level};
use tracing_subscriber::{fmt, layer::SubscriberExt, EnvFilter, Registry};

pub async fn main_loop<T: StorageManager>(storage: T) -> Result<()> {
    dotenv().ok();

    init_tracing();

    let rpc_provider = env::var("RPC_PROVIDER").expect("RPC_PROVIDER must be set");
    let sn_client = StarknetClientHttp::new(&rpc_provider.clone())?;
    let block_manager = BlockManager::new(&storage, &sn_client);
    let mut event_manager = EventManager::new(&storage);
    let mut token_manager = TokenManager::new(&storage, &sn_client);
    let mut collection_manager = CollectionManager::new(&storage, &sn_client);

    let (from_block, to_block, poll_head_of_chain) = block_manager.get_block_range();

    let mut current_u64 = sn_client.block_id_to_u64(&from_block).await?;
    let mut to_u64 = sn_client.block_id_to_u64(&to_block).await?;

    loop {
        log::trace!("Indexing block range: {} {}", current_u64, to_u64);

        to_u64 = check_range(&sn_client, current_u64, to_u64, poll_head_of_chain).await;
        if current_u64 > to_u64 {
            continue;
        }

        if !block_manager.check_candidate(current_u64).await {
            current_u64 += 1;
            continue;
        }

        // Set block as pending
        block_manager
            .set_block_info(current_u64, BlockIndexingStatus::Processing)
            .await?;

        let block_ts = sn_client.block_time(BlockId::Number(current_u64)).await?;

        let blocks_events = sn_client
            .fetch_events(
                BlockId::Number(current_u64),
                BlockId::Number(current_u64),
                event_manager.keys_selector(),
            )
            .await?;

        for (_, events) in blocks_events {
            for e in events {
                let contract_address = e.from_address;

                let contract_type = match collection_manager
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

                let token_event = match event_manager
                    .format_and_register_event(&e, contract_type, block_ts)
                    .await
                {
                    Ok(te) => te,
                    Err(err) => {
                        log::error!("Error while registering event {:?}\n{:?}", err, e);
                        continue;
                    }
                };

                match token_manager.format_token(&token_event).await {
                    Ok(()) => (),
                    Err(err) => {
                        log::error!("Can't format token {:?}\ntevent: {:?}", err, token_event);
                        continue;
                    }
                }
            }
        }

        block_manager
            .set_block_info(current_u64, BlockIndexingStatus::Terminated)
            .await?;
        // set block as indexed here
        current_u64 += 1;
    }
}

async fn check_range(
    client: &StarknetClientHttp,
    current: u64,
    to: u64,
    poll_head_of_chain: bool,
) -> u64 {
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
        client
            .block_number()
            .await
            .expect("Can't fetch last block number")
    } else {
        to
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
