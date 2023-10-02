use crate::storage::types::{BlockIndexingStatus, BlockInfo, StorageError};
use crate::storage::Storage;
use starknet::core::types::FieldElement;
use std::sync::Arc;

#[derive(Debug)]
pub struct BlockManager<S: Storage> {
    storage: Arc<S>,
}

impl<S: Storage> BlockManager<S> {
    pub fn new(storage: Arc<S>) -> Self {
        Self {
            storage: Arc::clone(&storage),
        }
    }

    pub async fn update_last_pending_block(
        &self,
        block_number: u64,
        block_timestamp: u64,
    ) -> Result<(), StorageError> {
        self.storage
            .update_last_pending_block(block_number, block_timestamp)
            .await
    }

    pub async fn clean_block(&self, block_number: u64) -> Result<(), StorageError> {
        self.storage.clean_block(block_number).await
    }

    /// Returns true if the given block number must be indexed.
    /// False otherwise.
    pub async fn check_candidate(
        &self,
        block_number: u64,
        indexer_version: u64,
        do_force: bool,
    ) -> Result<bool, StorageError> {
        if do_force {
            return match self.storage.clean_block(block_number).await {
                Ok(()) => Ok(true),
                Err(e) => Err(e),
            };
        }

        match self.storage.get_block_info(block_number).await {
            Ok(info) => {
                log::debug!("Block {} already indexed", block_number);
                if indexer_version > info.indexer_version {
                    match self.storage.clean_block(block_number).await {
                        Ok(()) => Ok(true),
                        Err(e) => Err(e),
                    }
                } else {
                    Ok(false)
                }
            }
            Err(StorageError::NotFound) => Ok(true),
            Err(_) => Ok(false),
        }
    }

    pub async fn set_block_info(
        &self,
        block_number: u64,
        indexer_version: u64,
        indexer_identifier: &str,
        status: BlockIndexingStatus,
    ) -> Result<(), StorageError> {
        self.storage
            .set_block_info(
                block_number,
                BlockInfo {
                    indexer_version,
                    indexer_identifier: indexer_identifier.to_string(),
                    status,
                },
            )
            .await?;
        Ok(())
    }
}

/// Data of the pending block being indexed.
/// The vector of txs hashes are the hashes
/// of the transactions already processed by the indexer.
#[derive(Debug)]
pub struct PendingBlockData {
    timestamp: u64,
    txs_hashes: Vec<FieldElement>,
}

impl PendingBlockData {
    pub fn new() -> Self {
        PendingBlockData {
            timestamp: 0,
            txs_hashes: vec![],
        }
    }

    pub fn get_timestamp(&self) -> u64 {
        self.timestamp
    }

    pub fn set_timestamp(&mut self, ts: u64) {
        self.timestamp = ts;
    }

    pub fn add_tx_as_processed(&mut self, tx_hash: &FieldElement) {
        self.txs_hashes.push(*tx_hash);
    }

    pub fn is_tx_processed(&self, tx_hash: &FieldElement) -> bool {
        self.txs_hashes.contains(tx_hash)
    }

    pub fn clear_tx_hashes(&mut self) {
        self.txs_hashes.clear();
    }
}

impl Default for PendingBlockData {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::{
        types::{BlockIndexingStatus, BlockInfo},
        MockStorage,
    };

    #[tokio::test]
    async fn test_check_candidate() {
        let mut mock_storage = MockStorage::default();

        mock_storage
            .expect_clean_block()
            .returning(|_| Box::pin(futures::future::ready(Ok(()))));

        mock_storage
            .expect_get_block_info()
            .returning(|block_number| {
                Box::pin(futures::future::ready(if block_number == 1 {
                    Ok(BlockInfo {
                        indexer_version: 0,
                        status: BlockIndexingStatus::None,
                        indexer_identifier: String::from("123"),
                    })
                } else {
                    Err(StorageError::NotFound)
                }))
            });

        let manager = BlockManager {
            storage: Arc::new(mock_storage),
        };

        // New version, should update.
        assert!(manager.check_candidate(1, 2, false).await.unwrap());

        // Force but same version, should update.
        assert!(manager.check_candidate(2, 0, true).await.unwrap());
    }
}
