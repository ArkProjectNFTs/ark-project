use core::serde::Serde;

use starknet::ContractAddress;

use ark_common::protocol::order_v1::OrderV1;
use ark_common::protocol::order_types::RouteType;


#[derive(Drop, Copy, Debug, Serde, starknet::Store)]
struct OrderInfo {
    route: RouteType,
    // Contract address of the currency used on Starknet for the transfer.
    currency_address: ContractAddress,
    // The token contract address.
    token_address: ContractAddress,
    // The token id.
    // TODO: how to store Option<u256> ?
    token_id: u256,
    // in wei. --> 10 | 10 | 10 |
    start_amount: u256,
    //
    offerer: ContractAddress,
}

impl OrderV1IntoOrderInfo of Into<OrderV1, OrderInfo> {
    fn into(self: OrderV1) -> OrderInfo {
        let token_id = match self.token_id {
            Option::Some(token_id) => token_id,
            Option::None => 0,
        };
        OrderInfo {
            route: self.route,
            currency_address: self.currency_address,
            token_address: self.token_address,
            token_id: token_id,
            start_amount: self.start_amount,
            offerer: self.offerer,
        }
    }
}
//! Executor contract on Starknet for arkchain.
//!
//! This contract is responsible of executing the orders
//! and move the assets accordingly.
//! Once done, an event is emitted to confirm at the arkchain
//! that the order was executed correctly.
//!
//! In order to communicate with the Arkchain, this contract
//! uses the `appchain_messaging` contract dispatcher to send
//! messages.

#[starknet::contract]
mod executor {
    use core::zeroable::Zeroable;
    use core::traits::Into;
    use starknet::contract_address_to_felt252;
    use starknet::get_contract_address;

    use core::debug::PrintTrait;
    use core::traits::TryInto;
    use core::box::BoxTrait;
    use starknet::{ContractAddress, ClassHash};
    use ark_common::protocol::order_types::{
        RouteType, ExecutionInfo, ExecutionValidationInfo, FulfillInfo, CreateOrderInfo,
        FulfillOrderInfo, CancelOrderInfo, CancelInfo,
    };
    use ark_common::protocol::order_v1::{OrderV1, OrderTraitOrderV1};
    use ark_starknet::interfaces::{IExecutor, IUpgradable};
    use ark_starknet::appchain_messaging::{
        IAppchainMessagingDispatcher, IAppchainMessagingDispatcherTrait,
    };
    use openzeppelin::token::{
        erc721::interface::{IERC721, IERC721Dispatcher, IERC721DispatcherTrait},
        erc20::interface::{IERC20, IERC20Dispatcher, IERC20DispatcherTrait}
    };

    use super::{OrderInfo, OrderV1IntoOrderInfo};

    #[storage]
    struct Storage {
        admin_address: ContractAddress,
        arkchain_orderbook_address: ContractAddress,
        eth_contract_address: ContractAddress,
        messaging_address: ContractAddress,
        arkchain_fee: u256,
        chain_id: felt252,
        broker_fees: LegacyMap<ContractAddress, u256>,
        ark_fees: u256,
        // order hash -> OrderInfo
        orders: LegacyMap<felt252, OrderInfo>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        OrderExecuted: OrderExecuted,
    }

    #[derive(Drop, starknet::Event)]
    struct OrderExecuted {
        #[key]
        order_hash: felt252,
        #[key]
        transaction_hash: felt252,
        block_timestamp: u64
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        admin_address: ContractAddress,
        eth_contract_address: ContractAddress,
        messaging_address: ContractAddress,
        chain_id: felt252
    ) {
        self.admin_address.write(admin_address);
        self.eth_contract_address.write(eth_contract_address);
        self.messaging_address.write(messaging_address);
        self.chain_id.write(chain_id);
    }

    #[abi(embed_v0)]
    impl ExecutorImpl of IExecutor<ContractState> {
        fn set_broker_fees(ref self: ContractState, broker_address: ContractAddress, fee: u256) {
            self.broker_fees.write(broker_address, fee);
        }

