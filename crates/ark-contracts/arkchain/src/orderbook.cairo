//! # Orderbook Contract
//! 
//! This module defines the structure and functionalities of an orderbook contract. It includes
//! trait definitions, error handling, contract storage, events, constructors, L1 handlers, external functions, 
//! and internal functions. The primary functionalities include broker whitelisting, order management 
//! (creation, cancellation, fulfillment), and order queries.

use arkchain::order::types::{FulfillInfo, OrderType, CancelInfo, OrderStatus};
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
    /// * `cancel_info` - information about the order to be cancelled.
    /// * `sign_info` - The signing information associated with the order cancellation.
    fn cancel_order(ref self: T, cancel_info: CancelInfo, signer: Signer);

    /// Fulfils an existing order in the orderbook.
    ///
    /// # Arguments
    ///
    /// * `order_hash` - The order to be fulfil.
    /// * `sign_info` - The signing information associated with the order fulfillment.
    fn fulfill_order(ref self: T, fulfill_info: FulfillInfo, signer: Signer);

    /// Retrieves the type of an order using its hash.
    ///
    /// # Arguments
    /// * `order_hash` - The order hash of order.
    fn get_order_type(self: @T, order_hash: felt252) -> OrderType;

    /// Retrieves the status of an order using its hash.
    ///
    /// # Arguments
    /// * `order_hash` - The order hash of order.
    fn get_order_status(self: @T, order_hash: felt252) -> felt252;

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
    const ORDER_NOT_FULFILLABLE: felt252 = 'OB: order not fulfillable';
    const ORDER_NOT_FOUND: felt252 = 'OB: order not found';
    const ORDER_FULFILLED: felt252 = 'OB: order fulfilled';
    const ORDER_NOT_CANCELLABLE: felt252 = 'OB: order not cancellable';
    const ORDER_EXPIRED: felt252 = 'OB: order expired';
    const ORDER_SAME_OFFERER: felt252 = 'OB: order has same offerer';
    const ORDER_NOT_SAME_OFFERER: felt252 = 'OB: order has not same offerer';
    const OFFER_ALREADY_EXISTS: felt252 = 'OB: offer already exists';
    const ORDER_IS_EXPIRED: felt252 = 'OB: order is expired';
    const AUCTION_IS_EXPIRED: felt252 = 'OB: auction is expired';
}

/// StarkNet smart contract module for an order book.
#[starknet::contract]
mod orderbook {
    use arkchain::crypto::signer::SignerTrait;
    use core::traits::TryInto;
    use core::result::ResultTrait;
    use core::zeroable::Zeroable;
    use core::option::OptionTrait;
    use core::starknet::event::EventEmitter;
    use core::traits::Into;
    use super::{orderbook_errors, Orderbook};
    use starknet::ContractAddress;
    use arkchain::order::types::{OrderTrait, OrderType, CancelInfo, FulfillInfo, FulfillmentInfo};
    use arkchain::order::order_v1::OrderV1;
    use arkchain::order::database::{
        order_read, order_status_read, order_write, order_status_write, order_type_read
    };
    use arkchain::crypto::signer::{SignInfo, Signer, SignerValidator};
    use arkchain::order::types::OrderStatus;
    use arkchain::crypto::hash::{starknet_keccak, serialized_hash};

    use debug::PrintTrait;

