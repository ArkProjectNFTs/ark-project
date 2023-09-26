//! Operator contract on Starknet for arkchain.
//!
//! This contract is responsible of executing the orders
//! and move the assets accordingly.
//! Once done, an event is emitted to confirm at the arkchain
//! that the order can be finalized.

/// Operator contract.
#[starknet::contract]
mod operator {
    use starknet::{ContractAddress, ClassHash};
    use ark_operator::interfaces::{
        IOperator, IERCDispatcher, IERCDispatcherTrait, IUpgradable, OrderExecute
    };

    use ark_operator::appchain_messaging::{
        IAppchainMessagingDispatcher, IAppchainMessagingDispatcherTrait,
    };

    #[storage]
    struct Storage {
        admin_address: ContractAddress,
        arkchain_sequencer_address: ContractAddress,
        arkchain_orderbook_address: ContractAddress,
        eth_contract_address: ContractAddress,
        messaging_address: ContractAddress,
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
        block_timestamp: u64
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        admin_address: ContractAddress,
        // The account of starknet sending TX from the arkchain sequencer.
        arkchain_sequencer_address: ContractAddress,
        // The orderbook contract on the arkchain, which will receive messages.
        arkchain_orderbook_address: ContractAddress,
        eth_contract_address: ContractAddress,
        messaging_address: ContractAddress,
    ) {
        self.admin_address.write(admin_address);
        self.eth_contract_address.write(eth_contract_address);
        self.arkchain_sequencer_address.write(arkchain_sequencer_address);
        self.arkchain_orderbook_address.write(arkchain_orderbook_address);
        self.messaging_address.write(messaging_address);
    }


    #[external(v0)]
    impl OperatorImpl of IOperator<ContractState> {

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

        fn update_sequencer_address(ref self: ContractState, sequencer_address: ContractAddress) {
            assert(
                starknet::get_caller_address() == self.admin_address.read(),
                'Unauthorized admin address'
            );

            self.arkchain_sequencer_address.write(sequencer_address);
        }

        fn update_orderbook_address(ref self: ContractState, orderbook_address: ContractAddress) {
            assert(
                starknet::get_caller_address() == self.admin_address.read(),
                'Unauthorized admin address'
            );

            self.arkchain_orderbook_address.write(orderbook_address);
        }

        fn execute_buy_order(ref self: ContractState, order: OrderExecute) {
            assert(
                starknet::get_caller_address() == self.arkchain_sequencer_address.read(),
                'Invalid msg sender'
            );

            let nft_contract = IERCDispatcher { contract_address: order.nft_address };
            nft_contract.transfer_from(order.maker_address, order.taker_address, order.token_id);

            let eth_contract = IERCDispatcher {
                contract_address: self.eth_contract_address.read()
            };

            eth_contract.transferFrom(order.taker_address, order.maker_address, order.price);

            let block_timestamp = starknet::info::get_block_timestamp();
            self.emit(OrderExecuted {
                order_hash: order.order_hash,
                block_timestamp,
            });

            let messaging = IAppchainMessagingDispatcher {
                contract_address: self.messaging_address.read()
            };

            messaging.send_message_to_appchain(
                self.arkchain_orderbook_address.read(),
                // finalize_order_buy selector
                0x00dc783263b4080fde14fad025c03978a991c3b64149cea7bb5e707b082a302f,
                array![order.order_hash, order.taker_address.into()].span(),
            );
        }
    }

    #[external(v0)]
    impl OperatorUpgradeImpl of IUpgradable<ContractState> {
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

        fn update_admin_address(ref self: ContractState, admin_address: ContractAddress) {
            assert(
                starknet::get_caller_address() == self.admin_address.read(),
                'Unauthorized admin address'
            );

            self.admin_address.write(admin_address);
        }
    }
}