        fn get_broker_fees(ref self: ContractState, broker_address: ContractAddress) -> u256 {
            self.broker_fees.read(broker_address)
        }

        fn set_ark_fees(ref self: ContractState, fee: u256) {
            assert(
                starknet::get_caller_address() == self.admin_address.read(),
                'Unauthorized admin address'
            );
            self.ark_fees.write(fee);
        }

        fn get_ark_fees(ref self: ContractState) -> u256 {
            self.ark_fees.read()
        }

        fn get_messaging_address(ref self: ContractState) -> ContractAddress {
            self.messaging_address.read()
        }

        fn get_orderbook_address(ref self: ContractState) -> ContractAddress {
            self.arkchain_orderbook_address.read()
        }

        fn update_arkchain_orderbook_address(
            ref self: ContractState, orderbook_address: ContractAddress
        ) {
            assert(
                starknet::get_caller_address() == self.admin_address.read(),
                'Unauthorized admin address'
            );

            self.arkchain_orderbook_address.write(orderbook_address);
        }

        fn update_messaging_address(ref self: ContractState, msger_address: ContractAddress) {
            assert(
                starknet::get_caller_address() == self.admin_address.read(),
                'Unauthorized admin address'
            );

            self.messaging_address.write(msger_address);
        }

        fn update_eth_address(ref self: ContractState, eth_address: ContractAddress) {
            assert(
                starknet::get_caller_address() == self.admin_address.read(),
                'Unauthorized admin address'
            );

            self.eth_contract_address.write(eth_address);
        }

        fn update_orderbook_address(ref self: ContractState, orderbook_address: ContractAddress) {
            assert(
                starknet::get_caller_address() == self.admin_address.read(),
                'Unauthorized admin address'
            );

            self.arkchain_orderbook_address.write(orderbook_address);
        }

        fn update_arkchain_fee(ref self: ContractState, arkchain_fee: u256) {
            assert(
                starknet::get_caller_address() == self.admin_address.read(),
                'Unauthorized admin address'
            );

            self.arkchain_fee.write(arkchain_fee);
        }

        fn update_admin_address(ref self: ContractState, admin_address: ContractAddress) {
            assert(
                starknet::get_caller_address() == self.admin_address.read(),
                'Unauthorized admin address'
            );

            self.admin_address.write(admin_address);
        }

        fn cancel_order(ref self: ContractState, cancelInfo: CancelInfo) {
            let messaging = IAppchainMessagingDispatcher {
                contract_address: self.messaging_address.read()
            };

            let vinfo = CancelOrderInfo { cancelInfo: cancelInfo.clone() };

            let mut vinfo_buf = array![];
            Serde::serialize(@vinfo, ref vinfo_buf);

            messaging
                .send_message_to_appchain(
                    self.arkchain_orderbook_address.read(),
                    selector!("cancel_order_from_l2"),
                    vinfo_buf.span(),
                );
        }

        fn create_order(ref self: ContractState, order: OrderV1) {
            let messaging = IAppchainMessagingDispatcher {
                contract_address: self.messaging_address.read()
            };

            let vinfo = CreateOrderInfo { order: order.clone() };
            _verify_create_order(@self, @vinfo);

            let order_hash = order.compute_order_hash();
            let order_info = order.into();
            self.orders.write(order_hash, order_info);

            let mut vinfo_buf = array![];
            Serde::serialize(@vinfo, ref vinfo_buf);

            messaging
                .send_message_to_appchain(
                    self.arkchain_orderbook_address.read(),
                    selector!("create_order_from_l2"),
                    vinfo_buf.span(),
                );
        }

