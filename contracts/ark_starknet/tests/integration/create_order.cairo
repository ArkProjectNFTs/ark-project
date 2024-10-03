use ark_common::protocol::order_types::RouteType;

use ark_common::protocol::order_v1::OrderV1;


use ark_starknet::interfaces::{
    IExecutorDispatcher, IExecutorDispatcherTrait, IMaintenanceDispatcher,
    IMaintenanceDispatcherTrait
};
use ark_tokens::erc1155::IFreeMintDispatcher as Erc1155Dispatcher;
use ark_tokens::erc1155::IFreeMintDispatcherTrait as Erc1155DispatcherTrait;

use ark_tokens::erc20::IFreeMintDispatcher as Erc20Dispatcher;
use ark_tokens::erc20::IFreeMintDispatcherTrait as Erc20DispatcherTrait;
use ark_tokens::erc721::IFreeMintDispatcher as Erc721Dispatcher;
use ark_tokens::erc721::IFreeMintDispatcherTrait as Erc721DispatcherTrait;

use snforge_std::{cheat_caller_address, CheatSpan};
use starknet::{ContractAddress, contract_address_const};

use super::super::common::setup::{setup, setup_order, setup_erc1155, setup_order_erc1155};

//
// ERC 721
//

#[test]
fn test_create_order_erc20_to_erc721_ok() {
    let (executor_address, erc20_address, nft_address) = setup();
    let offerer = contract_address_const::<'offerer'>();
    let start_amount = 10_000_000;

    Erc20Dispatcher { contract_address: erc20_address }.mint(offerer, start_amount);

    let mut order = setup_order(erc20_address, nft_address);
    order.offerer = offerer;
    order.start_amount = start_amount;

    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
}

#[test]
fn test_create_order_erc721_to_erc20_ok() {
    let (executor_address, erc20_address, nft_address) = setup();
    let offerer = contract_address_const::<'offerer'>();

    let token_id: u256 = Erc721Dispatcher { contract_address: nft_address }
        .get_current_token_id()
        .into();
    Erc721Dispatcher { contract_address: nft_address }.mint(offerer, 'base_uri');

    let mut order = setup_order(erc20_address, nft_address);
    order.route = RouteType::Erc721ToErc20.into();
    order.offerer = offerer;
    order.token_id = Option::Some(token_id);

    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
}


