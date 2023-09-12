use ark_starknet::client2::StarknetClient;
use ark_storage::storage_manager::StorageManager;

use std::env;

#[derive(Debug)]
pub struct BlockManager<'a, T: StorageManager> {
    storage: &'a T,
    client: &'a StarknetClient,
    indexer_version: u64,
}

// TODO: this struct must come from Storage crate.
#[derive(Debug, PartialEq)]
pub enum BlockIndexingStatus {
    None,
    Processing,
    Terminated,
}

// TODO: this struct must come from Storage crate.
pub struct BlockInfo {
    pub indexer_version: u64,
    pub status: BlockIndexingStatus,
}

impl<'a, T: StorageManager> BlockManager<'a, T> {
    pub fn new(storage: &'a T, client: &'a StarknetClient) -> Self {
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

    /// Returns true if the given block number must be indexed.
    /// False otherwise.
    pub fn check_candidate(&self, block_number: u64) -> bool {
        let do_force: &bool = &env::var("FORCE_MODE")
            .unwrap_or("false".to_string())
            .parse()
            .unwrap_or(false);

        // TODO: self.storage.get_block_info(...);
        let info = BlockInfo {
            indexer_version: 0,
            status: BlockIndexingStatus::None,
        };

        if info.status == BlockIndexingStatus::None {
            return true;
        }

        if *do_force {
            log::debug!("Block #{} forced", block_number);
            // TODO: self.storage.clean_block(block_number);
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
