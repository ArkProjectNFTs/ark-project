//! How to run pontos on pending block only.
//!
//! Can be run with `cargo run --example pontos_pending`.
//!
use anyhow::Result;
use ark_starknet::client::{StarknetClient, StarknetClientHttp};
use arkproject::pontos::{
    event_handler::EventHandler, storage::types::*, storage::Storage, Pontos, PontosConfig,
};
use async_trait::async_trait;
use starknet::core::types::*;
use std::sync::Arc;

#[tokio::main]
async fn main() -> Result<()> {
    let client = Arc::new(
        StarknetClientHttp::new(
            "https://starknet-goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
        )
        .unwrap(),
    );

    // Typically loaded from env.
    let config = PontosConfig {
        indexer_version: 1,
        indexer_identifier: "task_1234".to_string(),
    };

    let pontos = Arc::new(Pontos::new(
        Arc::clone(&client),
        Arc::new(DefaultStorage::new()),
        Arc::new(DefaultEventHandler::new()),
        config,
    ));

    let task = tokio::spawn(async move { Arc::clone(&pontos).index_pending().await });

    if let Err(err) = task.await {
        eprintln!("Error in the spawned task: {:?}", err);
    }

    Ok(())
}

// Default event hanlder.
struct DefaultEventHandler;

impl DefaultEventHandler {
    pub fn new() -> Self {
        DefaultEventHandler {}
    }
}

#[async_trait]
impl EventHandler for DefaultEventHandler {}

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
    async fn register_mint(
        &self,
        token: &TokenFromEvent,
        _block_number: u64,
    ) -> Result<(), StorageError> {
        log::trace!("Registering mint {:?}", token);
        Ok(())
    }

    async fn register_token(
        &self,
        token: &TokenFromEvent,
        _block_number: u64,
    ) -> Result<(), StorageError> {
        log::trace!("Registering token {:?}", token);
        Ok(())
    }

    async fn register_event(
        &self,
        event: &TokenEvent,
        _block_number: u64,
    ) -> Result<(), StorageError> {
        log::trace!("Registering event {:?}", event);
        Ok(())
    }

    async fn get_contract_type(
        &self,
        contract_address: &FieldElement,
    ) -> Result<ContractType, StorageError> {
        log::trace!(
            "Getting contract info for contract {:#64x}",
            contract_address
        );
        Ok(ContractType::Other)
    }

    async fn register_contract_info(
        &self,
        contract_address: &FieldElement,
        contract_type: &ContractType,
        _block_number: u64,
    ) -> Result<(), StorageError> {
        log::trace!(
            "Registering contract info {:?} for contract {:#64x}",
            contract_type,
            contract_address
        );
        Ok(())
    }

    async fn set_block_info(&self, block_number: u64, info: BlockInfo) -> Result<(), StorageError> {
        log::trace!("Setting block info {:?} for block #{}", info, block_number);
        Ok(())
    }

    async fn get_block_info(&self, block_number: u64) -> Result<BlockInfo, StorageError> {
        log::trace!("Getting block info for block #{}", block_number);
        Ok(BlockInfo {
            indexer_version: 0,
            indexer_identifier: "v0".to_string(),
            status: BlockIndexingStatus::None,
        })
    }

    async fn clean_block(&self, block_number: u64) -> Result<(), StorageError> {
        log::trace!("Cleaning block #{}", block_number);
        Ok(())
    }

    async fn update_last_pending_block(
        &self,
        block_number: u64,
        block_timestamp: u64,
    ) -> Result<(), StorageError> {
        log::trace!(
            "Update last pending block #{} {}",
            block_number,
            block_timestamp
        );
        Ok(())
    }
}
