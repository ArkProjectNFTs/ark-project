//! # Orderbook Contract
//!
//! This module defines the structure and functionalities of an orderbook contract. It includes
//! trait definitions, error handling, contract storage, events, constructors, L1 handlers, external
//! functions, and internal functions. The primary functionalities include broker whitelisting,
//! order management (creation, cancellation, fulfillment), and order queries.

use ark_common::protocol::order_types::{FulfillInfo, OrderType, CancelInfo, OrderStatus};
use ark_common::crypto::signer::{SignInfo, Signer, SignerValidator};
use ark_common::protocol::order_v1::OrderV1;
use starknet::ContractAddress;

#[starknet::interface]
trait OrderbookAdmin<T> {
    /// Upgrades the contract to a new version.
    ///
    /// # Arguments
    /// * `class_hash` - The class hash of the new contract version.
    fn upgrade(ref self: T, class_hash: starknet::ClassHash);

    fn update_starknet_executor_address(ref self: T, value: starknet::ContractAddress);
}


/// StarkNet smart contract module for an order book.
#[starknet::contract]
mod orderbook {
    use ark_common::crypto::typed_data::{OrderSign, TypedDataTrait};
    use core::debug::PrintTrait;
    use ark_common::crypto::signer::{SignInfo, Signer, SignerTrait, SignerValidator};
    use ark_common::protocol::order_types::{
        OrderStatus, OrderTrait, OrderType, CancelInfo, FulfillInfo, ExecutionValidationInfo,
        ExecutionInfo, RouteType
    };
    use ark_common::crypto::hash::{serialized_hash};
    use core::traits::TryInto;
    use core::result::ResultTrait;
    use core::zeroable::Zeroable;
    use core::option::OptionTrait;
    // use core::starknet::event::EventEmitter;
    use core::traits::Into;
    use super::OrderbookAdmin;
    use super::super::interface::orderbook_errors;
    use super::super::component::OrderbookComponent;

    use starknet::ContractAddress;
    use starknet::storage::Map;
    use ark_common::protocol::order_v1::OrderV1;
    use ark_common::protocol::order_database::{
        order_read, order_status_read, order_write, order_status_write, order_type_read
    };

    const EXTENSION_TIME_IN_SECONDS: u64 = 600;
    const AUCTION_ACCEPTING_TIME_SECS: u64 = 172800;

    component!(path: OrderbookComponent, storage: orderbook, event: OrderbookEvent);

    /// Storage struct for the Orderbook contract.
    #[storage]
    struct Storage {
        /// Order database.
        /// Mapping of token hashes to order data.
        /// Order database [token_hash, order_data]
        /// see ark_orderbook:order::database for more details.
        chain_id: felt252,
        /// Administrator address of the order book.
        admin: ContractAddress,
        /// The address of the StarkNet executor contract.
        starknet_executor_address: ContractAddress,
        #[substorage(v0)]
        orderbook: OrderbookComponent::Storage,
    }

    // *************************************************************************
    // EVENTS
    // *************************************************************************

