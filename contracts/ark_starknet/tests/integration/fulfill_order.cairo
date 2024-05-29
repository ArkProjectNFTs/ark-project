use starknet::{ContractAddress, contract_address_const};

use ark_common::protocol::order_v1::OrderV1;
use ark_common::protocol::order_types::{FulfillInfo, OrderTrait, RouteType};


use ark_starknet::interfaces::{IExecutorDispatcher, IExecutorDispatcherTrait,};

use ark_tokens::erc20::IFreeMintDispatcher as Erc20Dispatcher;
use ark_tokens::erc20::IFreeMintDispatcherTrait as Erc20DispatcherTrait;
use ark_tokens::erc721::IFreeMintDispatcher as Erc721Dispatcher;
use ark_tokens::erc721::IFreeMintDispatcherTrait as Erc721DispatcherTrait;

use snforge_std as snf;
use snf::{ContractClass, ContractClassTrait, CheatTarget};

use super::super::common::setup::{setup, setup_order};

fn create_order_erc20_to_erc721(
    executor_address: ContractAddress,
    erc20_address: ContractAddress,
    nft_address: ContractAddress,
    token_id: u256
) -> felt252 {
    let offerer = contract_address_const::<'offerer'>();
    let start_amount = 10_000_000;

    Erc20Dispatcher { contract_address: erc20_address }.mint(offerer, start_amount);

    let mut order = setup_order(erc20_address, nft_address);
    order.offerer = offerer;
    order.start_amount = start_amount;
    order.token_id = Option::Some(token_id);

    snf::start_prank(CheatTarget::One(executor_address), offerer);
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
    snf::stop_prank(CheatTarget::One(executor_address));

    order.compute_order_hash()
}

fn create_order_erc721_to_erc20(
    executor_address: ContractAddress,
    erc20_address: ContractAddress,
    nft_address: ContractAddress,
    start_amount: u256
) -> felt252 {
    let offerer = contract_address_const::<'offerer'>();

    let token_id: u256 = Erc721Dispatcher { contract_address: nft_address }
        .get_current_token_id()
        .into();
    Erc721Dispatcher { contract_address: nft_address }.mint(offerer, 'base_uri');

    let mut order = setup_order(erc20_address, nft_address);
    order.route = RouteType::Erc721ToErc20.into();
    order.offerer = offerer;
    order.token_id = Option::Some(token_id);
    order.start_amount = start_amount;

    snf::start_prank(CheatTarget::One(executor_address), offerer);
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
    snf::stop_prank(CheatTarget::One(executor_address));

    order.compute_order_hash()
}

#[test]
fn test_fulfill_order_erc20_to_erc721_ok() {
    let (executor_address, erc20_address, nft_address) = setup();
    let fulfiller = contract_address_const::<'fulfiller'>();

    let token_id: u256 = Erc721Dispatcher { contract_address: nft_address }
        .get_current_token_id()
        .into();
    Erc721Dispatcher { contract_address: nft_address }.mint(fulfiller, 'base_uri');
    let order_hash = create_order_erc20_to_erc721(
        executor_address, erc20_address, nft_address, token_id
    );

    let fulfill_info = FulfillInfo {
        order_hash: order_hash,
        related_order_hash: Option::None,
        fulfiller: fulfiller,
        token_chain_id: 'SN_MAIN',
        token_address: nft_address,
        token_id: Option::Some(1),
        fulfill_broker_address: contract_address_const::<'broker'>()
    };

    snf::start_prank(CheatTarget::One(executor_address), fulfiller);
    IExecutorDispatcher { contract_address: executor_address }.fulfill_order(fulfill_info);
    snf::stop_prank(CheatTarget::One(executor_address));
}

