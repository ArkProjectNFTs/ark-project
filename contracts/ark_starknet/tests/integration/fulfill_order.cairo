use starknet::{ContractAddress, contract_address_const};

use ark_common::protocol::order_v1::OrderV1;
use ark_common::protocol::order_types::{FulfillInfo, RouteType};


use ark_starknet::interfaces::{IExecutorDispatcher, IExecutorDispatcherTrait,};

use ark_tokens::erc20::IFreeMintDispatcher as Erc20Dispatcher;
use ark_tokens::erc20::IFreeMintDispatcherTrait as Erc20DispatcherTrait;
use ark_tokens::erc721::IFreeMintDispatcher as Erc721Dispatcher;
use ark_tokens::erc721::IFreeMintDispatcherTrait as Erc721DispatcherTrait;

use snforge_std as snf;
use snf::{ContractClass, ContractClassTrait, CheatTarget};

use super::super::common::setup::{setup, setup_order};

#[test]
#[should_panic(expected: ("Caller is not the fulfiller",))]
fn test_fulfill_order_fulfiller_shall_be_caller() {
    let (executor_address, erc20_address, nft_address) = setup();
    let caller = contract_address_const::<'caller'>();
    let fulfiller = contract_address_const::<'fulfiller'>();

    let fulfill_info = FulfillInfo {
        order_hash: 0x123,
        related_order_hash: Option::None,
        fulfiller: fulfiller,
        token_chain_id: 'SN_MAIN',
        token_address: nft_address,
        token_id: Option::Some(1),
        fulfill_broker_address: contract_address_const::<'broker'>()
    };

    snf::start_prank(CheatTarget::One(executor_address), caller);
    IExecutorDispatcher { contract_address: executor_address }.fulfill_order(fulfill_info);
    snf::stop_prank(CheatTarget::One(executor_address));
}
