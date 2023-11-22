use core::traits::TryInto;
use core::traits::Into;
use core::option::OptionTrait;
use snforge_std::{PrintTrait, declare, ContractClassTrait};
use arkchain::orderbook::Orderbook;
use arkchain::orderbook::orderbook;
use arkchain::order::order_v1::OrderV1;
use arkchain::order::order_v1::RouteType;
use arkchain::crypto::{hash::{serialized_hash}, signer::{Signer, SignInfo}};
use arkchain::order::order_v1::OrderTrait;
use arkchain::order::order_v1::OrderType;
use arkchain::order::types::{OrderStatus, FulfillInfo};
use arkchain::orderbook::{OrderbookDispatcher, OrderbookDispatcherTrait};
use starknet::deploy_syscall;

use super::super::common::signer::sign_mock;
use super::super::common::setup::{setup, setup_listing_order_with_sign};

// try to fulfill an order that doesn't exist
#[should_panic(expected: ('OB: order not found',))]
#[test]
fn test_create_listing_order_and_fulfill_non_existing_order() {
    let block_timestamp = 1699556828; // starknet::get_block_timestamp();
    let (order_listing, signer, _order_hash, token_hash) = setup(block_timestamp, false);
    let contract = declare('orderbook');
    let contract_data = array![0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078];
    let contract_address = contract.deploy(@contract_data).unwrap();
    let dispatcher = OrderbookDispatcher { contract_address };

    let fulfill_info = FulfillInfo {
        order_hash: 0x00E4769a444F7FF9C70951A333eBA5c32707Cef3CdfB6B27cA63567f51cdd078
            .try_into()
            .unwrap(),
        related_order_hash: Option::None,
        fulfiller: 0x00E4769a4d2F7F69C70951A333eBA5c32707Cef3CdfB6B27cA63567f51cdd078
            .try_into()
            .unwrap(),
        token_chain_id: 0x534e5f4d41494e.try_into().unwrap(),
        token_address: 0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672
            .try_into()
            .unwrap(),
        token_id: Option::Some(8),
    };

    let fulfill_info_hash = serialized_hash(fulfill_info);
    let signer = sign_mock(fulfill_info_hash);

    dispatcher.fulfill_order(fulfill_info, signer);
}

// create and order & fulfill it
#[test]
fn test_create_listing_order_and_fulfill() {
    let block_timestamp = 1699556828; // starknet::get_block_timestamp();
    let (order_listing, signer, order_hash, token_hash) = setup(block_timestamp, false);
    let contract = declare('orderbook');
    let contract_data = array![0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078];
    let contract_address = contract.deploy(@contract_data).unwrap();
    let dispatcher = OrderbookDispatcher { contract_address };

    dispatcher.create_order(order: order_listing, signer: signer);
    let order = dispatcher.get_order(order_hash);

    let fulfill_info = FulfillInfo {
        order_hash: order_hash,
        related_order_hash: Option::None,
        fulfiller: 0x00E4769a4d2F7F69C70931A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078
            .try_into()
            .unwrap(),
        token_chain_id: 0x534e5f4d41494e.try_into().unwrap(),
        token_address: 0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672
            .try_into()
            .unwrap(),
        token_id: Option::Some(10),
    };

    let fulfill_info_hash = serialized_hash(fulfill_info);
    let signer = sign_mock(fulfill_info_hash);

    dispatcher.fulfill_order(fulfill_info, signer);

    let order: OrderV1 = dispatcher.get_order(order_hash);
    let order_status = dispatcher.get_order_status(order_hash);

    assert(order_status == OrderStatus::Fulfilled.into(), 'Status should be fulfilled');
}

// try to fulfill an order with the same fulfiller as the order creator
#[should_panic(expected: ('OB: order has same offerer',))]
#[test]
fn test_create_listing_order_and_fulfill_with_same_fulfiller() {
    let block_timestamp = 1699556828; // starknet::get_block_timestamp();
    let (order_listing, signer, order_hash, token_hash) = setup(block_timestamp, false);
    let contract = declare('orderbook');
    let contract_data = array![0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078];
    let contract_address = contract.deploy(@contract_data).unwrap();
    let dispatcher = OrderbookDispatcher { contract_address };

    dispatcher.create_order(order: order_listing, signer: signer);
    let order = dispatcher.get_order(order_hash);

    let fulfill_info = FulfillInfo {
        order_hash: order_hash,
        related_order_hash: Option::None,
        fulfiller: 0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078
            .try_into()
            .unwrap(),
        token_chain_id: 0x534e5f4d41494e.try_into().unwrap(),
        token_address: 0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672
            .try_into()
            .unwrap(),
        token_id: Option::Some(10),
    };

    let fulfill_info_hash = serialized_hash(fulfill_info);
    let signer = sign_mock(fulfill_info_hash);

    dispatcher.fulfill_order(fulfill_info, signer);
}

#[should_panic(expected: ('OB: order not fulfillable',))]
#[test]
fn test_fulfill_already_fulfilled_order() {
    let block_timestamp = 1699556828;
    let (order_listing, signer, order_hash, token_hash) = setup(block_timestamp, false);
    let contract = declare('orderbook');
    let contract_data = array![0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078];
    let contract_address = contract.deploy(@contract_data).unwrap();
    let dispatcher = OrderbookDispatcher { contract_address };
    dispatcher.create_order(order: order_listing, signer: signer);

    let fulfill_info = FulfillInfo {
        order_hash: order_hash,
        related_order_hash: Option::None,
        fulfiller: 0x00E4769a4d2F7F69C70931A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078
            .try_into()
            .unwrap(),
        token_chain_id: 0x534e5f4d41494e.try_into().unwrap(),
        token_address: 0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672
            .try_into()
            .unwrap(),
        token_id: Option::Some(10),
    };
    let fulfill_info_hash = serialized_hash(fulfill_info);
    let signer = sign_mock(fulfill_info_hash);
    dispatcher.fulfill_order(fulfill_info, signer);
    dispatcher.fulfill_order(fulfill_info, signer);
}

#[should_panic(expected: ('OB: order expired',))]
#[test]
fn test_fulfill_expired_order() {
    let block_timestamp = starknet::get_block_timestamp();
    let (mut order_listing, signer, order_hash, token_hash) = setup(block_timestamp, true);
    let contract = declare('orderbook');
    let contract_data = array![0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078];
    let contract_address = contract.deploy(@contract_data).unwrap();
    let dispatcher = OrderbookDispatcher { contract_address };
    order_listing.end_date = starknet::get_block_timestamp();

    dispatcher.create_order(order: order_listing, signer: signer);

    let fulfill_info = FulfillInfo {
        order_hash: order_hash,
        related_order_hash: Option::None,
        fulfiller: 0x00E4269a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078
            .try_into()
            .unwrap(),
        token_chain_id: 0x534e5f4d41494e.try_into().unwrap(),
        token_address: 0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672
            .try_into()
            .unwrap(),
        token_id: Option::Some(10),
    };
    let fulfill_info_hash = serialized_hash(fulfill_info);
    let fulfill_signer = sign_mock(fulfill_info_hash);
    dispatcher.fulfill_order(fulfill_info, fulfill_signer);
}