    const EXTENSION_TIME_IN_SECONDS: u64 = 600;

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
    // info: ExecutionInfo,
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
        fn get_order_type(self: @ContractState, order_hash: felt252) -> OrderType {
            let order_type_option = order_type_read(order_hash);
            if order_type_option.is_none() {
                panic_with_felt252(orderbook_errors::ORDER_NOT_FOUND);
            }
            order_type_option.unwrap().into()
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

        /// Retrieves the auction end date
        /// # View
        fn get_auction_expiration(self: @ContractState, order_hash: felt252) -> u64 {
            let order = order_read::<OrderV1>(order_hash);
            if (order.is_none()) {
                panic_with_felt252(orderbook_errors::ORDER_NOT_FOUND);
            }
            let token_hash = order.unwrap().compute_token_hash();
            let (_, auction_end_date, _) = self.auctions.read(token_hash);
            auction_end_date
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
            let user_pubkey = SignerValidator::verify(order_hash, signer);
            let block_ts = starknet::get_block_timestamp();
            let validation = order.validate_common_data(block_ts);
            if validation.is_err() {
                panic_with_felt252(validation.unwrap_err().into());
            }
            let order_type = order
                .validate_order_type()
                .expect(orderbook_errors::ORDER_INVALID_DATA);
            let order_hash = order.compute_order_hash();
            assert(order_status_read(order_hash).is_none(), orderbook_errors::ORDER_ALREADY_EXISTS);
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
            self.order_signers.write(order_hash, user_pubkey);
        }

        fn cancel_order(ref self: ContractState, cancel_info: CancelInfo, signer: Signer) {
            let mut generated_signer = signer.clone();
            generated_signer.set_public_key(self.order_signers.read(cancel_info.order_hash));
            SignerValidator::verify(cancel_info.order_hash, generated_signer);

            // Check if order exists

            let order_hash = cancel_info.order_hash;
            let order_option = order_read::<OrderV1>(order_hash);
            assert(order_option.is_some(), orderbook_errors::ORDER_NOT_FOUND);
            let order = order_option.unwrap();

            assert(order.offerer == cancel_info.canceller, 'not the same offerrer'); // TODO

            // Check order status

            let status = match order_status_read(order_hash) {
                Option::Some(s) => s,
                Option::None => panic_with_felt252(orderbook_errors::ORDER_NOT_FOUND),
            };

            // Check expiration date
            let block_ts = starknet::get_block_timestamp();

            // Check the order type
            match order_type_read(order_hash) {
                Option::Some(order_type) => {
                    if order_type == OrderType::Auction {
                        let auction_token_hash = order.compute_token_hash();
                        let (auction_order_hash, auction_end_date, auction_offer_count) = self
                            .auctions
                            .read(auction_token_hash);

                        assert(block_ts <= auction_end_date, orderbook_errors::AUCTION_IS_EXPIRED);
                        self.auctions.write(auction_token_hash, (0, 0, 0));
                    } else {
                        assert(block_ts < order.end_date, orderbook_errors::ORDER_IS_EXPIRED);
                        if order_type == OrderType::Listing {
                            self.token_listings.write(order.compute_token_hash(), 0);
                        }
                    }
                },
                Option::None => panic_with_felt252(orderbook_errors::ORDER_NOT_FOUND),
            };

            // Cancel order
            order_status_write(order_hash, OrderStatus::CancelledUser);
            self.emit(OrderCancelled { order_hash, reason: OrderStatus::CancelledUser.into() });
        }

        fn fulfill_order(ref self: ContractState, fulfill_info: FulfillInfo, signer: Signer) {
            let order_hash = fulfill_info.order_hash;
            let execution_hash = serialized_hash(fulfill_info);
            SignerValidator::verify(execution_hash, signer);
            let order: OrderV1 = match order_read(order_hash) {
                Option::Some(o) => o,
                Option::None => panic_with_felt252(orderbook_errors::ORDER_NOT_FOUND),
            };
            let status = match order_status_read(order_hash) {
                Option::Some(s) => s,
                Option::None => panic_with_felt252(orderbook_errors::ORDER_NOT_FOUND),
            };
            assert(status == OrderStatus::Open, orderbook_errors::ORDER_NOT_FULFILLABLE);
            let order_type = match order_type_read(order_hash) {
                Option::Some(s) => s,
                Option::None => panic_with_felt252(orderbook_errors::ORDER_NOT_FOUND),
            };
            match order_type {
                OrderType::Listing => { self._fulfill_listing_order(fulfill_info, order); },
                OrderType::Auction => { self._fulfill_auction_order(fulfill_info, order) },
                OrderType::Offer => { panic_with_felt252('Offer not implemented'); },
                OrderType::CollectionOffer => {
                    panic_with_felt252('CollectionOffer not implemented');
                },
            }
        }
    }

    // *************************************************************************
    // INTERNAL FUNCTIONS
    // *************************************************************************
    #[generate_trait]
    impl InternalFunctions of InternalFunctionsTrait {
        /// Fulfill auction order
        ///
        /// # Arguments
        /// * `fulfill_info` - The execution info of the order.
        /// * `order_type` - The type of the order.
        ///
        fn _fulfill_auction_order(
            ref self: ContractState, fulfill_info: FulfillInfo, order: OrderV1
        ) {
            assert(
                order.offerer == fulfill_info.fulfiller, orderbook_errors::ORDER_NOT_SAME_OFFERER
            );
            let AUCTION_ACCEPTING_TIME: u64 = 86400;
            assert(
                order.end_date + AUCTION_ACCEPTING_TIME > starknet::get_block_timestamp(),
                orderbook_errors::ORDER_EXPIRED
            );
            let related_order_hash = fulfill_info
                .related_order_hash
                .expect(orderbook_errors::ORDER_NOT_FOUND);
            match order_type_read(related_order_hash) {
                Option::Some(order_type) => {
                    assert(
                        order_type == OrderType::Offer || order_type == OrderType::CollectionOffer,
                        orderbook_errors::ORDER_NOT_FULFILLABLE
                    );
                },
                Option::None => panic_with_felt252(orderbook_errors::ORDER_NOT_FOUND),
            }
            let related_order_status = match order_status_read(related_order_hash) {
                Option::Some(s) => {
                    assert(s == OrderStatus::Open, orderbook_errors::ORDER_NOT_FULFILLABLE);
                    s
                },
                Option::None => panic_with_felt252(orderbook_errors::ORDER_NOT_FOUND),
            };
            let related_order = match order_read::<OrderV1>(related_order_hash) {
                Option::Some(o) => o,
                Option::None => panic_with_felt252(orderbook_errors::ORDER_NOT_FOUND),
            };
            let related_offer_auction = self.auction_offers.read(related_order_hash);
            if related_offer_auction.is_non_zero() {
                // order is related to auction so we need to check if it match the auction order
                assert(
                    related_offer_auction == fulfill_info.order_hash, 'order_hash does not match'
                );
            } else {// order is not related to auction so we can fulfill it but before we need to check its expiration date
                assert(
                    related_order.end_date > starknet::get_block_timestamp(),
                    orderbook_errors::ORDER_EXPIRED
                );
            }
            order_status_write(fulfill_info.related_order_hash.unwrap(), OrderStatus::Fulfilled);
            order_status_write(fulfill_info.order_hash, OrderStatus::Fulfilled);
            self
                .emit(
                    OrderFulfilled {
                        order_hash: fulfill_info.order_hash, fulfiller: fulfill_info.fulfiller
                    }
                );
        }

