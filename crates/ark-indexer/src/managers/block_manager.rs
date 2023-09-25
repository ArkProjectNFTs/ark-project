use ark_starknet::client::StarknetClient;
use ark_storage::storage_manager::StorageManager;
use ark_storage::types::{BlockIndexingStatus, BlockInfo, StorageError};
use starknet::core::types::*;

use std::env;

#[derive(Debug)]
pub struct BlockManager<'a, T: StorageManager, C: StarknetClient> {
    storage: &'a T,
    client: &'a C,
    indexer_version: u64,
}

impl<'a, T: StorageManager, C: StarknetClient> BlockManager<'a, T, C> {
    pub fn new(storage: &'a T, client: &'a C) -> Self {
        let v: &u64 = &env::var("INDEXER_VERSION")
            .expect("INDEXER_VERSION env var is missing")
            .parse()
            .expect("INDEXER_VERSION env var is invalid");

        Self {
            storage,
            client,
            indexer_version: *v,
        }
    }

    /// Returns the block range to be fetched during this run.
    pub fn get_block_range(&self) -> (BlockId, BlockId, bool) {
        let (from_block, to_block) = self
            .client
            .parse_block_range(
                &env::var("START_BLOCK").expect("START_BLOCK env variable is missing"),
                &env::var("END_BLOCK").unwrap_or("latest".to_string()),
            )
            .expect("Can't parse block range from env");

        let is_head_of_chain = to_block == BlockId::Tag(BlockTag::Latest);
        log::debug!(
            "Indexing range: {:?} {:?} (head of chain: {})",
            from_block,
            to_block,
            is_head_of_chain
        );

        (from_block, to_block, is_head_of_chain)
    }

    /// Returns true if the given block number must be indexed.
    /// False otherwise.
    pub async fn check_candidate(&self, block_number: u64) -> bool {
        // If we are indexing the head of the chain, we don't need to check
        let do_force: &bool = &env::var("FORCE_MODE")
            .unwrap_or("false".to_string())
            .parse()
            .unwrap_or(false);

        if *do_force {
            return self.storage.clean_block(block_number).await.is_ok();
        }

        match self.storage.get_block_info(block_number).await {
            Ok(info) => {
                log::debug!("Block {} already indexed", block_number);
                if self.indexer_version > info.indexer_version {
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
        status: BlockIndexingStatus,
    ) -> Result<(), StorageError> {
        self.storage
            .set_block_info(
                block_number,
                BlockInfo {
                    indexer_version: self.indexer_version,
                    indexer_identifier: env::var("INDEXER_IDENTIFIER").unwrap_or("".to_string()),
                    status,
                },
            )
            .await?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use ark_starknet::client::MockStarknetClient;
    use ark_storage::{
        storage_manager::MockStorageManager,
        types::{BlockIndexingStatus, BlockInfo},
    };

    use super::*;

    #[test]
    fn test_get_block_range() {
        let mut mock_client = MockStarknetClient::default();
        let mock_storage = MockStorageManager::default();

        mock_client
            .expect_parse_block_range()
            .returning(|_, _| Ok((BlockId::Number(1), BlockId::Tag(BlockTag::Latest))));

        let manager = BlockManager {
            storage: &mock_storage,
            client: &mock_client,
            indexer_version: 1,
        };

        env::set_var("START_BLOCK", "1");
        env::set_var("END_BLOCK", "latest");

        let (from, to, is_head) = manager.get_block_range();
        assert_eq!(from, BlockId::Number(1));
        assert_eq!(to, BlockId::Tag(BlockTag::Latest));
        assert!(is_head);

        // Cleanup environment variables after the test
        env::remove_var("START_BLOCK");
        env::remove_var("END_BLOCK");
    }

    #[tokio::test]
    async fn test_check_candidate() {
        let mock_client = MockStarknetClient::default();
        let mut mock_storage = MockStorageManager::default();

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
            storage: &mock_storage,
            client: &mock_client,
            indexer_version: 1,
        };

        env::set_var("FORCE_MODE", "false");

        assert!(manager.check_candidate(1).await);
        assert!(manager.check_candidate(2).await);

        // Cleanup environment variable after the test
        env::remove_var("FORCE_MODE");
    }
}
