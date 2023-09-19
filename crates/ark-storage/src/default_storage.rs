use crate::prisma::token;
use crate::prisma::PrismaClient;
use crate::types::{
    BlockIndexing, BlockIndexingStatus, BlockInfo, ContractType, StorageError, TokenEvent,
    TokenFromEvent,
};
use crate::StorageManager;
use async_trait::async_trait;
use log;
use prisma_client_rust::NewClientError;
use starknet::core::types::FieldElement;

pub struct DefaultStorage {
    prisma_client: PrismaClient,
}

impl DefaultStorage {
    pub async fn new() -> Result<Self, NewClientError> {
        let client = PrismaClient::_builder().build().await?;
        Ok(Self {
            prisma_client: client,
        })
    }
}

#[async_trait]
impl StorageManager for DefaultStorage {
    async fn register_token(&self, token: &TokenFromEvent) -> Result<(), StorageError> {
        log::debug!("Registering token {:?}", token);

        let token_from_db: Option<token::Data> = self
            .prisma_client
            .token()
            .find_first(vec![
                token::token_id::equals(token.formated_token_id.token_id.clone()),
                token::address::equals(token.address.clone()),
            ])
            .exec()
            .await
            .unwrap();

        match token_from_db {
            Some(data) => {
                let result = self
                    .prisma_client
                    .token()
                    .update(
                        token::id::equals(data.id.clone()),
                        vec![token::owner::set(token.owner.clone())],
                    )
                    .exec()
                    .await;
                match result {
                    Ok(_) => Ok(()),
                    Err(e) => {
                        log::error!("Database error: {:?}", e);
                        Err(StorageError::DatabaseError)
                    }
                }
            }
            None => {
                let result = self
                    .prisma_client
                    .token()
                    .create(
                        token.address.clone(),
                        token.formated_token_id.token_id.clone(),
                        token.formated_token_id.padded_token_id.clone(),
                        token.owner.clone(),
                        vec![],
                    )
                    .exec()
                    .await;
                match result {
                    Ok(_) => Ok(()),
                    Err(e) => {
                        log::error!("Database error: {:?}", e);
                        Err(StorageError::DatabaseError)
                    }
                }
            }
        }
    }

    async fn register_mint(&self, token: &TokenFromEvent) -> Result<(), StorageError> {
        log::debug!("Registering mint {:?}", token);

        let token_from_db: Option<token::Data> = self
            .prisma_client
            .token()
            .find_first(vec![
                token::token_id::equals(token.formated_token_id.token_id.clone()),
                token::address::equals(token.address.clone()),
            ])
            .exec()
            .await
            .unwrap();

        log::debug!("Token from db: {:?}", token_from_db);

        let token_from_db: Option<token::Data> = self
            .prisma_client
            .token()
            .find_first(vec![
                token::token_id::equals(token.formated_token_id.token_id.clone()),
                token::address::equals(token.address.clone()),
            ])
            .exec()
            .await
            .unwrap();

        match token_from_db {
            Some(data) => {
                let result = self
                    .prisma_client
                    .token()
                    .update(
                        token::id::equals(data.id.clone()),
                        vec![
                            token::owner::set(token.owner.clone()),
                            token::mint_address::set(Some(format!(
                                "{:#064x}",
                                token.mint_address.clone().unwrap()
                            ))),
                            token::mint_timestamp::set(Some(
                                token.mint_timestamp.unwrap().try_into().unwrap(),
                            )),
                            token::mint_transaction_hash::set(token.mint_transaction_hash.clone()),
                            token::mint_block_number::set(Some(
                                token.mint_block_number.unwrap().try_into().unwrap(),
                            )),
                        ],
                    )
                    .exec()
                    .await;
                match result {
                    Ok(_) => Ok(()),
                    Err(e) => {
                        log::error!("Database error: {:?}", e);
                        Err(StorageError::DatabaseError)
                    }
                }
            }
            None => {
                let result = self
                    .prisma_client
                    .token()
                    .create(
                        token.address.clone(),
                        token.formated_token_id.token_id.clone(),
                        token.formated_token_id.padded_token_id.clone(),
                        token.owner.clone(),
                        vec![
                            token::mint_address::set(Some(format!(
                                "{:#064x}",
                                token.mint_address.clone().unwrap()
                            ))),
                            token::mint_timestamp::set(Some(
                                token.mint_timestamp.unwrap().try_into().unwrap(),
                            )),
                            token::mint_transaction_hash::set(token.mint_transaction_hash.clone()),
                            token::mint_block_number::set(Some(
                                token.mint_block_number.unwrap().try_into().unwrap(),
                            )),
                        ],
                    )
                    .exec()
                    .await;
                match result {
                    Ok(_) => Ok(()),
                    Err(e) => {
                        log::error!("Database error: {:?}", e);
                        Err(StorageError::DatabaseError)
                    }
                }
            }
        }
    }

