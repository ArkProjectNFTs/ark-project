

use std::sync::Arc;

use anyhow::Result;
use clap::Parser;
use console::Style;
use katana_core::sequencer::KatanaSequencer;
use katana_rpc::{spawn, NodeHandle};
use tokio::signal::ctrl_c;

use tracing_subscriber::fmt;

mod args;

use args::KatanaArgs;

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

    let server_config = config.server_config();
    let sequencer_config = config.sequencer_config();
    let starknet_config = config.starknet_config();

    let sequencer = Arc::new(KatanaSequencer::new(sequencer_config, starknet_config).await);
    let NodeHandle { addr, handle, .. } = spawn(Arc::clone(&sequencer), server_config).await?;
    
    let accounts = sequencer.backend.accounts.iter().map(|a| format!("{a}")).collect::<Vec<_>>().join("\n");

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

