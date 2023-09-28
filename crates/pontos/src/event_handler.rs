//! Trait related to any events that Pontos can emit to be handled.
use crate::storage::types::{TokenEvent, TokenFromEvent};
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
    async fn on_terminated(&self, indexer_version: u64, indexer_identifier: &str) {}

    /// Block has be processed by Pontos.
    async fn on_block_processed(
        &self,
        block_number: u64,
        indexer_version: u64,
        indexer_identifier: &str,
    ) {
    }

    /// A new token has be registered.
    async fn on_token_registered(&self, token: TokenFromEvent) {}

    /// A new event has be registered.
    async fn on_event_registered(&self, event: TokenEvent) {}

    // TODO: add pertinent events to react on.
}
