use crate::types::{BlockInfo, ContractInfo, TokenEvent, TokenFromEvent};
use log;

pub trait StorageManager {
    // Store a new token in the storage
    fn register_token(&self, token: &TokenFromEvent);

    // Update an existing token's owner in the storage
    fn update_token_owner(&self, token: &TokenFromEvent, new_owner: &str);

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
    fn clean_block(&self, block_number: u64) -> bool {
        log::debug!("Cleaning block #{}", block_number);
        true
    }

    fn register_token(&self, token: &TokenFromEvent) {
        log::debug!("Registering token {:?}", token);
    }

    fn update_token_owner(&self, token: &TokenFromEvent, new_owner: &str) {
        log::debug!("Updating token {:?} owner to {}", token, new_owner);
    }

    fn get_block_info(&self, block_number: u64) -> Option<BlockInfo> {
        log::debug!("Getting block info for block #{}", block_number);
        None
    }

    fn get_contract_info(&self, contract_address: &str) -> Option<ContractInfo> {
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
