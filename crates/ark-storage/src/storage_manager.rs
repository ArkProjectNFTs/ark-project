use crate::types::{
    BlockIndexing, BlockIndexingStatus, BlockInfo, ContractInfo, StorageError,
    TokenEvent, TokenFromEvent,
};
use log;
use starknet::core::types::FieldElement;

pub trait StorageManager {
    fn register_mint(&self, token: &TokenFromEvent) -> Result<(), StorageError>;

    fn register_token(&self, token: &TokenFromEvent) -> Result<(), StorageError>;

    fn clean_block(&self, block_number: u64) -> Result<(), StorageError>;

    fn get_block_info(&self, block_number: u64) -> Result<Option<BlockInfo>, StorageError>;

    fn get_contract_info(
        &self,
        contract_address: &FieldElement,
    ) -> Result<ContractInfo, StorageError>;

    fn register_contract_info(
        &self,
        contract_address: &FieldElement,
        info: &ContractInfo,
    ) -> Result<(), StorageError>;

    fn register_event(&self, event: &TokenEvent) -> Result<(), StorageError>;

    fn set_block_info(&self, block_number: u64, info: BlockInfo) -> Result<(), StorageError>;

    fn set_indexer_progress(&self, progress: BlockIndexing) -> Result<(), StorageError>;
}

pub struct DefaultStorage;

impl DefaultStorage {
    pub fn new() -> Self {
        Self
    }
}

impl StorageManager for DefaultStorage {
    fn register_token(&self, token: &TokenFromEvent) -> Result<(), StorageError> {
        log::debug!("Registering token {:?}", token);
        // TODO: In future, handle and return potential errors
        // Err(StorageError::DuplicateToken)
        Ok(())
    }

    fn register_mint(&self, token: &TokenFromEvent) -> Result<(), StorageError> {
        log::debug!("Registering mint {:?}", token);
        // TODO: In future, handle and return potential errors
        // Err(StorageError::InvalidMintData)
        Ok(())
    }

    fn clean_block(&self, block_number: u64) -> Result<(), StorageError> {
        log::debug!("Cleaning block #{}", block_number);
        // TODO: In future, handle and return potential errors
        // Err(StorageError::DatabaseError)
        Ok(())
    }

    fn get_block_info(&self, block_number: u64) -> Result<Option<BlockInfo>, StorageError> {
        log::debug!("Getting block info for block #{}", block_number);
        // TODO: In future, handle and return potential errors
        // Err(StorageError::NotFound)
        Ok(Some(BlockInfo {
            indexer_version: 0,
            indexer_indentifier: "42".to_string(),
            status: BlockIndexingStatus::None,
        }))
    }

    fn get_contract_info(
        &self,
        contract_address: &FieldElement,
    ) -> Result<ContractInfo, StorageError> {
        log::debug!("Getting contract info for contract {}", contract_address);
        // TODO: In future, handle and return potential errors
        Err(StorageError::NotFound)
    }

    fn register_contract_info(
        &self,
        contract_address: &FieldElement,
        info: &ContractInfo,
    ) -> Result<(), StorageError> {
        log::debug!(
            "Registering contract info {:?} for contract {}",
            info,
            contract_address
        );
        // TODO: In future, handle and return potential errors
        // Err(StorageError::DuplicateToken)
        Ok(())
    }

    fn register_event(&self, event: &TokenEvent) -> Result<(), StorageError> {
        log::debug!("Registering event {:?}", event);
        // TODO: In future, handle and return potential errors
        // Err(StorageError::DatabaseError)
        Ok(())
    }

    fn set_block_info(&self, block_number: u64, info: BlockInfo) -> Result<(), StorageError> {
        log::debug!("Setting block info {:?} for block #{}", info, block_number);
        // TODO: In future, handle and return potential errors
        // Err(StorageError::DatabaseError)
        Ok(())
    }

    fn set_indexer_progress(&self, indexer_progress: BlockIndexing) -> Result<(), StorageError> {
        log::debug!(
            "Setting indexer progress to block #{}",
            indexer_progress.percentage
        );
        // TODO: In future, handle and return potential errors
        // Err(StorageError::DatabaseError)
        Ok(())
    }
}
