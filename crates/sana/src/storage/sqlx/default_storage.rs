use async_trait::async_trait;

use sqlx::{any::AnyPoolOptions, AnyPool, Error as SqlxError, FromRow};
use std::str::FromStr;
use tracing::trace;

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
        token_id: &str,
        chain_id: &str,
    ) -> Result<Option<TokenData>, StorageError> {
        let q =
            "SELECT contract_address, chain_id, token_id FROM token WHERE contract_address = $1 AND chain_id = $2 AND token_id = $3";

        match sqlx::query(q)
            .bind(contract_address)
            .bind(chain_id)
            .bind(token_id)
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

    async fn get_event_by_id(
        &self,
        token_event_id: &str,
    ) -> Result<Option<EventData>, StorageError> {
        let q = "SELECT token_event_id, contract_address, chain_id, broker_id, order_hash, token_id, event_type, block_timestamp, transaction_hash, to_address, from_address, amount, canceled_reason FROM token_event WHERE token_event_id = $1";

        match sqlx::query(q)
            .bind(token_event_id)
            .fetch_all(&self.pool)
            .await
        {
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
        chain_id: &str,
    ) -> Result<Option<ContractData>, StorageError> {
        let q = "SELECT contract_address, updated_timestamp, contract_address, contract_type FROM contract WHERE contract_address = $1 AND chain_id = $2";

        match sqlx::query(q)
            .bind(contract_address.to_string())
            .bind(chain_id.to_string())
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
        let q = "SELECT b.block_number, b.block_status, b.block_timestamp, b.indexer_identifier, i.indexer_version
        FROM block as b
        INNER JOIN indexer as i ON i.indexer_identifier = b.indexer_identifier 
        WHERE block_timestamp = $1";

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
        _token_id_hex: &str,
        token_id: &str,
        info: &TokenMintInfo,
    ) -> Result<(), StorageError> {
        trace!(
            "Registering mint {} {} {:?}",
            contract_address,
            token_id,
            info
        );

        let q = "UPDATE token SET mint_address = $1, mint_timestamp = $2, mint_transaction_hash = $3 WHERE token_id = $4";

        let _r = sqlx::query(q)
            .bind(info.address.clone())
            .bind(info.block_timestamp.to_string())
            .bind(info.transaction_hash.clone())
            .bind(token_id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    async fn register_token(
        &self,
        token: &TokenInfo,
        block_timestamp: u64,
    ) -> Result<(), StorageError> {
        trace!(
            "Registering token {:?} - block_timestamp: {}",
            token,
            block_timestamp
        );

        if (self
            .get_token_by_id(&token.contract_address, &token.token_id, &token.chain_id)
            .await?)
            .is_some()
        {
            // let q =
            //     "UPDATE token SET block_timestamp = $1, updated_timestamp = EXTRACT(epoch FROM now())::bigint WHERE contract_address = $2 and token_id = $3";

            // sqlx::query(q)
            //     .bind(block_timestamp as i64)
            //     .bind(token.contract_address.clone())
            //     .bind(token.token_id.clone())
            //     .execute(&self.pool)
            //     .await?;

            Ok(())
        } else {
            let q = "INSERT INTO token (contract_address, chain_id, token_id, token_id_hex, current_owner, block_timestamp) VALUES ($1, $2, $3, $4, $5, $6)";

            let _r = sqlx::query(q)
                .bind(token.contract_address.clone())
                .bind(token.chain_id.clone())
                .bind(token.token_id.clone())
                .bind(token.token_id_hex.clone())
                .bind(token.owner.clone())
                .bind(block_timestamp as i64)
                .execute(&self.pool)
                .await?;

            Ok(())
        }
    }

    async fn register_sale_event(
        &self,
        event: &TokenSaleEvent,
        block_timestamp: u64,
    ) -> Result<(), StorageError> {
        trace!("Registering sale event {:?}", event);

        if (self.get_event_by_id(&event.token_event_id).await?).is_some() {
            let q = "UPDATE token_event SET block_timestamp = $1 WHERE token_event_id = $2";
            sqlx::query(q)
                .bind(block_timestamp as i64)
                .bind(event.token_event_id.clone())
                .execute(&self.pool)
                .await?;

            return Ok(());
        }

        let q = "INSERT INTO token_event (token_event_id, contract_address, chain_id, token_id, token_id_hex, event_type, block_timestamp, transaction_hash, to_address, from_address)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (token_event_id) DO NOTHING";

        let event_type = self.to_title_case(&event.event_type.to_string().to_lowercase());

        let _r = sqlx::query(q)
            .bind(event.token_event_id.clone())
            .bind(event.nft_contract_address.clone())
            .bind(event.chain_id.clone())
            .bind(event.token_id.clone())
            .bind(event.token_id_hex.clone())
            .bind(event_type)
            .bind(event.block_timestamp as i64)
            .bind(event.transaction_hash.clone())
            .bind(event.to_address.clone())
            .bind(event.from_address.clone())
            .execute(&self.pool)
            .await?;

        // Update the owner of the token
        let update_q = "UPDATE token SET current_owner = $1, held_timestamp = $2 WHERE contract_address = $3 AND chain_id = $4 AND token_id = $5";
        let _r = sqlx::query(update_q)
            .bind(event.to_address.clone())
            .bind(event.block_timestamp as i64)
            .bind(event.nft_contract_address.clone())
            .bind(event.chain_id.clone())
            .bind(event.token_id.clone())
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    async fn register_transfer_event(
        &self,
        event: &TokenTransferEvent,
    ) -> Result<(), StorageError> {
        let existing_transfer_event =
            (self.get_event_by_id(&event.token_event_id).await?).is_some();

        if existing_transfer_event {
            trace!(
                "Updating existing transfer event {:?}",
                event.token_event_id
            );

            let q = "UPDATE token_event SET block_timestamp = $1 WHERE token_event_id = $2";
            sqlx::query(q)
                .bind(event.block_timestamp as i64)
                .bind(event.token_event_id.clone())
                .execute(&self.pool)
                .await?;

            Ok(())
        } else {
            trace!("Inserting new transfer event {:?}", event.token_event_id);

            let q = "INSERT INTO token_event (token_event_id, contract_address, chain_id, token_id, token_id_hex, event_type, block_timestamp, transaction_hash, to_address, from_address)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (token_event_id) DO NOTHING";

            let event_type = match &event.event_type {
                Some(e) => {
                    let res = self.to_title_case(&e.to_string().to_lowercase());
                    Some(res)
                }
                _ => None,
            };

            let _r = sqlx::query(q)
                .bind(event.token_event_id.clone())
                .bind(event.contract_address.clone())
                .bind(event.chain_id.clone())
                .bind(event.token_id.clone())
                .bind(event.token_id_hex.clone())
                .bind(event_type)
                .bind(event.block_timestamp as i64)
                .bind(event.transaction_hash.clone())
                .bind(event.to_address.clone())
                .bind(event.from_address.clone())
                .execute(&self.pool)
                .await?;

            // Update the owner of the token
            let update_q = "UPDATE token SET current_owner = $1, held_timestamp = $2 WHERE contract_address = $3 AND chain_id = $4 AND token_id = $5";
            let _r = sqlx::query(update_q)
                .bind(event.to_address.clone())
                .bind(event.block_timestamp as i64)
                .bind(event.contract_address.clone())
                .bind(event.chain_id.clone())
                .bind(event.token_id.clone())
                .execute(&self.pool)
                .await?;

            Ok(())
        }
    }

    async fn get_contract_type(
        &self,
        contract_address: &str,
        chain_id: &str,
    ) -> Result<ContractType, StorageError> {
        trace!(
            "Getting contract info for contract {}, chain_id: {}",
            contract_address,
            chain_id
        );

        if let Some(c) = self
            .get_contract_by_address(contract_address, chain_id)
            .await?
        {
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

        if (self
            .get_contract_by_address(&info.contract_address, &info.chain_id)
            .await?)
            .is_some()
        {
            let q = "UPDATE contract SET updated_timestamp = $1 WHERE contract_address = $2 AND chain_id = $3";
            sqlx::query(q)
                .bind(block_timestamp as i64)
                .bind(info.contract_address.clone())
                .bind(info.chain_id.clone())
                .execute(&self.pool)
                .await?;

            return Err(StorageError::AlreadyExists(format!(
                "contract addr = {}",
                info.contract_address
            )));
        }

        let q = "INSERT INTO contract (contract_address, chain_id, contract_type, updated_timestamp, contract_symbol, contract_image, contract_name, metadata_ok)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)";

        let _r = sqlx::query(q)
            .bind(info.contract_address.clone())
            .bind(info.chain_id.clone())
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

        let exists = sqlx::query("SELECT 1 FROM indexer WHERE indexer_identifier = $1")
            .bind(info.indexer_identifier.clone())
            .fetch_optional(&self.pool)
            .await?
            .is_some();

        if !exists {
            let q = "INSERT INTO indexer (indexer_identifier, indexer_version) VALUES ($1, $2)";
            sqlx::query(q)
                .bind(info.indexer_identifier.clone())
                .bind(info.indexer_version.clone())
                .execute(&self.pool)
                .await?;
        }

        let _r = if (self.get_block_by_timestamp(block_timestamp).await?).is_some() {
            let q = "UPDATE block SET block_timestamp = $1, block_number = $2, block_status = $3, indexer_identifier = $4 WHERE block_timestamp = $1";
            sqlx::query(q)
                .bind(block_timestamp as i64)
                .bind(block_number as i64)
                .bind(info.block_status.to_string())
                .bind(info.indexer_identifier.clone())
                .execute(&self.pool)
                .await?
        } else {
            let q = "INSERT INTO block (block_timestamp, block_number, block_status, indexer_identifier) VALUES ($1, $2, $3, $4)";

            sqlx::query(q)
                .bind(block_timestamp as i64)
                .bind(block_number as i64)
                .bind(info.block_status.to_string())
                .bind(info.indexer_identifier.clone())
                .execute(&self.pool)
                .await?
        };

        Ok(())
    }

    async fn get_block_info(&self, block_number: u64) -> Result<BlockInfo, StorageError> {
        trace!("Getting block info for block #{}", block_number);

        let q = "SELECT b.block_timestamp, b.indexer_identifier, b.block_status, b.block_number, i.indexer_version FROM block as b INNER JOIN indexer as i ON i.indexer_identifier = b.indexer_identifier WHERE b.block_number = $1";

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
                        indexer_identifier: d.indexer_identifier.clone(),
                        indexer_version: d.indexer_version.clone(),
                        block_status: BlockIndexingStatus::from_str(&d.block_status).unwrap(),
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

        let q = "DELETE FROM block WHERE block_timestamp = $1";
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

        let q = "DELETE FROM token_event WHERE block_timestamp = $1";
        sqlx::query(q)
            .bind(block_timestamp.to_string())
            .fetch_all(&self.pool)
            .await?;

        Ok(())
    }
}