    /// Events emitted by the Orderbook contract.
    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        OrderbookEvent: OrderbookComponent::Event,
        Upgraded: Upgraded,
    }

    #[derive(Drop, starknet::Event)]
    struct Upgraded {
        class_hash: starknet::ClassHash,
    }

    #[abi(embed_v0)]
    impl OrderbookImpl = OrderbookComponent::OrderbookImpl<ContractState>;
    impl OrderbookActionImpl = OrderbookComponent::OrderbookActionImpl<ContractState>;
    impl OrderbookInternalImpl = OrderbookComponent::InternalImpl<ContractState>;

    // *************************************************************************
    // CONSTRUCTOR
    // *************************************************************************
    #[constructor]
    fn constructor(ref self: ContractState, admin: ContractAddress, chain_id: felt252) {
        self.admin.write(admin);
        self.chain_id.write(chain_id);
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
    fn validate_order_execution(
        ref self: ContractState, _from_address: felt252, info: ExecutionValidationInfo
    ) {
        // Solis already checks that ALL the messages are coming from the executor contract.
        // TODO: anyway, it can be useful to have an extra check here.
        self.orderbook.validate_order_execution(info);
    }

    /// Update status : only from solis.
    // #[l1_handler]
    // fn rollback_status_order(
    //     ref self: ContractState, _from_address: felt252, order_hash: felt252, reason: felt252
    // ) {
    //     order_status_write(order_hash, OrderStatus::Open);
    //     self.emit(RollbackStatus { order_hash, reason: reason.into() });
    // }

    #[l1_handler]
    fn create_order_from_l2(ref self: ContractState, _from_address: felt252, order: OrderV1) {
        self.orderbook.create_order(order);
    }

    #[l1_handler]
    fn cancel_order_from_l2(
        ref self: ContractState, _from_address: felt252, cancelInfo: CancelInfo
    ) {
        self.orderbook.cancel_order(cancelInfo);
    }

    #[l1_handler]
    fn fulfill_order_from_l2(
        ref self: ContractState, _from_address: felt252, fulfillInfo: FulfillInfo
    ) {
        self.orderbook.fulfill_order(fulfillInfo);
    }

    #[abi(embed_v0)]
    impl OrderbookAdminImpl of OrderbookAdmin<ContractState> {
        fn upgrade(ref self: ContractState, class_hash: starknet::ClassHash) {
            assert(
                starknet::get_caller_address() == self.admin.read(), 'Unauthorized replace class'
            );

            match starknet::replace_class_syscall(class_hash) {
                Result::Ok(_) => self.emit(Upgraded { class_hash }),
                Result::Err(revert_reason) => panic(revert_reason),
            };
        }

        fn update_starknet_executor_address(ref self: ContractState, value: ContractAddress) {
            assert(starknet::get_caller_address() == self.admin.read(), 'Unauthorized update');
            self.starknet_executor_address.write(value);
        }
    }

    // *************************************************************************
    // INTERNAL FUNCTIONS FOR TESTING PURPOSE
    // *************************************************************************
    #[generate_trait]
    impl InternalFunctions of InternalFunctionsTrait {
        fn _cancel_order(ref self: ContractState, cancel_info: CancelInfo) {
            self.orderbook.cancel_order(cancel_info);
        }

        /// Submits and places an order to the orderbook if the order is valid.
        fn _create_order(ref self: ContractState, order: OrderV1) {
            self.orderbook.create_order(order);
        }

        fn _fulfill_order(ref self: ContractState, fulfill_info: FulfillInfo) {
            self.orderbook.fulfill_order(fulfill_info);
        }

        /// Fulfill auction order
        ///
        /// # Arguments
        /// * `fulfill_info` - The execution info of the order.
        /// * `order_type` - The type of the order.
        ///
        fn _fulfill_auction_order(
            ref self: ContractState, fulfill_info: FulfillInfo, order: OrderV1
        ) {
            match self.orderbook._fulfill_auction_order(fulfill_info, order) {
                Option::Some(execute_info) => {
                    let execute_order_selector = selector!("execute_order");
                    let starknet_executor_address: ContractAddress = self
                        .starknet_executor_address
                        .read();

                    let mut buf: Array<felt252> = array![
                        starknet_executor_address.into(), execute_order_selector
                    ];
                    execute_info.serialize(ref buf);
                    starknet::send_message_to_l1_syscall('EXE', buf.span()).unwrap();
                },
                Option::None => ()
            }
        }

        /// Fulfill offer order
        ///
        /// # Arguments
        /// * `fulfill_info` - The execution info of the order.
        /// * `order` - The order.
        ///
        fn _fulfill_offer(ref self: ContractState, fulfill_info: FulfillInfo, order: OrderV1) {
            match self.orderbook._fulfill_offer(fulfill_info, order) {
                Option::Some(execute_info) => {
                    let execute_order_selector = selector!("execute_order");
                    let starknet_executor_address: ContractAddress = self
                        .starknet_executor_address
                        .read();

                    let mut buf: Array<felt252> = array![
                        starknet_executor_address.into(), execute_order_selector
                    ];
                    execute_info.serialize(ref buf);
                    starknet::send_message_to_l1_syscall('EXE', buf.span()).unwrap();
                },
                Option::None => ()
            }
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
            match self.orderbook._fulfill_listing_order(fulfill_info, order) {
                Option::Some(execute_info) => {
                    let execute_order_selector = selector!("execute_order");
                    let starknet_executor_address: ContractAddress = self
                        .starknet_executor_address
                        .read();

                    let mut buf: Array<felt252> = array![
                        starknet_executor_address.into(), execute_order_selector
                    ];

                    execute_info.serialize(ref buf);
                    starknet::send_message_to_l1_syscall('EXE', buf.span()).unwrap();
                },
                Option::None => {}
            }
        }

        /// Get order hash from token hash
        ///
        /// # Arguments
        /// * `token_hash` - The token hash of the order.
        ///
        fn _get_order_hash_from_token_hash(self: @ContractState, token_hash: felt252) -> felt252 {
            self.orderbook._get_order_hash_from_token_hash(token_hash)
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
            self.orderbook._get_previous_order(token_hash)
        }

        /// Process previous order
        ///
        /// # Arguments
        /// * `token_hash` - The token hash of the order.
        ///
        fn _process_previous_order(
            ref self: ContractState, token_hash: felt252, offerer: ContractAddress
        ) -> Option<felt252> {
            self.orderbook._process_previous_order(token_hash, offerer)
        }

        /// Creates a listing order.
        fn _create_listing_order(
            ref self: ContractState, order: OrderV1, order_type: OrderType, order_hash: felt252,
        ) -> Option<felt252> {
            self.orderbook._create_listing_order(order, order_type, order_hash)
        }

        /// Creates an auction order.
        fn _create_auction(
            ref self: ContractState, order: OrderV1, order_type: OrderType, order_hash: felt252
        ) {
            self.orderbook._create_auction(order, order_type, order_hash)
        }

        fn _manage_auction_offer(ref self: ContractState, order: OrderV1, order_hash: felt252) {
            self.orderbook._manage_auction_offer(order, order_hash)
        }

        /// Creates an offer order.
        fn _create_offer(
            ref self: ContractState, order: OrderV1, order_type: OrderType, order_hash: felt252
        ) {
            self.orderbook._create_offer(order, order_type, order_hash)
        }

        /// Creates a collection offer order.
        fn _create_collection_offer(
            ref self: ContractState, order: OrderV1, order_type: OrderType, order_hash: felt252
        ) {
            self.orderbook._create_collection_offer(order, order_type, order_hash)
        }
    }
}
