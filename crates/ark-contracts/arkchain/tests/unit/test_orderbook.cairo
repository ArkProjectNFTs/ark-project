use arkchain::order::types::OrderTrait;
use core::debug::PrintTrait;
use core::option::OptionTrait;
use arkchain::orderbook::orderbook;
use arkchain::order::order_v1::OrderV1;
use arkchain::order::types::RouteType;
use core::traits::Into;
use core::traits::TryInto;
use arkchain::order::types::OrderType;
use arkchain::order::database::{order_read, order_status_read, order_status_write, order_type_read};
use arkchain::order::types::OrderStatus;
use snforge_std::{
    declare, ContractClassTrait, spy_events, EventSpy, EventFetcher, EventAssertions, Event, SpyOn,
    test_address
};
use arkchain::orderbook::orderbook_errors;
use array::ArrayTrait;
use super::super::common::setup::setup_listing_order;
const ORDER_VERSION_V1: felt252 = 'v1';

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
