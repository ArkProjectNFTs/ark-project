use core::debug::PrintTrait;
use core::option::OptionTrait;
use arkchain::orderbook::orderbook;
use arkchain::order::order_v1::OrderV1;
use core::traits::Into;
use core::traits::TryInto;
use arkchain::order::types::{OrderTrait, RouteType, OrderType, FulfillInfo, OrderStatus};
use arkchain::order::database::{order_read, order_status_read, order_status_write, order_type_read};
use snforge_std::{
    start_warp, declare, ContractClassTrait, spy_events, EventSpy, EventFetcher, EventAssertions,
    Event, SpyOn, test_address
};
use arkchain::orderbook::orderbook_errors;
use array::ArrayTrait;
use super::super::common::setup::{setup_listing_order, get_offer_order, setup_orders};
const ORDER_VERSION_V1: felt252 = 'v1';
use arkchain::crypto::signer::{SignInfo, Signer, SignerValidator};

#[test]
fn test_create_listing() {
    let (order_listing_1, order_hash_1, token_hash_1) = setup_listing_order(600000000000000000);
    let contract_address = test_address();
    let mut state = orderbook::contract_state_for_testing();
    let mut spy = spy_events(SpyOn::One(contract_address));

    orderbook::InternalFunctions::_create_listing_order(
        ref state, order_listing_1, OrderType::Listing, order_hash_1
    );

    let order_option = order_read::<OrderV1>(order_hash_1);
    let order_status = order_status_read(order_hash_1);
    let order_type = order_type_read(order_hash_1);
    assert(order_option.is_some(), 'storage order');
    let order = order_option.unwrap();
    assert(order_status.is_some(), 'storage order');
    assert(order_status.unwrap() == OrderStatus::Open, 'order status');
    assert(order_type.is_some(), 'storage order');
    assert(order_type.unwrap() == OrderType::Listing, 'order type');
    assert(order.token_address == order_listing_1.token_address, 'token address does not match');
    // test price
    assert(order.start_amount == order_listing_1.start_amount, 'price does not match');
    // test price start amount with value
    assert(order.start_amount == 600000000000000000.into(), 'price does not match');
    // assert the order hash is associated in the storage to the ressource hash
    let order_hash = order.compute_order_hash();
    let token_hash = order.compute_token_hash();
    let state_order_hash_for_token_hash =
        orderbook::InternalFunctions::_get_order_hash_from_token_hash(
        @state, token_hash
    );
    assert(state_order_hash_for_token_hash == order_hash, 'storage order');
    spy
        .assert_emitted(
            @array![
                (
                    contract_address,
                    orderbook::Event::OrderPlaced(
                        orderbook::OrderPlaced {
                            order_hash: order_hash_1,
                            cancelled_order_hash: Option::None,
                            order_version: ORDER_VERSION_V1,
                            order_type: OrderType::Listing,
                            order: order_listing_1
                        }
                    )
                )
            ]
        );
}

#[should_panic(expected: ('OB: order not cancellable',))]
#[test]
fn test_recreate_listing_same_owner() {
    let (order_listing_1, order_hash_1, token_hash_1) = setup_listing_order(600000000000000000);
    let contract_address = test_address();
    let mut state = orderbook::contract_state_for_testing();
    orderbook::InternalFunctions::_create_listing_order(
        ref state, order_listing_1, OrderType::Listing, order_hash_1
    );
    // check is first order is fulfilled
    let order_status = order_status_read(order_hash_1);
    assert(order_status.unwrap() == OrderStatus::Open, 'Order not open');
    // create a second order over the first one same ressource hash different price
    let (order_listing_2, order_hash_2, token_hash_2) = setup_listing_order(500000000000000000);
    orderbook::InternalFunctions::_create_listing_order(
        ref state, order_listing_2, OrderType::Listing, order_hash_2
    );
}

#[should_panic(expected: ('OB: order fulfilled',))]
#[test]
fn test_recreate_listing_different_offerer_fulfilled() {
    let (order_listing_1, order_hash_1, token_hash_1) = setup_listing_order(600000000000000000);
    let contract_address = test_address();
    let mut state = orderbook::contract_state_for_testing();
    orderbook::InternalFunctions::_create_listing_order(
        ref state, order_listing_1, OrderType::Listing, order_hash_1
    );
    let order_option = order_read::<OrderV1>(order_hash_1);
    let order_status = order_status_read(order_hash_1);
    let order_type = order_type_read(order_hash_1);
    // fullfill the order 1
    order_status_write(order_hash_1, OrderStatus::Fulfilled);
    // check is first order is fulfilled
    let order_status = order_status_read(order_hash_1);
    assert(order_status.unwrap() == OrderStatus::Fulfilled, 'Order not fulfilled');
    // create a second order over the first one same ressource hash different price, different owner but the previous order is only fulfilled, to cover the case of user who just bought a token to list it instantly but the order is not yet executed
    // we cannot place & cancel a previous order if it's fulfilled
    let (mut order_listing_2, order_hash_2, token_hash_2) = setup_listing_order(500000000000000000);
    order_listing_2
        .offerer = 0x00E4769a4d2F7F69C70951A333eBA5c32707Cef3CdfB6B27cA63567f51cdd078
        .try_into()
        .unwrap();
    orderbook::InternalFunctions::_create_listing_order(
        ref state, order_listing_2, OrderType::Listing, order_hash_2
    );
}

