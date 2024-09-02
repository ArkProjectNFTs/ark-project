use ark_common::protocol::order_types::ExecutionInfo;
use ark_common::protocol::order_types::OrderV1;
use ark_common::protocol::order_types::{FulfillInfo, CancelInfo};
use ark_oz::erc2981::FeesRatio;
//! Interfaces for arkchain operator.
use starknet::{ClassHash, ContractAddress};

#[derive(Serde, Drop)]
struct FeesAmount {
    fulfill_broker: u256,
    listing_broker: u256,
    ark: u256,
    creator: u256,
}

#[starknet::interface]
trait IExecutor<T> {
    fn fulfill_order(ref self: T, fulfillInfo: FulfillInfo);
    fn cancel_order(ref self: T, cancelInfo: CancelInfo);
    fn create_order(ref self: T, order: OrderV1);
    // fn execute_order(ref self: T, execution_info: ExecutionInfo);
    fn update_admin_address(ref self: T, admin_address: ContractAddress);
    fn update_orderbook_address(ref self: T, orderbook_address: ContractAddress);
    fn update_eth_address(ref self: T, eth_address: ContractAddress);
    fn update_messaging_address(ref self: T, msger_address: ContractAddress);
    fn get_messaging_address(self: @T) -> ContractAddress;
    fn get_orderbook_address(self: @T) -> ContractAddress;
    fn update_arkchain_orderbook_address(ref self: T, orderbook_address: ContractAddress);
    fn set_broker_fees(ref self: T, fees_ratio: FeesRatio);
    fn get_broker_fees(self: @T, broker_address: ContractAddress) -> FeesRatio;
    fn set_ark_fees(ref self: T, fees_ratio: FeesRatio);
    fn get_ark_fees(self: @T) -> FeesRatio;

    fn get_default_creator_fees(self: @T) -> (ContractAddress, FeesRatio);
    fn set_default_creator_fees(ref self: T, receiver: ContractAddress, fees_ratio: FeesRatio);
    fn get_collection_creator_fees(
        self: @T, nft_address: ContractAddress
    ) -> (ContractAddress, FeesRatio);
    fn set_collection_creator_fees(
        ref self: T, nft_address: ContractAddress, receiver: ContractAddress, fees_ratio: FeesRatio
    );

    fn get_fees_amount(
        self: @T,
        fulfill_broker: ContractAddress,
        listing_broker: ContractAddress,
        nft_address: ContractAddress,
        nft_token_id: u256,
        payment_amount: u256
    ) -> FeesAmount;
}

#[starknet::interface]
trait IUpgradable<T> {
    fn upgrade(ref self: T, class_hash: ClassHash);
}

#[starknet::interface]
trait IMaintenance<T> {
    fn is_in_maintenance(self: @T) -> bool;
    fn set_maintenance_mode(ref self: T, on: bool);
}
