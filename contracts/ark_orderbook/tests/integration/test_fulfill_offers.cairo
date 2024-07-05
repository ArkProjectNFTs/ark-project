use core::result::ResultTrait;
use core::traits::TryInto;
use core::traits::Into;
use core::option::OptionTrait;
use ark_orderbook::orderbook::Orderbook;
use ark_orderbook::orderbook::orderbook;
use ark_common::protocol::order_v1::OrderV1;
use ark_common::crypto::{signer::{Signer, SignInfo, SignerTrait}, hash::serialized_hash};
use snforge_std::cheatcodes::CheatTarget;
use ark_common::protocol::order_types::{RouteType, FulfillInfo, OrderTrait, OrderType, OrderStatus};
use ark_orderbook::orderbook::{OrderbookDispatcher, OrderbookDispatcherTrait};
use starknet::deploy_syscall;
use snforge_std::{
    start_warp, declare, ContractClassTrait, spy_events, EventSpy, EventFetcher, EventAssertions,
    Event, SpyOn, test_address,
    signature::stark_curve::{StarkCurveKeyPairImpl, StarkCurveSignerImpl, StarkCurveVerifierImpl}
};

use super::super::common::signer::sign_mock;
use super::super::common::setup::{
    setup_orders, setup_listing_order_with_sign, whitelist_creator_broker
};

#[test]
#[should_panic(expected: ('OB: order expired',))]
fn test_fulfill_expired_offer() {
    let (order_listing, mut order_offer, _, _) = setup_orders();
    let chain_id = 0x534e5f4d41494e;
    let contract = declare('orderbook');
    let contract_data = array![
        0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078, chain_id
    ];
    let contract_address = contract.deploy(@contract_data).unwrap();
    let dispatcher = OrderbookDispatcher { contract_address };

    order_offer.start_date = order_listing.start_date;
    order_offer.end_date = order_listing.start_date + 1000;

    let offer_order_hash = order_offer.compute_order_hash();
    let offer_signer = sign_mock(offer_order_hash, order_offer.offerer);
    whitelist_creator_broker(contract_address, order_offer.broker_id, dispatcher);
    dispatcher.create_order(order: order_offer, signer: offer_signer);

    start_warp(CheatTarget::One(contract_address), order_listing.start_date + 2000);

    let fulfill_info = FulfillInfo {
        order_hash: order_offer.compute_order_hash(),
        related_order_hash: Option::None,
        fulfiller: order_listing.offerer,
        token_chain_id: order_listing.token_chain_id,
        token_address: order_listing.token_address,
        token_id: order_listing.token_id,
        fulfill_broker_address: test_address(),
    };

    let fulfill_info_hash = serialized_hash(fulfill_info);
    let signer = sign_mock(fulfill_info_hash, fulfill_info.fulfiller);
    dispatcher.fulfill_order(fulfill_info, signer);
}

#[test]
#[should_panic(expected: ('OB: order not found',))]
fn test_fulfill_non_existing_offer() {
    let contract = declare('orderbook');
    let chain_id = 0x534e5f4d41494e;
    let contract_data = array![
        0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078, chain_id
    ];
    let contract_address = contract.deploy(@contract_data).unwrap();
    let dispatcher = OrderbookDispatcher { contract_address };

    let order_hash: felt252 = 0x0123456.into();
    let fulfill_info = FulfillInfo {
        order_hash,
        related_order_hash: Option::None,
        fulfiller: 0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078
            .try_into()
            .unwrap(),
        token_chain_id: chain_id,
        token_address: 0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672
            .try_into()
            .unwrap(),
        token_id: Option::Some(10),
        fulfill_broker_address: test_address()
    };

    let fulfill_info_hash = serialized_hash(fulfill_info);
    let signer = sign_mock(fulfill_info_hash, fulfill_info.fulfiller);
    dispatcher.fulfill_order(fulfill_info, signer);
}

