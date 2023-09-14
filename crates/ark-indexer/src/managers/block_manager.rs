use ark_starknet::client::StarknetClient;
use ark_storage::storage_manager::StorageManager;
use ark_storage::types::StorageError;
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
        // If we are indexing the head of the chain, we don't need to check
        let do_force: &bool = &env::var("FORCE_MODE")
            .unwrap_or("false".to_string())
            .parse()
            .unwrap_or(false);

        if *do_force {
<<<<<<< HEAD:crates/ark-indexer/src/managers/block_manager.rs
            return self.storage.clean_block(block_number).is_ok();
        }
        
        match self.storage.get_block_info(block_number) {
            Ok(info) => {
                if self.indexer_version > info.indexer_version {
                    self.storage.clean_block(block_number).is_ok()
                } else {
                    false
                }
            }
            Err(StorageError::NotFound) => true,
            Err(_) => false,
        }
=======
            match self.storage.clean_block(block_number) {
                Ok(_) => log::debug!("Block cleaned successfully!"),
                Err(e) => log::debug!("Error cleaning block: {:?}", e),
            }
            return true;
        }

        let info = match self.storage.get_block_info(block_number) {
            Ok(block_info) => {
                log::debug!("Retrieved block info: {:?}", block_info);
                Some(block_info) // Assign the value of block_info to `info`
            }
            Err(e) => {
                log::debug!("Error retrieving block info: {:?}", e);
                None // Assigns None to `info` in case of error
            }
        };

        // Use the retrieved info to determine some actions
        if let Some(actual_info) = info {
            if actual_info.status == BlockIndexingStatus::None {
                return true;
            }

            if actual_info.indexer_version > self.indexer_version {
                log::debug!("Block #{} new version", block_number);
                match self.storage.clean_block(block_number) {
                    Ok(_) => log::debug!("Block cleaned successfully!"),
                    Err(e) => log::debug!("Error cleaning block: {:?}", e),
                }
                return true;
            }
        } else {
            log::debug!("Info is not available for the block.");
        }

        // If no conditions are met, return false or whatever default you want
        false
>>>>>>> a85c0ca (feat(storage): add basic return & usage for storage):crates/ark-core/src/managers/block_manager.rs
    }
}
