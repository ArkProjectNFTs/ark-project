use starknet::{ContractAddress, contract_address_const};

use openzeppelin::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
use openzeppelin::token::erc721::interface::{IERC721Dispatcher, IERC721DispatcherTrait};
use ark_common::protocol::order_v1::OrderV1;
use ark_common::protocol::order_types::{FulfillInfo, ExecutionInfo, OrderTrait, RouteType};


use ark_starknet::interfaces::{IExecutorDispatcher, IExecutorDispatcherTrait, FeesRatio};

use ark_tokens::erc20::{IFreeMintDispatcher, IFreeMintDispatcherTrait};
use ark_tokens::erc721::IFreeMintDispatcher as Erc721Dispatcher;
use ark_tokens::erc721::IFreeMintDispatcherTrait as Erc721DispatcherTrait;

use snforge_std as snf;
use snf::{ContractClass, ContractClassTrait, CheatTarget};

use super::super::common::setup::{setup, setup_order, setup_royalty};

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

fn create_execution_info(
    order_hash: felt252,
    nft_address: ContractAddress,
    nft_from: ContractAddress,
    nft_to: ContractAddress,
    nft_token_id: u256,
    payment_from: ContractAddress,
    payment_to: ContractAddress,
    payment_amount: u256,
    payment_currency_address: ContractAddress,
    payment_currency_chain_id: felt252,
    listing_broker_address: ContractAddress,
    fulfill_broker_address: ContractAddress
) -> ExecutionInfo {
    ExecutionInfo {
        order_hash: order_hash,
        nft_address: nft_address,
        nft_from: nft_from,
        nft_to: nft_to,
        nft_token_id: nft_token_id,
        payment_from: payment_from,
        payment_to: payment_to,
        payment_amount: payment_amount,
        payment_currency_address: payment_currency_address,
        payment_currency_chain_id: payment_currency_chain_id,
        listing_broker_address: listing_broker_address,
        fulfill_broker_address: fulfill_broker_address,
    }
}

fn setup_execute_order(
    admin_address: ContractAddress,
    offerer: ContractAddress,
    fulfiller: ContractAddress,
    listing_broker: ContractAddress,
    fulfill_broker: ContractAddress,
    start_amount: u256,
    royalty: bool,
) -> (ContractAddress, ContractAddress, ExecutionInfo) {
    let (executor_address, erc20_address, nft_address) = if royalty {
        setup_royalty()
    } else {
        setup()
    };
    let executor = IExecutorDispatcher { contract_address: executor_address };

    let token_id: u256 = Erc721Dispatcher { contract_address: nft_address }
        .get_current_token_id()
        .into();
    Erc721Dispatcher { contract_address: nft_address }.mint(fulfiller, 'base_uri');
    IFreeMintDispatcher { contract_address: erc20_address }.mint(offerer, start_amount);

    let mut order = setup_order(erc20_address, nft_address);
    order.offerer = offerer;
    order.start_amount = start_amount;
    order.token_id = Option::Some(token_id);

    snf::start_prank(CheatTarget::One(executor.contract_address), offerer);
    executor.create_order(order);
    snf::stop_prank(CheatTarget::One(executor_address));
    let order_hash = order.compute_order_hash();

    snf::start_prank(CheatTarget::One(erc20_address), offerer);
    IERC20Dispatcher { contract_address: erc20_address }.approve(executor_address, start_amount);
    snf::stop_prank(CheatTarget::One(erc20_address));

    let fulfill_info = create_fulfill_info(order_hash, fulfiller, nft_address, token_id);

    snf::start_prank(CheatTarget::One(nft_address), fulfiller);
    IERC721Dispatcher { contract_address: nft_address }
        .set_approval_for_all(executor_address, true);
    snf::stop_prank(CheatTarget::One(nft_address));

    snf::start_prank(CheatTarget::One(executor_address), fulfiller);
    executor.fulfill_order(fulfill_info);
    snf::stop_prank(CheatTarget::One(executor_address));

    let execution_info = create_execution_info(
        order_hash,
        nft_address,
        fulfiller,
        offerer,
        token_id,
        offerer,
        fulfiller,
        start_amount,
        erc20_address,
        'SN_MAIN',
        listing_broker,
        fulfill_broker
    );

    (executor_address, erc20_address, execution_info)
}

#[test]
fn test_execute_order_check_deault_fees_ok() {
    let fulfiller = contract_address_const::<'fulfiller'>();
    let listing_broker = contract_address_const::<'listing_broker'>();
    let fulfill_broker = contract_address_const::<'fulfill_broker'>();
    let admin_address = contract_address_const::<'admin'>();
    let offerer = contract_address_const::<'offerer'>();

    let start_amount = 10_000_000;
    let (executor_address, _erc20_address, execution_info) = setup_execute_order(
        admin_address, offerer, fulfiller, listing_broker, fulfill_broker, start_amount, false
    );

    IExecutorDispatcher { contract_address: executor_address }.execute_order(execution_info);
}


