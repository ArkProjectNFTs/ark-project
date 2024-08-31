#[starknet::component]
pub mod OrderbookComponent {
    use ark_common::crypto::typed_data::{OrderSign, TypedDataTrait};
    use core::debug::PrintTrait;
    use ark_common::crypto::signer::{SignInfo, Signer, SignerTrait, SignerValidator};
    use ark_common::protocol::order_types::{
        OrderStatus, OrderTrait, OrderType, CancelInfo, FulfillInfo, ExecutionValidationInfo,
        ExecutionInfo, RouteType
    };
    use core::traits::TryInto;
    use core::result::ResultTrait;
    use core::zeroable::Zeroable;
    use core::option::OptionTrait;
    use core::starknet::event::EventEmitter;
    use core::traits::Into;
    use super::super::interface::{IOrderbook, IOrderbookAction, orderbook_errors};
    use starknet::ContractAddress;
    use starknet::storage::Map;
    use ark_common::protocol::order_v1::OrderV1;
    use ark_common::protocol::order_database::{
        order_read, order_status_read, order_write, order_status_write, order_type_read
    };

    const EXTENSION_TIME_IN_SECONDS: u64 = 600;
    const AUCTION_ACCEPTING_TIME_SECS: u64 = 172800;
    /// Storage struct for the Orderbook component.
    #[storage]
    struct Storage {
        /// Mapping of broker addresses to their whitelisted status.
        /// Represented as felt252, set to 1 if the broker is registered.
        brokers: Map<felt252, felt252>,
        /// Mapping of token_hash to order_hash.
        token_listings: Map<felt252, felt252>,
        /// Mapping of token_hash to auction details (order_hash and end_date, auction_offer_count).
        auctions: Map<felt252, (felt252, u64, u256)>,
        /// Mapping of auction offer order_hash to auction listing order_hash.
        auction_offers: Map<felt252, felt252>,
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

    // must be increased when `OrderExecuted` content change
    const ORDER_EXECUTED_EVENT_VERSION: u8 = 1;
    /// Event for when an order is executed.
    #[derive(Drop, starknet::Event)]
    struct OrderExecuted {
        #[key]
        order_hash: felt252,
        #[key]
        order_status: OrderStatus,
        version: u8,
        transaction_hash: felt252,
        from: ContractAddress,
        to: ContractAddress,
    }

    /// Event for when an order is cancelled.
    #[derive(Drop, starknet::Event)]
    struct OrderCancelled {
        #[key]
        order_hash: felt252,
        #[key]
        reason: felt252,
    }

    /// Event for when an order has been rollbacked to placed.
    #[derive(Drop, starknet::Event)]
    struct RollbackStatus {
        #[key]
        order_hash: felt252,
        #[key]
        reason: felt252
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


    #[embeddable_as(OrderbookImpl)]
    pub impl Orderbook<
        TContractState, +HasComponent<TContractState>, +Drop<TContractState>,
    > of IOrderbook<ComponentState<TContractState>> {
        /// Retrieves the type of an order using its hash.
        /// # View
        fn get_order_type(self: @ComponentState<TContractState>, order_hash: felt252) -> OrderType {
            let order_type_option = order_type_read(order_hash);
            if order_type_option.is_none() {
                panic_with_felt252(orderbook_errors::ORDER_NOT_FOUND);
            }
            order_type_option.unwrap().into()
        }

        /// Retrieves the status of an order using its hash.
        /// # View
        fn get_order_status(
            self: @ComponentState<TContractState>, order_hash: felt252
        ) -> OrderStatus {
            let status = order_status_read(order_hash);
            if status.is_none() {
                panic_with_felt252(orderbook_errors::ORDER_NOT_FOUND);
            }
            status.unwrap().into()
        }

        /// Retrieves the auction end date
        /// # View
        fn get_auction_expiration(
            self: @ComponentState<TContractState>, order_hash: felt252
        ) -> u64 {
            let order = order_read::<OrderV1>(order_hash);
            if (order.is_none()) {
                panic_with_felt252(orderbook_errors::ORDER_NOT_FOUND);
            }
            let token_hash = order.unwrap().compute_token_hash();
            let (_, auction_end_date, _b) = self.auctions.read(token_hash);
            auction_end_date
        }

        /// Retrieves the order using its hash.
        /// # View
        fn get_order(self: @ComponentState<TContractState>, order_hash: felt252) -> OrderV1 {
            let order = order_read(order_hash);
            if (order.is_none()) {
                panic_with_felt252(orderbook_errors::ORDER_NOT_FOUND);
            }
            order.unwrap()
        }

        /// Retrieves the order hash using its token hash.
        /// # View
        fn get_order_hash(self: @ComponentState<TContractState>, token_hash: felt252) -> felt252 {
            let order_hash = self.token_listings.read(token_hash);
            if (order_hash.is_zero()) {
                panic_with_felt252(orderbook_errors::ORDER_NOT_FOUND);
            }
            order_hash
        }
    }

