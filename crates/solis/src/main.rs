// use anyhow::Result;
// use clap::Parser;
// use console::Style;

// use katana_core::hooker::KatanaHooker;
// use katana_core::sequencer::KatanaSequencer;
// use katana_rpc::{spawn, NodeHandle};

// use starknet::core::types::FieldElement;
// use std::sync::Arc;
// use tokio::signal::ctrl_c;
// use tokio::sync::RwLock as AsyncRwLock;
// use tracing_subscriber::fmt;

use std::io;
use std::sync::Arc;

use clap::{CommandFactory, Parser};
use clap_complete::{generate, Shell};
use console::Style;
use katana_core::constants::{
    ERC20_CONTRACT_CLASS_HASH, FEE_TOKEN_ADDRESS, UDC_ADDRESS, UDC_CLASS_HASH,
};
use katana_core::hooker::KatanaHooker;
use katana_core::sequencer::KatanaSequencer;
use katana_rpc::{spawn, NodeHandle};
use starknet::core::types::FieldElement;
use tokio::signal::ctrl_c;
use tokio::sync::RwLock as AsyncRwLock;
use tracing::info;

use crate::hooker::SolisHooker;

mod args;

use args::Commands::Completions;
use args::KatanaArgs;

//mod args;
mod contracts;
mod hooker;
mod solis_args;

// Chain ID: 'SOLIS' cairo short string.
pub const CHAIN_ID_SOLIS: FieldElement = FieldElement::from_mont([
    18446732623703627169,
    18446744073709551615,
    18446744073709551615,
    576266102202707888,
]);

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = KatanaArgs::parse();
    config.init_logging()?;

    if let Some(command) = config.command {
        match command {
            Completions { shell } => {
                print_completion(shell);
                return Ok(());
            }
        }
    }

    let server_config = config.server_config();
    let sequencer_config = config.sequencer_config();
    let starknet_config = config.starknet_config();

    // ** SOLIS
    let sn_utils_reader = contracts::starknet_utils::new_starknet_utils_reader(
        FieldElement::ZERO,
        &sequencer_config.messaging.clone().unwrap().rpc_url,
    );

    let executor_address = FieldElement::ZERO;
    let orderbook_address = FieldElement::ZERO;

    let hooker = Arc::new(AsyncRwLock::new(SolisHooker::new(
        sn_utils_reader,
        orderbook_address,
        executor_address,
    )));
    // **

    let sequencer = Arc::new(
        KatanaSequencer::new(sequencer_config, starknet_config, hooker.clone())
            .await
            .expect("Failed to start sequencer"),
    );
    let NodeHandle { addr, handle, .. } = spawn(Arc::clone(&sequencer), server_config).await?;

    // ** SOLIS
    // Important to set the sequencer reference in the hooker, to allow the hooker
    // to send `L1HandlerTransaction` to the orderbook.
    hooker.write().await.set_sequencer(sequencer.clone());
    // **

    if !config.silent {
        let mut accounts = sequencer.backend.accounts.iter().peekable();
        let account_class_hash = accounts.peek().unwrap().class_hash;

        if config.json_log {
            info!(
                "{}",
                serde_json::json!({
                    "accounts": accounts.map(|a| serde_json::json!(a)).collect::<Vec<_>>(),
                    "seed": format!("{}", config.starknet.seed),
                    "address": format!("{addr}"),
                })
            )
        } else {
            let accounts = accounts
                .map(|a| format!("{a}"))
                .collect::<Vec<_>>()
                .join("\n");
            print_intro(
                accounts,
                config.starknet.seed.clone(),
                format!(
                    "🚀 JSON-RPC server started: {}",
                    Style::new().red().apply_to(format!("http://{addr}"))
                ),
                format!("{:#064x}", account_class_hash),
            );
        }
    }

    // Wait until Ctrl + C is pressed, then shutdown
    ctrl_c().await?;
    handle.stop()?;

    Ok(())
}

fn print_completion(shell: Shell) {
    let mut command = KatanaArgs::command();
    let name = command.get_name().to_string();
    generate(shell, &mut command, name, &mut io::stdout());
}

fn print_intro(accounts: String, seed: String, address: String, account_class_hash: String) {
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
PREDEPLOYED CONTRACTS
==================

| Contract        | Fee Token
| Address         | {}
| Class Hash      | {:#064x}

| Contract        | Universal Deployer
| Address         | {}
| Class Hash      | {:#064x}

| Contract        | Account Contract
| Class Hash      | {}
    ",
        *FEE_TOKEN_ADDRESS,
        *ERC20_CONTRACT_CLASS_HASH,
        *UDC_ADDRESS,
        *UDC_CLASS_HASH,
        account_class_hash
    );

    println!(
        r"
PREFUNDED ACCOUNTS
==================
{accounts}
    "
    );

    println!(
        r"
ACCOUNTS SEED
=============
{seed}
    "
    );

    println!("\n{address}\n\n");
}
