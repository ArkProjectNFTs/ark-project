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

pub struct MarketplaceSqlxStorage {
    pool: AnyPool,
}

impl MarketplaceSqlxStorage {
    pub fn get_pool_ref(&self) -> &AnyPool {
        &self.pool
    }

    pub async fn new_any(db_url: &str) -> Result<Self, StorageError> {
        sqlx::any::install_default_drivers();

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
        // get contract_id
        let contract_data = self.get_contract_by_address(&contract_address).await?;

        let contract_id = match contract_data {
            Some(data) => data.contract_id,
            None => {
                return Err(StorageError::NotFound(format!(
                    "No contract found for address: {}",
                    contract_address
                )))
            }
        };

        let q =
            "SELECT contract_id, token_id FROM token WHERE contract_id = $1 AND token_id_hex = $2";

        match sqlx::query(q)
            .bind(contract_id)
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
        let q = "SELECT * FROM token_events WHERE ark_event_id = $1";

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

    fn to_title_case(&self, s: &str) -> String {
        let mut c = s.chars();
        match c.next() {
            None => String::new(),
            Some(f) => f.to_uppercase().chain(c).collect(),
        }
    }

    async fn get_contract_by_address(
        &self,
        contract_address: &str,
    ) -> Result<Option<ContractData>, StorageError> {
        let q = "SELECT contract_id, updated_timestamp, contract_address, contract_type FROM contract WHERE contract_address = $1";

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
        let q = "SELECT * FROM block WHERE timestamp = $1";

        match sqlx::query(q).bind(ts as i64).fetch_all(&self.pool).await {
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
impl Storage for MarketplaceSqlxStorage {
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

        let q = "UPDATE token SET mint_address = $1, mint_timestamp = $2, mint_transaction_hash = $3 WHERE token_id_hex = $4";

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

        let contract_data = self
            .get_contract_by_address(&token.contract_address)
            .await?;
        trace!("inserting token debug {:?}", token);
        if let Some(contract_data) = contract_data {
            let q = "INSERT INTO token (contract_id, token_id, token_id_hex, current_owner, updated_timestamp) VALUES ($1, $2, $3, $4, $5)";
            let _r = sqlx::query(q)
                .bind(contract_data.contract_id as i32)
                .bind(token.token_id.clone())
                .bind(token.token_id_hex.clone())
                .bind(token.owner.clone())
                .bind(block_timestamp as i64)
                .execute(&self.pool)
                .await?;
        } else {
            return Err(StorageError::NotFound(format!(
                "No contract found for address: {}",
                token.contract_address
            )));
        }

        Ok(())
    }

    async fn register_sale_event(
        &self,
        event: &TokenSaleEvent,
        _block_timestamp: u64,
    ) -> Result<(), StorageError> {
        trace!("Registering sale event {:?}", event);

        if (self.get_event_by_id(&event.event_id).await?).is_some() {
            return Err(StorageError::AlreadyExists(format!(
                "event id = {}",
                event.event_id
            )));
        }

        let contract_data = self
            .get_contract_by_address(&event.nft_contract_address)
            .await?;

        let contract_id = match contract_data {
            Some(data) => data.contract_id,
            None => {
                return Err(StorageError::NotFound(format!(
                    "No contract found for address: {}",
                    event.nft_contract_address
                )))
            }
        };

        let q = "INSERT INTO token_events (order_hash, contract_id, token_id, event_type, timestamp, token_id_hex, transaction_hash, to_address, from_address)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)";

        trace!("Registering transfer event type {:?}", contract_id);

        let event_type = self.to_title_case(&event.event_type.to_string().to_lowercase());

        let _r = sqlx::query(q)
            .bind("")
            .bind(contract_id as i32)
            .bind(event.token_id.clone())
            .bind(event_type)
            .bind(event.timestamp as i64)
            .bind(event.token_id_hex.clone())
            .bind(event.transaction_hash.clone())
            .bind(event.to_address.clone())
            .bind(event.from_address.clone())
            .execute(&self.pool)
            .await?;

        // Update the owner of the token
        let update_q = "UPDATE token SET current_owner = $1, held_timestamp = $2 WHERE contract_id = $3 AND token_id_hex = $4";
        let _r = sqlx::query(update_q)
            .bind(event.to_address.clone())
            .bind(event.timestamp as i64)
            .bind(contract_id as i32)
            .bind(event.token_id_hex.clone())
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    async fn register_transfer_event(
        &self,
        event: &TokenTransferEvent,
        _block_timestamp: u64,
    ) -> Result<(), StorageError> {
        trace!("Registering transfer event {:?}", event);

        if (self.get_event_by_id(&event.event_id).await?).is_some() {
            return Err(StorageError::AlreadyExists(format!(
                "event id = {}",
                event.event_id
            )));
        }

        let contract_data = self
            .get_contract_by_address(&event.contract_address)
            .await?;

        let contract_id = match contract_data {
            Some(data) => data.contract_id,
            None => {
                return Err(StorageError::NotFound(format!(
                    "No contract found for address: {}",
                    event.contract_address
                )))
            }
        };

        let q = "INSERT INTO token_events (order_hash, contract_id, token_id, event_type, timestamp, token_id_hex, transaction_hash, to_address, from_address)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)";

        trace!("Registering transfer event type {:?}", contract_id);

        let event_type = self.to_title_case(&event.event_type.to_string().to_lowercase());

        let _r = sqlx::query(q)
            .bind("")
            .bind(contract_id as i32)
            .bind(event.token_id.clone())
            .bind(event_type)
            .bind(event.timestamp as i64)
            .bind(event.token_id_hex.clone())
            .bind(event.transaction_hash.clone())
            .bind(event.to_address.clone())
            .bind(event.from_address.clone())
            .execute(&self.pool)
            .await?;

        // Update the owner of the token
        let update_q = "UPDATE token SET current_owner = $1, held_timestamp = $2 WHERE contract_id = $3 AND token_id_hex = $4";
        let _r = sqlx::query(update_q)
            .bind(event.to_address.clone())
            .bind(event.timestamp as i64)
            .bind(contract_id as i32)
            .bind(event.token_id_hex.clone())
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

        let q = "INSERT INTO contract (contract_address, contract_type, updated_timestamp, contract_symbol, contract_image, contract_name, metadata_ok)
                VALUES ($1, $2, $3, $4, $5, $6, $7)";

        let _r = sqlx::query(q)
            .bind(info.contract_address.clone())
            .bind(info.contract_type.to_string())
            .bind(block_timestamp as i64)
            .bind(info.symbol.clone().unwrap_or_default())
            .bind(info.image.clone().unwrap_or_default())
            .bind(info.name.clone().unwrap_or_default())
            .bind(false)
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
            let q = "UPDATE block SET timestamp = $1, block_number = $2, status = $3, indexer_version = $4, indexer_identifier = $5 WHERE timestamp = $1";
            sqlx::query(q)
                .bind(block_timestamp as i64)
                .bind(block_number as i64)
                .bind(info.status.to_string())
                .bind(info.indexer_version.clone())
                .bind(info.indexer_identifier.clone())
                .execute(&self.pool)
                .await?
        } else {
            let q = "INSERT INTO block (timestamp, block_number, status, indexer_version, indexer_identifier) VALUES ($1, $2, $3, $4, $5)";

            sqlx::query(q)
                .bind(block_timestamp as i64)
                .bind(block_number as i64)
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

        let q = "SELECT * FROM block WHERE block_number = $1";

        match sqlx::query(q)
            .bind(block_number as i64)
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

        let q = "DELETE FROM block WHERE timestamp = $1";
        sqlx::query(q)
            .bind(block_timestamp.to_string())
            .fetch_all(&self.pool)
            .await?;

        let q = "DELETE FROM contract WHERE updated_timestamp = $1";
        sqlx::query(q)
            .bind(block_timestamp.to_string())
            .fetch_all(&self.pool)
            .await?;

        let q = "DELETE FROM token WHERE updated_timestamp = $1";
        sqlx::query(q)
            .bind(block_timestamp.to_string())
            .fetch_all(&self.pool)
            .await?;

        let q = "DELETE FROM token_events WHERE timestamp = $1";
        sqlx::query(q)
            .bind(block_timestamp.to_string())
            .fetch_all(&self.pool)
            .await?;

        Ok(())
    }
}
