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
use super::super::common::setup::{
    setup_auction_order, setup, sign_mock, setup_orders, setup_auction_offer
};
use snforge_std::{
    PrintTrait, start_warp, declare, ContractClassTrait, spy_events, EventSpy, EventFetcher,
    EventAssertions, Event, SpyOn, test_address,
    signature::{StarkCurveKeyPair, StarkCurveKeyPairTrait, Verifier}
};

#[test]
#[should_panic(expected: ('OB: order already exists',))]
fn test_create_existing_order() {
    let block_timestamp = 1699556828; // starknet::get_block_timestamp();
    let (order_listing, signer, _order_hash, token_hash) = setup(block_timestamp);
    let contract = declare('orderbook');
    let contract_data = array![0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078];
    let contract_address = contract.deploy(@contract_data).unwrap();
    let dispatcher = OrderbookDispatcher { contract_address };
    dispatcher.create_order(order: order_listing, signer: signer);
    dispatcher.create_order(order: order_listing, signer: signer);
}

#[test]
fn test_create_listing_order() {
    let block_timestamp = 1699556828; // starknet::get_block_timestamp();
    let (order_listing, signer, _order_hash, token_hash) = setup(block_timestamp);
    let contract = declare('orderbook');
    let contract_data = array![0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078];
    let contract_address = contract.deploy(@contract_data).unwrap();
    let dispatcher = OrderbookDispatcher { contract_address };

    dispatcher.create_order(order: order_listing, signer: signer);
    let order = dispatcher.get_order(_order_hash);
    let order_status = dispatcher.get_order_status(_order_hash);
    let order_type = dispatcher.get_order_type(_order_hash);
    let order_hash = dispatcher.get_order_hash(token_hash);

    assert(order.broker_id == 123, 'Broker id is not equal');
    assert(order.token_id.is_some(), 'No Token id');
    assert(order.token_id.unwrap() == 10, 'Token id is not equal');
    assert(
        order
            .token_address == 0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672
            .try_into()
            .unwrap(),
        'Token address is not equal'
    );
    assert(
        order
            .currency_address == 0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7
            .try_into()
            .unwrap(),
        'Currency address is not equal'
    );
    assert(order.quantity == 1, 'Quantity is not equal');
    assert(order.start_amount == 600000000000000000, 'Start amount is not equal');
    assert(order.end_amount == 0, 'End amount is not equal');
    assert(order.start_date == block_timestamp, 'Start date is not equal');
    assert(order.end_date == block_timestamp + (30 * 24 * 60 * 60), 'End date is not equal');
    assert(
        order
            .offerer == 0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078
            .try_into()
            .unwrap(),
        'Offerer is not equal'
    );
    assert(order_hash == _order_hash, 'Order hash is not equal');
    assert(order_type == OrderType::Listing.into(), 'Order type is not listing');
    assert(order_status == OrderStatus::Open.into(), 'Order status is not open');
}


#[test]
fn test_auction_order_with_extended_time_order() {
    let start_date = 1699556828;
    let end_date = start_date + (10 * 24 * 60 * 60);

    let (auction_listing_order, auction_listing_signer, order_hash, token_hash) =
        setup_auction_order(
        start_date, end_date, 1, 10
    );

    let contract = declare('orderbook');
    let contract_data = array![0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078];
    let contract_address = contract.deploy(@contract_data).unwrap();

    let dispatcher = OrderbookDispatcher { contract_address };
    dispatcher.create_order(order: auction_listing_order, signer: auction_listing_signer);

    let order_type = dispatcher.get_order_type(order_hash);
    assert(order_type == OrderType::Auction.into(), 'order is not auction');

    start_warp(contract_address, end_date - 1);
    let (auction_offer, signer, auction_order_hash, auction_token_hash) = setup_auction_offer(
        end_date - 1, end_date + 1200
    );
    dispatcher.create_order(order: auction_offer, signer: signer);
    let order_expiration_date = dispatcher.get_auction_expiration(auction_order_hash);

    let expected_end_date = end_date + 600;
    assert(order_expiration_date == expected_end_date, 'order end date is not correct');
}

