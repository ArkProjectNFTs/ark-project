use ark_common::protocol::order_types::{FulfillInfo, OrderTrait, RouteType};
use ark_common::protocol::order_v1::OrderV1;


use ark_starknet::interfaces::{
    IExecutorDispatcher, IExecutorDispatcherTrait, IMaintenanceDispatcher,
    IMaintenanceDispatcherTrait
};

use ark_tokens::erc20::{IFreeMintDispatcher, IFreeMintDispatcherTrait};
use ark_tokens::erc721::IFreeMintDispatcher as Erc721Dispatcher;
use ark_tokens::erc721::IFreeMintDispatcherTrait as Erc721DispatcherTrait;

use openzeppelin::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
use openzeppelin::token::erc721::interface::{IERC721Dispatcher, IERC721DispatcherTrait};

use snforge_std::{cheat_caller_address, CheatSpan};
use starknet::{ContractAddress, contract_address_const};

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

    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);

    (order.compute_order_hash(), offerer, start_amount)
}

fn create_collection_offer_order(
    executor_address: ContractAddress, erc20_address: ContractAddress, nft_address: ContractAddress,
) -> (felt252, ContractAddress, u256) {
    let offerer = contract_address_const::<'offerer'>();
    let start_amount = 10_000_000;

    IFreeMintDispatcher { contract_address: erc20_address }.mint(offerer, start_amount);

    let mut order = setup_order(erc20_address, nft_address);
    order.offerer = offerer;
    order.start_amount = start_amount;
    order.token_id = Option::None;

    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);

    (order.compute_order_hash(), offerer, start_amount)
}

fn create_listing_order(
    executor_address: ContractAddress,
    erc20_address: ContractAddress,
    nft_address: ContractAddress,
    start_amount: u256
) -> (felt252, ContractAddress, u256) {
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

    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);

    (order.compute_order_hash(), offerer, token_id)
}

fn create_auction_order(
    executor_address: ContractAddress,
    erc20_address: ContractAddress,
    nft_address: ContractAddress,
    start_amount: u256,
    end_amount: u256
) -> (felt252, ContractAddress, u256) {
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
    order.end_amount = end_amount;

    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);

    (order.compute_order_hash(), offerer, token_id)
}

fn create_fulfill_info(
    order_hash: felt252, fulfiller: ContractAddress, token_address: ContractAddress, token_id: u256
) -> FulfillInfo {
    FulfillInfo {
        order_hash: order_hash,
        related_order_hash: Option::None,
        fulfiller: fulfiller,
        token_chain_id: 'SN_MAIN',
        token_address: token_address,
        token_id: Option::Some(token_id),
        fulfill_broker_address: contract_address_const::<'broker'>()
    }
}