    pub impl OrderbookActionImpl<
        TContractState, +HasComponent<TContractState>
    > of IOrderbookAction<ComponentState<TContractState>> {
        fn validate_order_execution(
            ref self: ComponentState<TContractState>, info: ExecutionValidationInfo
        ) {
            order_status_write(info.order_hash, OrderStatus::Executed);
            let order_status = order_status_read(info.order_hash).unwrap();
            self
                .emit(
                    OrderExecuted {
                        order_hash: info.order_hash,
                        order_status: order_status,
                        transaction_hash: info.transaction_hash,
                        from: info.from,
                        to: info.to,
                        version: ORDER_EXECUTED_EVENT_VERSION,
                    }
                );
        }

        /// Submits and places an order to the orderbook if the order is valid.
        fn create_order(ref self: ComponentState<TContractState>, order: OrderV1) {
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
                    assert(
                        order_status_read(order_hash).is_none(),
                        orderbook_errors::ORDER_ALREADY_EXISTS
                    );
                    let _ = self._create_listing_order(order, order_type, order_hash);
                },
                OrderType::Auction => {
                    assert(
                        order_status_read(order_hash).is_none(),
                        orderbook_errors::ORDER_ALREADY_EXISTS
                    );
                    self._create_auction(order, order_type, order_hash);
                },
                OrderType::Offer => { self._create_offer(order, order_type, order_hash); },
                OrderType::CollectionOffer => {
                    self._create_collection_offer(order, order_type, order_hash);
                },
            };
        }

