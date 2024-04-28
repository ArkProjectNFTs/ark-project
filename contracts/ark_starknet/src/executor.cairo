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
    use starknet::contract_address_to_felt252;
    use core::debug::PrintTrait;
    use core::traits::TryInto;
    use core::box::BoxTrait;
    use starknet::{ContractAddress, ClassHash};
    use ark_common::protocol::order_types::{RouteType, ExecutionInfo, ExecutionValidationInfo, FulfillInfo, CreateOrderInfo, FulfillOrderInfo};
    use ark_common::protocol::order_v1::OrderV1;
    use ark_starknet::interfaces::{IExecutor, IUpgradable};
    use ark_starknet::appchain_messaging::{
        IAppchainMessagingDispatcher, IAppchainMessagingDispatcherTrait,
    };
    use openzeppelin::token::{
        erc721::interface::{IERC721, IERC721Dispatcher, IERC721DispatcherTrait},
        erc20::interface::{IERC20, IERC20Dispatcher, IERC20DispatcherTrait}
    };

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

        fn create_order(ref self: ContractState, order: OrderV1) {
            let messaging = IAppchainMessagingDispatcher {
                contract_address: self.messaging_address.read()
            };

            let vinfo = CreateOrderInfo { order: order.clone() };

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
}