#[test]
fn test_fulfill_classic_offer() {
    let (order_listing, mut order_offer, _, _) = setup_orders();

    let contract = declare('orderbook');
    let chain_id = 0x534e5f4d41494e;
    let contract_data = array![
        0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078, chain_id
    ];
    let contract_address = contract.deploy(@contract_data).unwrap();
    let dispatcher = OrderbookDispatcher { contract_address };

    let listing_order_hash = order_listing.compute_order_hash();
    let signer = sign_mock(listing_order_hash, order_listing.offerer);
    whitelist_creator_broker(contract_address, order_listing.broker_id, dispatcher);
    dispatcher.create_order(order: order_listing, signer: signer);

    order_offer.start_date = order_listing.start_date;
    order_offer.end_date = order_listing.start_date + 1000;

    let offer_order_hash = order_offer.compute_order_hash();
    let offer_signer = sign_mock(offer_order_hash, order_offer.offerer);
    dispatcher.create_order(order: order_offer, signer: offer_signer);

    start_warp(CheatTarget::One(contract_address), order_offer.start_date);

    let fulfill_info = FulfillInfo {
        order_hash: order_offer.compute_order_hash(),
        related_order_hash: Option::None,
        fulfiller: order_listing.offerer,
        token_chain_id: order_listing.token_chain_id,
        token_address: order_listing.token_address,
        token_id: order_listing.token_id,
        fulfill_broker_address: test_address(),
    };

    let fulfill_info_hash = serialized_hash(fulfill_info);
    let signer = sign_mock(fulfill_info_hash, fulfill_info.fulfiller);
    dispatcher.fulfill_order(fulfill_info, signer);
}

#[test]
fn test_fulfill_collection_offer() {
    let contract = declare('orderbook');
    let chain_id = 0x534e5f4d41494e;
    let contract_data = array![
        0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078, chain_id
    ];
    let contract_address = contract.deploy(@contract_data).unwrap();
    let dispatcher = OrderbookDispatcher { contract_address };
    let data = array![];
    let data_span = data.span();

    let order_offer = OrderV1 {
        route: RouteType::Erc20ToErc721.into(),
        currency_address: 0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7
            .try_into()
            .unwrap(),
        currency_chain_id: chain_id,
        salt: 1,
        offerer: 0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078
            .try_into()
            .unwrap(),
        token_chain_id: chain_id,
        token_address: 0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672
            .try_into()
            .unwrap(),
        token_id: Option::None,
        quantity: 1,
        start_amount: 600000000000000000,
        end_amount: 0,
        start_date: 100,
        end_date: 1000,
        broker_id: test_address(),
        additional_data: data_span,
    };

    let offer_order_hash = order_offer.compute_order_hash();
    let offer_signer = sign_mock(offer_order_hash, order_offer.offerer);
    whitelist_creator_broker(contract_address, order_offer.broker_id, dispatcher);
    dispatcher.create_order(order: order_offer, signer: offer_signer);

    start_warp(CheatTarget::One(contract_address), order_offer.start_date);

    let fulfill_info = FulfillInfo {
        order_hash: order_offer.compute_order_hash(),
        related_order_hash: Option::None,
        fulfiller: 0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc8
            .try_into()
            .unwrap(),
        token_chain_id: 0x534e5f4d41494e.try_into().unwrap(),
        token_address: 0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672
            .try_into()
            .unwrap(),
        token_id: Option::Some(1),
        fulfill_broker_address: test_address(),
    };

    let fulfill_info_hash = serialized_hash(fulfill_info);
    let signer = sign_mock(fulfill_info_hash, fulfill_info.fulfiller);
    dispatcher.fulfill_order(fulfill_info, signer);
}

#[test]
#[should_panic(expected: ('OB: order expired',))]
fn test_fulfill_expired_collection_offer() {
    let contract = declare('orderbook');
    let chain_id = 0x534e5f4d41494e;
    let contract_data = array![
        0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078, chain_id
    ];
    let contract_address = contract.deploy(@contract_data).unwrap();
    let dispatcher = OrderbookDispatcher { contract_address };

    let data = array![];
    let data_span = data.span();

    let order_offer = OrderV1 {
        route: RouteType::Erc20ToErc721.into(),
        currency_address: 0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7
            .try_into()
            .unwrap(),
        currency_chain_id: chain_id,
        salt: 1,
        offerer: 0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078
            .try_into()
            .unwrap(),
        token_chain_id: chain_id,
        token_address: 0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672
            .try_into()
            .unwrap(),
        token_id: Option::None,
        quantity: 1,
        start_amount: 600000000000000000,
        end_amount: 0,
        start_date: 100,
        end_date: 1000,
        broker_id: test_address(),
        additional_data: data_span,
    };

    let offer_order_hash = order_offer.compute_order_hash();
    let offer_signer = sign_mock(offer_order_hash, order_offer.offerer);
    whitelist_creator_broker(contract_address, order_offer.broker_id, dispatcher);
    dispatcher.create_order(order: order_offer, signer: offer_signer);

    start_warp(CheatTarget::One(contract_address), order_offer.end_date);

    let fulfill_info = FulfillInfo {
        order_hash: order_offer.compute_order_hash(),
        related_order_hash: Option::None,
        fulfiller: 0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc8
            .try_into()
            .unwrap(),
        token_chain_id: chain_id,
        token_address: 0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672
            .try_into()
            .unwrap(),
        token_id: Option::Some(1),
        fulfill_broker_address: test_address()
    };

    let fulfill_info_hash = serialized_hash(fulfill_info);
    let signer = sign_mock(fulfill_info_hash, fulfill_info.fulfiller);
    dispatcher.fulfill_order(fulfill_info, signer);
}

