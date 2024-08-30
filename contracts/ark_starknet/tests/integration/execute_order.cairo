use ark_common::protocol::order_types::{FulfillInfo, ExecutionInfo, OrderTrait, RouteType};
use ark_common::protocol::order_v1::OrderV1;

use ark_oz::erc2981::{IERC2981SetupDispatcher, IERC2981SetupDispatcherTrait};

use ark_starknet::interfaces::{
    IExecutorDispatcher, IExecutorDispatcherTrait, FeesRatio, IMaintenanceDispatcher,
    IMaintenanceDispatcherTrait
};

use ark_tokens::erc20::{IFreeMintDispatcher, IFreeMintDispatcherTrait};
use ark_tokens::erc721::IFreeMintDispatcher as Erc721Dispatcher;
use ark_tokens::erc721::IFreeMintDispatcherTrait as Erc721DispatcherTrait;

use snforge_std::{
    ContractClass, ContractClassTrait, cheat_caller_address, CheatSpan, spy_events,
    EventSpyAssertionsTrait, EventSpyTrait, Event, EventsFilterTrait,
};
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
) -> (ContractAddress, ContractAddress, ContractAddress, ExecutionInfo) {
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

    cheat_caller_address(executor.contract_address, offerer, CheatSpan::TargetCalls(1));
    executor.create_order(order);
    let order_hash = order.compute_order_hash();

    cheat_caller_address(erc20_address, offerer, CheatSpan::TargetCalls(1));
    IERC20Dispatcher { contract_address: erc20_address }.approve(executor_address, start_amount);

    let fulfill_info = create_fulfill_info(order_hash, fulfiller, nft_address, token_id);

    cheat_caller_address(nft_address, fulfiller, CheatSpan::TargetCalls(1));
    IERC721Dispatcher { contract_address: nft_address }
        .set_approval_for_all(executor_address, true);

    cheat_caller_address(executor_address, fulfiller, CheatSpan::TargetCalls(1));
    executor.fulfill_order(fulfill_info);

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

    (executor_address, erc20_address, nft_address, execution_info)
}

#[test]
fn test_execute_order_check_default_fees_ok() {
    let fulfiller = contract_address_const::<'fulfiller'>();
    let listing_broker = contract_address_const::<'listing_broker'>();
    let fulfill_broker = contract_address_const::<'fulfill_broker'>();
    let admin_address = contract_address_const::<'admin'>();
    let offerer = contract_address_const::<'offerer'>();

    let start_amount = 10_000_000;
    let (executor_address, _erc20_address, _, execution_info) = setup_execute_order(
        admin_address, offerer, fulfiller, listing_broker, fulfill_broker, start_amount, false
    );

    IExecutorDispatcher { contract_address: executor_address }.execute_order(execution_info);
}