#[test]
fn test_fulfill_order_erc721_to_erc20_ok() {
    let (executor_address, erc20_address, nft_address) = setup();
    let fulfiller = contract_address_const::<'fulfiller'>();
    let start_amount = 10_000_000;

    let order_hash = create_order_erc721_to_erc20(
        executor_address, erc20_address, nft_address, start_amount
    );

    Erc20Dispatcher { contract_address: erc20_address }.mint(fulfiller, start_amount);

    let fulfill_info = FulfillInfo {
        order_hash: order_hash,
        related_order_hash: Option::None,
        fulfiller: fulfiller,
        token_chain_id: 'SN_MAIN',
        token_address: nft_address,
        token_id: Option::Some(1),
        fulfill_broker_address: contract_address_const::<'broker'>()
    };

    snf::start_prank(CheatTarget::One(executor_address), fulfiller);
    IExecutorDispatcher { contract_address: executor_address }.fulfill_order(fulfill_info);
    snf::stop_prank(CheatTarget::One(executor_address));
}

#[test]
#[should_panic(expected: ("Caller is not the fulfiller",))]
fn test_fulfill_order_fulfiller_shall_be_caller() {
    let (executor_address, _erc20_address, nft_address) = setup();
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

#[test]
#[should_panic(expected: ("Fulfiller does not own enough ERC20 tokens",))]
fn test_fulfill_order_fulfiller_not_enough_erc20_token() {
    let (executor_address, erc20_address, nft_address) = setup();
    let fulfiller = contract_address_const::<'fulfiller'>();
    let start_amount = 10_000_000;

    let order_hash = create_order_erc721_to_erc20(
        executor_address, erc20_address, nft_address, start_amount
    );

    Erc20Dispatcher { contract_address: erc20_address }.mint(fulfiller, start_amount - 100);

    let fulfill_info = FulfillInfo {
        order_hash: order_hash,
        related_order_hash: Option::None,
        fulfiller: fulfiller,
        token_chain_id: 'SN_MAIN',
        token_address: nft_address,
        token_id: Option::Some(1),
        fulfill_broker_address: contract_address_const::<'broker'>()
    };

    snf::start_prank(CheatTarget::One(executor_address), fulfiller);
    IExecutorDispatcher { contract_address: executor_address }.fulfill_order(fulfill_info);
    snf::stop_prank(CheatTarget::One(executor_address));
}

#[test]
#[should_panic(expected: ("Fulfiller does not own the specified ERC721 token",))]
fn test_fulfill_order_fulfiller_not_owner() {
    let (executor_address, erc20_address, nft_address) = setup();
    let fulfiller = contract_address_const::<'fulfiller'>();
    let other = contract_address_const::<'other'>();

    let token_id: u256 = Erc721Dispatcher { contract_address: nft_address }
        .get_current_token_id()
        .into();
    Erc721Dispatcher { contract_address: nft_address }.mint(other, 'base_uri');
    let order_hash = create_order_erc20_to_erc721(
        executor_address, erc20_address, nft_address, token_id
    );

    let fulfill_info = FulfillInfo {
        order_hash: order_hash,
        related_order_hash: Option::None,
        fulfiller: fulfiller,
        token_chain_id: 'SN_MAIN',
        token_address: nft_address,
        token_id: Option::Some(1),
        fulfill_broker_address: contract_address_const::<'broker'>()
    };

    snf::start_prank(CheatTarget::One(executor_address), fulfiller);
    IExecutorDispatcher { contract_address: executor_address }.fulfill_order(fulfill_info);
    snf::stop_prank(CheatTarget::One(executor_address));
}

#[test]
#[should_panic(expected: ("Order not found",))]
fn test_fulfill_order_not_found() {
    let (executor_address, _erc20_address, nft_address) = setup();
    let fulfiller = contract_address_const::<'fulfiller'>();

    let fulfill_info = FulfillInfo {
        order_hash: 0x1234,
        related_order_hash: Option::None,
        fulfiller: fulfiller,
        token_chain_id: 'SN_MAIN',
        token_address: nft_address,
        token_id: Option::Some(1),
        fulfill_broker_address: contract_address_const::<'broker'>()
    };

    snf::start_prank(CheatTarget::One(executor_address), fulfiller);
    IExecutorDispatcher { contract_address: executor_address }.fulfill_order(fulfill_info);
    snf::stop_prank(CheatTarget::One(executor_address));
}
