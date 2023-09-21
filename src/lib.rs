//! ArkProject rust libraries.

pub mod starknet {
    pub use ark_starknet::*;
}

pub mod nft_indexer {
    pub use ark_indexer::*;
}

pub mod nft_storage {
    pub use ark_storage::*;
}

// TODO: need to rework the organization of those crates.
pub mod arkchain {
    pub use arkchain_indexer::*;
}
