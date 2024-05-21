//! Implementation of default storage using sqlx crate.
//!
//! The implementation in this file is very naive, and mostly
//! used for testing and as an example of implementation.
//! No optimization was done for indexing or PK/FK managment.
use async_trait::async_trait;

use log::trace;
use sqlx::{any::AnyPoolOptions, AnyPool, Error as SqlxError, FromRow};
use std::str::FromStr;

use super::types::*;
use crate::storage::types::*;
use crate::Storage;

impl From<SqlxError> for StorageError {
    fn from(e: SqlxError) -> Self {
        StorageError::DatabaseError(e.to_string())
    }
}

pub struct DefaultSqlxStorage {
    pool: AnyPool,
}

impl DefaultSqlxStorage {
    pub fn get_pool_ref(&self) -> &AnyPool {
        &self.pool
    }

    pub async fn new_any(db_url: &str) -> Result<Self, StorageError> {
        Ok(Self {
            pool: AnyPoolOptions::new()
                .max_connections(1)
                .connect(db_url)
                .await?,
        })
    }

    pub async fn dump_tables(&self) -> Result<(), StorageError> {
        let q = "SELECT * FROM token";
        let rows = sqlx::query(q).fetch_all(&self.pool).await?;

        rows.iter().for_each(|r| {
            println!("{:?}", TokenData::from_row(r).unwrap());
        });

        Ok(())
    }

    async fn get_token_by_id(
        &self,
        contract_address: &str,
        token_id_hex: &str,
    ) -> Result<Option<TokenData>, StorageError> {
        let q = "SELECT * FROM token WHERE contract_address = ? AND token_id_hex = ?";

        match sqlx::query(q)
            .bind(contract_address)
            .bind(token_id_hex)
            .fetch_all(&self.pool)
            .await
        {
            Ok(rows) => {
                if rows.is_empty() {
                    Ok(None)
                } else {
                    Ok(Some(TokenData::from_row(&rows[0])?))
                }
            }
            Err(e) => Err(StorageError::DatabaseError(e.to_string())),
        }
    }

    async fn get_event_by_id(&self, event_id: &str) -> Result<Option<EventData>, StorageError> {
        let q = "SELECT * FROM event WHERE event_id = ?";

        match sqlx::query(q).bind(event_id).fetch_all(&self.pool).await {
            Ok(rows) => {
                if rows.is_empty() {
                    Ok(None)
                } else {
                    Ok(Some(EventData::from_row(&rows[0])?))
                }
            }
            Err(e) => Err(StorageError::DatabaseError(e.to_string())),
        }
    }

    async fn get_contract_by_address(
        &self,
        contract_address: &str,
    ) -> Result<Option<ContractData>, StorageError> {
        let q = "SELECT * FROM contract WHERE contract_address = ?";

        match sqlx::query(q)
            .bind(contract_address.to_string())
            .fetch_all(&self.pool)
            .await
        {
            Ok(rows) => {
                if rows.is_empty() {
                    Ok(None)
                } else {
                    Ok(Some(ContractData::from_row(&rows[0])?))
                }
            }
            Err(e) => Err(StorageError::DatabaseError(e.to_string())),
        }
    }

    async fn get_block_by_timestamp(&self, ts: u64) -> Result<Option<BlockData>, StorageError> {
        let q = "SELECT * FROM block WHERE block_timestamp = ?";

        match sqlx::query(q)
            .bind(ts.to_string())
            .fetch_all(&self.pool)
            .await
        {
            Ok(rows) => {
                if rows.is_empty() {
                    Ok(None)
                } else {
                    Ok(Some(BlockData::from_row(&rows[0])?))
                }
            }
            Err(e) => Err(StorageError::DatabaseError(e.to_string())),
        }
    }
}