#[should_panic(expected: ('OB: order fulfilled',))]
#[test]
fn test_recreate_listing_same_offerer_fulfilled() {
    let (order_listing_1, order_hash_1, token_hash_1) = setup_listing_order(600000000000000000);
    let contract_address = test_address();
    let mut state = orderbook::contract_state_for_testing();
    orderbook::InternalFunctions::_create_listing_order(
        ref state, order_listing_1, OrderType::Listing, order_hash_1
    );
    let order_option = order_read::<OrderV1>(order_hash_1);
    let order_status = order_status_read(order_hash_1);
    let order_type = order_type_read(order_hash_1);
    // fullfill the order 1
    order_status_write(order_hash_1, OrderStatus::Fulfilled);
    // check is first order is fulfilled
    let order_status = order_status_read(order_hash_1);
    assert(order_status.unwrap() == OrderStatus::Fulfilled, 'Order not fulfilled');
    // create a second order over the first one same ressource hash different price, different owner but the previous order is only fulfilled, to cover the case of user who just bought a token to list it instantly but the order is not yet executed
    // we cannot place & cancel a previous order if it's fulfilled
    let (mut order_listing_2, order_hash_2, token_hash_2) = setup_listing_order(500000000000000000);
    order_listing_2
        .offerer = 0x00E4769a4d2F7F69C70951A333eBA5c32707Cef3CdfB6B27cA63567f51cdd078
        .try_into()
        .unwrap();
    orderbook::InternalFunctions::_create_listing_order(
        ref state, order_listing_2, OrderType::Listing, order_hash_2
    );
}

#[test]
fn test_recreate_listing_new_owner() {
    let (order_listing_1, order_hash_1, token_hash_1) = setup_listing_order(600000000000000000);
    let contract_address = test_address();
    let mut state = orderbook::contract_state_for_testing();
    orderbook::InternalFunctions::_create_listing_order(
        ref state, order_listing_1, OrderType::Listing, order_hash_1
    );
    // create a second order over the first one same ressource hash different price, different owner it should work and cancel the previous one
    let (mut order_listing_2, order_hash_2, token_hash_2) = setup_listing_order(500000000000000000);
    order_listing_2
        .offerer = 0x00E4769a4d2F7F69C70951A333eBA5c32707Cef3CdfB6B27cA63567f51cdd078
        .try_into()
        .unwrap();
    orderbook::InternalFunctions::_create_listing_order(
        ref state, order_listing_2, OrderType::Listing, order_hash_2
    );

    // assert order1 is cancelled
    let order_option = order_read::<OrderV1>(order_hash_1);
    let order_status = order_status_read(order_hash_1);
    let order_type = order_type_read(order_hash_1);
    assert(order_option.is_some(), 'storage order');
    let order = order_option.unwrap();
    assert(order_status.is_some(), 'storage order');
    assert(order_status.unwrap() == OrderStatus::CancelledByNewOrder, 'order status');

    // assert order2 is open
    let order_option = order_read::<OrderV1>(order_hash_2);
    let order_status = order_status_read(order_hash_2);
    assert(order_option.is_some(), 'storage order');
    let order = order_option.unwrap();
    assert(order_status.is_some(), 'storage order');
    assert(order_status.unwrap() == OrderStatus::Open, 'order status');
    assert(order.token_address == order_listing_2.token_address, 'token address does not match');
}

