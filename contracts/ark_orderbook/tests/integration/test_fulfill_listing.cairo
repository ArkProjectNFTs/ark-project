use core::result::ResultTrait;
use core::traits::TryInto;
use core::traits::Into;
use core::option::OptionTrait;
use snforge_std::{ declare, ContractClassTrait};
use ark_orderbook::orderbook::Orderbook;
use ark_orderbook::orderbook::orderbook;
use ark_common::protocol::order_v1::OrderV1;
use snforge_std::cheatcodes::CheatTarget;
use ark_common::crypto::{signer::{Signer, SignInfo, SignerTrait}, hash::serialized_hash};
use ark_common::protocol::order_types::{RouteType, FulfillInfo, OrderTrait, OrderType, OrderStatus};
use ark_orderbook::orderbook::{OrderbookDispatcher, OrderbookDispatcherTrait};
use starknet::deploy_syscall;
use snforge_std::{start_warp, test_address};

use super::super::common::signer::sign_mock;
use super::super::common::setup::{
    setup_listing, setup_listing_order_with_sign, whitelist_creator_broker
};

// try to fulfill an order that doesn't exist
#[should_panic(expected: ('OB: order not found',))]
#[test]
fn test_create_listing_order_and_fulfill_non_existing_order() {
    let start_date = 1699556828;
    let end_date = start_date + (10 * 24 * 60 * 60);
    let (_, _, _order_hash, _) = setup_listing(
        start_date, end_date, Option::Some(123)
    );
    let contract = declare("orderbook").unwrap();
    let chain_id = 0x534e5f4d41494e;
    let contract_data = array![
        0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078, chain_id
    ];
    let (contract_address, _) = contract.deploy(@contract_data).unwrap();

    let dispatcher = OrderbookDispatcher { contract_address };
    let fulfiller = 0x00E4769a4d2F7F69C70951A333eBA5c32707Cef3CdfB6B27cA63567f51cdd078
        .try_into()
        .unwrap();
    let fulfill_info = FulfillInfo {
        order_hash: 0x00E4769a444F7FF9C70951A333eBA5c32707Cef3CdfB6B27cA63567f51cdd078
            .try_into()
            .unwrap(),
        related_order_hash: Option::None,
        fulfiller: fulfiller,
        token_chain_id: chain_id,
        token_address: 0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672
            .try_into()
            .unwrap(),
        token_id: Option::Some(8),
        fulfill_broker_address: test_address()
    };

    let fulfill_info_hash = serialized_hash(fulfill_info);
    let signer = sign_mock(fulfill_info_hash, fulfiller);

    dispatcher.fulfill_order(fulfill_info, signer);
}

// create and order & fulfill it
#[test]
fn test_create_listing_order_and_fulfill() {
    let start_date = 1699556828;
    let end_date = start_date + (10 * 24 * 60 * 60);
    let (order_listing, signer, order_hash, _) = setup_listing(
        start_date, end_date, Option::Some(123)
    );
    let contract = declare("orderbook").unwrap();   
    let chain_id = 0x534e5f4d41494e;
    let contract_data = array![
        0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078, chain_id
    ];
    let (contract_address, _) = contract.deploy(@contract_data).unwrap();
    let dispatcher = OrderbookDispatcher { contract_address };
    whitelist_creator_broker(contract_address, order_listing.broker_id, dispatcher);
    dispatcher.create_order(order: order_listing, signer: signer);
    let fulfiller = 0x00E4769a4d2F7F69C70931A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078
        .try_into()
        .unwrap();
    let fulfill_info = FulfillInfo {
        order_hash: order_hash,
        related_order_hash: Option::None,
        fulfiller: fulfiller,
        token_chain_id: chain_id,
        token_address: 0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672
            .try_into()
            .unwrap(),
        token_id: Option::Some(10),
        fulfill_broker_address: test_address()
    };

    let fulfill_info_hash = serialized_hash(fulfill_info);
    let signer = sign_mock(fulfill_info_hash, fulfiller);

    dispatcher.fulfill_order(fulfill_info, signer);

    let order_status = dispatcher.get_order_status(order_hash);

    assert(order_status == OrderStatus::Fulfilled.into(), 'Status should be fulfilled');
}

