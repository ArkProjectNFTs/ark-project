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
            // Force indexing by cleaning the block, and return true.
            match self.storage.clean_block(block_number).await {
                Ok(()) => Ok(true),
                Err(e) => Err(e),
            }
        } else {
            match self.storage.get_block_info(block_number).await {
                Ok(info) => {
                    trace!("Block {} already indexed", block_number);
                    debug!(
                        "Checking indexation version: current={:?}, last={:?}",
                        indexer_version, info.indexer_version
                    );

                    // Compare the indexer versions.
                    match compare(indexer_version, info.indexer_version) {
                        Ok(Cmp::Gt) => {
                            // If the current version is greater, clean the block and return true for indexing.
                            match self.storage.clean_block(block_number).await {
                                Ok(()) => Ok(true),
                                Err(_) => Ok(false), // Error cleaning, return false.
                            }
                        }
                        _ => Ok(false), // Versions are equal or current is older, return false for skipping indexing.
                    }
                }
                Err(StorageError::NotFound) => Ok(false),
                Err(_) => Ok(true),
            }
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
    use mockall::predicate::*;

    use crate::storage::{
        types::{BlockIndexingStatus, BlockInfo},
        MockStorage,
    };

    #[tokio::test]
    async fn test_check_candidate_not_found() {
        let mut mock_storage = MockStorage::default();

        // Mock the get_block_info to return NotFound.
        mock_storage
            .expect_get_block_info()
            .returning(|_| Box::pin(async { Err(StorageError::NotFound) }));

        let block_number = 3;

        // Mock the clean_block method to return Ok(()).
        mock_storage
            .expect_clean_block()
            .with(eq(block_number))
            .returning(|_| Box::pin(async { Ok(()) }));

        let manager = BlockManager {
            storage: Arc::new(mock_storage),
        };

        // Should return false as the block is not found.
        let result = manager
            .check_candidate(block_number, "v0.0.2", false)
            .await
            .unwrap();

        assert!(result == false);
    }

    #[tokio::test]
    async fn test_check_candidate() {
        let mut mock_storage = MockStorage::default();

        // Mock the clean_block method to return Ok(()).
        mock_storage
            .expect_clean_block()
            .returning(|_| Box::pin(futures::future::ready(Ok(()))));

        // Mock the get_block_info to return an indexed block with an older version.
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

        // Mock the clean_block method to return Ok(()).
        mock_storage
            .expect_clean_block()
            .returning(|_| Box::pin(async { Ok(()) }));

        let manager = BlockManager {
            storage: Arc::new(mock_storage),
        };

        // New version, should return true for indexing.
        let result = manager.check_candidate(1, "v0.0.2", false).await.unwrap();
        assert!(result == true);

        // Force but same version, should return true for indexing.
        let result = manager.check_candidate(2, "v0.0.1", true).await.unwrap();
        assert!(result == true);
    }
}
