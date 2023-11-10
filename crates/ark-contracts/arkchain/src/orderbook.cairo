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
}

// *************************************************************************
// ERRORS
// *************************************************************************
mod orderbook_errors {
    const BROKER_UNREGISTERED: felt252 = 'OB: unregistered broker';
    const ORDER_INVALID_DATA: felt252 = 'OB: order invalid data';
    const ORDER_ALREADY_EXEC: felt252 = 'OB: order already executed';
    const ORDER_NOT_FOUND: felt252 = 'OB: order not found';
}

#[starknet::contract]
mod orderbook {
    use core::starknet::event::EventEmitter;
    use core::traits::Into;
    use super::{orderbook_errors, Orderbook};
    use starknet::ContractAddress;
    use arkchain::order::types::{OrderTrait, OrderType, ExecutionInfo, FulfillmentInfo};
    use arkchain::order::order_v1::OrderV1;
    use arkchain::order::database::{order_read, order_status_read};
    use arkchain::crypto::signer::SignInfo;

    #[storage]
    struct Storage {
        // Administrator of the orderbook.
        admin: ContractAddress,
        // Whitelist of brokers. For now felt252 is used instead of bool
        // to ensure future evolution. Set to 1 if the broker is registered.
        brokers: LegacyMap<felt252, felt252>,
        // (chain_id, token_address, token_id) -> order_hash
        listings: LegacyMap<(felt252, ContractAddress, u256), felt252>,
        // (chain_id, token_address, token_id) -> (order_hash, nonce)
        auction: LegacyMap<(felt252, ContractAddress, u256), (felt252, felt252)>,
    // Order database [order status, order data]
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
    ) { 
        // Verify it comes from Arkchain operator contract.
        // Check data + cancel / fulfill the order.
    }

    // *************************************************************************
    // EXTERNAL FUNCTIONS
    // *************************************************************************
    #[external(v0)]
    impl ImplOrderbook of Orderbook<ContractState> {
        fn whitelist_broker(ref self: ContractState, broker_id: felt252) {
            // TODO: check components with OZ when ready for ownable.
            assert(
                self.admin.read() == starknet::get_caller_address(),
                orderbook_errors::BROKER_UNREGISTERED
            );

            self.brokers.write(broker_id, 1);
        }

        fn create_order(ref self: ContractState, order: OrderV1, sign_info: SignInfo) {
            order.validate_common_data().expect(orderbook_errors::ORDER_INVALID_DATA);

            let order_type = order
                .validate_order_type()
                .expect(orderbook_errors::ORDER_INVALID_DATA);
  
            let order_hash = order.compute_data_hash();

            match order_type {
                OrderType::Listing => {
                    self._create_listing_order(order, order_type, order_hash);
                },
                OrderType::Auction => {
                    self._create_listing_auction(order, order_type, order_hash);
                },
                OrderType::Offer => {
                    self._create_listing_offer(order, order_type, order_hash);
                },
                OrderType::CollectionOffer => {
                    self._create_listing_collection_offer(order, order_type, order_hash);
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
        ) {
            
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
            self
                .emit(
                    OrderPlaced {
                        order_hash: order_hash,
                        order_version: order.get_version(),
                        order_type: order_type,
                        order: order,
                    }
                );
        }
        fn _create_listing_auction(
            ref self: ContractState, order: OrderV1, order_type: OrderType, order_hash: felt252
        ) {
            self
                .emit(
                    OrderPlaced {
                        order_hash: order_hash,
                        order_version: order.get_version(),
                        order_type: order_type,
                        order: order,
                    }
                );
        }
        fn _create_listing_offer(
            ref self: ContractState, order: OrderV1, order_type: OrderType, order_hash: felt252
        ) {
            self
                .emit(
                    OrderPlaced {
                        order_hash: order_hash,
                        order_version: order.get_version(),
                        order_type: order_type,
                        order: order,
                    }
                );
        }
        fn _create_listing_collection_offer(
            ref self: ContractState, order: OrderV1, order_type: OrderType, order_hash: felt252
        ) {
            self
                .emit(
                    OrderPlaced {
                        order_hash: order_hash,
                        order_version: order.get_version(),
                        order_type: order_type,
                        order: order,
                    }
                );
        }
    }
}
