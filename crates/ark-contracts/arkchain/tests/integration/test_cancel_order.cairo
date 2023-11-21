use core::traits::TryInto;
use core::traits::Into;
use core::option::OptionTrait;
use arkchain::orderbook::Orderbook;
use arkchain::order::order_v1::OrderV1;
use arkchain::order::order_v1::RouteType;
use arkchain::crypto::signer::{Signer, SignInfo};
use arkchain::order::order_v1::OrderTrait;
use arkchain::order::order_v1::OrderType;
use arkchain::order::types::OrderStatus;
use arkchain::orderbook::{OrderbookDispatcher, OrderbookDispatcherTrait};
use starknet::deploy_syscall;
use snforge_std::{
    start_warp, declare, ContractClassTrait, spy_events, EventSpy, EventFetcher, EventAssertions,
    Event, SpyOn, test_address, signature::{StarkCurveKeyPair, StarkCurveKeyPairTrait, Verifier}
};
use super::super::common::setup::{
    setup_auction_order, setup, sign_mock, setup_orders, setup_auction_offer
};
use core::debug::PrintTrait;

#[test]
fn test_cancel_auction() {
    let start_date = 1699556828;
    let end_date = start_date + (10 * 24 * 60 * 60);

    let (auction_listing_order, signer, order_hash, token_hash) = setup_auction_order(
        start_date, end_date, 1, 10
    );

    let contract = declare('orderbook');
    let contract_data = array![0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078];
    let contract_address = contract.deploy(@contract_data).unwrap();

    let dispatcher = OrderbookDispatcher { contract_address };
    dispatcher.create_order(order: auction_listing_order, signer: signer);

    let order_hash = auction_listing_order.compute_order_hash();
    dispatcher.cancel_order(order_hash: order_hash, signer: signer);
}

#[test]
#[should_panic(expected: ('OB: order not found',))]
fn test_cancel_non_existing_order() {
    let start_date = 1699556828;
    let end_date = start_date + (10 * 24 * 60 * 60);

    let (auction_listing_order, signer, order_hash, token_hash) = setup_auction_order(
        start_date, end_date, 1, 10
    );
    let order_hash = auction_listing_order.compute_order_hash();

    let contract = declare('orderbook');
    let contract_data = array![0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078];
    let contract_address = contract.deploy(@contract_data).unwrap();

    let dispatcher = OrderbookDispatcher { contract_address };
    dispatcher.cancel_order(order_hash: order_hash, signer: signer);
}

#[test]
#[should_panic(expected: ('OB: auction is expired',))]
fn test_invalid_cancel_auction_order() {
    let start_date = 1699556828;
    let end_date = start_date + (10 * 24 * 60 * 60);

    let (auction_listing_order, signer, order_hash, token_hash) = setup_auction_order(
        start_date, end_date, 1, 10
    );

    let contract = declare('orderbook');
    let contract_data = array![0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078];
    let contract_address = contract.deploy(@contract_data).unwrap();

    let dispatcher = OrderbookDispatcher { contract_address };
    dispatcher.create_order(order: auction_listing_order, signer: signer);

    let order_type = dispatcher.get_order_type(order_hash);
    assert(order_type == OrderType::Auction.into(), 'order is not auction');

    start_warp(contract_address, end_date + 10);
    let order_hash = auction_listing_order.compute_order_hash();
    dispatcher.cancel_order(order_hash: order_hash, signer: signer);
}
// #[test]
// fn test_invalid_cancel_order_with_extended_time_order() {
//     let start_date = 1699556828;
//     let end_date = start_date + (10 * 24 * 60 * 60);

//     let (auction_listing_order, auction_listing_signer, order_hash, token_hash) =
//         setup_auction_order(
//         start_date, end_date, 1, 10
//     );

//     let contract = declare('orderbook');
//     let contract_data = array![0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078];
//     let contract_address = contract.deploy(@contract_data).unwrap();

//     let dispatcher = OrderbookDispatcher { contract_address };
//     dispatcher.create_order(order: auction_listing_order, signer: auction_listing_signer);

//     let (auction_offer, signer, order_hash, token_hash) = setup_auction_offer(
//         end_date - 1, end_date + 1200
//     );
//     dispatcher.create_order(order: auction_offer, signer: signer);
//     let order_expiration_date = dispatcher.get_auction_expiration(token_hash);
//     order_expiration_date.print();

//     // assert(order_expiration_date == end_date + 600, 'order end date is not correct');

//     // start_warp(contract_address, end_date + 5);
//     // let order_hash = auction_listing_order.compute_order_hash();
//     // dispatcher.cancel_order(order_hash: order_hash, signer: auction_listing_signer);
// }