        /// Fulfill listing order
        ///
        /// # Arguments
        /// * `fulfill_info` - The execution info of the order.
        /// * `order_type` - The type of the order.
        ///
        fn _fulfill_listing_order(
            ref self: ContractState, fulfill_info: FulfillInfo, order: OrderV1
        ) {
            assert(order.offerer != fulfill_info.fulfiller, orderbook_errors::ORDER_SAME_OFFERER);
            assert(
                order.end_date > starknet::get_block_timestamp(), orderbook_errors::ORDER_EXPIRED
            );
            order_status_write(fulfill_info.order_hash, OrderStatus::Fulfilled);
            self
                .emit(
                    OrderFulfilled {
                        order_hash: fulfill_info.order_hash, fulfiller: fulfill_info.fulfiller
                    }
                );
        }

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
            if (previous_order.is_some()) {
                let (previous_orderhash, previous_order_is_expired, previous_order) = previous_order
                    .unwrap();
                let previous_order_status = order_status_read(previous_orderhash)
                    .expect('Invalid Order status');
                let previous_order_type = order_type_read(previous_orderhash)
                    .expect('Invalid Order type');
                assert(
                    previous_order_status != OrderStatus::Fulfilled,
                    orderbook_errors::ORDER_FULFILLED
                );
                if (previous_order.offerer == offerer) {
                    assert(previous_order_is_expired, orderbook_errors::ORDER_NOT_CANCELLABLE);
                }
                order_status_write(previous_orderhash, OrderStatus::CancelledByNewOrder);
                return Option::Some(previous_orderhash);
            }
            return Option::None;
        }

        /// Creates a listing order.
        fn _create_listing_order(
            ref self: ContractState, order: OrderV1, order_type: OrderType, order_hash: felt252,
        ) -> Option<felt252> {
            let token_hash = order.compute_token_hash();
            let cancelled_order_hash = self._process_previous_order(token_hash, order.offerer);
            order_write(order_hash, order_type, order);
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
            let cancelled_order_hash = self._process_previous_order(token_hash, order.offerer);
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

        fn _manage_auction_offer(ref self: ContractState, order: OrderV1, order_hash: felt252) {
            let token_hash = order.compute_token_hash();
            let (auction_order_hash, auction_end_date, auction_offer_count) = self
                .auctions
                .read(token_hash);

            let current_block_timestamp = starknet::get_block_timestamp();
            // Determine if the auction end date has passed, indicating that the auction is still ongoing.
            let auction_is_pending = current_block_timestamp < auction_end_date;

            if auction_is_pending {
                // If the auction is still pending, record the new offer by linking it to the 
                // auction order hash in the 'auction_offers' mapping.
                self.auction_offers.write(order_hash, auction_order_hash);

                if auction_end_date - current_block_timestamp < EXTENSION_TIME_IN_SECONDS {
                    // Increment the number of offers for this auction and extend the auction 
                    // end date by the predefined extension time to allow for additional offers.
                    self
                        .auctions
                        .write(
                            token_hash,
                            (
                                auction_order_hash,
                                auction_end_date + EXTENSION_TIME_IN_SECONDS,
                                auction_offer_count + 1
                            )
                        );
                } else {
                    self
                        .auctions
                        .write(
                            token_hash,
                            (auction_order_hash, auction_end_date, auction_offer_count + 1)
                        );
                }
            }
        }

        /// Creates an offer order.
        fn _create_offer(
            ref self: ContractState, order: OrderV1, order_type: OrderType, order_hash: felt252
        ) {
            self._manage_auction_offer(order, order_hash);
            order_write(order_hash, order_type, order);
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
            order_write(order_hash, order_type, order);
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
