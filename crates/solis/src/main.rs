use anyhow::Result;
use clap::Parser;
use console::Style;

use katana_core::hooker::KatanaHooker;
use katana_core::sequencer::KatanaSequencer;
use katana_rpc::{spawn, NodeHandle};

use starknet::core::types::FieldElement;
use std::sync::Arc;
use tokio::signal::ctrl_c;
use tokio::sync::RwLock as AsyncRwLock;
use tracing_subscriber::fmt;

mod args;
mod contracts;
mod error;
mod hooker;
mod solis_args;

use crate::args::KatanaArgs;
use crate::hooker::SolisHooker;

// Chain ID: 'SOLIS' cairo short string.
pub const CHAIN_ID_SOLIS: FieldElement = FieldElement::from_mont([
    18446732623703627169,
    18446744073709551615,
    18446744073709551615,
    576266102202707888,
]);

#[tokio::main]
async fn main() -> Result<()> {
    tracing::subscriber::set_global_default(
        fmt::Subscriber::builder()
            .with_env_filter(
                "info,executor=trace,server=debug,katana_core=trace,blockifier=off,\
                 jsonrpsee_server=off,hyper=off,solis=trace",
            )
            .finish(),
    )
    .expect("Failed to set the global tracing subscriber");

    let config = KatanaArgs::parse();

    let sn_utils_reader = contracts::starknet_utils::new_starknet_utils_reader(
        FieldElement::ZERO,
        &config.messaging.rpc_url,
    );

    let executor_address = FieldElement::from_hex_be(&config.solis.executor_address)
        .expect("Invalid executor address");
    let orderbook_address = FieldElement::from_hex_be(&config.solis.orderbook_address)
        .expect("Invalid orderbook address");

    let hooker = Arc::new(AsyncRwLock::new(SolisHooker::new(
        sn_utils_reader,
        orderbook_address,
        executor_address,
    )));

    let server_config = config.server_config();
    let sequencer_config = config.sequencer_config();
    let starknet_config = config.starknet_config();

    let sequencer =
        Arc::new(KatanaSequencer::new(sequencer_config, starknet_config, hooker.clone()).await);
    let NodeHandle { addr, handle, .. } = spawn(Arc::clone(&sequencer), server_config).await?;

    // Important to set the sequencer reference in the hooker, to allow the hooker
    // to send `L1HandlerTransaction` to the orderbook.
    hooker.write().await.set_sequencer(sequencer.clone());

    let accounts = sequencer
        .backend
        .accounts
        .iter()
        .map(|a| format!("{a}"))
        .collect::<Vec<_>>()
        .join("\n");

    print_intro(
        accounts,
        format!(
            "🚀 JSON-RPC server started: {}",
            Style::new().blue().apply_to(format!("http://{addr}"))
        ),
    );

    // Wait until Ctrl + C is pressed, then shutdown
    ctrl_c().await?;
    shutdown_handler(sequencer, config).await;
    handle.stop()?;

    Ok(())
}

fn print_intro(accounts: String, address: String) {
    println!(
        "{}",
        Style::new().blue().apply_to(
            r"
 ___  ___ | (_)___ 
/ __|/ _ \| | / __|
\__ \ (_) | | \__ \
|___/\___/|_|_|___/                                                     
"
        )
    );

    println!(
        r"        
PREFUNDED ACCOUNTS
==================
{accounts}
    "
    );

    println!("\n{address}\n\n");
}

pub async fn shutdown_handler(_sequencer: Arc<KatanaSequencer>, _config: KatanaArgs) {
    // Do stuff before exit.
}