#[test]
#[should_panic(expected: ('OB: token id is missing',))]
fn test_fulfill_collection_offer_andatory_token_id() {
    let contract = declare('orderbook');
    let chain_id = 0x534e5f4d41494e;
    let contract_data = array![
        0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078, chain_id
    ];
    let contract_address = contract.deploy(@contract_data).unwrap();
    let dispatcher = OrderbookDispatcher { contract_address };

    let data = array![];
    let data_span = data.span();

    let order_offer = OrderV1 {
        route: RouteType::Erc20ToErc721.into(),
        currency_address: 0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7
            .try_into()
            .unwrap(),
        currency_chain_id: chain_id,
        salt: 1,
        offerer: 0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078
            .try_into()
            .unwrap(),
        token_chain_id: chain_id,
        token_address: 0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672
            .try_into()
            .unwrap(),
        token_id: Option::None,
        quantity: 1,
        start_amount: 600000000000000000,
        end_amount: 0,
        start_date: starknet::get_block_timestamp(),
        end_date: starknet::get_block_timestamp() + 1000,
        broker_id: test_address(),
        additional_data: data_span,
    };

    let offer_order_hash = order_offer.compute_order_hash();
    let offer_signer = sign_mock(offer_order_hash, order_offer.offerer);
    whitelist_creator_broker(contract_address, order_offer.broker_id, dispatcher);
    dispatcher.create_order(order: order_offer, signer: offer_signer);

    start_warp(CheatTarget::One(contract_address), order_offer.end_date);

    let fulfill_info = FulfillInfo {
        order_hash: order_offer.compute_order_hash(),
        related_order_hash: Option::None,
        fulfiller: 0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc8
            .try_into()
            .unwrap(),
        token_chain_id: chain_id,
        token_address: 0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672
            .try_into()
            .unwrap(),
        token_id: Option::None,
        fulfill_broker_address: test_address()
    };

    let fulfill_info_hash = serialized_hash(fulfill_info);
    let signer = sign_mock(fulfill_info_hash, fulfill_info.fulfiller);
    dispatcher.fulfill_order(fulfill_info, signer);
}

#[test]
#[should_panic(expected: ('OB: order not fulfillable',))]
fn test_double_fulfill_offer() {
    let (order_listing, mut order_offer, _, _) = setup_orders();
    let chain_id = 0x534e5f4d41494e;
    let contract = declare('orderbook');
    let contract_data = array![
        0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078, chain_id
    ];
    let contract_address = contract.deploy(@contract_data).unwrap();
    let dispatcher = OrderbookDispatcher { contract_address };

    let listing_order_hash = order_listing.compute_order_hash();
    let signer = sign_mock(listing_order_hash, order_listing.offerer);
    whitelist_creator_broker(contract_address, order_listing.broker_id, dispatcher);

    dispatcher.create_order(order: order_listing, signer: signer);

    order_offer.start_date = order_listing.start_date;
    order_offer.end_date = order_listing.start_date + 1000;

    let offer_order_hash = order_offer.compute_order_hash();
    let offer_signer = sign_mock(offer_order_hash, order_offer.offerer);
    dispatcher.create_order(order: order_offer, signer: offer_signer);

    start_warp(CheatTarget::One(contract_address), order_offer.start_date);

    let fulfill_info = FulfillInfo {
        order_hash: order_offer.compute_order_hash(),
        related_order_hash: Option::None,
        fulfiller: order_listing.offerer,
        token_chain_id: order_listing.token_chain_id,
        token_address: order_listing.token_address,
        token_id: order_listing.token_id,
        fulfill_broker_address: test_address(),
    };

    let fulfill_info_hash = serialized_hash(fulfill_info);
    let signer = sign_mock(fulfill_info_hash, fulfill_info.fulfiller);
    dispatcher.fulfill_order(fulfill_info, signer);

    let fulfill_info = FulfillInfo {
        order_hash: order_offer.compute_order_hash(),
        related_order_hash: Option::None,
        fulfiller: order_listing.offerer,
        token_chain_id: order_listing.token_chain_id,
        token_address: order_listing.token_address,
        token_id: order_listing.token_id,
        fulfill_broker_address: test_address(),
    };

    let fulfill_info_hash = serialized_hash(fulfill_info);
    let signer = sign_mock(fulfill_info_hash, fulfill_info.fulfiller);
    dispatcher.fulfill_order(fulfill_info, signer);
}
