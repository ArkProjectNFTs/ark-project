mod constants;
mod contract;
mod managers;
mod transfer;
mod utils;

use anyhow::Result;
use ark_starknet::client2::StarknetClient;

use dotenv::dotenv;

use managers::BlockManager;
use std::env;
use tracing::{span, Level};
use tracing_subscriber::{fmt, layer::SubscriberExt, EnvFilter, Registry};

use starknet::core::types::*;
use tokio::time::{self, Duration};

mod storage;

#[tokio::main]
async fn main() -> Result<()> {
    dotenv().ok();

    init_tracing();

    let rpc_provider = env::var("RPC_PROVIDER").expect("RPC_PROVIDER must be set");
    let sn_client = StarknetClient::new(&rpc_provider.clone())?;
    let storage = storage::init_default();

    let block_manager = BlockManager::new(&storage, &sn_client);
    let (from_block, to_block, poll_head_of_chain) = block_manager.get_block_range();

    let mut current_u64 = sn_client.block_id_to_u64(&from_block).await?;
    let mut to_u64 = sn_client.block_id_to_u64(&to_block).await?;

    loop {
        log::trace!("Indexing block: {} {}", current_u64, to_u64);

        // We've parsed all the block of the range.
        if current_u64 >= to_u64 {
            if !poll_head_of_chain {
                // TODO: can print some stats here if necessary.
                log::info!("End of indexing block range");
                return Ok(());
            }

            // TODO: make this duration configurable (DELAY_HEAD_OF_CHAIN).
            time::sleep(Duration::from_secs(1)).await;

            // Head of the chain requested -> check the last block and continue
            // indexing loop.
            to_u64 = sn_client.block_number().await?;
            continue;
        }

        if !block_manager.check_candidate(current_u64) {
            continue;
        }

        // 2. get events to index them.

        // let blocks_events = self
        //     .client
        //     .fetch_events(BlockId::Number(from_u64), BlockId::Number(latest_u64))
        //     .await?;
        // for (block_number, events) in blocks_events {
        //     self.process_events(block_number, events).await?;
        // }

        current_u64 += 1;
    }

    Ok(())
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
