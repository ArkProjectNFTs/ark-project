//! Trait related to any events that Diri can emit to be handled.

use async_trait::async_trait;

/// A trait to be implemented in order to handle
/// events emitted by diri, in an external code.
///
/// Any long computation in the code of those functions
/// will directly impact Diri performances.
/// Please consider spawning tasks if some work may
/// be too heavy and impact negatively Diri performances.
#[async_trait]
pub trait EventHandler {
    /// Block has be processed by Diri.
    async fn on_block_processed(&self, block_number: u64);
}
