//! Orderbook contract.
//!
use arkchain::order::types::ExecutionInfo;
use arkchain::order::order_v1::OrderV1;
use arkchain::crypto::signer::SignInfo;

#[starknet::interface]
trait Orderbook<T> {
    /// Whitelists a broker.
    /// TODO: good first exercise to use a components for broker management.
    ///
    /// # Arguments
    ///
    /// * `broker_id` - ID of the broker.
    fn whitelist_broker(ref self: T, broker_id: felt252);

    /// Submits and places an order to the orderbook if the order is valid.
    ///
    /// # Arguments
    ///
    /// * `order` - The order to be placed.
    /// * `sign_info` - The signing info of the `order`.
    fn create_order(ref self: T, order: OrderV1, sign_info: SignInfo);

    fn cancel_order(ref self: T, order_hash: felt252, sign_info: SignInfo);

    fn execute_order(
        ref self: T, order_hash: felt252, execution_info: ExecutionInfo, sign_info: SignInfo
    );

    fn get_order_status(self: @T, order_hash: felt252) -> felt252;
    fn get_order(self: @T, order_hash: felt252) -> OrderV1;
}

// *************************************************************************
// ERRORS
// *************************************************************************
mod orderbook_errors {
    const BROKER_UNREGISTERED: felt252 = 'OB: unregistered broker';
    const ORDER_INVALID_DATA: felt252 = 'OB: order invalid data';
    const ORDER_ALREADY_EXEC: felt252 = 'OB: order already executed';
    const ORDER_NOT_FOUND: felt252 = 'OB: order not found';
    const ORDER_FULFILLED: felt252 = 'OB: order fullfiled';
    const STATUS_NOT_FOUND: felt252 = 'OB: status not found';
}

#[starknet::contract]
mod orderbook {
    use core::traits::TryInto;
    use core::result::ResultTrait;
    use core::zeroable::Zeroable;
    use core::option::OptionTrait;
    use core::starknet::event::EventEmitter;
    use core::traits::Into;
    use super::{orderbook_errors, Orderbook};
    use starknet::ContractAddress;
    use arkchain::order::types::{OrderTrait, OrderType, ExecutionInfo, FulfillmentInfo};
    use arkchain::order::order_v1::OrderV1;
    use arkchain::order::database::{order_read, order_status_read, order_write, order_status_write};
    use arkchain::crypto::signer::SignInfo;
    use arkchain::order::types::OrderStatus;

    #[storage]
    struct Storage {
        // Administrator of the orderbook.
        admin: ContractAddress,
        // Whitelist of brokers. For now felt252 is used instead of bool
        // to ensure future evolution. Set to 1 if the broker is registered.
        brokers: LegacyMap<felt252, felt252>,

        // (chain_id, token_address, token_id): felt252 -> order_hash
        token_listings: LegacyMap<felt252, felt252>,

        // (chain_id, token_address, token_id): ressource_hash -> (order_hash, end_date)
        auctions: LegacyMap<felt252, (felt252, felt252)>,

        // storage for auction offers to match Auction order
        // (auction offer order_hash) -> auction listing order_hash
        auction_offers: LegacyMap<felt252, felt252>,    

        // Order database [token_hash, order_data]
        // see arkchain::order::database
    }

