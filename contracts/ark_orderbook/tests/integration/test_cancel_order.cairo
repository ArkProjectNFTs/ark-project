use core::traits::TryInto;
use core::traits::Into;
use core::option::OptionTrait;
use ark_common::crypto::{signer::{Signer, SignInfo}, hash::serialized_hash};
use ark_common::protocol::order_types::{OrderStatus, OrderTrait, OrderType, CancelInfo, RouteType};
use ark_orderbook::orderbook::Orderbook;
use ark_orderbook::order::order_v1::OrderV1;
use ark_orderbook::orderbook::{OrderbookDispatcher, OrderbookDispatcherTrait};
use starknet::deploy_syscall;
use snforge_std::{
    PrintTrait, start_warp, declare, ContractClassTrait, spy_events, EventSpy, EventFetcher,
    EventAssertions, Event, SpyOn, test_address,
    signature::{StarkCurveKeyPair, StarkCurveKeyPairTrait, Verifier}
};

use super::super::common::setup::{
    setup_auction_order, setup_listing, sign_mock, setup_orders, setup_offer,
    whitelist_creator_broker
};

#[test]
fn test_cancel_auction() {
    let start_date = 1699556828;
    let end_date = start_date + (10 * 24 * 60 * 60);

    let (auction_listing_order, signer, order_hash, token_hash) = setup_auction_order(
        start_date, end_date, 1, 10, Option::None
    );

    let contract = declare('orderbook');
    let chain_id = 0x534e5f4d41494e;
    let contract_data = array![
        0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078, chain_id
    ];
    let contract_address = contract.deploy(@contract_data).unwrap();

    let dispatcher = OrderbookDispatcher { contract_address };
    whitelist_creator_broker(contract_address, auction_listing_order.broker_id, dispatcher);
    dispatcher.create_order(order: auction_listing_order, signer: signer);

    let cancel_info = CancelInfo {
        order_hash: order_hash,
        canceller: auction_listing_order.offerer,
        token_chain_id: auction_listing_order.token_chain_id,
        token_address: auction_listing_order.token_address,
        token_id: auction_listing_order.token_id,
    };

    let cancel_info_hash = serialized_hash(cancel_info);
    let canceller_signer = sign_mock(cancel_info_hash, auction_listing_order.offerer);
    dispatcher.cancel_order(cancel_info, signer: canceller_signer);
}

#[test]
#[should_panic(expected: ('OB: order not found',))]
fn test_cancel_non_existing_order() {
    let start_date = 1699556828;
    let end_date = start_date + (10 * 24 * 60 * 60);
    let (auction_listing_order, signer, order_hash, token_hash) = setup_auction_order(
        start_date, end_date, 1, 10, Option::None
    );
    let order_hash = auction_listing_order.compute_order_hash();
    let canceller = 0x2284a6517b487be8114013f277f9e2010ac001a24a93e3c48cdf5f8f345a81b
        .try_into()
        .unwrap();
    let contract = declare('orderbook');
    let chain_id = 0x534e5f4d41494e;
    let contract_data = array![
        0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078, chain_id
    ];
    let contract_address = contract.deploy(@contract_data).unwrap();
    let cancel_info = CancelInfo {
        order_hash: order_hash,
        canceller: canceller,
        token_chain_id: 0,
        token_address: 0x00E4769a4d2F7F69C70931A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078
            .try_into()
            .unwrap(),
        token_id: Option::Some(1),
    };
    let cancel_info_hash = serialized_hash(cancel_info);
    let canceller_signer = sign_mock(cancel_info_hash, canceller);
    let dispatcher = OrderbookDispatcher { contract_address };
    dispatcher.cancel_order(cancel_info, signer: canceller_signer);
}

#[test]
#[should_panic(expected: ('OB: auction is expired',))]
fn test_invalid_cancel_auction_order() {
    let start_date = 1699556828;
    let end_date = start_date + (10 * 24 * 60 * 60);

    let (auction_listing_order, signer, order_hash, token_hash) = setup_auction_order(
        start_date, end_date, 1, 10, Option::None
    );

    let contract = declare('orderbook');
    let chain_id = 0x534e5f4d41494e;
    let contract_data = array![
        0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078, chain_id
    ];
    let contract_address = contract.deploy(@contract_data).unwrap();

    let dispatcher = OrderbookDispatcher { contract_address };
    whitelist_creator_broker(contract_address, auction_listing_order.broker_id, dispatcher);
    dispatcher.create_order(order: auction_listing_order, signer: signer);

    let order_type = dispatcher.get_order_type(order_hash);
    assert(order_type == OrderType::Auction.into(), 'order is not auction');

    let cancel_info = CancelInfo {
        order_hash: order_hash,
        canceller: auction_listing_order.offerer,
        token_chain_id: auction_listing_order.token_chain_id,
        token_address: auction_listing_order.token_address,
        token_id: auction_listing_order.token_id
    };

    start_warp(contract_address, end_date + 10);
    let order_hash = auction_listing_order.compute_order_hash();

    let cancel_info_hash = serialized_hash(cancel_info);
    let canceller_signer = sign_mock(cancel_info_hash, auction_listing_order.offerer);
    dispatcher.cancel_order(cancel_info, signer: canceller_signer);
}

#[test]
fn test_cancel_auction_during_the_extended_time() {
    let start_date = 1699556828;
    let end_date = start_date + (10 * 24 * 60 * 60);

    let (auction_listing_order, auction_listing_signer, order_hash, token_hash) =
        setup_auction_order(
        start_date, end_date, 1, 10, Option::None
    );

    let contract = declare('orderbook');
    let chain_id = 0x534e5f4d41494e;
    let contract_data = array![
        0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078, chain_id
    ];
    let contract_address = contract.deploy(@contract_data).unwrap();
    let dispatcher = OrderbookDispatcher { contract_address };
    whitelist_creator_broker(contract_address, auction_listing_order.broker_id, dispatcher);
    dispatcher.create_order(order: auction_listing_order, signer: auction_listing_signer);
    let order_type = dispatcher.get_order_type(order_hash);
    assert(order_type == OrderType::Auction.into(), 'order is not auction');
    start_warp(contract_address, end_date - 1);
    let (auction_offer, signer, auction_order_hash, auction_token_hash) = setup_offer(
        end_date - 1, end_date + 1200, Option::None, Option::None
    );
    dispatcher.create_order(order: auction_offer, signer: signer);
    let order_expiration_date = dispatcher.get_auction_expiration(auction_order_hash);
    let expected_end_date = end_date + 600;
    assert(order_expiration_date == expected_end_date, 'order end date is not correct');
    start_warp(contract_address, end_date + 5);
    let cancel_info = CancelInfo {
        order_hash: order_hash,
        canceller: auction_listing_order.offerer,
        token_chain_id: auction_listing_order.token_chain_id,
        token_address: auction_listing_order.token_address,
        token_id: auction_listing_order.token_id
    };

    let cancel_info_hash = serialized_hash(cancel_info);
    let canceller_signer = sign_mock(cancel_info_hash, auction_listing_order.offerer);

    dispatcher.cancel_order(cancel_info, signer: canceller_signer);
}
