//! Trait related to any events that Diri can emit to be handled.
use super::storage::*;
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

    /// A new broker has been registered.
    async fn on_broker_registered(&self, broker: BrokerData);

    /// A new listing order has been registered.
    async fn on_order_listing_added(&self, order: OrderListingData);

    /// A new buy order has been executed.
    async fn on_order_buy_executed(&self, order: OrderBuyExecutingData);

    /// An order has been finalized.
    async fn on_order_finalized(&self, order: OrderFinalizedData);
}