#[test]
fn test_execute_order_check_fee_ok() {
    let fulfiller = contract_address_const::<'fulfiller'>();
    let listing_broker = contract_address_const::<'listing_broker'>();
    let fulfill_broker = contract_address_const::<'fulfill_broker'>();
    let admin_address = contract_address_const::<'admin'>();
    let offerer = contract_address_const::<'offerer'>();

    let start_amount = 10_000_000;
    let (executor_address, erc20_address, execution_info) = setup_execute_order(
        admin_address, offerer, fulfiller, listing_broker, fulfill_broker, start_amount, false
    );

    let erc20 = IERC20Dispatcher { contract_address: erc20_address };
    let executor = IExecutorDispatcher { contract_address: executor_address };

    snf::start_prank(CheatTarget::One(executor.contract_address), admin_address);
    let fulfill_fees_ratio = FeesRatio { numerator: 10, denominator: 100 };

    let listing_fees_ratio = FeesRatio { numerator: 5, denominator: 100 };

    executor.set_broker_fees(fulfill_broker, fulfill_fees_ratio);
    executor.set_broker_fees(listing_broker, listing_fees_ratio);
    snf::stop_prank(CheatTarget::One(executor.contract_address));

    assert_eq!(
        executor.get_broker_fees(fulfill_broker),
        fulfill_fees_ratio,
        "Fulfill broker fees not updated"
    );
    assert_eq!(
        executor.get_broker_fees(listing_broker),
        listing_fees_ratio,
        "Listing broker fees not updated"
    );

    let fulfill_broker_balance = erc20.balance_of(fulfill_broker);
    let listing_broker_balance = erc20.balance_of(listing_broker);
    assert_eq!(fulfill_broker_balance, 0, "Wrong initial balance for fulfill broker");
    assert_eq!(listing_broker_balance, 0, "Wrong initial balance for listing broker");

    IExecutorDispatcher { contract_address: executor_address }.execute_order(execution_info);
    assert_eq!(erc20.balance_of(fulfill_broker), 1_000_000, "Fulfill broker balance not correct");
    assert_eq!(erc20.balance_of(listing_broker), 500_000, "Listing broker balance not correct");
}

#[test]
fn test_execute_order_royalty_check_fees_ok() {
    let fulfiller = contract_address_const::<'fulfiller'>();
    let listing_broker = contract_address_const::<'listing_broker'>();
    let fulfill_broker = contract_address_const::<'fulfill_broker'>();
    let admin_address = contract_address_const::<'admin'>();
    let offerer = contract_address_const::<'offerer'>();
    let creator = contract_address_const::<'creator'>();

    let start_amount = 10_000_000;
    let (executor_address, erc20_address, execution_info) = setup_execute_order(
        admin_address, offerer, fulfiller, listing_broker, fulfill_broker, start_amount, true
    );

    let erc20 = IERC20Dispatcher { contract_address: erc20_address };
    let executor = IExecutorDispatcher { contract_address: executor_address };

    snf::start_prank(CheatTarget::One(executor.contract_address), admin_address);
    let fulfill_fees_ratio = FeesRatio { numerator: 10, denominator: 100 };

    let listing_fees_ratio = FeesRatio { numerator: 5, denominator: 100 };

    executor.set_broker_fees(fulfill_broker, fulfill_fees_ratio);
    executor.set_broker_fees(listing_broker, listing_fees_ratio);
    snf::stop_prank(CheatTarget::One(executor.contract_address));

    assert_eq!(
        executor.get_broker_fees(fulfill_broker),
        fulfill_fees_ratio,
        "Fulfill broker fees not updated"
    );
    assert_eq!(
        executor.get_broker_fees(listing_broker),
        listing_fees_ratio,
        "Listing broker fees not updated"
    );

    let fulfill_broker_balance = erc20.balance_of(fulfill_broker);
    let listing_broker_balance = erc20.balance_of(listing_broker);
    let creator_balance = erc20.balance_of(creator);

    IExecutorDispatcher { contract_address: executor_address }.execute_order(execution_info);
    assert_eq!(erc20.balance_of(fulfill_broker) - fulfill_broker_balance, 1_000_000, "Fulfill broker balance not correct");
    assert_eq!(erc20.balance_of(listing_broker) - listing_broker_balance, 500_000, "Listing broker balance not correct");
    assert_eq!(erc20.balance_of(creator) - creator_balance, 200_000, "Creator balance not correct");
}

#[test]
#[should_panic(expected: ("Fees exceed payment amount",))]
fn test_execute_order_check_fee_too_much_fees() {
    let fulfiller = contract_address_const::<'fulfiller'>();
    let listing_broker = contract_address_const::<'listing_broker'>();
    let fulfill_broker = contract_address_const::<'fulfill_broker'>();
    let admin_address = contract_address_const::<'admin'>();
    let offerer = contract_address_const::<'offerer'>();

    let start_amount = 10_000_000;
    let (executor_address, erc20_address, execution_info) = setup_execute_order(
        admin_address, offerer, fulfiller, listing_broker, fulfill_broker, start_amount, false
    );

    let erc20 = IERC20Dispatcher { contract_address: erc20_address };
    let executor = IExecutorDispatcher { contract_address: executor_address };

    snf::start_prank(CheatTarget::One(executor.contract_address), admin_address);
    let fulfill_fees_ratio = FeesRatio { numerator: 60, denominator: 100 };

    let listing_fees_ratio = FeesRatio { numerator: 60, denominator: 100 };

    executor.set_broker_fees(fulfill_broker, fulfill_fees_ratio);
    executor.set_broker_fees(listing_broker, listing_fees_ratio);
    snf::stop_prank(CheatTarget::One(executor.contract_address));

    IExecutorDispatcher { contract_address: executor_address }.execute_order(execution_info);
    assert_eq!(erc20.balance_of(fulfill_broker), 1_000_000, "Fulfill broker balance not correct");
    assert_eq!(erc20.balance_of(listing_broker), 500_000, "Listing broker balance not correct");
}
