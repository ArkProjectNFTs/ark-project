use starknet::{ContractAddress, contract_address_const};

use openzeppelin::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
use openzeppelin::token::erc721::interface::{IERC721Dispatcher, IERC721DispatcherTrait};
use ark_common::protocol::order_v1::OrderV1;
use ark_common::protocol::order_types::{CancelInfo, OrderTrait, RouteType};


use ark_starknet::interfaces::{
    IExecutorDispatcher, IExecutorDispatcherTrait, IMaintenanceDispatcher,
    IMaintenanceDispatcherTrait
};

use ark_tokens::erc20::{IFreeMintDispatcher, IFreeMintDispatcherTrait};
use ark_tokens::erc721::IFreeMintDispatcher as Erc721Dispatcher;
use ark_tokens::erc721::IFreeMintDispatcherTrait as Erc721DispatcherTrait;

use snforge_std as snf;
use snf::{ContractClass, ContractClassTrait, CheatTarget};

use super::super::common::setup::{setup, setup_order};

fn create_offer_order(
    executor_address: ContractAddress,
    erc20_address: ContractAddress,
    nft_address: ContractAddress,
    token_id: u256
) -> (felt252, ContractAddress, u256) {
    let offerer = contract_address_const::<'offerer'>();
    let start_amount = 10_000_000;

    IFreeMintDispatcher { contract_address: erc20_address }.mint(offerer, start_amount);

    let mut order = setup_order(erc20_address, nft_address);
    order.offerer = offerer;
    order.start_amount = start_amount;
    order.token_id = Option::Some(token_id);

    snf::start_prank(CheatTarget::One(executor_address), offerer);
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
    snf::stop_prank(CheatTarget::One(executor_address));

    (order.compute_order_hash(), offerer, start_amount)
}

#[test]
fn test_cancel_offer_order() {
    let (executor_address, erc20_address, nft_address) = setup();
    let token_id = 10;

    let (order_hash, offerer, _start_amount) = create_offer_order(
        executor_address, erc20_address, nft_address, token_id
    );

    let cancel_info = CancelInfo {
        order_hash,
        canceller: offerer,
        token_chain_id: 'SN_MAIN',
        token_address: nft_address,
        token_id: Option::Some(token_id),
    };

    snf::start_prank(CheatTarget::One(executor_address), offerer);
    IExecutorDispatcher { contract_address: executor_address }.cancel_order(cancel_info);
    snf::stop_prank(CheatTarget::One(executor_address));
}

#[test]
#[should_panic(expected: ("Caller is not the canceller",))]
fn test_cancel_offer_order_only_offerer() {
    let (executor_address, erc20_address, nft_address) = setup();
    let token_id = 10;
    let other = contract_address_const::<'other'>();

    let (order_hash, offerer, _start_amount) = create_offer_order(
        executor_address, erc20_address, nft_address, token_id
    );

    let cancel_info = CancelInfo {
        order_hash,
        canceller: offerer,
        token_chain_id: 'SN_MAIN',
        token_address: nft_address,
        token_id: Option::Some(token_id),
    };

    snf::start_prank(CheatTarget::One(executor_address), other);
    IExecutorDispatcher { contract_address: executor_address }.cancel_order(cancel_info);
    snf::stop_prank(CheatTarget::One(executor_address));
}

#[test]
#[should_panic(expected: ("Canceller is not the offerer",))]
fn test_cancel_offer_order_offerer_is_not_the_canceller() {
    let (executor_address, erc20_address, nft_address) = setup();
    let token_id = 10;
    let other = contract_address_const::<'other'>();

    let (order_hash, _offerer, _start_amount) = create_offer_order(
        executor_address, erc20_address, nft_address, token_id
    );

    let cancel_info = CancelInfo {
        order_hash,
        canceller: other,
        token_chain_id: 'SN_MAIN',
        token_address: nft_address,
        token_id: Option::Some(token_id),
    };

    snf::start_prank(CheatTarget::One(executor_address), other);
    IExecutorDispatcher { contract_address: executor_address }.cancel_order(cancel_info);
    snf::stop_prank(CheatTarget::One(executor_address));
}