        fn fulfill_order(ref self: ContractState, fulfillInfo: FulfillInfo) {
            let messaging = IAppchainMessagingDispatcher {
                contract_address: self.messaging_address.read()
            };

            let vinfo = FulfillOrderInfo { fulfillInfo: fulfillInfo.clone() };

            _verify_fulfill_order(@self, @vinfo);

            let mut vinfo_buf = array![];
            Serde::serialize(@vinfo, ref vinfo_buf);

            messaging
                .send_message_to_appchain(
                    self.arkchain_orderbook_address.read(),
                    selector!("fulfill_order_from_l2"),
                    vinfo_buf.span(),
                );
        }

        fn execute_order(ref self: ContractState, execution_info: ExecutionInfo) {
            // assert(
            //     starknet::get_caller_address() == self.messaging_address.read(),
            //     'Invalid msg sender'
            // );

            // Check if execution_info.currency_contract_address is whitelisted

            assert(
                execution_info.payment_currency_chain_id == self.chain_id.read(),
                'Chain ID is not SN_MAIN'
            );

            let currency_contract = IERC20Dispatcher {
                contract_address: execution_info.payment_currency_address.try_into().unwrap()
            };

            let fulfill_broker_fees = self.broker_fees.read(execution_info.fulfill_broker_address);
            let listing_broker_fees = self.broker_fees.read(execution_info.listing_broker_address);
            let ark_fees = self.ark_fees.read();
            let creator_fees = 1;

            let seller_amount = execution_info.payment_amount
                * (100 - fulfill_broker_fees - listing_broker_fees - creator_fees - ark_fees)
                / 100;
            // split the fees
            currency_contract
                .transfer_from(
                    execution_info.payment_from,
                    execution_info.fulfill_broker_address,
                    execution_info.payment_amount * (fulfill_broker_fees / 100)
                );

            currency_contract
                .transfer_from(
                    execution_info.payment_from,
                    execution_info.listing_broker_address,
                    execution_info.payment_amount * (listing_broker_fees / 100)
                );

            // finally transfer to the seller
            currency_contract
                .transfer_from(
                    execution_info.payment_from, execution_info.payment_to, seller_amount
                );

            let nft_contract = IERC721Dispatcher { contract_address: execution_info.nft_address };
            nft_contract
                .transfer_from(
                    execution_info.nft_from, execution_info.nft_to, execution_info.nft_token_id
                );

            let tx_info = starknet::get_tx_info().unbox();
            let transaction_hash = tx_info.transaction_hash;
            let block_timestamp = starknet::info::get_block_timestamp();

            self
                .emit(
                    OrderExecuted {
                        order_hash: execution_info.order_hash, transaction_hash, block_timestamp,
                    }
                );

            let messaging = IAppchainMessagingDispatcher {
                contract_address: self.messaging_address.read()
            };

            let vinfo = ExecutionValidationInfo {
                order_hash: execution_info.order_hash,
                transaction_hash,
                starknet_block_timestamp: block_timestamp,
            };

            let mut vinfo_buf = array![];
            Serde::serialize(@vinfo, ref vinfo_buf);

            messaging
                .send_message_to_appchain(
                    self.arkchain_orderbook_address.read(),
                    selector!("validate_order_execution"),
                    vinfo_buf.span(),
                );
        }
    }

    #[abi(embed_v0)]
    impl ExecutorUpgradeImpl of IUpgradable<ContractState> {
        fn upgrade(ref self: ContractState, class_hash: ClassHash) {
            assert(
                starknet::get_caller_address() == self.admin_address.read(),
                'Unauthorized replace class'
            );

            match starknet::replace_class_syscall(class_hash) {
                Result::Ok(_) => (), // emit event
                Result::Err(revert_reason) => panic(revert_reason),
            };
        }
    }

    fn _verify_create_order(self: @ContractState, vinfo: @CreateOrderInfo) {
        let order = vinfo.order;
        let caller = starknet::get_caller_address();
        assert!(caller == *(order.offerer), "Caller is not the offerer");

        match order.route {
            RouteType::Erc20ToErc721 => {
                assert!(
                    _check_erc20_amount(
                        order.currency_address, *(order.start_amount), order.offerer
                    ),
                    "Offerer does not own enough ERC20 tokens"
                );
            },
            RouteType::Erc721ToErc20 => {
                match order.token_id {
                    Option::Some(token_id) => {
                        assert!(
                            _check_erc721_owner(order.token_address, *token_id, order.offerer),
                            "Offerer does not own the specified ERC721 token"
                        );
                    },
                    Option::None => panic!("Invalid token id"),
                }
            },
        }
    }

