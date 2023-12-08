//! Interfaces for arkchain operator.
use starknet::{ClassHash, ContractAddress};
use ark_common::protocol::order_types::ExecutionInfo;

#[starknet::interface]
trait IExecutor<T> {
    fn execute_order(ref self: T, execution_info: ExecutionInfo);
    fn update_admin_address(ref self: T, admin_address: ContractAddress);
    fn update_arkchain_fee(ref self: T, arkchain_fee: u256);
    fn update_orderbook_address(ref self: T, orderbook_address: ContractAddress);
    fn update_eth_address(ref self: T, eth_address: ContractAddress);
    fn update_messaging_address(ref self: T, msger_address: ContractAddress);
    fn get_test_address(ref self: T) -> ContractAddress;
    fn get_messaging_address(ref self: T) -> ContractAddress;
    fn get_orderbook_address(ref self: T) -> ContractAddress;
}

#[starknet::interface]
trait IUpgradable<T> {
    fn upgrade(ref self: T, class_hash: ClassHash);
}
