use arkchain::order::types::OrderTrait;
use core::debug::PrintTrait;
use core::option::OptionTrait;
use arkchain::orderbook::orderbook;
use arkchain::order::order_v1::OrderV1;
use arkchain::order::types::RouteType;
use core::traits::Into;
use core::traits::TryInto;
use arkchain::order::types::OrderType;
use arkchain::order::database::{order_read, order_status_read, order_write, order_type_read};
use arkchain::order::types::OrderStatus;
use snforge_std::{
    declare, ContractClassTrait, spy_events, EventSpy, EventFetcher, EventAssertions, Event, SpyOn,
    test_address
};
use array::ArrayTrait;
use super::super::common::setup::setup_listing_order;

const ORDER_VERSION_V1: felt252 = 'v1';

#[test]
fn test_recreate_listing() {
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

    // create a second order over the first one same ressource hash
    let (order_listing_2, order_hash_2, token_hash_2) = setup_listing_order(500000000000000000);
    orderbook::InternalFunctions::_create_listing_order(
        ref state, order_listing_2, OrderType::Listing, order_hash_2
    );

    // previous order should be cancelled
    let order_status = order_status_read(order_hash_1);
    assert(order_status.is_some(), 'storage order');
    assert(order_status.unwrap() == OrderStatus::CancelledByNewOrder, 'Wrong order status');

    // check new order
    let order2_option = order_read::<OrderV1>(order_hash_2);
    assert(order2_option.is_some(), 'storage order');
    let order2 = order2_option.unwrap();
    let order2_option = order_read::<OrderV1>(order_hash_2);
    let order2_status = order_status_read(order_hash_2);
    let order2_type = order_type_read(order_hash_2);
    assert(order2.start_amount == order_listing_2.start_amount, 'price does not match');
}

#[test]
fn test_create_auction() {
    assert(true, '');
}