#[test]
fn test_recreate_listing_same_owner_old_order_expired() {
    let (mut order_listing_1, order_hash_1, token_hash_1) = setup_listing_order(600000000000000000);
    let contract_address = test_address();
    let mut state = orderbook::contract_state_for_testing();
    order_listing_1.end_date = starknet::get_block_timestamp();
    orderbook::InternalFunctions::_create_listing_order(
        ref state, order_listing_1, OrderType::Listing, order_hash_1
    );
    // create a second order over the first one same ressource hash different price, different owner it should work and cancel the previous one
    let (order_listing_2, order_hash_2, token_hash_2) = setup_listing_order(500000000000000000);

    orderbook::InternalFunctions::_create_listing_order(
        ref state, order_listing_2, OrderType::Listing, order_hash_2
    );

    // assert order1 is cancelled
    let order_option = order_read::<OrderV1>(order_hash_1);
    let order_status = order_status_read(order_hash_1);
    let order_type = order_type_read(order_hash_1);
    assert(order_option.is_some(), 'storage order');
    let order = order_option.unwrap();
    assert(order_status.is_some(), 'storage order');
    assert(order_status.unwrap() == OrderStatus::CancelledByNewOrder, 'order status');

    // assert order2 is open
    let order_option = order_read::<OrderV1>(order_hash_2);
    let order_status = order_status_read(order_hash_2);
    assert(order_option.is_some(), 'storage order');
    let order = order_option.unwrap();
    assert(order_status.is_some(), 'storage order');
    assert(order_status.unwrap() == OrderStatus::Open, 'order status');
    assert(order.token_address == order_listing_2.token_address, 'token address does not match');
}

#[test]
fn test_create_offer() {
    let offer_order = get_offer_order();
    let order_hash = '123';

    let contract_address = test_address();
    let mut state = orderbook::contract_state_for_testing();
    let mut spy = spy_events(SpyOn::One(contract_address));

    orderbook::InternalFunctions::_create_offer(
        ref state, offer_order, OrderType::Offer, order_hash
    );

    let order_option = order_read::<OrderV1>(order_hash);
    assert(order_option.is_some(), 'storage order');
    let order = order_option.unwrap();
    assert(order.token_address == offer_order.token_address, 'token address does not match');

    spy
        .assert_emitted(
            @array![
                (
                    contract_address,
                    orderbook::Event::OrderPlaced(
                        orderbook::OrderPlaced {
                            order_hash,
                            order_version: ORDER_VERSION_V1,
                            order_type: OrderType::Offer,
                            order: offer_order,
                            cancelled_order_hash: Option::None
                        }
                    )
                )
            ]
        );
}

#[test]
fn test_create_collection_offer() {
    let contract_address = test_address();
    let mut spy = spy_events(SpyOn::One(contract_address));

    let mut offer_order = get_offer_order();
    offer_order.token_id = Option::None;
    let order_hash = '123';

    let mut state = orderbook::contract_state_for_testing();
    orderbook::InternalFunctions::_create_collection_offer(
        ref state, offer_order, OrderType::CollectionOffer, order_hash
    );

    let order_option = order_read::<OrderV1>(order_hash);
    assert(order_option.is_some(), 'storage order');
    let order = order_option.unwrap();
    assert(order.token_address == offer_order.token_address, 'token address does not match');

    spy
        .assert_emitted(
            @array![
                (
                    contract_address,
                    orderbook::Event::OrderPlaced(
                        orderbook::OrderPlaced {
                            order_hash,
                            order_version: ORDER_VERSION_V1,
                            order_type: OrderType::CollectionOffer,
                            order: offer_order,
                            cancelled_order_hash: Option::None
                        }
                    )
                )
            ]
        );
}

#[test]
fn test_create_listing_order_and_fulfill_the_order() {
    let (mut order_listing_1, order_hash_1, token_hash_1) = setup_listing_order(600000000000000000);
    let contract_address = test_address();
    let mut state = orderbook::contract_state_for_testing();
    orderbook::InternalFunctions::_create_listing_order(
        ref state, order_listing_1, OrderType::Listing, order_hash_1
    );

    let fulfill_info = FulfillInfo {
        order_hash: order_hash_1,
        related_order_hash: Option::None,
        fulfiller: 0x00E4769a4d2F7F69C70951A333eBA5c32707Cef3CdfB6B27cA63567f51cdd078
            .try_into()
            .unwrap(),
        token_chain_id: order_listing_1.token_chain_id,
        token_address: order_listing_1.token_address,
        token_id: order_listing_1.token_id,
    };

    // Try to fulfill the order
    orderbook::InternalFunctions::_fulfill_listing_order(ref state, fulfill_info, order_listing_1,);

    // assert order1 is fulfilled
    let order_option = order_read::<OrderV1>(order_hash_1);
    let order_status = order_status_read(order_hash_1);
    let order_type = order_type_read(order_hash_1);
    assert(order_option.is_some(), 'storage order');
    let order = order_option.unwrap();
    assert(order_status.is_some(), 'storage order');
    assert(order_status.unwrap() == OrderStatus::Fulfilled, 'order status');
}

