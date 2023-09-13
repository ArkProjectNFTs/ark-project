use crate::types::{BlockIndexing, BlockInfo, ContractInfo, TokenEvent, TokenFromEvent};
use log;

enum StorageError {
    // TODO
}
// TODO
//
pub trait StorageManager {
    fn register_mint(&self, token: &TokenFromEvent) -> Result<(), StorageError>;

    fn register_token(&self, token: &TokenFromEvent) -> Result<(), StorageError>;

    fn clean_block(&self, block_number: u64) -> Result<(), StorageError>;

    fn get_block_info(&self, block_number: u64) -> Result<Option<BlockInfo>, StorageError>;

    fn get_contract_info(
        &self,
        contract_address: &str,
    ) -> Result<Option<ContractInfo>, StorageError>;

    fn register_contract_info(
        &self,
        contract_address: &str,
        info: ContractInfo,
    ) -> Result<(), StorageError>;

    fn register_event(&self, event: TokenEvent) -> Result<(), StorageError>;

    fn set_block_info(&self, block_number: u64, info: BlockInfo) -> Result<(), StorageError>;

    fn set_indexer_progress(&self, block_number: u64) -> Result<(), StorageError>;
}

impl StorageManager for DefaultStorage {
    fn register_token(&self, token: &TokenFromEvent) -> Result<(), StorageError> {
        log::debug!("Registering token {:?}", token);
        // ... Logic here
        Ok(())
    }

    fn register_mint(&self, token: &TokenFromEvent) -> Result<(), StorageError> {
        log::debug!("Registering mint {:?}", token);
        // ... Logic here
        Ok(())
    }

    fn clean_block(&self, block_number: u64) -> Result<(), StorageError> {
        log::debug!("Cleaning block #{}", block_number);
        // ... Logic here
        Ok(())
    }

    fn get_block_info(&self, block_number: u64) -> Result<Option<BlockInfo>, StorageError> {
        log::debug!("Getting block info for block #{}", block_number);
        // ... Logic here
        Ok(None)
    }

    fn get_contract_info(
        &self,
        contract_address: &str,
    ) -> Result<Option<ContractInfo>, StorageError> {
        log::debug!("Getting contract info for contract {}", contract_address);
        // ... Logic here
        Ok(None)
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
        // ... Logic here
        Ok(())
    }

    fn register_event(&self, event: TokenEvent) -> Result<(), StorageError> {
        log::debug!("Registering event {:?}", event);
        // ... Logic here
        Ok(())
    }

    fn set_block_info(&self, block_number: u64, info: BlockInfo) -> Result<(), StorageError> {
        log::debug!("Setting block info {:?} for block #{}", info, block_number);
        // ... Logic here
        Ok(())
    }

    fn set_indexer_progress(&self, progress: BlockIndexing) -> Result<(), StorageError> {
        log::debug!(
            "Setting indexer progress to block #{}",
            progress.percentage
        );
        // ... Logic here
        Ok(())
    }
}
