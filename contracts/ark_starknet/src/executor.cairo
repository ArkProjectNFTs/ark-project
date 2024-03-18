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
    use core::debug::PrintTrait;
    use core::traits::TryInto;
    use core::box::BoxTrait;

    use ark_common::protocol::order_v1::OrderV1;
    use ark_common::crypto::signer::{Signer};
    use starknet::{ContractAddress, ClassHash};

    use ark_common::protocol::order_types::{
        CreateOrderInfo, RouteType, ExecutionInfo, ExecutionValidationInfo
    };
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
        chain_id: felt252
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


    #[external(v0)]
    impl ExecutorImpl of IExecutor<ContractState> {
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

            currency_contract
                .transfer_from(
                    execution_info.payment_from,
                    execution_info.payment_to,
                    execution_info.payment_amount
                );

            let nft_contract = IERC721Dispatcher { contract_address: execution_info.nft_address };
            nft_contract
                .transfer_from(
                    execution_info.nft_from, execution_info.nft_to, execution_info.nft_token_id
                );

            // self._transfer_royalties(execution_info, eth_contract);

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
// #[generate_trait]
// impl InternalFunctions of InternalFunctionsTrait {
//     fn _transfer_royalties(
//         ref self: ContractState, execution_info: ExecutionInfo, eth_contract: IERC20Dispatcher
//     ) {
//         // Royalties distribution
//         let arkchain_fee = self.arkchain_fee.read();
//         let total_fees = execution_info.create_broker_fee
//             + execution_info.fulfill_broker_fee
//             + execution_info.creator_fee
//             + arkchain_fee;
//         assert(execution_info.price < total_fees, 'Invalid price');

//         match execution_info.route {
//             RouteType::Erc20ToErc721 => { // ...
//             },
//             RouteType::Erc721ToErc20 => {
//                 eth_contract
//                     .transfer_from(
//                         execution_info.offerer_address, self.admin_address.read(), arkchain_fee
//                     );
//             // eth_contract.transfer_from(execution_info.offerer_address, self.admin_address.read(), arkchain_fee);
//             },
//         };
//     // eth_contract
//     //     .transfer_from(execution_info.taker_address, execution_info.creator_address, execution_info.creator_fee);

//     // eth_contract
//     //     .transfer_from(
//     //         execution_info.taker_address, execution_info.create_broker_address, execution_info.create_broker_fee
//     //     );

//     // eth_contract
//     //     .transfer_from(
//     //         execution_info.taker_address, execution_info.fulfill_broker_address, execution_info.fulfill_broker_fee
//     //     );

//     // eth_contract.transferFrom(execution_info.taker_address, execution_info.maker_address, execution_info.price);
//     }
// }
}
