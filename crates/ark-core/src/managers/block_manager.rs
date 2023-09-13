use ark_starknet::client::StarknetClient;
use ark_storage::storage_manager::StorageManager;
use ark_storage::types::{BlockIndexingStatus, BlockInfo};
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
    pub fn check_candidate(&self, block_number: u64) -> bool {
        let do_force: &bool = &env::var("FORCE_MODE")
            .unwrap_or("false".to_string())
            .parse()
            .unwrap_or(false);

        if *do_force {
            log::debug!("Block #{} forced", block_number);
            // TODO: self.storage.clean_block(block_number);
            return true;
        }

        // TODO: self.storage.get_block_info(...);
        let info = BlockInfo {
            indexer_version: 0,
            status: BlockIndexingStatus::None,
        };

        if info.status == BlockIndexingStatus::None {
            return true;
        }

        if info.indexer_version > self.indexer_version {
            log::debug!("Block #{} new version", block_number);
            // TODO: self.storage.clean_block(block_number);
            return true;
        }

        log::debug!("Block #{} not candidate", block_number);
        false
    }
}