    fn _verify_fulfill_order(self: @ContractState, vinfo: @FulfillOrderInfo) {
        let fulfill_info = vinfo.fulfillInfo;
        let caller = starknet::get_caller_address();

        assert!(caller == *(fulfill_info.fulfiller), "Caller is not the fulfiller");

        let order_info = self.orders.read(*fulfill_info.order_hash);
        // default value for ContractAddress is zero
        // and an order's currency address shall not be zero
        if order_info.currency_address.is_zero() {
            panic!("Order not found");
        }
        assert!(
            order_info.offerer != *(fulfill_info.fulfiller),
            "Orderer and fulfiller must be different"
        );

        let contract_address = get_contract_address();

        match order_info.route {
            RouteType::Erc20ToErc721 => {
                assert!(
                    _check_erc721_owner(@order_info.token_address, order_info.token_id, @caller),
                    "Fulfiller does not own the specified ERC721 token"
                );
                assert!(
                    _check_erc721_approval(
                        @order_info.token_address, order_info.token_id, @caller, @contract_address,
                    ),
                    "Executor not approved"
                );
                assert!(
                    _check_erc20_amount(
                        @order_info.currency_address, order_info.start_amount, @order_info.offerer
                    ),
                    "Offerer does not own enough ERC20 tokens"
                );
                assert!(
                    _check_erc20_allowance(
                        @order_info.currency_address,
                        order_info.start_amount,
                        @order_info.offerer,
                        @contract_address,
                    ),
                    "Executor allowance is not enough"
                )
            },
            RouteType::Erc721ToErc20 => {
                assert!(
                    _check_erc20_amount(
                        @order_info.currency_address, order_info.start_amount, @caller
                    ),
                    "Fulfiller does not own enough ERC20 tokens"
                );
                assert!(
                    _check_erc20_allowance(
                        @order_info.currency_address,
                        order_info.start_amount,
                        @caller,
                        @get_contract_address()
                    ),
                    "Executor allowance is not enough"
                );
                assert!(
                    _check_erc721_owner(
                        @order_info.token_address, order_info.token_id, @order_info.offerer
                    ),
                    "Offerer does not own the specified ERC721 token"
                );
                assert!(
                    _check_erc721_approval(
                        @order_info.token_address,
                        order_info.token_id,
                        @order_info.offerer,
                        @contract_address,
                    ),
                    "Executor not approved"
                );
            }
        }
    }

    fn _check_erc20_amount(
        token_address: @ContractAddress, amount: u256, user: @ContractAddress
    ) -> bool {
        let contract = IERC20Dispatcher { contract_address: *token_address };
        amount <= contract.balance_of(*user)
    }

    fn _check_erc20_allowance(
        token_address: @ContractAddress,
        amount: u256,
        owner: @ContractAddress,
        spender: @ContractAddress
    ) -> bool {
        let contract = IERC20Dispatcher { contract_address: *token_address };
        amount <= contract.allowance(*owner, *spender)
    }

    fn _check_erc721_owner(
        token_address: @ContractAddress, token_id: u256, user: @ContractAddress
    ) -> bool {
        let contract = IERC721Dispatcher { contract_address: *token_address };
        contract.owner_of(token_id) == *user
    }

    fn _check_erc721_approval(
        token_address: @ContractAddress,
        token_id: u256,
        owner: @ContractAddress,
        operator: @ContractAddress
    ) -> bool {
        let contract = IERC721Dispatcher { contract_address: *token_address };
        contract.is_approved_for_all(*owner, *operator)
            || (contract.get_approved(token_id) == *operator)
    }
}