#[async_trait]
impl Storage for DefaultSqlxStorage {
    async fn register_mint(
        &self,
        contract_address: &str,
        token_id_hex: &str,
        info: &TokenMintInfo,
    ) -> Result<(), StorageError> {
        trace!(
            "Registering mint {} {} {:?}",
            contract_address,
            token_id_hex,
            info
        );

        let q = "UPDATE token SET mint_address = ?, mint_timestamp = ?, mint_transaction_hash = ? WHERE token_id_hex = ?";

        let _r = sqlx::query(q)
            .bind(info.address.clone())
            .bind(info.timestamp.to_string())
            .bind(info.transaction_hash.clone())
            .bind(token_id_hex)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    async fn register_token(
        &self,
        token: &TokenInfo,
        block_timestamp: u64,
    ) -> Result<(), StorageError> {
        trace!("Registering token {:?}", token);

        if (self
            .get_token_by_id(&token.contract_address, &token.token_id_hex)
            .await?)
            .is_some()
        {
            return Err(StorageError::AlreadyExists(format!(
                "token id = {}",
                token.token_id_hex
            )));
        }

        let q = "INSERT INTO token (contract_address, token_id, chain_id, token_id_hex, owner, block_timestamp) VALUES (?, ?, ?, ?, ?)";

        let _r = sqlx::query(q)
            .bind(token.contract_address.clone())
            .bind(token.token_id.clone())
            .bind(token.chain_id.clone())
            .bind(token.token_id_hex.clone())
            .bind(token.owner.clone())
            .bind(block_timestamp.to_string())
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    async fn register_sale_event(
        &self,
        _event: &TokenSaleEvent,
        _block_timestamp: u64,
    ) -> Result<(), StorageError> {
        Ok(())
    }

    async fn register_transfer_event(
        &self,
        event: &TokenTransferEvent,
        _block_timestamp: u64,
    ) -> Result<(), StorageError> {
        trace!("Registering event {:?}", event);

        if (self.get_event_by_id(&event.event_id).await?).is_some() {
            return Err(StorageError::AlreadyExists(format!(
                "event id = {}",
                event.event_id
            )));
        }

        let q = "INSERT INTO event (block_timestamp, contract_address, from_address, to_address, transaction_hash, token_id, token_id_hex, contract_type, event_type, event_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        let _r = sqlx::query(q)
            .bind(event.timestamp.to_string())
            .bind(event.from_address.clone())
            .bind(event.to_address.clone())
            .bind(event.contract_address.clone())
            .bind(event.transaction_hash.clone())
            .bind(event.token_id.clone())
            .bind(event.token_id_hex.clone())
            .bind(event.contract_type.clone())
            .bind(event.event_type.to_string())
            .bind(event.event_id.clone())
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    async fn get_contract_type(
        &self,
        contract_address: &str,
    ) -> Result<ContractType, StorageError> {
        trace!("Getting contract info for contract {}", contract_address);

        if let Some(c) = self.get_contract_by_address(contract_address).await? {
            Ok(ContractType::from_str(&c.contract_type).unwrap())
        } else {
            Err(StorageError::NotFound(format!(
                "contract_address: {contract_address}"
            )))
        }
    }

    async fn register_contract_info(
        &self,
        info: &ContractInfo,
        block_timestamp: u64,
    ) -> Result<(), StorageError> {
        trace!(
            "Registering contract info {:?} for contract {}",
            info.contract_type,
            info.contract_address
        );

        if (self.get_contract_by_address(&info.contract_address).await?).is_some() {
            return Err(StorageError::AlreadyExists(format!(
                "contract addr = {}",
                info.contract_address
            )));
        }

        let q = "INSERT INTO contract (contract_address, contract_type, block_timestamp) VALUES (?, ?, ?)";

        let _r = sqlx::query(q)
            .bind(info.contract_address.clone())
            .bind(info.contract_type.to_string())
            .bind(block_timestamp.to_string())
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    async fn set_block_info(
        &self,
        block_number: u64,
        block_timestamp: u64,
        info: BlockInfo,
    ) -> Result<(), StorageError> {
        trace!("Setting block info {:?} for block #{}", info, block_number);

        let _r = if (self.get_block_by_timestamp(block_timestamp).await?).is_some() {
            let q = "UPDATE block SET block_timestamp = ?, block_number = ?, status = ?, indexer_version = ?, indexer_identifier = ? WHERE block_timestamp = ?";
            sqlx::query(q)
                .bind(block_timestamp.to_string())
                .bind(block_number.to_string())
                .bind(info.status.to_string())
                .bind(info.indexer_version.clone())
                .bind(info.indexer_identifier.clone())
                .bind(block_timestamp.to_string())
                .execute(&self.pool)
                .await?
        } else {
            let q = "INSERT INTO block (block_timestamp, block_number, status, indexer_version, indexer_identifier) VALUES (?, ?, ?, ?, ?)";

            sqlx::query(q)
                .bind(block_timestamp.to_string())
                .bind(block_number.to_string())
                .bind(info.status.to_string())
                .bind(info.indexer_version.clone())
                .bind(info.indexer_identifier.clone())
                .execute(&self.pool)
                .await?
        };

        Ok(())
    }

    async fn get_block_info(&self, block_number: u64) -> Result<BlockInfo, StorageError> {
        trace!("Getting block info for block #{}", block_number);

        let q = "SELECT * FROM block WHERE block_number = ?";

        match sqlx::query(q)
            .bind(block_number.to_string())
            .fetch_all(&self.pool)
            .await
        {
            Ok(rows) => {
                if rows.is_empty() {
                    Err(StorageError::NotFound(format!(
                        "block number {block_number}"
                    )))
                } else {
                    let d = BlockData::from_row(&rows[0])?;
                    Ok(BlockInfo {
                        indexer_version: d.indexer_version.clone(),
                        indexer_identifier: d.indexer_identifier.clone(),
                        status: BlockIndexingStatus::from_str(&d.status).unwrap(),
                        block_number,
                    })
                }
            }
            Err(e) => Err(StorageError::DatabaseError(e.to_string())),
        }
    }

    async fn clean_block(
        &self,
        block_timestamp: u64,
        block_number: Option<u64>,
    ) -> Result<(), StorageError> {
        trace!(
            "Cleaning block #{:?} [ts: {}]",
            block_number,
            block_timestamp.to_string()
        );

        let q = "DELETE FROM block WHERE block_timestamp = ?";
        sqlx::query(q)
            .bind(block_timestamp.to_string())
            .fetch_all(&self.pool)
            .await?;

        let q = "DELETE FROM contract WHERE block_timestamp = ?";
        sqlx::query(q)
            .bind(block_timestamp.to_string())
            .fetch_all(&self.pool)
            .await?;

        let q = "DELETE FROM token WHERE block_timestamp = ?";
        sqlx::query(q)
            .bind(block_timestamp.to_string())
            .fetch_all(&self.pool)
            .await?;

        let q = "DELETE FROM event WHERE block_timestamp = ?";
        sqlx::query(q)
            .bind(block_timestamp.to_string())
            .fetch_all(&self.pool)
            .await?;

        Ok(())
    }
}
