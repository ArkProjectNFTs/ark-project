use core::debug::PrintTrait;
use core::option::OptionTrait;
use arkchain::orderbook::orderbook::ordersContractMemberStateTrait;
use arkchain::orderbook::orderbook;
use arkchain::order::order_v1::OrderV1;
use arkchain::order::types::RouteType;
use core::traits::Into;
use core::traits::TryInto;
use arkchain::order::types::OrderType;
use arkchain::order::database::{order_read, order_status_read, order_write};
use arkchain::order::types::OrderStatus;
use snforge_std::{
    declare, ContractClassTrait, spy_events, EventSpy, EventFetcher, EventAssertions, Event, SpyOn,
    test_address
};
use array::ArrayTrait;

const ORDER_VERSION_V1: felt252 = 'v1';

#[test]
fn test_create_offer() {
    let offer_order = get_offer_order();
    let order_hash = '123';

    let contract_address = test_address();
    let mut state = orderbook::contract_state_for_testing();
    let mut spy = spy_events(SpyOn::One(contract_address));

    orderbook::InternalFunctions::create_offer(
        ref state, offer_order, OrderType::Offer, order_hash
    );

    let order_option = order_read::<OrderV1>(order_hash);
    assert(order_option.is_some(), 'storage order');
    let (order_status, order) = order_option.unwrap();
    assert(order_status == OrderStatus::Open, 'order status');
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
                            order: offer_order
                        }
                    )
                )
            ]
        );
}

#[test]
fn test_create_collection_offer() {
    let contract_address = test_address();

    contract_address.print();
    let mut spy = spy_events(SpyOn::One(contract_address));

    let mut offer_order = get_offer_order();
    offer_order.token_id = 0;
    let order_hash = '123';

    let mut state = orderbook::contract_state_for_testing();
    orderbook::InternalFunctions::create_offer(
        ref state, offer_order, OrderType::CollectionOffer, order_hash
    );

    let order_option = order_read::<OrderV1>(order_hash);
    assert(order_option.is_some(), 'storage order');
    let (order_status, order) = order_option.unwrap();
    assert(order_status == OrderStatus::Open, 'order status');
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
                            order: offer_order
                        }
                    )
                )
            ]
        );
}

fn get_offer_order() -> OrderV1 {
    let data = array![];
    let data_span = data.span();
    OrderV1 {
        route: RouteType::Erc20ToErc721.into(),
        currency_address: 0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7
            .try_into()
            .unwrap(),
        currency_chain_id: 0x534e5f4d41494e.try_into().unwrap(),
        salt: 0,
        offerer: 0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078
            .try_into()
            .unwrap(),
        token_chain_id: 0x534e5f4d41494e.try_into().unwrap(),
        token_address: 0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672
            .try_into()
            .unwrap(),
        token_id: 0,
        quantity: 1,
        start_amount: 600000000000000000,
        end_amount: 0,
        start_date: 1699525884797,
        end_date: 1702117884797,
        broker_id: 123,
        additional_data: data_span,
    }
}
