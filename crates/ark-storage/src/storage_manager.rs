use crate::types::{BlockInfo, ContractInfo, TokenEvent, TokenFromEvent};
use log;

// TODO
// 
pub trait StorageManager {
    // Store a new mint in the storage
    fn register_mint(&self, token: &TokenFromEvent) -> bool;

    // Store a new token in the storage
    fn register_token(&self, token: &TokenFromEvent);

    // clean block info from storage
    fn clean_block(&self, block_number: u64) -> bool;

    // get block info from storage
    fn get_block_info(&self, block_number: u64) -> Option<BlockInfo>;

    // register block info in storage
    fn get_contract_info(&self, contract_address: &str) -> Option<ContractInfo>;

    // register contract info in storage
    fn register_contract_info(&self, contract_address: &str, info: ContractInfo);

    // register event in storage
    fn register_event(&self, event: TokenEvent);
}

// Default implementation (Logging for this example)
pub struct DefaultStorage;

impl DefaultStorage {
    pub fn new() -> Self {
        Self
    }
}

impl StorageManager for DefaultStorage {
    fn register_token(&self, token: &TokenFromEvent) {
        log::debug!("Registering token {:?}", token);
        // 3 informations to store:
        // - token id
        // - token owner
        // - contract address
    }

    fn register_mint(&self, token: &TokenFromEvent) {
        log::debug!("Registering mint {:?}", token);
        // Informations to store:
        // - minted timestamp
        // - minted block
        // - minted transaction hash
        // - minted owner optional
    }

    fn clean_block(&self, block_number: u64) -> bool {
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

    fn register_contract_info(&self, contract_address: &str, info: ContractInfo) {
        log::debug!(
            "Registering contract info {:?} for contract {}",
            info,
            contract_address
        );
    }

    fn register_event(&self, event: TokenEvent) {
        log::debug!("Registering event {:?}", event);
    }
}
