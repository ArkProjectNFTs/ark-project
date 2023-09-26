use crate::prisma::PrismaClient;
use crate::prisma::{block, collection, event, token};
use crate::types::{
    BlockIndexing, BlockInfo, ContractType, StorageError, TokenEvent, TokenFromEvent,
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

// TODO - add indexer version check with @remi
// TODO - add tests

#[async_trait]
impl StorageManager for DefaultStorage {
    async fn register_mint(
        &self,
        token: &TokenFromEvent,
        block_number: u64,
    ) -> Result<(), StorageError> {
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

        log::debug!("Token found in the database: {:?}\n", token_from_db);
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
                                token.mint_address.unwrap()
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
                        block_number as i32,
                        vec![
                            token::mint_address::set(Some(format!(
                                "{:#064x}",
                                token.mint_address.unwrap()
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

    async fn register_token(
        &self,
        token: &TokenFromEvent,
        block_number: u64,
    ) -> Result<(), StorageError> {
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
                        block_number as i32,
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

    async fn register_event(
        &self,
        event: &TokenEvent,
        block_number: u64,
    ) -> Result<(), StorageError> {
        log::debug!("Registering event {:?}", event);
        let event_from_db: Option<event::Data> = self
            .prisma_client
            .event()
            .find_unique(event::event_id::equals(event.event_id.to_string()))
            .exec()
            .await
            .unwrap();

        match event_from_db {
            Some(_) => Err(StorageError::AlreadyExists),
            None => {
                let from_address = format!("{:#064x}", event.from_address_field_element);

                let to_address = format!("{:#064x}", event.to_address_field_element);

                let result = self
                    .prisma_client
                    .event()
                    .create(
                        event.event_id.to_string(),
                        event.timestamp as i32,
                        from_address,
                        to_address,
                        event.contract_address.clone(),
                        event.transaction_hash.clone(),
                        event.formated_token_id.token_id.clone(),
                        event.formated_token_id.padded_token_id.clone(),
                        event.block_number as i32,
                        event.contract_type.clone(),
                        event.event_type.clone().to_string(),
                        block_number as i32,
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

    async fn get_contract_type(
        &self,
        contract_address: &FieldElement,
    ) -> Result<ContractType, StorageError> {
        log::debug!("Getting contract info for contract {}", contract_address);
        let contract_data: Option<collection::Data> = self
            .prisma_client
            .collection()
            .find_unique(collection::contract_address::equals(
                contract_address.to_string(),
            ))
            .exec()
            .await
            .unwrap();
        match contract_data {
            Some(data) => Ok(data.r#type.parse().unwrap()),
            None => Err(StorageError::NotFound),
        }
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
        let formated_contract_address = format!("{:#064x}", contract_address);

        let result = self
            .prisma_client
            .collection()
            .create(
                formated_contract_address,
                contract_type.clone().to_string(),
                block_number as i32,
                vec![],
            )
            .exec()
            .await;
        match result {
            Ok(_) => Ok(()),
            Err(_) => Err(StorageError::AlreadyExists),
        }
    }

    async fn set_block_info(&self, block_number: u64, info: BlockInfo) -> Result<(), StorageError> {
        log::debug!("Setting block info {:?} for block #{}", info, block_number);
        let result = self
            .prisma_client
            .block()
            .upsert(
                block::number::equals(block_number as i32),
                block::create(
                    block_number as i32,
                    info.indexer_version.to_string(),
                    info.indexer_identifier,
                    info.status.to_string(),
                    block_number as i32,
                    vec![],
                ),
                vec![block::status::set(info.status.to_string())],
            )
            .exec()
            .await;
        match result {
            Ok(_) => Ok(()),
            Err(_) => Err(StorageError::AlreadyExists),
        }
    }

    async fn get_block_info(&self, block_number: u64) -> Result<BlockInfo, StorageError> {
        log::debug!("Getting block info for block #{}", block_number);
        let block_data: Option<block::Data> = self
            .prisma_client
            .block()
            .find_unique(block::number::equals(block_number as i32))
            .exec()
            .await
            .unwrap();
        match block_data {
            Some(data) => Ok(BlockInfo {
                indexer_version: data.indexer_version.parse().unwrap(),
                indexer_identifier: data.indexer_identifier,
                status: data
                    .status
                    .parse()
                    .map_err(|_| StorageError::InvalidStatus)?,
            }),
            None => Err(StorageError::NotFound),
        }
    }

    async fn clean_block(&self, block_number: u64) -> Result<(), StorageError> {
        log::debug!("Cleaning block #{}", block_number);
        // TODO: In future, handle and return potential errors
        let block_result = self
            .prisma_client
            .block()
            .delete_many(vec![block::indexed_at_block_number::equals(
                block_number as i32,
            )])
            .exec()
            .await;
        let event_result = self
            .prisma_client
            .event()
            .delete_many(vec![event::indexed_at_block_number::equals(
                block_number as i32,
            )])
            .exec()
            .await;
        let token_result = self
            .prisma_client
            .token()
            .delete_many(vec![token::indexed_at_block_number::equals(
                block_number as i32,
            )])
            .exec()
            .await;
        let collection_result = self
            .prisma_client
            .collection()
            .delete_many(vec![collection::indexed_at_block_number::equals(
                block_number as i32,
            )])
            .exec()
            .await;
        match (block_result, event_result, token_result, collection_result) {
            (Ok(_), Ok(_), Ok(_), Ok(_)) => Ok(()),
            _ => Err(StorageError::DatabaseError),
        }
    }

    // TODO check with @remi
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