#[test]
fn test_fulfill_offer_order_ok() {
    let (executor_address, erc20_address, nft_address) = setup();
    let fulfiller = contract_address_const::<'fulfiller'>();

    let token_id: u256 = Erc721Dispatcher { contract_address: nft_address }
        .get_current_token_id()
        .into();
    Erc721Dispatcher { contract_address: nft_address }.mint(fulfiller, 'base_uri');
    let (order_hash, offerer, start_amount) = create_offer_order(
        executor_address, erc20_address, nft_address, token_id
    );

    cheat_caller_address(erc20_address, offerer, CheatSpan::TargetCalls(1));
    IERC20Dispatcher { contract_address: erc20_address }.approve(executor_address, start_amount);

    let fulfill_info = create_fulfill_info(order_hash, fulfiller, nft_address, token_id);

    cheat_caller_address(nft_address, fulfiller, CheatSpan::TargetCalls(1));
    IERC721Dispatcher { contract_address: nft_address }
        .set_approval_for_all(executor_address, true);

    cheat_caller_address(executor_address, fulfiller, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.fulfill_order(fulfill_info);
}

#[test]
fn test_fulfill_listing_order_ok() {
    let (executor_address, erc20_address, nft_address) = setup();
    let fulfiller = contract_address_const::<'fulfiller'>();
    let start_amount = 10_000_000;

    let (order_hash, offerer, token_id) = create_listing_order(
        executor_address, erc20_address, nft_address, start_amount
    );

    IFreeMintDispatcher { contract_address: erc20_address }.mint(fulfiller, start_amount);

    cheat_caller_address(nft_address, offerer, CheatSpan::TargetCalls(1));
    IERC721Dispatcher { contract_address: nft_address }
        .set_approval_for_all(executor_address, true);

    let fulfill_info = create_fulfill_info(order_hash, fulfiller, nft_address, token_id);

    cheat_caller_address(erc20_address, fulfiller, CheatSpan::TargetCalls(1));
    IERC20Dispatcher { contract_address: erc20_address }.approve(executor_address, start_amount);

    cheat_caller_address(executor_address, fulfiller, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.fulfill_order(fulfill_info);
}

#[test]
#[should_panic(expected: "Caller is not the fulfiller")]
fn test_fulfill_order_fulfiller_shall_be_caller() {
    let (executor_address, _erc20_address, nft_address) = setup();
    let caller = contract_address_const::<'caller'>();
    let fulfiller = contract_address_const::<'fulfiller'>();

    let fulfill_info = create_fulfill_info(0x123, fulfiller, nft_address, 1);

    cheat_caller_address(executor_address, caller, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.fulfill_order(fulfill_info);
}

#[test]
#[should_panic(expected: "Fulfiller does not own enough ERC20 tokens")]
fn test_fulfill_listing_order_fulfiller_not_enough_erc20_token() {
    let (executor_address, erc20_address, nft_address) = setup();
    let fulfiller = contract_address_const::<'fulfiller'>();
    let start_amount = 10_000_000;

    let (order_hash, _, token_id) = create_listing_order(
        executor_address, erc20_address, nft_address, start_amount
    );

    IFreeMintDispatcher { contract_address: erc20_address }.mint(fulfiller, start_amount - 100);

    let fulfill_info = create_fulfill_info(order_hash, fulfiller, nft_address, token_id);

    cheat_caller_address(executor_address, fulfiller, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.fulfill_order(fulfill_info);
}

#[test]
#[should_panic(expected: "Fulfiller does not own the specified ERC721 token")]
fn test_fulfill_offer_order_fulfiller_not_owner() {
    let (executor_address, erc20_address, nft_address) = setup();
    let fulfiller = contract_address_const::<'fulfiller'>();
    let other = contract_address_const::<'other'>();

    let token_id: u256 = Erc721Dispatcher { contract_address: nft_address }
        .get_current_token_id()
        .into();
    Erc721Dispatcher { contract_address: nft_address }.mint(other, 'base_uri');
    let (order_hash, _, _) = create_offer_order(
        executor_address, erc20_address, nft_address, token_id
    );

    let fulfill_info = create_fulfill_info(order_hash, fulfiller, nft_address, token_id);

    cheat_caller_address(executor_address, fulfiller, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.fulfill_order(fulfill_info);
}

#[test]
#[should_panic(expected: "Order not found")]
fn test_fulfill_order_not_found() {
    let (executor_address, _erc20_address, nft_address) = setup();
    let fulfiller = contract_address_const::<'fulfiller'>();

    let fulfill_info = create_fulfill_info(0x1234, fulfiller, nft_address, 1);

    cheat_caller_address(executor_address, fulfiller, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.fulfill_order(fulfill_info);
}

#[test]
#[should_panic(expected: "Offerer's allowance of executor is not enough")]
fn test_fulfill_offer_order_offerer_not_enough_allowance() {
    let (executor_address, erc20_address, nft_address) = setup();
    let fulfiller = contract_address_const::<'fulfiller'>();

    let token_id: u256 = Erc721Dispatcher { contract_address: nft_address }
        .get_current_token_id()
        .into();
    Erc721Dispatcher { contract_address: nft_address }.mint(fulfiller, 'base_uri');
    let (order_hash, offerer, start_amount) = create_offer_order(
        executor_address, erc20_address, nft_address, token_id
    );

    cheat_caller_address(erc20_address, offerer, CheatSpan::TargetCalls(1));
    IERC20Dispatcher { contract_address: erc20_address }
        .approve(executor_address, start_amount - 10);

    let fulfill_info = create_fulfill_info(order_hash, fulfiller, nft_address, token_id);

    cheat_caller_address(nft_address, fulfiller, CheatSpan::TargetCalls(1));
    IERC721Dispatcher { contract_address: nft_address }
        .set_approval_for_all(executor_address, true);

    cheat_caller_address(executor_address, fulfiller, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.fulfill_order(fulfill_info);
}

#[test]
#[should_panic(expected: "Fulfiller's allowance of executor is not enough")]
fn test_fulfill_listing_order_fulfiller_not_enough_allowance() {
    let (executor_address, erc20_address, nft_address) = setup();
    let fulfiller = contract_address_const::<'fulfiller'>();
    let start_amount = 10_000_000;

    let (order_hash, offerer, token_id) = create_listing_order(
        executor_address, erc20_address, nft_address, start_amount
    );

    IFreeMintDispatcher { contract_address: erc20_address }.mint(fulfiller, start_amount);

    cheat_caller_address(nft_address, offerer, CheatSpan::TargetCalls(1));
    IERC721Dispatcher { contract_address: nft_address }
        .set_approval_for_all(executor_address, true);

    let fulfill_info = create_fulfill_info(order_hash, fulfiller, nft_address, token_id);

    cheat_caller_address(erc20_address, fulfiller, CheatSpan::TargetCalls(1));
    IERC20Dispatcher { contract_address: erc20_address }
        .approve(executor_address, start_amount - 10);

    cheat_caller_address(executor_address, fulfiller, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.fulfill_order(fulfill_info);
}

#[test]
#[should_panic(expected: "Executor not approved by offerer")]
fn test_fulfill_listing_order_offerer_not_approved() {
    let (executor_address, erc20_address, nft_address) = setup();
    let fulfiller = contract_address_const::<'fulfiller'>();
    let start_amount = 10_000_000;

    let (order_hash, _offerer, token_id) = create_listing_order(
        executor_address, erc20_address, nft_address, start_amount
    );

    IFreeMintDispatcher { contract_address: erc20_address }.mint(fulfiller, start_amount);

    let fulfill_info = create_fulfill_info(order_hash, fulfiller, nft_address, token_id);

    cheat_caller_address(erc20_address, fulfiller, CheatSpan::TargetCalls(1));
    IERC20Dispatcher { contract_address: erc20_address }.approve(executor_address, start_amount);

    cheat_caller_address(executor_address, fulfiller, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.fulfill_order(fulfill_info);
}

#[test]
#[should_panic(expected: "Executor not approved by fulfiller")]
fn test_fulfill_offer_order_fulfiller_not_approved() {
    let (executor_address, erc20_address, nft_address) = setup();
    let fulfiller = contract_address_const::<'fulfiller'>();

    let token_id: u256 = Erc721Dispatcher { contract_address: nft_address }
        .get_current_token_id()
        .into();
    Erc721Dispatcher { contract_address: nft_address }.mint(fulfiller, 'base_uri');
    let (order_hash, offerer, start_amount) = create_offer_order(
        executor_address, erc20_address, nft_address, token_id
    );

    cheat_caller_address(erc20_address, offerer, CheatSpan::TargetCalls(1));
    IERC20Dispatcher { contract_address: erc20_address }.approve(executor_address, start_amount);

    let fulfill_info = create_fulfill_info(order_hash, fulfiller, nft_address, token_id);

    cheat_caller_address(executor_address, fulfiller, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.fulfill_order(fulfill_info);
}


#[test]
#[should_panic(expected: "Offerer and fulfiller must be different")]
fn test_fulfill_offer_order_fulfiller_same_as_offerer() {
    let (executor_address, erc20_address, nft_address) = setup();

    let token_id: u256 = Erc721Dispatcher { contract_address: nft_address }
        .get_current_token_id()
        .into();
    let (order_hash, offerer, start_amount) = create_offer_order(
        executor_address, erc20_address, nft_address, token_id
    );
    let fulfiller = offerer;
    Erc721Dispatcher { contract_address: nft_address }.mint(fulfiller, 'base_uri');

    cheat_caller_address(erc20_address, offerer, CheatSpan::TargetCalls(1));
    IERC20Dispatcher { contract_address: erc20_address }.approve(executor_address, start_amount);

    let fulfill_info = create_fulfill_info(order_hash, fulfiller, nft_address, token_id);

    cheat_caller_address(nft_address, fulfiller, CheatSpan::TargetCalls(1));
    IERC721Dispatcher { contract_address: nft_address }
        .set_approval_for_all(executor_address, true);

    cheat_caller_address(executor_address, fulfiller, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.fulfill_order(fulfill_info);
}

#[test]
#[should_panic(expected: "Offerer and fulfiller must be different")]
fn test_fulfill_listing_order_fulfiller_same_as_offerer() {
    let (executor_address, erc20_address, nft_address) = setup();
    let start_amount = 10_000_000;

    let (order_hash, offerer, token_id) = create_listing_order(
        executor_address, erc20_address, nft_address, start_amount
    );
    let fulfiller = offerer;

    IFreeMintDispatcher { contract_address: erc20_address }.mint(fulfiller, start_amount);

    cheat_caller_address(nft_address, offerer, CheatSpan::TargetCalls(1));
    IERC721Dispatcher { contract_address: nft_address }
        .set_approval_for_all(executor_address, true);

    let fulfill_info = create_fulfill_info(order_hash, fulfiller, nft_address, token_id);

    cheat_caller_address(erc20_address, fulfiller, CheatSpan::TargetCalls(1));
    IERC20Dispatcher { contract_address: erc20_address }.approve(executor_address, start_amount);

    cheat_caller_address(executor_address, fulfiller, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.fulfill_order(fulfill_info);
}

#[test]
fn test_fulfill_auction_order_ok() {
    let (executor_address, erc20_address, nft_address) = setup();
    let start_amount = 10_000_000;
    let end_amount = 20_000_000;
    let buyer = contract_address_const::<'buyer'>();

    let (order_hash, offerer, token_id) = create_auction_order(
        executor_address, erc20_address, nft_address, start_amount, end_amount
    );
    let fulfiller = offerer;

    IFreeMintDispatcher { contract_address: erc20_address }.mint(buyer, start_amount);

    let mut buyer_order = setup_order(erc20_address, nft_address);
    buyer_order.offerer = buyer;
    buyer_order.start_amount = start_amount;
    buyer_order.token_id = Option::Some(token_id);

    cheat_caller_address(executor_address, buyer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(buyer_order);

    cheat_caller_address(nft_address, offerer, CheatSpan::TargetCalls(1));
    IERC721Dispatcher { contract_address: nft_address }
        .set_approval_for_all(executor_address, true);

    let mut fulfill_info = create_fulfill_info(order_hash, fulfiller, nft_address, token_id);
    fulfill_info.related_order_hash = Option::Some(buyer_order.compute_order_hash());

    cheat_caller_address(erc20_address, buyer, CheatSpan::TargetCalls(1));
    IERC20Dispatcher { contract_address: erc20_address }.approve(executor_address, start_amount);

    cheat_caller_address(executor_address, fulfiller, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.fulfill_order(fulfill_info);
}

#[test]
fn test_fulfill_auction_order_fulfiller_same_as_offerer() {
    let (executor_address, erc20_address, nft_address) = setup();
    let start_amount = 10_000_000;
    let end_amount = 20_000_000;
    let buyer = contract_address_const::<'buyer'>();

    let (order_hash, offerer, token_id) = create_auction_order(
        executor_address, erc20_address, nft_address, start_amount, end_amount
    );
    let fulfiller = offerer;

    IFreeMintDispatcher { contract_address: erc20_address }.mint(buyer, start_amount);

    let mut buyer_order = setup_order(erc20_address, nft_address);
    buyer_order.offerer = buyer;
    buyer_order.start_amount = start_amount;
    buyer_order.token_id = Option::Some(token_id);

    cheat_caller_address(executor_address, buyer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(buyer_order);

    cheat_caller_address(nft_address, offerer, CheatSpan::TargetCalls(1));
    IERC721Dispatcher { contract_address: nft_address }
        .set_approval_for_all(executor_address, true);

    let mut fulfill_info = create_fulfill_info(order_hash, fulfiller, nft_address, token_id);
    fulfill_info.related_order_hash = Option::Some(buyer_order.compute_order_hash());

    cheat_caller_address(erc20_address, buyer, CheatSpan::TargetCalls(1));
    IERC20Dispatcher { contract_address: erc20_address }.approve(executor_address, start_amount);

    cheat_caller_address(executor_address, fulfiller, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.fulfill_order(fulfill_info);
}

#[test]
#[should_panic(expected: 'Executor not enabled')]
fn test_fulfill_order_not_enabled() {
    let (executor_address, erc20_address, nft_address) = setup();
    let admin = contract_address_const::<'admin'>();
    let fulfiller = contract_address_const::<'fulfiller'>();

    let token_id: u256 = Erc721Dispatcher { contract_address: nft_address }
        .get_current_token_id()
        .into();
    Erc721Dispatcher { contract_address: nft_address }.mint(fulfiller, 'base_uri');
    let (order_hash, offerer, start_amount) = create_offer_order(
        executor_address, erc20_address, nft_address, token_id
    );

    cheat_caller_address(erc20_address, offerer, CheatSpan::TargetCalls(1));
    IERC20Dispatcher { contract_address: erc20_address }.approve(executor_address, start_amount);

    let fulfill_info = create_fulfill_info(order_hash, fulfiller, nft_address, token_id);

    cheat_caller_address(nft_address, fulfiller, CheatSpan::TargetCalls(1));
    IERC721Dispatcher { contract_address: nft_address }
        .set_approval_for_all(executor_address, true);

    cheat_caller_address(executor_address, admin, CheatSpan::TargetCalls(1));
    IMaintenanceDispatcher { contract_address: executor_address }.set_maintenance_mode(true);

    cheat_caller_address(executor_address, fulfiller, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.fulfill_order(fulfill_info);
}