#[test]
fn test_execute_order_check_brokers_fees_ok() {
    let fulfiller = contract_address_const::<'fulfiller'>();
    let listing_broker = contract_address_const::<'listing_broker'>();
    let fulfill_broker = contract_address_const::<'fulfill_broker'>();
    let admin_address = contract_address_const::<'admin'>();
    let offerer = contract_address_const::<'offerer'>();

    let start_amount = 10_000_000;
    let (executor_address, erc20_address, _, execution_info) = setup_execute_order(
        admin_address, offerer, fulfiller, listing_broker, fulfill_broker, start_amount, false
    );

    let erc20 = IERC20Dispatcher { contract_address: erc20_address };
    let executor = IExecutorDispatcher { contract_address: executor_address };

    let fulfill_fees_ratio = FeesRatio { numerator: 10, denominator: 100 };
    let listing_fees_ratio = FeesRatio { numerator: 5, denominator: 100 };

    cheat_caller_address(executor.contract_address, fulfill_broker, CheatSpan::TargetCalls(1));
    executor.set_broker_fees(fulfill_fees_ratio);

    cheat_caller_address(executor.contract_address, listing_broker, CheatSpan::TargetCalls(1));
    executor.set_broker_fees(listing_fees_ratio);

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
fn test_execute_order_check_ark_fees_ok() {
    let fulfiller = contract_address_const::<'fulfiller'>();
    let listing_broker = contract_address_const::<'listing_broker'>();
    let fulfill_broker = contract_address_const::<'fulfill_broker'>();
    let admin_address = contract_address_const::<'admin'>();
    let offerer = contract_address_const::<'offerer'>();

    let start_amount = 10_000_000;
    let (executor_address, erc20_address, _, execution_info) = setup_execute_order(
        admin_address, offerer, fulfiller, listing_broker, fulfill_broker, start_amount, false
    );

    let erc20 = IERC20Dispatcher { contract_address: erc20_address };
    let executor = IExecutorDispatcher { contract_address: executor_address };

    let ark_fees_ratio = FeesRatio { numerator: 5, denominator: 1000 };
    let fulfill_fees_ratio = FeesRatio { numerator: 10, denominator: 100 };

    let listing_fees_ratio = FeesRatio { numerator: 5, denominator: 100 };

    cheat_caller_address(executor.contract_address, fulfill_broker, CheatSpan::TargetCalls(1));
    executor.set_broker_fees(fulfill_fees_ratio);

    cheat_caller_address(executor.contract_address, listing_broker, CheatSpan::TargetCalls(1));
    executor.set_broker_fees(listing_fees_ratio);

    cheat_caller_address(executor.contract_address, admin_address, CheatSpan::TargetCalls(1));
    executor.set_ark_fees(ark_fees_ratio);

    let admin_balance = erc20.balance_of(admin_address);
    let admin_delta = 50_000; // 0.5%
    IExecutorDispatcher { contract_address: executor_address }.execute_order(execution_info);
    assert_eq!(erc20.balance_of(fulfill_broker), 1_000_000, "Fulfill broker balance not correct");
    assert_eq!(erc20.balance_of(listing_broker), 500_000, "Listing broker balance not correct");
    assert_eq!(
        erc20.balance_of(admin_address) - admin_balance, admin_delta, "Admin balance not correct"
    );
}

#[test]
fn test_execute_order_erc2981_default_royalty_check_fees_ok() {
    let fulfiller = contract_address_const::<'fulfiller'>();
    let listing_broker = contract_address_const::<'listing_broker'>();
    let fulfill_broker = contract_address_const::<'fulfill_broker'>();
    let admin_address = contract_address_const::<'admin'>();
    let offerer = contract_address_const::<'offerer'>();
    let creator = contract_address_const::<'creator'>();

    // hardcoded in deploy_nft
    let nft_owner = contract_address_const::<'nft_owner'>();

    let start_amount = 10_000_000;
    let (executor_address, erc20_address, nft_address, execution_info) = setup_execute_order(
        admin_address, offerer, fulfiller, listing_broker, fulfill_broker, start_amount, true
    );

    let erc20 = IERC20Dispatcher { contract_address: erc20_address };
    let executor = IExecutorDispatcher { contract_address: executor_address };

    let fulfill_fees_ratio = FeesRatio { numerator: 10, denominator: 100 };

    let listing_fees_ratio = FeesRatio { numerator: 5, denominator: 100 };

    cheat_caller_address(executor.contract_address, fulfill_broker, CheatSpan::TargetCalls(1));
    executor.set_broker_fees(fulfill_fees_ratio);

    cheat_caller_address(executor.contract_address, listing_broker, CheatSpan::TargetCalls(1));
    executor.set_broker_fees(listing_fees_ratio);

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
    let offerer_balance = erc20.balance_of(offerer);
    let fulfiller_balance = erc20.balance_of(fulfiller);

    let fulfill_broker_delta = 1_000_000; // 10%
    let listing_broker_delta = 500_000; // 5%
    let creator_delta = 200_000; // 2%
    let offerer_delta = start_amount;
    let fulfiller_delta = start_amount
        - fulfill_broker_delta
        - listing_broker_delta
        - creator_delta;

    cheat_caller_address(nft_address, nft_owner, CheatSpan::TargetCalls(1));
    IERC2981SetupDispatcher { contract_address: nft_address }
        .set_default_royalty(creator, FeesRatio { numerator: 2, denominator: 100 });

    let mut spy = spy_events();
    IExecutorDispatcher { contract_address: executor_address }.execute_order(execution_info);
    let events = spy.get_events().emitted_by(executor_address);

    assert_eq!(
        erc20.balance_of(fulfill_broker) - fulfill_broker_balance,
        fulfill_broker_delta,
        "Fulfill broker balance not correct"
    );
    assert_eq!(
        erc20.balance_of(listing_broker) - listing_broker_balance,
        listing_broker_delta,
        "Listing broker balance not correct"
    );
    assert_eq!(
        erc20.balance_of(creator) - creator_balance, creator_delta, "Creator balance not correct"
    );
    assert_eq!(
        offerer_balance - erc20.balance_of(offerer), offerer_delta, "Offerer balance not correct"
    );
    assert_eq!(
        erc20.balance_of(fulfiller) - fulfiller_balance,
        fulfiller_delta,
        "Fulfiller balance not correct"
    );

    assert_eq!(events.events.len(), 1, "Expected 1 events");
    let (_, event) = events.events.at(0);
    assert_eq!(event.keys.len(), 3, "There should be 3 keys");
    assert_eq!(event.keys.at(0), @selector!("OrderExecuted"), "Wrong event name");
}

#[test]
fn test_execute_order_erc2981_token_royalty_check_fees_ok() {
    let fulfiller = contract_address_const::<'fulfiller'>();
    let listing_broker = contract_address_const::<'listing_broker'>();
    let fulfill_broker = contract_address_const::<'fulfill_broker'>();
    let admin_address = contract_address_const::<'admin'>();
    let offerer = contract_address_const::<'offerer'>();
    let creator = contract_address_const::<'creator'>();
    let default_creator = contract_address_const::<'default_creator'>();

    // hardcoded in deploy_nft
    let nft_owner = contract_address_const::<'nft_owner'>();

    let start_amount = 10_000_000;
    let (executor_address, erc20_address, nft_address, execution_info) = setup_execute_order(
        admin_address, offerer, fulfiller, listing_broker, fulfill_broker, start_amount, true
    );

    let erc20 = IERC20Dispatcher { contract_address: erc20_address };
    let executor = IExecutorDispatcher { contract_address: executor_address };

    let fulfill_fees_ratio = FeesRatio { numerator: 10, denominator: 100 };

    let listing_fees_ratio = FeesRatio { numerator: 5, denominator: 100 };

    cheat_caller_address(executor.contract_address, fulfill_broker, CheatSpan::TargetCalls(1));
    executor.set_broker_fees(fulfill_fees_ratio);

    cheat_caller_address(executor.contract_address, listing_broker, CheatSpan::TargetCalls(1));
    executor.set_broker_fees(listing_fees_ratio);

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
    let default_creator_balance = erc20.balance_of(default_creator);
    let offerer_balance = erc20.balance_of(offerer);
    let fulfiller_balance = erc20.balance_of(fulfiller);

    let fulfill_broker_delta = 1_000_000; // 10%
    let listing_broker_delta = 500_000; // 5%
    let creator_delta = 300_000; // 3%
    let default_creator_delta = 0;

    let offerer_delta = start_amount;
    let fulfiller_delta = start_amount
        - fulfill_broker_delta
        - listing_broker_delta
        - creator_delta
        - default_creator_delta;

    cheat_caller_address(nft_address, nft_owner, CheatSpan::TargetCalls(2));
    IERC2981SetupDispatcher { contract_address: nft_address }
        .set_token_royalty(
            execution_info.nft_token_id, creator, FeesRatio { numerator: 3, denominator: 100 }
        );
    IERC2981SetupDispatcher { contract_address: nft_address }
        .set_default_royalty(default_creator, FeesRatio { numerator: 2, denominator: 100 });

    IExecutorDispatcher { contract_address: executor_address }.execute_order(execution_info);
    assert_eq!(
        erc20.balance_of(fulfill_broker) - fulfill_broker_balance,
        fulfill_broker_delta,
        "Fulfill broker balance not correct"
    );
    assert_eq!(
        erc20.balance_of(listing_broker) - listing_broker_balance,
        listing_broker_delta,
        "Listing broker balance not correct"
    );
    assert_eq!(
        erc20.balance_of(creator) - creator_balance, creator_delta, "Creator balance not correct"
    );
    assert_eq!(
        offerer_balance - erc20.balance_of(offerer), offerer_delta, "Offerer balance not correct"
    );
    assert_eq!(
        erc20.balance_of(fulfiller) - fulfiller_balance,
        fulfiller_delta,
        "Fulfiller balance not correct"
    );
    assert_eq!(
        erc20.balance_of(default_creator) - default_creator_balance,
        default_creator_delta,
        "Default creator balance not correct"
    );
}

#[test]
fn test_execute_order_non_erc2981_default_royalty_check_fees_ok() {
    let fulfiller = contract_address_const::<'fulfiller'>();
    let listing_broker = contract_address_const::<'listing_broker'>();
    let fulfill_broker = contract_address_const::<'fulfill_broker'>();
    let admin_address = contract_address_const::<'admin'>();
    let offerer = contract_address_const::<'offerer'>();
    let creator = contract_address_const::<'creator'>();

    let fake_nft_address = contract_address_const::<'fake_nft_address'>();

    let start_amount = 10_000_000;
    let (executor_address, erc20_address, nft_address, execution_info) = setup_execute_order(
        admin_address, offerer, fulfiller, listing_broker, fulfill_broker, start_amount, false
    );

    let erc20 = IERC20Dispatcher { contract_address: erc20_address };
    let executor = IExecutorDispatcher { contract_address: executor_address };

    let fulfill_fees_ratio = FeesRatio { numerator: 10, denominator: 100 };

    let listing_fees_ratio = FeesRatio { numerator: 5, denominator: 100 };

    cheat_caller_address(executor.contract_address, fulfill_broker, CheatSpan::TargetCalls(1));
    executor.set_broker_fees(fulfill_fees_ratio);

    cheat_caller_address(executor.contract_address, listing_broker, CheatSpan::TargetCalls(1));
    executor.set_broker_fees(listing_fees_ratio);

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
    let offerer_balance = erc20.balance_of(offerer);
    let fulfiller_balance = erc20.balance_of(fulfiller);

    let fulfill_broker_delta = 1_000_000; // 10%
    let listing_broker_delta = 500_000; // 5%
    let creator_delta = 200_000; // 2%
    let offerer_delta = start_amount;
    let fulfiller_delta = start_amount
        - fulfill_broker_delta
        - listing_broker_delta
        - creator_delta;

    cheat_caller_address(executor.contract_address, admin_address, CheatSpan::TargetCalls(2));
    executor.set_default_creator_fees(creator, FeesRatio { numerator: 2, denominator: 100 });
    executor
        .set_collection_creator_fees(
            fake_nft_address, creator, FeesRatio { numerator: 4, denominator: 1000 }
        );

    let mut spy = spy_events();
    IExecutorDispatcher { contract_address: executor_address }.execute_order(execution_info);
    let events = spy.get_events().emitted_by(executor_address);

    assert_eq!(
        erc20.balance_of(fulfill_broker) - fulfill_broker_balance,
        fulfill_broker_delta,
        "Fulfill broker balance not correct"
    );
    assert_eq!(
        erc20.balance_of(listing_broker) - listing_broker_balance,
        listing_broker_delta,
        "Listing broker balance not correct"
    );
    assert_eq!(
        erc20.balance_of(creator) - creator_balance, creator_delta, "Creator balance not correct"
    );
    assert_eq!(
        offerer_balance - erc20.balance_of(offerer), offerer_delta, "Offerer balance not correct"
    );
    assert_eq!(
        erc20.balance_of(fulfiller) - fulfiller_balance,
        fulfiller_delta,
        "Fulfiller balance not correct"
    );

    assert_eq!(events.events.len(), 2, "Expected 2 events");
    let (_, event) = events.events.at(0);
    assert_eq!(event.keys.len(), 4, "There should be 4 keys");
    assert_eq!(@selector!("CollectionFallbackFees"), event.keys.at(0), "Wrong event name");
    assert_eq!(nft_address, (*event.keys.at(1)).try_into().unwrap(), "Wrong collection address");
    assert_eq!(creator_delta.low, (*event.keys.at(2)).try_into().unwrap(), "Wrong low amount");
    assert_eq!(creator_delta.high, (*event.keys.at(3)).try_into().unwrap(), "Wrong high amount");
    let (_, event) = events.events.at(1);
    assert_eq!(event.keys.len(), 3, "There should be 3 keys");
    assert_eq!(@selector!("OrderExecuted"), event.keys.at(0), "Wrong event name");
}

#[test]
fn test_execute_order_non_erc2981_collection_royalty_check_fees_ok() {
    let fulfiller = contract_address_const::<'fulfiller'>();
    let listing_broker = contract_address_const::<'listing_broker'>();
    let fulfill_broker = contract_address_const::<'fulfill_broker'>();
    let admin_address = contract_address_const::<'admin'>();
    let offerer = contract_address_const::<'offerer'>();
    let creator = contract_address_const::<'creator'>();
    let other_creator = contract_address_const::<'other_creator'>();

    let start_amount = 10_000_000;
    let (executor_address, erc20_address, nft_address, execution_info) = setup_execute_order(
        admin_address, offerer, fulfiller, listing_broker, fulfill_broker, start_amount, false
    );

    let erc20 = IERC20Dispatcher { contract_address: erc20_address };
    let executor = IExecutorDispatcher { contract_address: executor_address };

    let fulfill_fees_ratio = FeesRatio { numerator: 10, denominator: 100 };

    let listing_fees_ratio = FeesRatio { numerator: 5, denominator: 100 };

    cheat_caller_address(executor.contract_address, fulfill_broker, CheatSpan::TargetCalls(1));
    executor.set_broker_fees(fulfill_fees_ratio);

    cheat_caller_address(executor.contract_address, listing_broker, CheatSpan::TargetCalls(1));
    executor.set_broker_fees(listing_fees_ratio);

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
    let offerer_balance = erc20.balance_of(offerer);
    let fulfiller_balance = erc20.balance_of(fulfiller);

    let fulfill_broker_delta = 1_000_000; // 10%
    let listing_broker_delta = 500_000; // 5%
    let creator_delta = 200_000; // 2%
    let offerer_delta = start_amount;
    let fulfiller_delta = start_amount
        - fulfill_broker_delta
        - listing_broker_delta
        - creator_delta;

    cheat_caller_address(executor.contract_address, admin_address, CheatSpan::TargetCalls(2));
    executor.set_default_creator_fees(other_creator, FeesRatio { numerator: 4, denominator: 100 });
    executor
        .set_collection_creator_fees(
            nft_address, creator, FeesRatio { numerator: 2, denominator: 100 }
        );

    IExecutorDispatcher { contract_address: executor_address }.execute_order(execution_info);
    assert_eq!(
        erc20.balance_of(fulfill_broker) - fulfill_broker_balance,
        fulfill_broker_delta,
        "Fulfill broker balance not correct"
    );
    assert_eq!(
        erc20.balance_of(listing_broker) - listing_broker_balance,
        listing_broker_delta,
        "Listing broker balance not correct"
    );
    assert_eq!(
        erc20.balance_of(creator) - creator_balance, creator_delta, "Creator balance not correct"
    );
    assert_eq!(
        offerer_balance - erc20.balance_of(offerer), offerer_delta, "Offerer balance not correct"
    );
    assert_eq!(
        erc20.balance_of(fulfiller) - fulfiller_balance,
        fulfiller_delta,
        "Fulfiller balance not correct"
    );
}

#[test]
#[should_panic(expected: "Fees exceed payment amount")]
fn test_execute_order_check_fee_too_much_fees() {
    let fulfiller = contract_address_const::<'fulfiller'>();
    let listing_broker = contract_address_const::<'listing_broker'>();
    let fulfill_broker = contract_address_const::<'fulfill_broker'>();
    let admin_address = contract_address_const::<'admin'>();
    let offerer = contract_address_const::<'offerer'>();

    let start_amount = 10_000_000;
    let (executor_address, erc20_address, _, execution_info) = setup_execute_order(
        admin_address, offerer, fulfiller, listing_broker, fulfill_broker, start_amount, false
    );

    let erc20 = IERC20Dispatcher { contract_address: erc20_address };
    let executor = IExecutorDispatcher { contract_address: executor_address };

    let fulfill_fees_ratio = FeesRatio { numerator: 60, denominator: 100 };

    let listing_fees_ratio = FeesRatio { numerator: 60, denominator: 100 };

    cheat_caller_address(executor.contract_address, fulfill_broker, CheatSpan::TargetCalls(1));
    executor.set_broker_fees(fulfill_fees_ratio);

    cheat_caller_address(executor.contract_address, listing_broker, CheatSpan::TargetCalls(1));
    executor.set_broker_fees(listing_fees_ratio);

    IExecutorDispatcher { contract_address: executor_address }.execute_order(execution_info);
    assert_eq!(erc20.balance_of(fulfill_broker), 1_000_000, "Fulfill broker balance not correct");
    assert_eq!(erc20.balance_of(listing_broker), 500_000, "Listing broker balance not correct");
}

#[test]
#[should_panic(expected: 'Executor not enabled')]
fn test_execute_order_disabled() {
    let fulfiller = contract_address_const::<'fulfiller'>();
    let listing_broker = contract_address_const::<'listing_broker'>();
    let fulfill_broker = contract_address_const::<'fulfill_broker'>();
    let admin_address = contract_address_const::<'admin'>();
    let offerer = contract_address_const::<'offerer'>();

    let start_amount = 10_000_000;
    let (executor_address, _erc20_address, _, execution_info) = setup_execute_order(
        admin_address, offerer, fulfiller, listing_broker, fulfill_broker, start_amount, false
    );

    cheat_caller_address(executor_address, admin_address, CheatSpan::TargetCalls(1));
    IMaintenanceDispatcher { contract_address: executor_address }.set_maintenance_mode(true);

    IExecutorDispatcher { contract_address: executor_address }.execute_order(execution_info);
}
