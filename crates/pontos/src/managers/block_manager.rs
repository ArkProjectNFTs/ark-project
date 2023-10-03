use crate::storage::types::{BlockIndexingStatus, BlockInfo, StorageError};
use crate::storage::Storage;
use log::{debug, trace};
use starknet::core::types::FieldElement;
use std::sync::Arc;
use version_compare::{compare, Cmp};

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
        indexer_version: &str,
        do_force: bool,
    ) -> Result<bool, StorageError> {
        if do_force {
            return match self.storage.clean_block(block_number).await {
                Ok(()) => Ok(false),
                Err(e) => Err(e),
            };
        }

        match self.storage.get_block_info(block_number).await {
            Ok(info) => {
                trace!("Block {} already indexed", block_number);
                debug!(
                    "Checking indexation version: current={:?}, last={:?}",
                    indexer_version, info.indexer_version
                );
                // check if the current indexer version is greater than the last one
                match compare(indexer_version, info.indexer_version) {
                    // if the current version is greater, clean the block & return false we index the block
                    Ok(Cmp::Gt) => self.storage.clean_block(block_number).await.map(|_| false),
                    // if the current version is equal, return false we skip the block indexation
                    _ => Ok(true),
                }
            }
            // handle item not found in the storage we index the block
            Err(StorageError::NotFound) => Ok(false),
            // handle base storage errors we skip the block indexation, in most of the case the indexer will break anyway
            Err(_) => Ok(true),
        }
    }

    pub async fn set_block_info(
        &self,
        block_number: u64,
        indexer_version: &str,
        indexer_identifier: &str,
        status: BlockIndexingStatus,
    ) -> Result<(), StorageError> {
        self.storage
            .set_block_info(
                block_number,
                BlockInfo {
                    indexer_version: indexer_version.to_string(),
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
    async fn test_check_candidate_not_found() {
        let mut mock_storage = MockStorage::default();

        mock_storage
            .expect_get_block_info()
            .returning(|_| Box::pin(futures::future::ready(Err(StorageError::NotFound))));

        let manager = BlockManager {
            storage: Arc::new(mock_storage),
        };

        assert!(manager.check_candidate(3, "v0.0.2", false).await.unwrap());
    }

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
                        status: BlockIndexingStatus::Processing,
                        indexer_version: String::from("v0.0.1"),
                        indexer_identifier: String::from("TASK#123"),
                    })
                } else {
                    Err(StorageError::NotFound)
                }))
            });

        let manager = BlockManager {
            storage: Arc::new(mock_storage),
        };

        // New version, should update.
        assert!(manager.check_candidate(1, "v0.0.2", false).await.unwrap());

        // Force but same version, should update.
        assert!(manager.check_candidate(2, "v0.0.1", true).await.unwrap());
    }
}