#[test]
#[should_panic(expected: "Caller is not the offerer")]
fn test_create_order_offerer_shall_be_caller() {
    let (executor_address, erc20_address, nft_address) = setup();
    let offerer = contract_address_const::<'offerer'>();
    let caller = contract_address_const::<'caller'>();

    let mut order = setup_order(erc20_address, nft_address);
    order.offerer = offerer;

    cheat_caller_address(executor_address, caller, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
}

#[test]
#[should_panic(expected: "Offerer does not own enough ERC20 tokens")]
fn test_create_order_offerer_not_enough_erc20_tokens() {
    let (executor_address, erc20_address, nft_address) = setup();
    let offerer = contract_address_const::<'offerer'>();
    let start_amount = 10_000_000;
    let minted = 10_000;

    Erc20Dispatcher { contract_address: erc20_address }.mint(offerer, minted);

    let mut order = setup_order(erc20_address, nft_address);
    order.offerer = offerer;
    order.start_amount = start_amount;

    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
}

#[test]
#[should_panic(expected: "Offerer does not own the specified ERC721 token")]
fn test_create_order_offerer_not_own_ec721_token() {
    let (executor_address, erc20_address, nft_address) = setup();
    let offerer = contract_address_const::<'offerer'>();
    let other = contract_address_const::<'other'>();

    let token_id: u256 = Erc721Dispatcher { contract_address: nft_address }
        .get_current_token_id()
        .into();
    Erc721Dispatcher { contract_address: nft_address }.mint(other, 'base_uri');

    let mut order = setup_order(erc20_address, nft_address);
    order.route = RouteType::Erc721ToErc20.into();
    order.offerer = offerer;
    order.token_id = Option::Some(token_id);

    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
}

#[test]
#[should_panic(expected: 'Executor not enabled')]
fn test_create_order_erc20_to_erc721_disabled() {
    let (executor_address, erc20_address, nft_address) = setup();
    let admin = contract_address_const::<'admin'>();
    let offerer = contract_address_const::<'offerer'>();
    let start_amount = 10_000_000;

    Erc20Dispatcher { contract_address: erc20_address }.mint(offerer, start_amount);

    let mut order = setup_order(erc20_address, nft_address);
    order.offerer = offerer;
    order.start_amount = start_amount;

    cheat_caller_address(executor_address, admin, CheatSpan::TargetCalls(1));
    IMaintenanceDispatcher { contract_address: executor_address }.set_maintenance_mode(true);

    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
}

#[test]
#[should_panic(expected: 'Executor not enabled')]
fn test_create_order_erc721_to_erc20_disabled() {
    let (executor_address, erc20_address, nft_address) = setup();
    let admin = contract_address_const::<'admin'>();
    let offerer = contract_address_const::<'offerer'>();

    let token_id: u256 = Erc721Dispatcher { contract_address: nft_address }
        .get_current_token_id()
        .into();
    Erc721Dispatcher { contract_address: nft_address }.mint(offerer, 'base_uri');

    let mut order = setup_order(erc20_address, nft_address);
    order.route = RouteType::Erc721ToErc20.into();
    order.offerer = offerer;
    order.token_id = Option::Some(token_id);

    cheat_caller_address(executor_address, admin, CheatSpan::TargetCalls(1));
    IMaintenanceDispatcher { contract_address: executor_address }.set_maintenance_mode(true);

    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
}

//
// ERC1155
//

#[test]
fn test_create_order_erc20_to_erc1155_ok() {
    let (executor_address, erc20_address, erc1155_address) = setup_erc1155();
    let offerer = contract_address_const::<'offerer'>();
    let quantity = 50_u256;
    let start_amount = 10_000_000;

    Erc20Dispatcher { contract_address: erc20_address }.mint(offerer, start_amount);

    let mut order = setup_order_erc1155(erc20_address, erc1155_address, quantity);
    order.route = RouteType::Erc20ToErc1155.into();
    order.offerer = offerer;
    order.start_amount = start_amount;

    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
}

#[test]
fn test_create_order_erc1155_to_erc20_ok() {
    let (executor_address, erc20_address, erc1155_address) = setup_erc1155();
    let offerer = contract_address_const::<'offerer'>();
    let quantity = 50_u256;

    let token_id = Erc1155Dispatcher { contract_address: erc1155_address }.mint(offerer, quantity);

    let mut order = setup_order_erc1155(erc20_address, erc1155_address, quantity);
    order.route = RouteType::Erc1155ToErc20.into();
    order.offerer = offerer;
    order.token_id = Option::Some(token_id.into());

    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
}

#[test]
#[should_panic(expected: "Offerer does not own enough of the specified ERC1155 token")]
fn test_create_order_offerer_not_own_enough_erc1155_token() {
    let (executor_address, erc20_address, erc1155_address) = setup_erc1155();
    let offerer = contract_address_const::<'offerer'>();
    let other = contract_address_const::<'other'>();
    let quantity = 50_u256;

    let token_id = Erc1155Dispatcher { contract_address: erc1155_address }.mint(offerer, 2_u256);

    let mut order = setup_order_erc1155(erc20_address, erc1155_address, quantity);
    order.route = RouteType::Erc1155ToErc20.into();
    order.offerer = offerer;
    order.token_id = Option::Some(token_id);

    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
}

#[test]
#[should_panic(expected: 'Executor not enabled')]
fn test_create_order_erc20_to_erc1155_disabled() {
    let (executor_address, erc20_address, erc1155_address) = setup_erc1155();
    let admin = contract_address_const::<'admin'>();
    let offerer = contract_address_const::<'offerer'>();
    let start_amount = 10_000_000;
    let quantity = 50_u256;

    Erc20Dispatcher { contract_address: erc20_address }.mint(offerer, start_amount);

    let mut order = setup_order_erc1155(erc20_address, erc1155_address, quantity);
    order.route = RouteType::Erc20ToErc1155.into();
    order.offerer = offerer;
    order.start_amount = start_amount;

    cheat_caller_address(executor_address, admin, CheatSpan::TargetCalls(1));
    IMaintenanceDispatcher { contract_address: executor_address }.set_maintenance_mode(true);

    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
}

#[test]
#[should_panic(expected: 'Executor not enabled')]
fn test_create_order_erc1155_to_erc20_disabled() {
    let (executor_address, erc20_address, erc1155_address) = setup_erc1155();
    let admin = contract_address_const::<'admin'>();
    let offerer = contract_address_const::<'offerer'>();
    let quantity = 50_u256;

    let token_id = Erc1155Dispatcher { contract_address: erc1155_address }.mint(offerer, quantity);

    let mut order = setup_order_erc1155(erc20_address, erc1155_address, quantity);
    order.route = RouteType::Erc1155ToErc20.into();
    order.offerer = offerer;
    order.token_id = Option::Some(token_id);

    cheat_caller_address(executor_address, admin, CheatSpan::TargetCalls(1));
    IMaintenanceDispatcher { contract_address: executor_address }.set_maintenance_mode(true);

    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
}

