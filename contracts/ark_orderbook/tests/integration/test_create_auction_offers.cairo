use core::traits::TryInto;
use core::traits::Into;
use core::option::OptionTrait;
use ark_orderbook::orderbook::Orderbook;
use ark_common::crypto::{signer::{Signer, SignInfo}, hash::serialized_hash};
use ark_common::protocol::order_types::{RouteType, FulfillInfo, OrderTrait, OrderType, OrderStatus};
use ark_orderbook::order::order_v1::OrderV1;
use ark_orderbook::orderbook::{OrderbookDispatcher, OrderbookDispatcherTrait};
use starknet::deploy_syscall;
use snforge_std::{
    start_warp, declare, ContractClassTrait, spy_events, EventSpy, EventFetcher, EventAssertions,
    Event, SpyOn, test_address, signature::{StarkCurveKeyPair, StarkCurveKeyPairTrait, Verifier}
};
use super::super::common::setup::{setup_auction_order, sign_mock, setup_orders, setup_offer};

#[test]
fn test_create_valid_auction_offer() {
    let start_date = 1699556828;
    let end_date = start_date + (10 * 24 * 60 * 60);

    let (auction_listing_order, signer, order_hash, token_hash) = setup_auction_order(
        start_date, end_date, 1, 10, Option::None
    );

    let contract = declare('orderbook');
    let contract_data = array![0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078];
    let contract_address = contract.deploy(@contract_data).unwrap();

    let dispatcher = OrderbookDispatcher { contract_address };
    dispatcher.create_order(order: auction_listing_order, signer: signer);

    let (auction_offer, signer, order_hash, token_hash) = setup_offer(
        start_date + 10, start_date + 50, Option::None, Option::None
    );
    dispatcher.create_order(order: auction_offer, signer: signer);
}

#[test]
fn test_accept_auction_after_expiration() {
    let start_date = 1699556828;
    let end_date = start_date + (10 * 24 * 60 * 60);

    let (auction_listing_order, signer, order_hash, token_hash) = setup_auction_order(
        start_date, end_date, 1, 10, Option::None
    );

    let contract = declare('orderbook');
    let contract_data = array![0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078];
    let contract_address = contract.deploy(@contract_data).unwrap();

    let dispatcher = OrderbookDispatcher { contract_address };
    dispatcher.create_order(order: auction_listing_order, signer: signer);

    let (auction_offer, signer, auction_offer_order_hash, token_hash) = setup_offer(
        start_date + 1000, start_date + 3000, Option::None, Option::None
    );

    start_warp(contract_address, start_date + 1000);
    dispatcher.create_order(order: auction_offer, signer: signer);

    start_warp(contract_address, end_date + 3600); // +1 hour
}
