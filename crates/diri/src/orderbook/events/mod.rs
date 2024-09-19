pub(crate) mod order_cancelled;
pub(crate) mod order_executed;
pub(crate) mod order_fulfilled;
pub(crate) mod order_placed;
pub(crate) mod rollback_status;

pub(crate) use order_cancelled::OrderCancelled;
pub(crate) use order_executed::OrderExecuted;
pub(crate) use order_fulfilled::OrderFulfilled;
pub(crate) use order_placed::OrderPlaced;
pub(crate) use rollback_status::RollbackStatus;

pub(crate) use cainome::cairo_serde::U256;
use starknet::{core::types::Felt, macros::selector};

#[derive(Debug)]
pub(crate) enum OrderbookParseError {
    Selector,
    KeyLength,
    DataLength,
    UnsupportedVersion,
    UnknownError,
}

pub const ORDER_CANCELLED_SELECTOR: Felt = selector!("OrderCancelled");
pub const ORDER_EXECUTED_SELECTOR: Felt = selector!("OrderExecuted");
pub const ORDER_FULFILLED_SELECTOR: Felt = selector!("OrderFulfilled");
pub const ORDER_PLACED_SELECTOR: Felt = selector!("OrderPlaced");
pub const ROLLBACK_STATUS_SELECTOR: Felt = selector!("RollbackStatus");
