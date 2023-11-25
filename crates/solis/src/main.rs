use anyhow::Result;
use clap::Parser;
use console::Style;

use katana_core::sequencer::KatanaSequencer;
use katana_rpc::{spawn, NodeHandle};

use starknet::core::types::FieldElement;
use std::sync::Arc;
use tokio::signal::ctrl_c;

use tracing_subscriber::fmt;

mod args;
mod contracts;
mod error;
mod hooker;

use crate::args::KatanaArgs;

use crate::hooker::SolisHooker;

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
        "http://0.0.0.0:5050",
    );

    let orderbook_address = FieldElement::from_hex_be(
        "0x024df499c7b1b14c0e52ea237e26a7401ef70507cf72eaef105316dfb5a207a7",
    )
    .unwrap();

    let hooker = Arc::new(SolisHooker {
        sn_utils_reader,
        orderbook_address,
    });

    // Private key + account address + rpc can come from ENV.
    let private_key =
        FieldElement::from_hex_be("0x1800000000300000180000000000030000000000003006001800006600")
            .unwrap();
    let account_address = FieldElement::from_hex_be(
        "0x517ececd29116499f4a1b64b094da79ba08dfd54a3edaa316134c41f8160973",
    )
    .unwrap();

    let account =
        contracts::account::new_account("http://0.0.0.0:5050", account_address, private_key).await;
    let _orderbook = contracts::orderbook::new_orderbook(orderbook_address, account);

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
