use anyhow::Result;
use async_trait::async_trait;
use clap::Parser;
use console::Style;
use katana_core::hooker::KatanaHooker;
use katana_core::sequencer::KatanaSequencer;
use katana_rpc::{spawn, NodeHandle};
use starknet::accounts::Call;
use starknet::core::types::BroadcastedInvokeTransaction;
use std::sync::Arc;
use tokio::signal::ctrl_c;

use tracing_subscriber::fmt;

mod args;

use args::KatanaArgs;

pub struct SolisHooker {}

#[async_trait]
impl KatanaHooker for SolisHooker {
    async fn verify_invoke_tx_before_pool(
        &self,
        transaction: BroadcastedInvokeTransaction,
    ) -> bool {
        println!("verify invoke tx before pool: {:?}", transaction);
        true
    }

    async fn verify_message_to_starknet_before_tx(&self, call: Call) -> bool {
        println!("verify message to starknet before tx: {:?}", call);
        true
    }

    async fn react_on_starknet_tx_failed(&self, call: Call) {
        println!("Starknet tx failed: {:?}", call);
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing::subscriber::set_global_default(
        fmt::Subscriber::builder()
            .with_env_filter(
                "info,executor=trace,server=debug,katana_core=trace,blockifier=off,\
                 jsonrpsee_server=off,hyper=off",
            )
            .finish(),
    )
    .expect("Failed to set the global tracing subscriber");

    let config = KatanaArgs::parse();

    let hooker = Arc::new(SolisHooker {});

    let server_config = config.server_config();
    let sequencer_config = config.sequencer_config();
    let starknet_config = config.starknet_config();

    let sequencer = Arc::new(KatanaSequencer::new(sequencer_config, starknet_config, hooker).await);
    let NodeHandle { addr, handle, .. } = spawn(Arc::clone(&sequencer), server_config).await?;

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
            Style::new().red().apply_to(format!("http://{addr}"))
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
