//! # Orderbook event mock Contract
//!
//! A very simple orderbook like contract that is only used
//! to emit events in order to test the indexer.
//! This contract will no longer be used once the SDK is operational.
#[starknet::contract]
mod orderbook_event_mock {
    use ark_common::protocol::order_types::{
        FulfillInfo, OrderType, CancelInfo, OrderStatus, RouteType
    };
    use core::traits::TryInto;
    use core::result::ResultTrait;
    use core::zeroable::Zeroable;
    use core::option::OptionTrait;
    use core::starknet::event::EventEmitter;
    use core::traits::Into;
    use starknet::ContractAddress;
    use ark_orderbook::order::order_v1::OrderV1;

    #[storage]
    struct Storage {}

    /// Events emitted by the Orderbook contract.
    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        OrderPlaced: OrderPlaced,
        OrderExecuted: OrderExecuted,
        OrderCancelled: OrderCancelled,
        RollbackStatus: RollbackStatus,
        OrderFulfilled: OrderFulfilled,
    }

    /// Event for when an order is placed.
    #[derive(Drop, starknet::Event)]
    struct OrderPlaced {
        #[key]
        order_hash: felt252,
        #[key]
        order_version: felt252,
        #[key]
        order_type: OrderType,
        // The order that was cancelled by this order.
        cancelled_order_hash: Option<felt252>,
        // The full order serialized.
        order: OrderV1,
    }

    /// Event for when an order is executed.
    #[derive(Drop, starknet::Event)]
    struct OrderExecuted {
        #[key]
        order_hash: felt252,
    }

    /// Event for when an order is executed.
    #[derive(Drop, starknet::Event)]
    struct RollbackStatus {
        #[key]
        order_hash: felt252,
        #[key]
        reason: felt252,
    }

    /// Event for when an order is cancelled.
    #[derive(Drop, starknet::Event)]
    struct OrderCancelled {
        #[key]
        order_hash: felt252,
        #[key]
        reason: felt252,
    }

    /// Event for when an order is fulfilled.
    #[derive(Drop, starknet::Event)]
    struct OrderFulfilled {
        #[key]
        order_hash: felt252,
        #[key]
        fulfiller: ContractAddress,
        #[key]
        related_order_hash: Option<felt252>,
    }


    #[external(v0)]
    fn emit_order_fulfilled(ref self: ContractState) {
        self
            .emit(
                OrderFulfilled {
                    order_hash: 0x1,
                    fulfiller: 0x123.try_into().unwrap(),
                    related_order_hash: Option::Some(0x1111),
                }
            );
    }

    #[external(v0)]
    fn emit_order_placed(ref self: ContractState) {
        self
            .emit(
                OrderPlaced {
                    order_hash: 0x1234,
                    order_version: 0x1,
                    order_type: OrderType::Listing,
                    cancelled_order_hash: Option::None,
                    order: OrderV1 {
                        route: RouteType::Erc721ToErc20,
                        currency_address: 0x1.try_into().unwrap(),
                        currency_chain_id: 'chain',
                        salt: 0x0,
                        offerer: 0x2.try_into().unwrap(),
                        token_chain_id: 'chain',
                        token_address: 0x3.try_into().unwrap(),
                        token_id: Option::Some(1),
                        quantity: 2,
                        start_amount: 3,
                        end_amount: 4,
                        start_date: 5,
                        end_date: 6,
                        broker_id: 0x2.try_into().unwrap(),
                        additional_data: array![].span(),
                    }
                }
            );
    }

    #[external(v0)]
    fn emit_order_listing(ref self: ContractState) {
        self
            .emit(
                OrderPlaced {
                    order_hash: 0x12345,
                    order_version: 0x1,
                    order_type: OrderType::Listing,
                    cancelled_order_hash: Option::None,
                    order: OrderV1 {
                        route: RouteType::Erc721ToErc20,
                        currency_address: 0x1.try_into().unwrap(),
                        currency_chain_id: 'chain',
                        salt: 0x0,
                        offerer: 0x2.try_into().unwrap(),
                        token_chain_id: 'chain',
                        token_address: 0x3.try_into().unwrap(),
                        token_id: Option::Some(1),
                        quantity: 1,
                        start_amount: 3,
                        end_amount: 4,
                        start_date: 5,
                        end_date: 6,
                        broker_id: 0x2.try_into().unwrap(),
                        additional_data: array![].span(),
                    }
                }
            );
    }

    #[external(v0)]
    fn emit_order_offer_placed(ref self: ContractState) {
        self
            .emit(
                OrderPlaced {
                    order_hash: 0x12346,
                    order_version: 0x1,
                    order_type: OrderType::Offer,
                    cancelled_order_hash: Option::None,
                    order: OrderV1 {
                        route: RouteType::Erc721ToErc20,
                        currency_address: 0x1.try_into().unwrap(),
                        currency_chain_id: 'chain',
                        salt: 0x0,
                        offerer: 0x3.try_into().unwrap(),
                        token_chain_id: 'chain',
                        token_address: 0x3.try_into().unwrap(),
                        token_id: Option::Some(1),
                        quantity: 2,
                        start_amount: 4,
                        end_amount: 0,
                        start_date: 2,
                        end_date: 0,
                        broker_id: 0x2.try_into().unwrap(),
                        additional_data: array![].span(),
                    }
                }
            );
    }

    #[external(v0)]
    fn emit_order_offer_executed(ref self: ContractState) {
        self.emit(OrderExecuted { order_hash: 0x12346, });
    }

    #[external(v0)]
    fn emit_order_cancelled(ref self: ContractState) {
        self.emit(OrderCancelled { order_hash: 0x1234, reason: 'fail', });
    }
}