    async fn clean_block(&self, block_number: u64) -> Result<(), StorageError> {
        log::debug!("Cleaning block #{}", block_number);
        // TODO: In future, handle and return potential errors
        // Err(StorageError::DatabaseError)
        Ok(())
    }

    async fn get_block_info(&self, block_number: u64) -> Result<BlockInfo, StorageError> {
        log::debug!("Getting block info for block #{}", block_number);
        // TODO: In future, handle and return potential errors
        // Err(StorageError::NotFound)
        Ok(BlockInfo {
            indexer_version: 0,
            indexer_indentifier: "42".to_string(),
            status: BlockIndexingStatus::None,
        })
    }

    async fn get_contract_type(
        &self,
        contract_address: &FieldElement,
    ) -> Result<ContractType, StorageError> {
        log::debug!("Getting contract info for contract {}", contract_address);
        // TODO: In future, handle and return potential errors

        Err(StorageError::NotFound)
    }

    async fn register_contract_info(
        &self,
        contract_address: &FieldElement,
        contract_type: &ContractType,
    ) -> Result<(), StorageError> {
        log::debug!(
            "Registering contract info {:?} for contract {}",
            contract_type,
            contract_address
        );
        let formated_contract_address = format!("{:#064x}", contract_address);

        let result = self
            .prisma_client
            .collection()
            .create(
                formated_contract_address,
                contract_type.clone().to_string(),
                vec![],
            )
            .exec()
            .await;
        match result {
            Ok(_) => Ok(()),
            Err(e) => {
                log::error!("Database error: {:?}", e);
                Err(StorageError::DatabaseError)
            }
        }
    }

    async fn register_event(&self, event: &TokenEvent) -> Result<(), StorageError> {
        log::debug!("Registering event {:?}", event);
        let from_address = format!("{:#064x}", event.from_address_field_element);
        let to_address = format!("{:#064x}", event.to_address_field_element);
        let result = self
            .prisma_client
            .event()
            .create(
                event.timestamp.try_into().unwrap(),
                from_address,
                to_address,
                event.contract_address.clone(),
                event.transaction_hash.clone(),
                event.formated_token_id.token_id.clone(),
                event.formated_token_id.padded_token_id.clone(),
                event.block_number.try_into().unwrap(),
                event.contract_type.clone(),
                event.event_type.clone().to_string(),
                vec![],
            )
            .exec()
            .await;
        match result {
            Ok(_) => Ok(()),
            Err(e) => {
                log::error!("Database error: {:?}", e);
                Err(StorageError::DatabaseError)
            }
        }
    }

    async fn set_block_info(&self, block_number: u64, info: BlockInfo) -> Result<(), StorageError> {
        log::debug!("Setting block info {:?} for block #{}", info, block_number);
        // TODO: In future, handle and return potential errors
        // Err(StorageError::DatabaseError)
        Ok(())
    }

    async fn set_indexer_progress(
        &self,
        indexer_progress: BlockIndexing,
    ) -> Result<(), StorageError> {
        log::debug!(
            "Setting indexer progress to block #{}",
            indexer_progress.percentage
        );
        // TODO: In future, handle and return potential errors
        // Err(StorageError::DatabaseError)
        Ok(())
    }
}
