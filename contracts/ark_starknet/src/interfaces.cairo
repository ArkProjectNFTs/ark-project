//! Interfaces for arkchain operator.
use starknet::{ClassHash, ContractAddress};
use ark_common::protocol::order_types::ExecutionInfo;
use ark_common::protocol::order_types::OrderV1;
use ark_common::protocol::order_types::{FulfillInfo};

#[starknet::interface]
trait IExecutor<T> {
    fn fulfill_order(ref self: T, fulfillInfo: FulfillInfo);
    fn create_order(ref self: T, order: OrderV1);
    fn execute_order(ref self: T, execution_info: ExecutionInfo);
    fn update_admin_address(ref self: T, admin_address: ContractAddress);
    fn update_arkchain_fee(ref self: T, arkchain_fee: u256);
    fn update_orderbook_address(ref self: T, orderbook_address: ContractAddress);
    fn update_eth_address(ref self: T, eth_address: ContractAddress);
    fn update_messaging_address(ref self: T, msger_address: ContractAddress);
    fn get_messaging_address(ref self: T) -> ContractAddress;
    fn get_orderbook_address(ref self: T) -> ContractAddress;
    fn update_arkchain_orderbook_address(ref self: T, orderbook_address: ContractAddress);
    fn set_broker_fees(ref self: T, broker_address: ContractAddress, fee: u256);
    fn get_broker_fees(ref self: T, broker_address: ContractAddress) -> u256;
    fn set_ark_fees(ref self: T, fee: u256);
    fn get_ark_fees(ref self: T) -> u256;
}

#[starknet::interface]
trait IUpgradable<T> {
    fn upgrade(ref self: T, class_hash: ClassHash);
}
