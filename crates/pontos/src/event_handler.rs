//! Trait related to any events that Pontos can emit to be handled.
use crate::storage::types::{TokenEvent, TokenInfo};
use async_trait::async_trait;

/// A trait to be implemented in order to handle
/// events emitted by Pontos, in an external code.
///
/// Any long computation in the code of those functions
/// will directly impact Pontos performances.
/// Please consider spawning tasks if some work may
/// be too heavy and impact negatively Pontos performances.
#[async_trait]
#[allow(unused)]
pub trait EventHandler {
    /// Pontos has normally terminated the indexation of the given blocks.
    async fn on_block_processed(&self, block_number: u64, indexation_progress: f64) {}

    /// Block is processing by Pontos.
    async fn on_block_processing(&self, block_timestamp: u64, block_number: Option<u64>) {}

    /// Invoked when Pontos has successfully indexed a range of blocks up to the given block number.
    async fn on_indexation_range_completed(&self) {}

    /// A new token has be registered.
    async fn on_token_registered(&self, token: TokenInfo) {}

    /// A new event has be registered.
    async fn on_event_registered(&self, event: TokenEvent) {}

    // A new latest block has been detected.
    async fn on_new_latest_blocks(&self, block_numbers: Vec<u64>) {}
}
