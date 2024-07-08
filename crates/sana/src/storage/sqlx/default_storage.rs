use super::types::*;
use crate::storage::types::*;
use crate::Storage;
use async_trait::async_trait;
use sqlx::{postgres::PgPoolOptions, Error as SqlxError, FromRow, PgPool, Row};
use std::str::FromStr;
use tracing::{error, trace};

impl From<SqlxError> for StorageError {
    fn from(e: SqlxError) -> Self {
        StorageError::DatabaseError(e.to_string())
    }
}

pub struct PostgresStorage {
    pool: PgPool,
}

impl PostgresStorage {
    pub fn get_pool_ref(&self) -> &PgPool {
        &self.pool
    }

    pub async fn new(db_url: &str) -> Result<Self, StorageError> {
        sqlx::any::install_default_drivers();

        Ok(Self {
            pool: PgPoolOptions::new()
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

    async fn _get_token_by_id(
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

    pub async fn update_indexer_progression(
        &self,
        indexer_identifier: &str,
        indexer_version: &str,
        progression: f64,
        current_block_number: i64,
        force_mode: bool,
        start_block_number: i64,
        end_block_number: i64,
    ) -> Result<(), StorageError> {
        let status = if progression == 100.0 {
            "COMPLETED"
        } else {
            "RUNNING"
        };

        let query = r#"
            INSERT INTO public.indexer (
                indexer_identifier, indexer_status, last_updated_timestamp, indexation_progress_percentage,
                current_block_number, is_force_mode_enabled, start_block_number, end_block_number, indexer_version
            ) VALUES (
                $1, $2, EXTRACT(epoch FROM now())::bigint, $3, $4, $5, $6, $7, $8
            ) ON CONFLICT (indexer_identifier) DO UPDATE
            SET
                indexer_status = EXCLUDED.indexer_status,
                last_updated_timestamp = EXTRACT(epoch FROM now())::bigint,
                indexation_progress_percentage = EXCLUDED.indexation_progress_percentage,
                current_block_number = EXCLUDED.current_block_number,
                is_force_mode_enabled = EXCLUDED.is_force_mode_enabled,
                start_block_number = EXCLUDED.start_block_number,
                end_block_number = EXCLUDED.end_block_number,
                indexer_version = EXCLUDED.indexer_version
        "#;

        sqlx::query(query)
            .bind(indexer_identifier)
            .bind(status)
            .bind(progression)
            .bind(current_block_number)
            .bind(force_mode)
            .bind(start_block_number)
            .bind(end_block_number)
            .bind(indexer_version)
            .execute(&self.pool)
            .await
            .map_err(|e| {
                error!("Failed to update indexer progress: {}", e);
                StorageError::DatabaseError(e.to_string())
            })?;

        Ok(())
    }
}

#[async_trait]
impl Storage for PostgresStorage {
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

        let q = "INSERT INTO token (contract_address, chain_id, token_id, token_id_hex, current_owner, block_timestamp) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (contract_address, chain_id, token_id) DO NOTHING";
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

        Ok(())
    }

    async fn register_transfer_event(
        &self,
        event: &TokenTransferEvent,
    ) -> Result<(), StorageError> {
        trace!("Registering transfer event {:?}", event.token_event_id);
        let existing_transfer_event =
            (self.get_event_by_id(&event.token_event_id).await?).is_some();

        if existing_transfer_event {
            let q = "UPDATE token_event SET block_timestamp = $1 WHERE token_event_id = $2";
            sqlx::query(q)
                .bind(event.block_timestamp as i64)
                .bind(event.token_event_id.clone())
                .execute(&self.pool)
                .await?;

            Ok(())
        } else {

            let last_transfer_query = r#"SELECT block_timestamp
            FROM token_event 
            WHERE contract_address = $1 AND chain_id = $2 
            AND token_id = $3 
            AND event_type IN ('Transfer', 'Burn', 'Mint')
            ORDER BY block_timestamp DESC LIMIT 1"#;
            
            match sqlx::query(last_transfer_query)
                .bind(event.contract_address.clone())
                .bind(event.chain_id.clone())
                .bind(event.token_id.clone())
                .fetch_optional(&self.pool)
                .await
            {
                Ok(row) => {
                    if let Some(r) = row {
                        let last_transfer_timestamp: i64 = r.get(0);
                        let last_transfer_timestamp_u64 = last_transfer_timestamp as u64;
                        if event.block_timestamp > last_transfer_timestamp_u64 {
                            let update_q = "UPDATE token SET current_owner = $1 WHERE contract_address = $2 AND chain_id = $3 AND token_id = $4";
                            let _r = sqlx::query(update_q)
                                .bind(event.to_address.clone())
                                .bind(event.contract_address.clone())
                                .bind(event.chain_id.clone())
                                .bind(event.token_id.clone())
                                .execute(&self.pool)
                                .await?;
                        }
                    }
                }
                Err(e) => {
                    error!("Database error: {:?}", e);
                }
            }


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
            return Err(StorageError::AlreadyExists(format!(
                "contract addr = {}",
                info.contract_address
            )));
        }

        let q = "INSERT INTO contract (contract_address, chain_id, contract_type, updated_timestamp, contract_symbol, contract_image, contract_name, metadata_ok, deployed_timestamp)
                VALUES ($1, $2, $3, EXTRACT(epoch FROM now())::bigint, $4, $5, $6, $7, $8) ON CONFLICT (contract_address, chain_id) DO NOTHING";

        let _r = sqlx::query(q)
            .bind(info.contract_address.clone())
            .bind(info.chain_id.clone())
            .bind(info.contract_type.to_string())
            .bind(info.symbol.clone().unwrap_or_default())
            .bind(info.image.clone().unwrap_or_default())
            .bind(info.name.clone().unwrap_or_default())
            .bind(false)
            .bind(block_timestamp as i64)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    async fn set_block_info(
        &self,
        block_timestamp: u64,
        info: BlockInfo,
    ) -> Result<(), StorageError> {
        let exists = sqlx::query("SELECT 1 FROM indexer WHERE indexer_identifier = $1")
            .bind(info.indexer_identifier.clone())
            .fetch_optional(&self.pool)
            .await?
            .is_some();

        if !exists {
            let q = "INSERT INTO indexer (indexer_identifier, indexer_version, indexer_status, current_block_number) VALUES ($1, $2, $3, $4)";
            sqlx::query(q)
                .bind(info.indexer_identifier.clone())
                .bind(info.indexer_version.clone())
                .bind(info.block_status.to_string())
                .bind(info.block_number as i64)
                .execute(&self.pool)
                .await?;
        }
        let _r = if (self.get_block_by_timestamp(block_timestamp).await?).is_some() {
            let q = r#"
                UPDATE block 
                SET block_number = $1, block_status = $2, indexer_identifier = $3 
                WHERE block_timestamp = $4;
            "#;
            sqlx::query(q)
                .bind(info.block_number as i64)
                .bind(info.block_status.to_string())
                .bind(info.indexer_identifier.clone())
                .bind(block_timestamp as i64)
                .execute(&self.pool)
                .await?
        } else {
            let q = "INSERT INTO block (block_timestamp, block_number, block_status, indexer_identifier) VALUES ($1, $2, $3, $4) ON CONFLICT (block_number) DO NOTHING";
            sqlx::query(q)
                .bind(block_timestamp as i64)
                .bind(info.block_number as i64)
                .bind(info.block_status.to_string())
                .bind(info.indexer_identifier.clone())
                .execute(&self.pool)
                .await?
        };

        Ok(())
    }

    async fn get_block_info(&self, block_number: u64) -> Result<BlockInfo, StorageError> {
        trace!("Getting block info for block #{}", block_number);

        let q = "SELECT b.block_number, b.block_status, b.block_timestamp, b.indexer_identifier, i.indexer_version
        FROM block as b
        LEFT JOIN indexer as i ON i.indexer_identifier = b.indexer_identifier 
        WHERE block_number = $1";

        match sqlx::query_as::<_, BlockData>(q)
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
                    let d = rows[0].clone();
                    Ok(BlockInfo {
                        indexer_identifier: d.indexer_identifier.clone(),
                        indexer_version: d.indexer_version.clone(),
                        block_status: BlockIndexingStatus::from_str(&d.block_status).unwrap(),
                        block_number,
                    })
                }
            }
            Err(e) => {
                error!("Database error: {:?}", e);
                Err(StorageError::DatabaseError(e.to_string()))
            }
        }
    }

    async fn clean_block(
        &self,
        block_timestamp: u64,
        _block_number: Option<u64>,
    ) -> Result<(), StorageError> {
        trace!("Cleaning block [ts: {}]", block_timestamp.to_string());
        let q = "DELETE FROM block WHERE block_timestamp = $1::bigint";
        sqlx::query(q)
            .bind(block_timestamp.to_string())
            .fetch_all(&self.pool)
            .await?;

        let q = "DELETE FROM token_event WHERE block_timestamp = $1::bigint";
        sqlx::query(q)
            .bind(block_timestamp.to_string())
            .fetch_all(&self.pool)
            .await?;

        trace!("Block {} cleaned", block_timestamp.to_string());

        Ok(())
    }
}