        fn cancel_order(ref self: ComponentState<TContractState>, cancel_info: CancelInfo) {
            let order_hash = cancel_info.order_hash;
            let order_option = order_read::<OrderV1>(order_hash);
            assert(order_option.is_some(), orderbook_errors::ORDER_NOT_FOUND);
            let order = order_option.unwrap();
            assert(order.offerer == cancel_info.canceller, 'not the same offerrer');
            match order_status_read(order_hash) {
                Option::Some(s) => s,
                Option::None => panic_with_felt252(orderbook_errors::ORDER_NOT_FOUND),
            };
            let block_ts = starknet::get_block_timestamp();
            match order_type_read(order_hash) {
                Option::Some(order_type) => {
                    if order_type == OrderType::Auction {
                        let auction_token_hash = order.compute_token_hash();
                        let (_, auction_end_date, _) = self.auctions.read(auction_token_hash);
                        assert(
                            block_ts <= auction_end_date, orderbook_errors::ORDER_AUCTION_IS_EXPIRED
                        );
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

        fn fulfill_order(
            ref self: ComponentState<TContractState>, fulfill_info: FulfillInfo
        ) -> Option::<ExecutionInfo> {
            let order_hash = fulfill_info.order_hash;
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
                OrderType::Listing => self._fulfill_listing_order(fulfill_info, order),
                OrderType::Auction => self._fulfill_auction_order(fulfill_info, order),
                OrderType::Offer => self._fulfill_offer(fulfill_info, order),
                OrderType::CollectionOffer => self._fulfill_offer(fulfill_info, order),
            }
        }
    }
    // *************************************************************************
    // INTERNAL FUNCTIONS
    // *************************************************************************
    #[generate_trait]
    pub impl InternalImpl<
        TContractState, +HasComponent<TContractState>
    > of InternalTrait<TContractState> {
        /// Fulfill auction order
        ///
        /// # Arguments
        /// * `fulfill_info` - The execution info of the order.
        /// * `order_type` - The type of the order.
        ///
        fn _fulfill_auction_order(
            ref self: ComponentState<TContractState>, fulfill_info: FulfillInfo, order: OrderV1
        ) -> Option<ExecutionInfo> {
            let block_timestamp = starknet::get_block_timestamp();
            assert(
                order.offerer == fulfill_info.fulfiller, orderbook_errors::ORDER_NOT_SAME_OFFERER
            );
            // get auction end date from storage
            let (_, end_date, _) = self.auctions.read(order.compute_token_hash());
            assert(
                end_date + AUCTION_ACCEPTING_TIME_SECS > block_timestamp,
                orderbook_errors::ORDER_EXPIRED
            );

            let related_order_hash = fulfill_info
                .related_order_hash
                .expect(orderbook_errors::ORDER_MISSING_RELATED_ORDER);

            match order_type_read(related_order_hash) {
                Option::Some(order_type) => {
                    assert(
                        order_type == OrderType::Offer || order_type == OrderType::CollectionOffer,
                        orderbook_errors::ORDER_NOT_AN_OFFER
                    );
                },
                Option::None => panic_with_felt252(orderbook_errors::ORDER_NOT_FOUND),
            }

            match order_status_read(related_order_hash) {
                Option::Some(s) => {
                    assert(s == OrderStatus::Open, orderbook_errors::ORDER_NOT_OPEN);
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
                assert(
                    related_offer_auction == fulfill_info.order_hash,
                    orderbook_errors::ORDER_HASH_DOES_NOT_MATCH
                );
            } else {
                assert(related_order.end_date > block_timestamp, orderbook_errors::ORDER_EXPIRED);
            }
            let related_order_token_hash = related_order.compute_token_hash();
            assert(
                related_order_token_hash == order.compute_token_hash(),
                orderbook_errors::ORDER_TOKEN_HASH_DOES_NOT_MATCH
            );
            assert(
                related_order.token_id == order.token_id,
                orderbook_errors::ORDER_TOKEN_ID_DOES_NOT_MATCH
            );

            order_status_write(related_order_hash, OrderStatus::Fulfilled);
            order_status_write(fulfill_info.order_hash, OrderStatus::Fulfilled);
            self
                .emit(
                    OrderFulfilled {
                        order_hash: fulfill_info.order_hash,
                        fulfiller: fulfill_info.fulfiller,
                        related_order_hash: Option::Some(related_order_hash)
                    }
                );

            if order.token_id.is_some() {
                let execute_info = ExecutionInfo {
                    order_hash: order.compute_order_hash(),
                    nft_address: order.token_address,
                    nft_from: order.offerer,
                    nft_to: related_order.offerer,
                    nft_token_id: order.token_id.unwrap(),
                    payment_from: related_order.offerer,
                    payment_to: fulfill_info.fulfiller,
                    payment_amount: related_order.start_amount,
                    payment_currency_address: related_order.currency_address,
                    payment_currency_chain_id: related_order.currency_chain_id,
                    listing_broker_address: order.broker_id,
                    fulfill_broker_address: fulfill_info.fulfill_broker_address
                };
                Option::Some(execute_info)
            } else {
                Option::None
            }
        }

        /// Fulfill offer order
        ///
        /// # Arguments
        /// * `fulfill_info` - The execution info of the order.
        /// * `order` - The order.
        ///
        fn _fulfill_offer(
            ref self: ComponentState<TContractState>, fulfill_info: FulfillInfo, order: OrderV1
        ) -> Option<ExecutionInfo> {
            if order.token_id.is_some() {
                let (auction_order_hash, _, _) = self.auctions.read(order.compute_token_hash());

                assert(auction_order_hash.is_zero(), orderbook_errors::USE_FULFILL_AUCTION);
            }

            assert(fulfill_info.token_id.is_some(), orderbook_errors::ORDER_TOKEN_ID_IS_MISSING);

            let current_date = starknet::get_block_timestamp();
            assert(order.end_date > current_date, orderbook_errors::ORDER_EXPIRED);

            order_status_write(fulfill_info.order_hash, OrderStatus::Fulfilled);
            self
                .emit(
                    OrderFulfilled {
                        order_hash: fulfill_info.order_hash,
                        fulfiller: fulfill_info.fulfiller,
                        related_order_hash: Option::None
                    }
                );

            if order.token_id.is_some() {
                // remove token from listed tokens
                self.token_listings.write(order.compute_token_hash(), 0);
            }
            let execute_info = ExecutionInfo {
                order_hash: order.compute_order_hash(),
                nft_address: order.token_address,
                nft_from: fulfill_info.fulfiller,
                nft_to: order.offerer,
                nft_token_id: fulfill_info.token_id.unwrap(),
                payment_from: order.offerer,
                payment_to: fulfill_info.fulfiller,
                payment_amount: order.start_amount,
                payment_currency_address: order.currency_address,
                payment_currency_chain_id: order.currency_chain_id,
                listing_broker_address: order.broker_id,
                fulfill_broker_address: fulfill_info.fulfill_broker_address
            };
            Option::Some(execute_info)
        }

        /// Fulfill listing order
        ///
        /// # Arguments
        /// * `fulfill_info` - The execution info of the order.
        /// * `order_type` - The type of the order.
        ///
        fn _fulfill_listing_order(
            ref self: ComponentState<TContractState>, fulfill_info: FulfillInfo, order: OrderV1
        ) -> Option<ExecutionInfo> {
            assert(order.offerer != fulfill_info.fulfiller, orderbook_errors::ORDER_SAME_OFFERER);
            assert(
                order.end_date > starknet::get_block_timestamp(), orderbook_errors::ORDER_EXPIRED
            );
            order_status_write(fulfill_info.order_hash, OrderStatus::Fulfilled);
            self
                .emit(
                    OrderFulfilled {
                        order_hash: fulfill_info.order_hash,
                        fulfiller: fulfill_info.fulfiller,
                        related_order_hash: Option::None
                    }
                );

            if order.token_id.is_some() {
                let execute_info = ExecutionInfo {
                    order_hash: order.compute_order_hash(),
                    nft_address: order.token_address,
                    nft_from: order.offerer,
                    nft_to: fulfill_info.fulfiller,
                    nft_token_id: order.token_id.unwrap(),
                    payment_from: fulfill_info.fulfiller,
                    payment_to: order.offerer,
                    payment_amount: order.start_amount,
                    payment_currency_address: order.currency_address,
                    payment_currency_chain_id: order.currency_chain_id,
                    listing_broker_address: order.broker_id,
                    fulfill_broker_address: fulfill_info.fulfill_broker_address
                };
                Option::Some(execute_info)
            } else {
                Option::None
            }
        }

        /// Get order hash from token hash
        ///
        /// # Arguments
        /// * `token_hash` - The token hash of the order.
        ///
        fn _get_order_hash_from_token_hash(
            self: @ComponentState<TContractState>, token_hash: felt252
        ) -> felt252 {
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
            self: @ComponentState<TContractState>, token_hash: felt252
        ) -> Option<(felt252, bool, OrderV1)> {
            let previous_listing_orderhash = self.token_listings.read(token_hash);
            let (previous_auction_orderhash, _, _) = self.auctions.read(token_hash);
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
                previous_orderhash = previous_auction_orderhash;
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
            ref self: ComponentState<TContractState>, token_hash: felt252, offerer: ContractAddress
        ) -> Option<felt252> {
            let previous_order = self._get_previous_order(token_hash);
            if (previous_order.is_some()) {
                let (previous_orderhash, previous_order_is_expired, previous_order) = previous_order
                    .unwrap();
                let previous_order_status = order_status_read(previous_orderhash)
                    .expect('Invalid Order status');
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
            ref self: ComponentState<TContractState>,
            order: OrderV1,
            order_type: OrderType,
            order_hash: felt252,
        ) -> Option<felt252> {
            let token_hash = order.compute_token_hash();
            // revert if order is fulfilled or Open
            let current_order_hash = self.token_listings.read(token_hash);
            if (current_order_hash.is_non_zero()) {
                assert(
                    order_status_read(current_order_hash) != Option::Some(OrderStatus::Fulfilled),
                    orderbook_errors::ORDER_FULFILLED
                );
            }
            let current_order: Option<OrderV1> = order_read(current_order_hash);
            if (current_order.is_some()) {
                let current_order = current_order.unwrap();
                // check if same offerer
                if (current_order.offerer == order.offerer) {
                    // check expiration if order is expired continue
                    assert(
                        current_order.end_date <= starknet::get_block_timestamp(),
                        orderbook_errors::ORDER_ALREADY_EXISTS
                    );
                }
            }

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
            ref self: ComponentState<TContractState>,
            order: OrderV1,
            order_type: OrderType,
            order_hash: felt252
        ) {
            let token_hash = order.compute_token_hash();
            let current_order_hash = self.token_listings.read(token_hash);
            if (current_order_hash.is_non_zero()) {
                assert(
                    order_status_read(current_order_hash) != Option::Some(OrderStatus::Fulfilled),
                    orderbook_errors::ORDER_FULFILLED
                );
            }
            let current_order: Option<OrderV1> = order_read(current_order_hash);
            if (current_order.is_some()) {
                let current_order = current_order.unwrap();
                // check expiration if order is expired continue
                if (current_order.offerer == order.offerer) {
                    assert(
                        current_order.end_date <= starknet::get_block_timestamp(),
                        orderbook_errors::ORDER_ALREADY_EXISTS
                    );
                }
            }
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

        fn _manage_auction_offer(
            ref self: ComponentState<TContractState>, order: OrderV1, order_hash: felt252
        ) {
            let token_hash = order.compute_token_hash();
            let (auction_order_hash, auction_end_date, auction_offer_count) = self
                .auctions
                .read(token_hash);

            let current_block_timestamp = starknet::get_block_timestamp();
            // Determine if the auction end date has passed, indicating that the auction is still
            // ongoing.
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
            ref self: ComponentState<TContractState>,
            order: OrderV1,
            order_type: OrderType,
            order_hash: felt252
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
            ref self: ComponentState<TContractState>,
            order: OrderV1,
            order_type: OrderType,
            order_hash: felt252
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