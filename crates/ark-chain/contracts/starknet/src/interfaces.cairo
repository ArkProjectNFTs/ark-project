//! Interfaces for arkchain operator.
use starknet::{ClassHash, ContractAddress};
use ark_operator::string::LongString;

// TODO: this must be shared in a package for both arkchain and starknet
// contracts.
#[derive(Drop, Serde)]
struct OrderExecute {
    order_hash: felt252,
    nft_address: ContractAddress,
    token_id: u256,
    maker_address: ContractAddress,
    taker_address: ContractAddress,
    price: u256
}

#[starknet::interface]
trait IOperator<T> {
    fn execute_buy_order(ref self: T, order: OrderExecute);
    fn update_sequencer_address(ref self: T, sequencer_address: ContractAddress);
    fn update_orderbook_address(ref self: T, orderbook_address: ContractAddress);
    fn update_messaging_address(ref self: T, msger_address: ContractAddress);
    fn update_eth_address(ref self: T, eth_address: ContractAddress);
}

// TODO: this must be reorganized once we have some components
// for re-usability.
#[starknet::interface]
trait IERC<T> {
    fn transferFrom(ref self: T, from: ContractAddress, to: ContractAddress, token_id: u256);
    fn transfer_from(ref self: T, from: ContractAddress, to: ContractAddress, token_id: u256);
}

#[starknet::interface]
trait IUpgradable<T> {
    fn upgrade(ref self: T, class_hash: ClassHash);
    fn update_admin_address(ref self: T, admin_address: ContractAddress);
}
