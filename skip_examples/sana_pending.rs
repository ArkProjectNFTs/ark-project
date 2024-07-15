use anyhow::Result;
use arkproject::sana::storage::types::{
    BlockInfo, ContractInfo, ContractType, StorageError, TokenInfo, TokenMintInfo,
};
use arkproject::sana::{
    event_handler::EventHandler, storage::types::*, storage::Storage, Sana, SanaConfig,
};
use arkproject::starknet::client::{StarknetClient, StarknetClientHttp};
use async_trait::async_trait;
use log::{error, info};
use std::sync::Arc;
use tracing_subscriber::{fmt, EnvFilter};

fn init_logging() {
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info,arkproject=debug,sana=debug"));

    tracing_subscriber::fmt().with_env_filter(filter).init();
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize the logger
    init_logging();

    // Set the log level (you can also do this via environment variable)
    std::env::set_var("RUST_LOG", "debug");

    info!("Initializing Sana for pending events indexing");

    // Initialize the Starknet client
    let rpc_url = "https://juno.mainnet.arkproject.dev";
    let starknet_client = Arc::new(StarknetClientHttp::new(rpc_url)?);

    // Create Sana configuration
    let config = SanaConfig {
        indexer_version: String::from("0.0.1"),
        indexer_identifier: "pending_test".to_string(),
    };

    // Initialize Sana
    let sana = Sana::new(
        Arc::clone(&starknet_client),
        Arc::new(DefaultStorage::new()),
        Arc::new(DefaultEventHandler::new()),
        config,
    );

    info!("Starting pending events indexer...");

    // Run the index_pending method
    match sana.index_pending().await {
        Ok(_) => info!("Pending events indexer completed successfully."),
        Err(e) => error!("Pending events indexer failed with error: {:?}", e),
    }

    Ok(())
}

// Implement a basic DefaultEventHandler
struct DefaultEventHandler;

impl DefaultEventHandler {
    pub fn new() -> Self {
        DefaultEventHandler {}
    }
}

#[async_trait::async_trait]
impl EventHandler for DefaultEventHandler {
    async fn on_block_processed(
        &self,
        block_number: u64,
        indexation_progress: f64,
        _force_mode: bool,
        _from: u64,
        _to: u64,
    ) {
        println!(
            "Block processed: {}, Progress: {:.2}%",
            block_number, indexation_progress
        );
    }

    async fn on_indexation_range_completed(&self) {
        println!("Indexation range completed");
    }

    async fn on_new_latest_block(&self, block_number: u64) {
        println!("New latest block: {}", block_number);
    }

    async fn on_block_processing(&self, block_timestamp: u64, block_number: Option<u64>) {
        println!(
            "Processing block: timestamp={}, number={:?}",
            block_timestamp, block_number
        );
    }
}

// Default storage.
pub struct DefaultStorage;

impl DefaultStorage {
    pub fn new() -> Self {
        Self {}
    }
}

impl Default for DefaultStorage {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl Storage for DefaultStorage {
    // Implement the required methods for the Storage trait with placeholder implementations
    async fn register_mint(
        &self,
        contract_address: &str,
        token_id_hex: &str,
        token_id: &str,
        info: &TokenMintInfo,
    ) -> Result<(), StorageError> {
        println!(
            "Registering mint: {} {} {}",
            contract_address, token_id, token_id_hex
        );
        Ok(())
    }

    async fn register_sale_event(
        &self,
        event: &TokenSaleEvent,
        block_timestamp: u64,
    ) -> Result<(), StorageError> {
        Ok(())
    }

    async fn register_transfer_event(
        &self,
        event: &TokenTransferEvent,
    ) -> Result<(), StorageError> {
        Ok(())
    }

    async fn register_token(
        &self,
        token: &TokenInfo,
        block_timestamp: u64,
    ) -> Result<(), StorageError> {
        println!("Registering token: {:?}", token);
        Ok(())
    }

    async fn get_contract_type(
        &self,
        contract_address: &str,
        chain_id: &str,
    ) -> Result<ContractType, StorageError> {
        println!("Getting contract type for: {}", contract_address);
        Ok(ContractType::ERC721)
    }

    async fn register_contract_info(
        &self,
        info: &ContractInfo,
        block_timestamp: u64,
    ) -> Result<(), StorageError> {
        println!("Registering contract info: {:?}", info);
        Ok(())
    }

    async fn set_block_info(
        &self,
        block_timestamp: u64,
        block_info: BlockInfo,
    ) -> Result<(), StorageError> {
        println!("Setting block info: {:?}", block_info);
        Ok(())
    }

    async fn get_block_info(&self, block_number: u64) -> Result<BlockInfo, StorageError> {
        log::trace!("Getting block info for block #{}", block_number);
        Ok(BlockInfo {
            indexer_version: String::from("0.0.1"),
            indexer_identifier: String::from("v0"),
            block_status: BlockIndexingStatus::None,
            block_number,
        })
    }

    async fn clean_block(
        &self,
        block_timestamp: u64,
        block_number: Option<u64>,
    ) -> Result<(), StorageError> {
        println!(
            "Cleaning block: timestamp={}, number={:?}",
            block_timestamp, block_number
        );
        Ok(())
    }
}