// another test trying to fulfill an expired order: should fail
#[should_panic(expected: ('OB: order expired',))]
#[test]
fn test_create_listing_order_and_fulfill_the_order_expired() {
    let (mut order_listing_1, order_hash_1, token_hash_1) = setup_listing_order(600000000000000000);
    let contract_address = test_address();
    let mut state = orderbook::contract_state_for_testing();
    order_listing_1
        .end_date =
            starknet::get_block_timestamp(); // we use the current block timestamp to make the order expired because if we substract it will be negative
    orderbook::InternalFunctions::_create_listing_order(
        ref state, order_listing_1, OrderType::Listing, order_hash_1
    );

    let fulfill_info = FulfillInfo {
        order_hash: order_hash_1,
        related_order_hash: Option::None,
        fulfiller: 0x00E4769a4d2F7F69C70951A333eBA5c32707Cef3CdfB6B27cA63567f51cdd078
            .try_into()
            .unwrap(),
        token_chain_id: order_listing_1.token_chain_id,
        token_address: order_listing_1.token_address,
        token_id: order_listing_1.token_id,
    };

    // Try to fulfill the order
    orderbook::InternalFunctions::_fulfill_listing_order(ref state, fulfill_info, order_listing_1,);
}

#[test]
fn test_fulfill_classic_token_offer() {
    let user_pubkey: felt252 = 0x00E4769a4d2F7F69C70951A333eBA5c32707Cef3CdfB6B27cA63567f51cdd078;

    let (order_listing, order_offer, order_auction, order_collection_offer) = setup_orders();
    let contract_address = test_address();
    let mut state = orderbook::contract_state_for_testing();

    let mut spy = spy_events(SpyOn::One(contract_address));
    let order_hash = order_listing.compute_order_hash();

    let fulfill_info = FulfillInfo {
        order_hash,
        related_order_hash: Option::Some(order_offer.compute_order_hash()),
        fulfiller: order_listing.offerer,
        token_chain_id: order_listing.token_chain_id,
        token_address: order_listing.token_address,
        token_id: order_listing.token_id
    };

    orderbook::InternalFunctions::_fulfill_offer(ref state, fulfill_info, order_listing);

    spy
        .assert_emitted(
            @array![
                (
                    contract_address,
                    orderbook::Event::OrderFulfilled(
                        orderbook::OrderFulfilled {
                            order_hash: fulfill_info.order_hash, fulfiller: fulfill_info.fulfiller
                        }
                    )
                )
            ]
        );
}

#[test]
fn test_fulfill_classic_collection_offer() {
    let user_pubkey: felt252 = 0x00E4769a4d2F7F69C70951A333eBA5c32707Cef3CdfB6B27cA63567f51cdd078;

    let (order_listing, mut order_offer, order_auction, order_collection_offer) = setup_orders();
    let contract_address = test_address();
    let mut spy = spy_events(SpyOn::One(contract_address));
    let mut state = orderbook::contract_state_for_testing();

    order_offer.token_id = Option::None;

    let fulfill_info = FulfillInfo {
        order_hash: order_listing.compute_order_hash(),
        related_order_hash: Option::Some(order_offer.compute_order_hash()),
        fulfiller: order_listing.offerer,
        token_chain_id: order_listing.token_chain_id,
        token_address: order_listing.token_address,
        token_id: Option::None
    };

    orderbook::InternalFunctions::_fulfill_offer(ref state, fulfill_info, order_listing);

    spy
        .assert_emitted(
            @array![
                (
                    contract_address,
                    orderbook::Event::OrderFulfilled(
                        orderbook::OrderFulfilled {
                            order_hash: fulfill_info.order_hash, fulfiller: fulfill_info.fulfiller
                        }
                    )
                )
            ]
        );
}

#[test]
#[should_panic(expected: ('OB: order expired',))]
fn test_fulfill_expired_offer() {
    let user_pubkey: felt252 = 0x00E4769a4d2F7F69C70951A333eBA5c32707Cef3CdfB6B27cA63567f51cdd078;

    let (order_listing, order_offer, order_auction, order_collection_offer) = setup_orders();
    let contract_address = test_address();
    let mut state = orderbook::contract_state_for_testing();

    start_warp(contract_address, order_listing.end_date + 3600); // +1 hour

    let fulfill_info = FulfillInfo {
        order_hash: order_listing.compute_order_hash(),
        related_order_hash: Option::Some(order_offer.compute_order_hash()),
        fulfiller: order_listing.offerer,
        token_chain_id: order_listing.token_chain_id,
        token_address: order_listing.token_address,
        token_id: order_listing.token_id
    };

    orderbook::InternalFunctions::_fulfill_offer(ref state, fulfill_info, order_listing);
}