// try to fulfill an order with the same fulfiller as the order creator
#[should_panic(expected: ('OB: order has same offerer',))]
#[test]
fn test_create_listing_order_and_fulfill_with_same_fulfiller() {
    let start_date = 1699556828;
    let end_date = start_date + (10 * 24 * 60 * 60);
    let (order_listing, signer, order_hash, _) = setup_listing(
        start_date, end_date, Option::Some(123)
    );
    let contract = declare("orderbook").unwrap();
    let chain_id = 0x534e5f4d41494e;
    let contract_data = array![
        0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078, chain_id
    ];
    let (contract_address, _) = contract.deploy(@contract_data).unwrap();
    let dispatcher = OrderbookDispatcher { contract_address };
    whitelist_creator_broker(contract_address, order_listing.broker_id, dispatcher);
    dispatcher.create_order(order: order_listing, signer: signer);

    let fulfill_info = FulfillInfo {
        order_hash: order_hash,
        related_order_hash: Option::None,
        fulfiller: order_listing.offerer,
        token_chain_id: chain_id,
        token_address: 0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672
            .try_into()
            .unwrap(),
        token_id: Option::Some(10),
        fulfill_broker_address: test_address()
    };

    let fulfill_info_hash = serialized_hash(fulfill_info);
    let signer = sign_mock(fulfill_info_hash, order_listing.offerer);

    dispatcher.fulfill_order(fulfill_info, signer);
}

#[should_panic(expected: ('OB: order not fulfillable',))]
#[test]
fn test_fulfill_already_fulfilled_order() {
    let start_date = 1699556828;
    let end_date = start_date + (10 * 24 * 60 * 60);
    let (order_listing, signer, order_hash, _) = setup_listing(
        start_date, end_date, Option::Some(123)
    );
    let contract = declare("orderbook").unwrap();   
    let chain_id = 0x534e5f4d41494e;
    let contract_data = array![
        0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078, chain_id
    ];
    let (contract_address, _) = contract.deploy(@contract_data).unwrap();
    let dispatcher = OrderbookDispatcher { contract_address };
    whitelist_creator_broker(contract_address, order_listing.broker_id, dispatcher);

    dispatcher.create_order(order: order_listing, signer: signer);
    let fulfiller = 0x00E4769a4d2F7F69C70931A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078
        .try_into()
        .unwrap();
    let fulfill_info = FulfillInfo {
        order_hash: order_hash,
        related_order_hash: Option::None,
        fulfiller: fulfiller,
        token_chain_id: chain_id,
        token_address: 0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672
            .try_into()
            .unwrap(),
        token_id: Option::Some(10),
        fulfill_broker_address: test_address()
    };
    let fulfill_info_hash = serialized_hash(fulfill_info);
    let signer = sign_mock(fulfill_info_hash, fulfiller);
    dispatcher.fulfill_order(fulfill_info, signer);
    dispatcher.fulfill_order(fulfill_info, signer);
}

#[should_panic(expected: ('OB: order expired',))]
#[test]
fn test_fulfill_expired_order() {
    let start_date = 1699556828;
    let end_date = start_date + (10 * 24 * 60 * 60);
    let (order_listing, signer, order_hash, _) = setup_listing(
        start_date, end_date, Option::Some(123)
    );
    let contract = declare("orderbook").unwrap();
    let chain_id = 0x534e5f4d41494e;
    let contract_data = array![
        0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078, chain_id
    ];
    let (contract_address, _) = contract.deploy(@contract_data).unwrap();
    let dispatcher = OrderbookDispatcher { contract_address };
    whitelist_creator_broker(contract_address, order_listing.broker_id, dispatcher);
    dispatcher.create_order(order: order_listing, signer: signer);

    start_warp(CheatTarget::One(contract_address), order_listing.end_date + 10);
    let fulfiller = 0x00E4269a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078
        .try_into()
        .unwrap();
    let fulfill_info = FulfillInfo {
        order_hash: order_hash,
        related_order_hash: Option::None,
        fulfiller: fulfiller,
        token_chain_id: chain_id,
        token_address: 0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672
            .try_into()
            .unwrap(),
        token_id: Option::Some(10),
        fulfill_broker_address: test_address()
    };
    let fulfill_info_hash = serialized_hash(fulfill_info);
    let fulfill_signer = sign_mock(fulfill_info_hash, fulfiller);
    dispatcher.fulfill_order(fulfill_info, fulfill_signer);
}