    // *************************************************************************
    // EVENTS
    // *************************************************************************
    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        OrderPlaced: OrderPlaced,
        OrderExecuted: OrderExecuted,
        OrderCancelled: OrderCancelled,
        OrderFulfilled: OrderFulfilled,
    }

    #[derive(Drop, starknet::Event)]
    struct OrderPlaced {
        #[key]
        order_hash: felt252,
        #[key]
        order_version: felt252,
        #[key]
        order_type: OrderType,
        cancelled_order_hash: felt252,
        // The full order serialized.
        order: OrderV1,
    }

    #[derive(Drop, starknet::Event)]
    struct OrderExecuted {
        #[key]
        order_hash: felt252,
        info: ExecutionInfo,
    }

    #[derive(Drop, starknet::Event)]
    struct OrderCancelled {
        #[key]
        order_hash: felt252,
        #[key]
        reason: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct OrderFulfilled {
        #[key]
        order_hash: felt252,
        #[key]
        transaction_hash_settlement: felt252,
    }

    // *************************************************************************
    // CONSTRUCTOR
    // *************************************************************************
    #[constructor]
    fn constructor(ref self: ContractState, admin: ContractAddress) {
        self.admin.write(admin);
    }

    // *************************************************************************
    // L1 HANDLERS
    // Only the sequencer can call this function with L1HandlerTransaction.
    // *************************************************************************
    #[l1_handler]
    fn fulfill_order(
        ref self: ContractState, from_address: felt252, info: FulfillmentInfo
    ) { // Verify it comes from Arkchain operator contract.
    // Check data + cancel / fulfill the order.
    }

    // *************************************************************************
    // EXTERNAL FUNCTIONS
    // *************************************************************************
    #[external(v0)]
    impl ImplOrderbook of Orderbook<ContractState> {
        // TODO: add a function to get the order status
        fn get_order_status(self: @ContractState, order_hash: felt252) -> felt252 {
            let status order_status_read(order_hash) {
            if status.is_none() {
                panic_with_felt252(orderbook_errors::STATUS_NOT_FOUND);
            }
            status
        }

        fn get_order(self: @ContractState, order_hash: felt252) -> OrderV1 {
            let order = order_read(order_hash);
            if (order.is_none()) {
                panic_with_felt252(orderbook_errors::ORDER_NOT_FOUND);
            }
            order.unwrap()
        }

        fn whitelist_broker(ref self: ContractState, broker_id: felt252) {
            // TODO: check components with OZ when ready for ownable.
            assert(
                self.admin.read() == starknet::get_caller_address(),
                orderbook_errors::BROKER_UNREGISTERED
            );

            self.brokers.write(broker_id, 1);
        }

        fn create_order(ref self: ContractState, order: OrderV1, sign_info: SignInfo) {
            let block_ts = starknet::get_block_timestamp();
            let validation = order.validate_common_data(block_ts);
            if validation.is_err() {
                panic_with_felt252(validation.unwrap_err().into());
            }

            let order_type = order
                .validate_order_type()
                .expect(orderbook_errors::ORDER_INVALID_DATA);

            let order_hash = order.compute_order_hash();
            match order_type {
                OrderType::Listing => {
                    self._create_listing_order(order, order_type, order_hash);
                },
                OrderType::Auction => { self._create_auction(order, order_type, order_hash); },
                OrderType::Offer => { self._create_offer(order, order_type, order_hash); },
                OrderType::CollectionOffer => {
                    self._create_collection_offer(order, order_type, order_hash);
                },
            }
        }

        fn cancel_order(ref self: ContractState, order_hash: felt252, sign_info: SignInfo) {
            let status = match order_status_read(order_hash) {
                Option::Some(s) => s,
                Option::None => panic_with_felt252(orderbook_errors::ORDER_NOT_FOUND),
            };
        }

        fn execute_order(
            ref self: ContractState,
            order_hash: felt252,
            execution_info: ExecutionInfo,
            sign_info: SignInfo
        ) { // if auction increment nonce
        }
    }

    // *************************************************************************
    // INTERNAL FUNCTIONS
    // *************************************************************************
    #[generate_trait]
    impl InternalFunctions of InternalFunctionsTrait {
        fn _create_listing_order(
            ref self: ContractState, order: OrderV1, order_type: OrderType, order_hash: felt252
        ) {
            let token_hash = order.compute_token_hash();
            let current_listing_orderhash = self.token_listings.read(token_hash);
            let current_order_status = order_status_read(current_listing_orderhash);
            // if there is an order already, we need to cancel it
            if current_listing_orderhash.is_non_zero() {
                // if current order has a status, we need to cancel it
                if current_order_status.is_some() {
                    let current_order_status = current_order_status.unwrap();
                    // if order is already fulfilled, we cannot cancel it
                    if (current_order_status == OrderStatus::Fulfilled) {
                        panic_with_felt252(orderbook_errors::ORDER_FULFILLED);
                    } else {
                        // change old order status to cancelled
                        order_status_write(
                            current_listing_orderhash, OrderStatus::CancelledByNewOrder
                        );
                    }
                } else {
                    // if order status is not found, panic
                    panic_with_felt252(orderbook_errors::STATUS_NOT_FOUND);
                }
            }
            // Associate order_hash to token_hash on the storage
            order_write(order_hash, order_type, order);
            // Change order status to fulfilled
            order_status_write(current_listing_orderhash, OrderStatus::Fulfilled);
            // Write new order with status open
            self.token_listings.write(token_hash, order_hash);
            self
                .emit(
                    OrderPlaced {
                        order_hash: order_hash,
                        order_version: order.get_version(),
                        order_type: order_type,
                        cancelled_order_hash: current_listing_orderhash,
                        order: order
                    }
                );
        }
        fn _create_auction(
            ref self: ContractState, order: OrderV1, order_type: OrderType, order_hash: felt252
        ) {
            self
                .emit(
                    OrderPlaced {
                        order_hash: order_hash,
                        order_version: order.get_version(),
                        order_type: order_type,
                        cancelled_order_hash: 0,
                        order: order,
                    }
                );
        }
        fn _create_offer(
            ref self: ContractState, order: OrderV1, order_type: OrderType, order_hash: felt252
        ) {
            self
                .emit(
                    OrderPlaced {
                        order_hash: order_hash,
                        order_version: order.get_version(),
                        order_type: order_type,
                        cancelled_order_hash: 0,
                        order: order,
                    }
                );
        }
        fn _create_collection_offer(
            ref self: ContractState, order: OrderV1, order_type: OrderType, order_hash: felt252
        ) {
            self
                .emit(
                    OrderPlaced {
                        order_hash: order_hash,
                        order_version: order.get_version(),
                        order_type: order_type,
                        cancelled_order_hash: 0,
                        order: order,
                    }
                );
        }
    }
}
