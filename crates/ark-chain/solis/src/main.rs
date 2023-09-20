use std::process::exit;
use std::sync::Arc;
use std::{fs};

use clap::{Parser};
use console::Style;
use katana_core::sequencer::{KatanaSequencer, Sequencer};
use katana_rpc::{spawn, KatanaApi, NodeHandle, StarknetApi};
use tokio::signal::ctrl_c;
use tracing::{error, info};
use tracing_subscriber::fmt;

mod args;

use args::KatanaArgs;

#[tokio::main]
async fn main() {
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
    let starknet_api = StarknetApi::new(sequencer.clone());
    let katana_api = KatanaApi::new(sequencer.clone());

    match spawn(katana_api, starknet_api, server_config).await {
        Ok(NodeHandle { addr, handle, .. }) => {
            if !config.silent {
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
            }

            // Wait until Ctrl + C is pressed, then shutdown
            ctrl_c().await.unwrap();
            shutdown_handler(sequencer.clone(), config).await;
            handle.stop().unwrap();
        }
        Err(err) => {
            error! {"{err}"};
            exit(1);
        }
    };
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

pub async fn shutdown_handler(sequencer: Arc<impl Sequencer>, config: KatanaArgs) {
    if let Some(path) = config.dump_state {
        info!("Dumping state on shutdown");
        let state = (*sequencer).backend().dump_state().await;
        if let Ok(state) = state {
            match fs::write(path.clone(), state) {
                Ok(_) => {
                    info!("Successfully dumped state")
                }
                Err(_) => {
                    error!("Failed to write state dump to {:?}", path)
                }
            };
        } else {
            error!("Failed to fetch state dump.")
        }
    };
}

