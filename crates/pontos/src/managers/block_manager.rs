use crate::storage::storage::Storage;
use crate::storage::types::{BlockIndexingStatus, BlockInfo, StorageError};
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

    /// Returns true if the given block number must be indexed.
    /// False otherwise.
    pub async fn check_candidate(
        &self,
        block_number: u64,
        indexer_version: u64,
        do_force: bool,
    ) -> bool {
        if do_force {
            return self.storage.clean_block(block_number).await.is_ok();
        }

        match self.storage.get_block_info(block_number).await {
            Ok(info) => {
                log::debug!("Block {} already indexed", block_number);
                if indexer_version > info.indexer_version {
                    self.storage.clean_block(block_number).await.is_ok()
                } else {
                    false
                }
            }
            Err(StorageError::NotFound) => true,
            Err(_) => false,
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::{
        storage::MockStorage,
        types::{BlockIndexingStatus, BlockInfo},
    };
    use std::ops::Deref;
    use std::sync::RwLock;

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
        assert!(manager.check_candidate(1, 2, false).await);

        // Force but same version, should update.
        assert!(manager.check_candidate(2, 0, true).await);
    }
}
