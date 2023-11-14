//! # Orderbook Contract
//! 
//! This module defines the structure and functionalities of an orderbook contract. It includes
//! trait definitions, error handling, contract storage, events, constructors, L1 handlers, external functions, 
//! and internal functions. The primary functionalities include broker whitelisting, order management 
//! (creation, cancellation, execution), and order queries.

use arkchain::order::types::ExecutionInfo;
use arkchain::order::order_v1::OrderV1;
use arkchain::crypto::signer::{SignInfo, Signer, SignerValidator};

/// Orderbook trait to define operations on orderbooks.
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
    fn create_order(ref self: T, order: OrderV1, signer: Signer);

    /// Cancels an existing order in the orderbook.
    ///
    /// # Arguments
    ///
    /// * `order_hash` - The order to be cancelled.
    /// * `sign_info` - The signing information associated with the order cancellation.
    fn cancel_order(ref self: T, order_hash: felt252, signer: Signer);

    /// Fulfils an existing order in the orderbook.
    ///
    /// # Arguments
    ///
    /// * `order_hash` - The order to be fulfil.
    /// * `sign_info` - The signing information associated with the order fulfillment.
    fn fullfil_order(
        ref self: T, order_hash: felt252, execution_info: ExecutionInfo, signer: Signer
    );

    /// Retrieves the type of an order using its hash.
    ///
    /// # Arguments
    /// * `order_hash` - The order hash of order.
    fn get_order_type(self: @T, order_hash: felt252) -> felt252;

    /// Retrieves the status of an order using its hash.
    ///
    /// # Arguments
    /// * `order_hash` - The order hash of order.
    fn get_order_status(self: @T, order_hash: felt252) -> felt252;

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

// *************************************************************************
// ERRORS
//
// Error messages used within the orderbook contract.
// *************************************************************************
mod orderbook_errors {
    const BROKER_UNREGISTERED: felt252 = 'OB: unregistered broker';
    const ORDER_INVALID_DATA: felt252 = 'OB: order invalid data';
    const ORDER_ALREADY_EXISTS: felt252 = 'OB: order already exists';
    const ORDER_ALREADY_EXEC: felt252 = 'OB: order already executed';
    const ORDER_NOT_FOUND: felt252 = 'OB: order not found';
    const ORDER_FULFILLED: felt252 = 'OB: order fulfilled';
    const ORDER_NOT_CANCELLABLE: felt252 = 'OB: order not cancellable';
}

