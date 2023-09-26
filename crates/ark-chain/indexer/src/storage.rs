use ark_starknet::CairoU256;
use async_trait::async_trait;
use starknet::core::types::FieldElement;

pub type StorageResult<T> = Result<T, StorageError>;

#[derive(Debug, thiserror::Error)]
pub enum StorageError {
    #[error("Transport error")]
    TransportError,
    #[error("Database error")]
    DatabaseError,
}

#[async_trait]
pub trait ArkchainStorage {
    /// Registers a broker.
    async fn register_broker(&self, broker: BrokerData) -> StorageResult<()>;

    /// Adds a listing order.
    async fn add_listing_order(&self, order: OrderListingData) -> StorageResult<()>;

    /// Registers the new state for the order as being executed.
    /// For the current context, this means that there is a buyer,
    /// that has sent a transaction on the arkchain to buy. So a transaction
    /// is fired on starknet for the settlement.
    async fn set_order_buy_executing(&self, order: OrderBuyExecutingData) -> StorageResult<()>;

    /// Registers the new state for the order as being finalized, starknet has
    /// confirmed to the arkchain that the order is completed.
    async fn set_order_finalized(&self, order: OrderFinalizedData) -> StorageResult<()>;
}

#[derive(Debug)]
pub struct BrokerData {
    pub name: FieldElement,
    pub chain_id: FieldElement,
    pub timestamp: u64,
    pub public_key: FieldElement,
}

#[derive(Debug)]
pub struct OrderListingData {
    pub order_hash: FieldElement,
    pub broker_name: FieldElement,
    pub chain_id: FieldElement,
    pub timestamp: u64,
    pub seller: FieldElement,
    pub collection: FieldElement,
    pub token_id: CairoU256,
    pub price: CairoU256,
}

#[derive(Debug)]
pub struct OrderBuyExecutingData {
    pub order_hash: FieldElement,
    pub broker_name: FieldElement,
    pub chain_id: FieldElement,
    pub timestamp: u64,
    pub buyer: FieldElement,
}

#[derive(Debug)]
pub struct OrderFinalizedData {
    pub order_hash: FieldElement,
    pub timestamp: u64,
}
