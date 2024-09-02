use ark_common::protocol::order_types::{
    CancelInfo, ExecutionInfo, ExecutionValidationInfo, FulfillInfo, OrderStatus, OrderType
};
use ark_common::protocol::order_v1::OrderV1;

use starknet::ContractAddress;

// *************************************************************************
// ERRORS
//
// Error messages used within the orderbook contract.
// *************************************************************************
pub mod orderbook_errors {
    const BROKER_UNREGISTERED: felt252 = 'OB: unregistered broker';
    const ORDER_INVALID_DATA: felt252 = 'OB: order invalid data';
    const ORDER_ALREADY_EXISTS: felt252 = 'OB: order already exists';
    const ORDER_ALREADY_EXEC: felt252 = 'OB: order already executed';
    const ORDER_NOT_FULFILLABLE: felt252 = 'OB: order not fulfillable';
    const ORDER_NOT_FOUND: felt252 = 'OB: order not found';
    const ORDER_FULFILLED: felt252 = 'OB: order fulfilled';
    const ORDER_NOT_CANCELLABLE: felt252 = 'OB: order not cancellable';
    const ORDER_EXPIRED: felt252 = 'OB: order expired';
    const ORDER_SAME_OFFERER: felt252 = 'OB: order has same offerer';
    const ORDER_NOT_SAME_OFFERER: felt252 = 'OB: fulfiller is not offerer';
    const OFFER_ALREADY_EXISTS: felt252 = 'OB: offer already exists';
    const ORDER_IS_EXPIRED: felt252 = 'OB: order is expired';
    const ORDER_AUCTION_IS_EXPIRED: felt252 = 'OB: auction is expired';
    const ORDER_MISSING_RELATED_ORDER: felt252 = 'OB: order missing related order';
    const ORDER_HASH_DOES_NOT_MATCH: felt252 = 'OB: order hash does not match';
    const ORDER_TOKEN_ID_DOES_NOT_MATCH: felt252 = 'OB: token id does not match';
    const ORDER_TOKEN_ID_IS_MISSING: felt252 = 'OB: token id is missing';
    const ORDER_TOKEN_HASH_DOES_NOT_MATCH: felt252 = 'OB: token hash does not match';
    const ORDER_NOT_AN_OFFER: felt252 = 'OB: order is not an offer';
    const ORDER_NOT_OPEN: felt252 = 'OB: order is not open';
    const ORDER_OPEN: felt252 = 'OB: order is not open';
    const USE_FULFILL_AUCTION: felt252 = 'OB: must use fulfill auction';
    const OFFER_NOT_STARTED: felt252 = 'OB: offer is not started';
    const INVALID_BROKER: felt252 = 'OB: broker is not whitelisted';
}

#[starknet::interface]
pub trait IOrderbook<T> {
    /// Retrieves the type of an order using its hash.
    ///
    /// # Arguments
    /// * `order_hash` - The order hash of order.
    fn get_order_type(self: @T, order_hash: felt252) -> OrderType;

    /// Retrieves the status of an order using its hash.
    ///
    /// # Arguments
    /// * `order_hash` - The order hash of order.
    fn get_order_status(self: @T, order_hash: felt252) -> OrderStatus;

    /// Retrieves the auction end date.
    ///
    /// # Arguments
    /// * `order_hash` - The order hash of order.
    fn get_auction_expiration(self: @T, order_hash: felt252) -> u64;

    /// Retrieves the order using its hash.
    ///
    /// # Arguments
    /// * `order_hash` - The order hash of order.
    fn get_order(self: @T, order_hash: felt252) -> OrderV1;

    /// Retrieves the order hash using its token hash.
    ///
    /// # Arguments
    /// * `token_hash` - The token hash of the order.
    fn get_order_hash(self: @T, token_hash: felt252) -> felt252;
}

pub trait IOrderbookAction<T> {
    fn validate_order_execution(ref self: T, info: ExecutionValidationInfo);

    fn create_order(ref self: T, order: OrderV1);
    fn cancel_order(ref self: T, cancel_info: CancelInfo);
    fn fulfill_order(ref self: T, fulfill_info: FulfillInfo) -> Option::<ExecutionInfo>;
}
