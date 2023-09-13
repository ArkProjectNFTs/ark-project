use crate::types::{BlockIndexing, BlockInfo, ContractInfo, TokenEvent, TokenFromEvent};
use log;

enum StorageError {
    // TODO
}
// TODO
//
pub trait StorageManager {
    // Store a new mint in the storage
    fn register_mint(&self, token: &TokenFromEvent) -> Result<(), StorageError>;

    // Store a new token in the storage
    fn register_token(&self, token: &TokenFromEvent) -> Result<(), StorageError>;

    // clean block info from storage
    fn clean_block(&self, block_number: u64) -> Result<(), StorageError>;

    // get block info from storage
    fn get_block_info(&self, block_number: u64) -> Option<BlockInfo>;

    // register block info in storage
    fn get_contract_info(&self, contract_address: &str) -> Option<ContractInfo>;

    // register contract info in storage
    fn register_contract_info(&self, contract_address: &str, info: ContractInfo);

    // register event in storage
    fn register_event(&self, event: TokenEvent) -> Result<(), StorageError>;

    fn set_block_info(&self, block_number: u64, info: BlockInfo) -> Result<(), StorageError>;

    fn set_indexer_progress(&self, block_number: u64) -> Result<(), StorageError>;
}

// Default implementation (Logging for this example)
pub struct DefaultStorage;

impl DefaultStorage {
    pub fn new() -> Self {
        Self
    }
}

impl StorageManager for DefaultStorage {
    fn register_token(&self, token: &TokenFromEvent) -> Result<(), StorageError> {
        log::debug!("Registering token {:?}", token);
        // 3 informations to store:
        // - token id
        // - token owner
        // - contract address
    }

    fn register_mint(&self, token: &TokenFromEvent) -> Result<(), StorageError> {
        log::debug!("Registering mint {:?}", token);
        // Informations to store:
        // - minted timestamp
        // - minted block
        // - minted transaction hash
        // - minted owner optional
    }

    fn clean_block(&self, block_number: u64) -> Result<(), StorageError> {
        // remove all tokens from this block
        // remove all events from this block
        log::debug!("Cleaning block #{}", block_number);
        true
    }

    fn get_block_info(&self, block_number: u64) -> Option<BlockInfo> {
        // return result with option with none or error with none
        log::debug!("Getting block info for block #{}", block_number);
        None
    }

    fn get_contract_info(&self, contract_address: &str) -> Option<ContractInfo> {
        // result with option with none or error with none
        log::debug!("Getting contract info for contract {}", contract_address);
        None
    }

    fn register_contract_info(
        &self,
        contract_address: &str,
        info: ContractInfo,
    ) -> Result<(), StorageError> {
        log::debug!(
            "Registering contract info {:?} for contract {}",
            info,
            contract_address
        );
    }

    fn register_event(&self, event: TokenEvent) -> Result<(), StorageError> {
        log::debug!("Registering event {:?}", event);
    }

    fn set_block_info(&self, block_number: u64, info: BlockInfo) -> Result<(), StorageError> {
        log::debug!("Setting block info {} for block #{}", info, block_number);
    }

    // range, progress, status {running, stopped}, indentifier, indexer_version
    fn set_indexer_progress(&self, indexer_progress: BlockIndexing) -> Result<(), StorageError> {
        log::debug!("Setting indexer progress to block #{}", block_number);
    }
}
