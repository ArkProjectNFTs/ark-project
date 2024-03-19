//! Interfaces for arkchain operator.
use starknet::{ClassHash, ContractAddress};
use ark_common::protocol::order_types::{ExecutionInfo};
use ark_common::protocol::order_types::OrderV1;
use ark_common::protocol::order_types::{FulfillInfo};
use super::route_types::SwapInfos;

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
}

#[starknet::interface]
trait IUpgradable<T> {
    fn upgrade(ref self: T, class_hash: ClassHash);
}

#[starknet::interface]
trait Irouter<T> {
    fn execute_swap(ref self: T, swap_info: SwapInfos);
}