/// StarkNet smart contract module for an order book.
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
    use arkchain::order::database::{
        order_read, order_status_read, order_write, order_status_write, order_type_read
    };
    use arkchain::crypto::signer::{SignInfo, Signer, SignerValidator};
    use arkchain::order::types::OrderStatus;

    /// Storage struct for the Orderbook contract.
    #[storage]
    struct Storage {
        /// Order database.
        /// Mapping of token hashes to order data.
        /// Order database [token_hash, order_data]
        /// see arkchain::order::database for more details.

        /// Administrator address of the order book.
        admin: ContractAddress,
        /// Mapping of broker addresses to their whitelisted status.
        /// Represented as felt252, set to 1 if the broker is registered.
        brokers: LegacyMap<felt252, felt252>,
        /// Mapping of token_hash to order_hash.
        token_listings: LegacyMap<felt252, felt252>,
        /// Mapping of token_hash to auction details (order_hash and end_date, auction_offer_count).
        auctions: LegacyMap<felt252, (felt252, u64, u256)>,
        /// Mapping of auction offer order_hash to auction listing order_hash.
        auction_offers: LegacyMap<felt252, felt252>,
        /// Mapping of order_hash to order_signer public key.
        order_signers: LegacyMap<felt252, felt252>,
    }

    // *************************************************************************
    // EVENTS
    // *************************************************************************

    /// Events emitted by the Orderbook contract.
    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        OrderPlaced: OrderPlaced,
        OrderExecuted: OrderExecuted,
        OrderCancelled: OrderCancelled,
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
        info: ExecutionInfo,
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

    /// L1 handler for placing an order.
    /// # TODO
    /// * Verify it comes from Arkchain executor contract.
    /// * Check data + cancel / execute the order.
    #[l1_handler]
    fn execute_order(ref self: ContractState, from_address: felt252, info: FulfillmentInfo) {}

    // *************************************************************************
    // EXTERNAL FUNCTIONS
    // *************************************************************************
    #[external(v0)]
    impl ImplOrderbook of Orderbook<ContractState> {
        /// Retrieves the type of an order using its hash.
        /// # View
        fn get_order_type(self: @ContractState, order_hash: felt252) -> felt252 {
            order_type_read(order_hash).unwrap().into()
        }

        /// Retrieves the status of an order using its hash.
        /// # View
        fn get_order_status(self: @ContractState, order_hash: felt252) -> felt252 {
            let status = order_status_read(order_hash);
            if status.is_none() {
                panic_with_felt252(orderbook_errors::ORDER_NOT_FOUND);
            }
            status.unwrap().into()
        }

        /// Retrieves the order using its hash.
        /// # View
        fn get_order(self: @ContractState, order_hash: felt252) -> OrderV1 {
            let order = order_read(order_hash);
            if (order.is_none()) {
                panic_with_felt252(orderbook_errors::ORDER_NOT_FOUND);
            }
            order.unwrap()
        }

        /// Retrieves the order hash using its token hash.
        /// # View
        fn get_order_hash(self: @ContractState, token_hash: felt252) -> felt252 {
            let order_hash = self.token_listings.read(token_hash);
            if (order_hash.is_zero()) {
                panic_with_felt252(orderbook_errors::ORDER_NOT_FOUND);
            }
            order_hash
        }

        /// Whitelists a broker.
        fn whitelist_broker(ref self: ContractState, broker_id: felt252) {
            // TODO: check components with OZ when ready for ownable.
            assert(
                self.admin.read() == starknet::get_caller_address(),
                orderbook_errors::BROKER_UNREGISTERED
            );

            self.brokers.write(broker_id, 1);
        }

        /// Submits and places an order to the orderbook if the order is valid.
        fn create_order(ref self: ContractState, order: OrderV1, signer: Signer) {
            let order_hash = order.compute_order_hash();
            SignerValidator::verify(order_hash, signer);

            let block_ts = starknet::get_block_timestamp();
            let validation = order.validate_common_data(block_ts);
            if validation.is_err() {
                panic_with_felt252(validation.unwrap_err().into());
            }

            let order_type = order
                .validate_order_type()
                .expect(orderbook_errors::ORDER_INVALID_DATA);

            let order_hash = order.compute_order_hash();

            // TODO

            // let order_read_option = order_read::<OrderV1>(order_hash);
            // assert(order_read_option.is_some(), orderbook_errors::ORDER_ALREADY_EXISTS);

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

        fn cancel_order(ref self: ContractState, order_hash: felt252, signer: Signer) {
            SignerValidator::verify(order_hash, signer);
            // TODO: if cancel an auction check if there are offers if true we can't cancel
            let status = match order_status_read(order_hash) {
                Option::Some(s) => s,
                Option::None => panic_with_felt252(orderbook_errors::ORDER_NOT_FOUND),
            };
        }

        fn fullfil_order(
            ref self: ContractState,
            order_hash: felt252,
            execution_info: ExecutionInfo,
            signer: Signer
        ) {}
    }

    // *************************************************************************
    // INTERNAL FUNCTIONS
    // *************************************************************************
    #[generate_trait]
    impl InternalFunctions of InternalFunctionsTrait {
        /// Get order hash from token hash
        ///
        /// # Arguments
        /// * `token_hash` - The token hash of the order.
        ///
        fn _get_order_hash_from_token_hash(self: @ContractState, token_hash: felt252) -> felt252 {
            self.token_listings.read(token_hash)
        }

        /// get previous order 
        ///
        /// # Arguments
        /// * `token_hash` - The token hash of the order.
        ///
        /// # Return option of (order hash: felt252, is_order_expired: bool, order: OrderV1)
        /// * order_hash
        /// * is_order_expired
        /// * order 
        fn _get_previous_order(
            self: @ContractState, token_hash: felt252
        ) -> Option<(felt252, bool, OrderV1)> {
            let previous_listing_orderhash = self.token_listings.read(token_hash);
            let (
                previous_auction_orderhash, previous_auction_end_date, previous_auction_offers_count
            ) =
                self
                .auctions
                .read(token_hash);
            let mut previous_orderhash = 0;

            if (previous_listing_orderhash.is_non_zero()) {
                previous_orderhash = previous_listing_orderhash;
                let previous_order: Option<OrderV1> = order_read(previous_orderhash);
                assert(previous_order.is_some(), 'Order must exist');
                let previous_order = previous_order.unwrap();
                return Option::Some(
                    (
                        previous_orderhash,
                        previous_order.end_date <= starknet::get_block_timestamp(),
                        previous_order
                    )
                );
            }
            if (previous_auction_orderhash.is_non_zero()) {
                previous_orderhash = previous_listing_orderhash;
                let current_order: Option<OrderV1> = order_read(previous_orderhash);
                assert(current_order.is_some(), 'Order must exist');
                let current_order = current_order.unwrap();
                let (_, auction_end_date, _) = self.auctions.read(token_hash);
                return Option::Some(
                    (
                        previous_orderhash,
                        auction_end_date <= starknet::get_block_timestamp(),
                        current_order
                    )
                );
            } else {
                return Option::None;
            }
        }

        /// Process previous order
        ///
        /// # Arguments
        /// * `token_hash` - The token hash of the order.
        ///
        fn _process_previous_order(
            ref self: ContractState, token_hash: felt252, offerer: ContractAddress
        ) -> Option<felt252> {
            let previous_order = self._get_previous_order(token_hash);

            // Check of previous order exists
            if (previous_order.is_some()) {
                let (previous_orderhash, previous_order_is_expired, previous_order) = previous_order
                    .unwrap();
                let previous_order_status = order_status_read(previous_orderhash)
                    .expect('Invalid Order status');
                let previous_order_type = order_type_read(previous_orderhash)
                    .expect('Invalid Order type');

                // check if previous order is fulfilled
                assert(
                    previous_order_status != OrderStatus::Fulfilled,
                    orderbook_errors::ORDER_FULFILLED
                );

                // verify offerer is the same
                if (previous_order.offerer == offerer) {
                    // check previous order is expired
                    assert(previous_order_is_expired, orderbook_errors::ORDER_NOT_CANCELLABLE);
                }

                // cancel previous order
                order_status_write(previous_orderhash, OrderStatus::CancelledByNewOrder);
                return Option::Some(previous_orderhash);
            }
            return Option::None;
        }

        /// Creates a listing order.
        fn _create_listing_order(
            ref self: ContractState, order: OrderV1, order_type: OrderType, order_hash: felt252
        ) -> Option<felt252> {
            let token_hash = order.compute_token_hash();
            // Check if there is a previous order and cancel it if needed
            let cancelled_order_hash = self._process_previous_order(token_hash, order.offerer);
            // Write new order with status open
            order_write(order_hash, order_type, order);
            // Associate token_hash to order_hash on the storage
            self.token_listings.write(token_hash, order_hash);
            self
                .emit(
                    OrderPlaced {
                        order_hash: order_hash,
                        order_version: order.get_version(),
                        order_type: order_type,
                        cancelled_order_hash,
                        order: order
                    }
                );
            cancelled_order_hash
        }

        /// Creates an auction order.
        fn _create_auction(
            ref self: ContractState, order: OrderV1, order_type: OrderType, order_hash: felt252
        ) {
            let token_hash = order.compute_token_hash();
            // Check if there is a previous order and cancel it if needed
            let cancelled_order_hash = self._process_previous_order(token_hash, order.offerer);
            /// we create an auction on the storage
            order_write(order_hash, order_type, order);
            self.auctions.write(token_hash, (order_hash, order.end_date, 0));
            self
                .emit(
                    OrderPlaced {
                        order_hash: order_hash,
                        order_version: order.get_version(),
                        order_type: order_type,
                        cancelled_order_hash,
                        order: order,
                    }
                );
        }
        /// Creates an offer order.
        fn _create_offer(
            ref self: ContractState, order: OrderV1, order_type: OrderType, order_hash: felt252
        ) {
            // // Manage auction offer
            // let token_hash = order.compute_token_hash();
            // let (auction_order_hash, auction_end_date) = self.auctions.read(token_hash);
            // if auction_order_hash.is_non_zero() {
            //     let auction_order = self.auction_offers.read(order_hash);
            //     assert(auction_order.is_zero(), 'already existing auction offer');
            //     self.auction_offers.write(order_hash, auction_order_hash);
            // }

            // order_write(order_hash, order);
            
            self
                .emit(
                    OrderPlaced {
                        order_hash: order_hash,
                        order_version: order.get_version(),
                        order_type: order_type,
                        cancelled_order_hash: Option::None,
                        order: order,
                    }
                );
        }
        /// Creates a collection offer order.
        fn _create_collection_offer(
            ref self: ContractState, order: OrderV1, order_type: OrderType, order_hash: felt252
        ) {

            // Manage auction offer
            // let ressource_hash = order.compute_ressource_hash();
            // let (auction_order_hash, auction_end_date) = self.auctions.read(ressource_hash);
            // if auction_order_hash.is_non_zero() {
            //     let auction_order = self.auction_offers.read(order_hash);
            //     assert(auction_order.is_zero(), 'already existing auction offer');
            //     self.auction_offers.write(order_hash, auction_order_hash);
            // }
            // order_write(order_hash, order);

            self
                .emit(
                    OrderPlaced {
                        order_hash: order_hash,
                        order_version: order.get_version(),
                        order_type: order_type,
                        cancelled_order_hash: Option::None,
                        order: order,
                    }
                );
        }
    }
}
