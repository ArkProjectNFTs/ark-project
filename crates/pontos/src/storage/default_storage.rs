use crate::storage::types::{BlockInfo, ContractType, StorageError, TokenEvent, TokenFromEvent};
use crate::Storage;
use async_trait::async_trait;
use log;
use sqlx::SqlitePool;
use starknet::core::types::FieldElement;
pub struct DefaultStorage {
    pool: SqlitePool,
}

impl DefaultStorage {
    pub async fn new(database_url: &str) -> Result<Self, sqlx::Error> {
        let pool = SqlitePool::connect(database_url).await?;
        sqlx::migrate!("./src/storage/migrations")
            .run(&pool)
            .await?;
        match pool.acquire().await {
            Ok(_) => {}
            Err(e) => {
                log::error!("Failed to acquire connection: {}", e);
                return Err(e);
            }
        }

        Ok(Self { pool })
    }
}

#[async_trait]
impl Storage for DefaultStorage {
    async fn register_mint(
        &self,
        token: &TokenFromEvent,
        block_number: u64,
    ) -> Result<(), StorageError> {
        log::debug!("Registering mint {:?}", token);
        Err((StorageError::DatabaseError))
    }

    async fn register_token(
        &self,
        token: &TokenFromEvent,
        block_number: u64,
    ) -> Result<(), StorageError> {
        log::debug!("Registering token {:?}", token);
        Err((StorageError::DatabaseError))
    }

    async fn register_event(
        &self,
        event: &TokenEvent,
        block_number: u64,
    ) -> Result<(), StorageError> {
        log::debug!("Registering event {:?}", event);
        Err((StorageError::DatabaseError))
    }

    async fn get_contract_type(
        &self,
        contract_address: &FieldElement,
    ) -> Result<ContractType, StorageError> {
        log::debug!("Getting contract info for contract {}", contract_address);
        Err((StorageError::DatabaseError))
    }

    async fn register_contract_info(
        &self,
        contract_address: &FieldElement,
        contract_type: &ContractType,
        block_number: u64,
    ) -> Result<(), StorageError> {
        log::debug!(
            "Registering contract info {:?} for contract {}",
            contract_type,
            contract_address
        );
        Err((StorageError::DatabaseError))
    }

    async fn set_block_info(&self, block_number: u64, info: BlockInfo) -> Result<(), StorageError> {
        log::debug!("Setting block info {:?} for block #{}", info, block_number);
        Err((StorageError::DatabaseError))
    }

    async fn get_block_info(&self, block_number: u64) -> Result<BlockInfo, StorageError> {
        log::debug!("Getting block info for block #{}", block_number);
        Err((StorageError::DatabaseError))
    }

    async fn clean_block(&self, block_number: u64) -> Result<(), StorageError> {
        log::debug!("Cleaning block #{}", block_number);
        Err((StorageError::DatabaseError))
    }
}
