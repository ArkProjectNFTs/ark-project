//! Interfaces for arkchain operator.
use starknet::{ClassHash, ContractAddress};
use ark_operator::string::LongString;

#[derive(Drop, Serde, Copy)]
enum RouteType {
    Erc20ToErc721,
    Erc721ToErc20
}

// TODO: this must be shared in a package for both arkchain and starknet
// contracts.
#[derive(Drop, Serde, Copy)]
struct ExecutionInfo {
    route: RouteType,
    order_hash: felt252,
    token_address: ContractAddress,
    token_id: u256,
    quantity: u256,
    offerer_address: ContractAddress,
    fulfiller_address: ContractAddress,
    price: u256,
    creator_address: ContractAddress,
    creator_fee: u256,
    create_broker_address: ContractAddress,
    create_broker_fee: u256,
    fulfill_broker_address: ContractAddress,
    fulfill_broker_fee: u256
}

#[starknet::interface]
trait IOperator<T> {
    fn execute_order(ref self: T, execution_info: ExecutionInfo);
    fn update_admin_address(ref self: T, admin_address: ContractAddress);
    fn update_arkchain_fee(ref self: T, arkchain_fee: u256);
    fn update_arkchain_sequencer_starknet_address(
        ref self: T, sequencer_starknet_address: ContractAddress
    );
    fn update_orderbook_address(ref self: T, orderbook_address: ContractAddress);
    fn update_eth_address(ref self: T, eth_address: ContractAddress);
    fn update_messaging_address(ref self: T, msger_address: ContractAddress);
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
}
