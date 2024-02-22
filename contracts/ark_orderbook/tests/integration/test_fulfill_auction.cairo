use core::debug::PrintTrait;
use core::traits::TryInto;
use core::traits::Into;
use core::option::OptionTrait;
use ark_orderbook::orderbook::Orderbook;
use ark_orderbook::order::order_v1::OrderV1;
use ark_common::crypto::{signer::{Signer, SignInfo, SignerTrait}, hash::serialized_hash};
use ark_common::protocol::order_types::{RouteType, FulfillInfo, OrderTrait, OrderType, OrderStatus};
use ark_orderbook::orderbook::{OrderbookDispatcher, OrderbookDispatcherTrait};
use starknet::deploy_syscall;
use snforge_std::{
    start_warp, declare, ContractClassTrait, spy_events, EventSpy, EventFetcher, EventAssertions,
    Event, SpyOn, test_address, signature::{StarkCurveKeyPair, StarkCurveKeyPairTrait, Verifier}
};
use super::super::common::setup::{
    setup_auction_order, setup_listing, sign_mock, setup_orders, setup_offer,
    whitelist_creator_broker
};

/// Test
///
/// Create one auction one offer and fulfill it.
///
#[test]
fn test_fulfill_auction() {
    let auction_pk = Option::Some(0x1234567890987654323);
    let offer_pk = Option::Some(0x1234567890987654342);

    let start_date = 1699556828;
    let end_date = start_date + (10 * 24 * 60 * 60);

    let (auction_listing_order, auction_signer, order_hash, token_hash) = setup_auction_order(
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
    dispatcher.create_order(order: auction_listing_order, signer: auction_signer);

    let (auction_offer, related_order_signer, related_order_hash, related_order_token_hash) =
        setup_offer(
        start_date, end_date, Option::None, Option::None
    );

    dispatcher.create_order(order: auction_offer, signer: related_order_signer);

    let fulfill_info = FulfillInfo {
        order_hash: order_hash,
        related_order_hash: Option::Some(related_order_hash),
        fulfiller: auction_listing_order.offerer,
        token_chain_id: auction_listing_order.token_chain_id,
        token_address: auction_listing_order.token_address,
        token_id: Option::Some(10),
    };

    let fulfill_info_hash = serialized_hash(fulfill_info);
    let offer_signer = sign_mock(fulfill_info_hash, auction_listing_order.offerer);
    let mut original_order_hash_signer = sign_mock(order_hash, auction_listing_order.offerer);
    let public_key = original_order_hash_signer.get_public_key();
    // sign original orderhash
    // from signer send public key
    dispatcher.fulfill_order(fulfill_info, offer_signer);
}

/// Test
///
/// Create one offer one auction and fulfill the auction with a classic offer.
///
#[test]
fn test_fulfill_auction_with_classic_offer() {
    // contract declaration
    let contract = declare('orderbook');
    let chain_id = 0x534e5f4d41494e;
    let contract_data = array![
        0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078, chain_id
    ];
    let contract_address = contract.deploy(@contract_data).unwrap();
    let dispatcher = OrderbookDispatcher { contract_address };

    // Create an offer
    let offer_start_date = 1699556820;
    let offer_end_date = offer_start_date + (10 * 24 * 60 * 60);
    let (offer_order, offer_signer, offer_order_hash, offer_order_token_hash) = setup_offer(
        offer_start_date, offer_end_date, Option::None, Option::None
    );
    whitelist_creator_broker(contract_address, offer_order.broker_id, dispatcher);
    dispatcher.create_order(order: offer_order, signer: offer_signer);

    // Create an auction
    let start_date = 1699556829;
    let end_date = start_date + (10 * 24 * 60 * 60);
    let (auction_listing_order, auction_signer, order_hash, token_hash) = setup_auction_order(
        start_date, end_date, 1, 10, Option::None
    );
    dispatcher.create_order(order: auction_listing_order, signer: auction_signer);

    start_warp(contract_address, start_date + 3600);
    let fulfill_info = FulfillInfo {
        order_hash: order_hash,
        related_order_hash: Option::Some(offer_order_hash),
        fulfiller: auction_listing_order.offerer,
        token_chain_id: auction_listing_order.token_chain_id,
        token_address: auction_listing_order.token_address,
        token_id: Option::Some(10),
    };

    let fulfill_info_hash = serialized_hash(fulfill_info);
    let signer = sign_mock(fulfill_info_hash, auction_listing_order.offerer);
    dispatcher.fulfill_order(fulfill_info, signer);
    let auction_status = dispatcher.get_order_status(order_hash);
    let offer_status = dispatcher.get_order_status(offer_order_hash);
    assert(auction_status == OrderStatus::Fulfilled.into(), 'Auction status is not fulfilled');
    assert(offer_status == OrderStatus::Fulfilled.into(), 'Offer status is not fulfilled');
}

// try to fulfill auction with classic offer but with a start date in the future
#[should_panic(expected: ('OB: order not started',))]
#[test]
fn test_fulfill_auction_with_future_offer() {
    // contract declaration
    let contract = declare('orderbook');
    let chain_id = 0x534e5f4d41494e;
    let contract_data = array![
        0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078, chain_id
    ];
    let contract_address = contract.deploy(@contract_data).unwrap();
    let dispatcher = OrderbookDispatcher { contract_address };

    // Create an offer
    let offer_start_date = 1699556828 + (10 * 24 * 60 * 60);
    let offer_end_date = offer_start_date + (20 * 24 * 60 * 60);
    let (offer_order, offer_signer, offer_order_hash, offer_order_token_hash) = setup_offer(
        offer_start_date, offer_end_date, Option::None, Option::None
    );
    whitelist_creator_broker(contract_address, offer_order.broker_id, dispatcher);

    dispatcher.create_order(order: offer_order, signer: offer_signer);

    // Create an auction
    let start_date = 1699556828;
    let end_date = start_date + (10 * 24 * 60 * 60);
    let (auction_listing_order, auction_signer, order_hash, token_hash) = setup_auction_order(
        start_date, end_date, 1, 10, Option::None
    );
    dispatcher.create_order(order: auction_listing_order, signer: auction_signer);

    let fulfill_info = FulfillInfo {
        order_hash: order_hash,
        related_order_hash: Option::Some(offer_order_hash),
        fulfiller: auction_listing_order.offerer,
        token_chain_id: auction_listing_order.token_chain_id,
        token_address: auction_listing_order.token_address,
        token_id: Option::Some(10),
    };

    start_warp(contract_address, start_date + 3600);

    let fulfill_info_hash = serialized_hash(fulfill_info);
    let signer = sign_mock(fulfill_info_hash, auction_listing_order.offerer);
    dispatcher.fulfill_order(fulfill_info, signer);
    let auction_status = dispatcher.get_order_status(order_hash);
    let offer_status = dispatcher.get_order_status(offer_order_hash);
}

// try to fulfill expired classic offer for a token when fulfilling an auction
#[should_panic(expected: ('OB: order expired',))]
#[test]
fn test_fulfill_auction_with_expired_offer() {
    // contract declaration
    let contract = declare('orderbook');
    let chain_id = 0x534e5f4d41494e;
    let contract_data = array![
        0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078, chain_id
    ];
    let contract_address = contract.deploy(@contract_data).unwrap();
    let dispatcher = OrderbookDispatcher { contract_address };

    // Create an offer
    let offer_start_date = 1698187649;
    let offer_end_date = offer_start_date + (10 * 24 * 60 * 60);
    let (offer_order, offer_signer, offer_order_hash, offer_order_token_hash) = setup_offer(
        offer_start_date, offer_end_date, Option::None, Option::None
    );
    whitelist_creator_broker(contract_address, offer_order.broker_id, dispatcher);

    dispatcher.create_order(order: offer_order, signer: offer_signer);

    // Create an auction
    let start_date = 1700869622;
    let end_date = start_date + (10 * 24 * 60 * 60);
    let (auction_listing_order, auction_signer, order_hash, token_hash) = setup_auction_order(
        start_date, end_date, 1, 10, Option::None
    );
    dispatcher.create_order(order: auction_listing_order, signer: auction_signer);

    start_warp(contract_address, start_date + 3600);

    let fulfill_info = FulfillInfo {
        order_hash: order_hash,
        related_order_hash: Option::Some(offer_order_hash),
        fulfiller: auction_listing_order.offerer,
        token_chain_id: auction_listing_order.token_chain_id,
        token_address: auction_listing_order.token_address,
        token_id: Option::Some(10),
    };

    let fulfill_info_hash = serialized_hash(fulfill_info);
    let signer = sign_mock(fulfill_info_hash, auction_listing_order.offerer);
    dispatcher.fulfill_order(fulfill_info, signer);
    let auction_status = dispatcher.get_order_status(order_hash);
    let offer_status = dispatcher.get_order_status(offer_order_hash);
}

// try to fullfill an expired auction
#[should_panic(expected: ('OB: order expired',))]
#[test]
fn test_fulfill_expired_auction() {
    // contract declaration
    let contract = declare('orderbook');
    let chain_id = 0x534e5f4d41494e;
    let contract_data = array![
        0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078, chain_id
    ];
    let contract_address = contract.deploy(@contract_data).unwrap();
    let dispatcher = OrderbookDispatcher { contract_address };

    // Create an offer
    let offer_start_date = 1699556828;
    let offer_end_date = offer_start_date + (10 * 24 * 60 * 60);
    let (offer_order, offer_signer, offer_order_hash, offer_order_token_hash) = setup_offer(
        offer_start_date, offer_end_date, Option::None, Option::None
    );
    whitelist_creator_broker(contract_address, offer_order.broker_id, dispatcher);
    dispatcher.create_order(order: offer_order, signer: offer_signer);

    // Create an auction
    let start_date = 1699556828;
    let end_date = start_date + (10 * 24 * 60 * 60);
    let (auction_listing_order, auction_signer, order_hash, token_hash) = setup_auction_order(
        start_date, end_date, 1, 10, Option::None
    );
    dispatcher.create_order(order: auction_listing_order, signer: auction_signer);

    start_warp(contract_address, end_date + 3600);

    let fulfill_info = FulfillInfo {
        order_hash: order_hash,
        related_order_hash: Option::Some(offer_order_hash),
        fulfiller: auction_listing_order.offerer,
        token_chain_id: auction_listing_order.token_chain_id,
        token_address: auction_listing_order.token_address,
        token_id: Option::Some(10),
    };
    start_warp(contract_address, 1700869684);
    let fulfill_info_hash = serialized_hash(fulfill_info);
    let fulfill_signer = sign_mock(fulfill_info_hash, auction_listing_order.offerer);
    dispatcher.fulfill_order(fulfill_info, fulfill_signer);
    let auction_status = dispatcher.get_order_status(order_hash);
    let offer_status = dispatcher.get_order_status(offer_order_hash);
}

// try to fulfill an auction with an offer that is not for the same token
#[should_panic(expected: ('OB: token hash does not match',))]
#[test]
fn test_fulfill_auction_with_offer_for_different_token() {
    // contract declaration
    let contract = declare('orderbook');
    let chain_id = 0x534e5f4d41494e;
    let contract_data = array![
        0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078, chain_id
    ];
    let contract_address = contract.deploy(@contract_data).unwrap();
    let dispatcher = OrderbookDispatcher { contract_address };

    // Create an offer
    let offer_start_date = 1699556828;
    let offer_end_date = offer_start_date + (10 * 24 * 60 * 60);
    let (mut offer_order, offer_signer, offer_order_hash, offer_order_token_hash) = setup_offer(
        offer_start_date, offer_end_date, Option::None, Option::Some(42)
    );
    whitelist_creator_broker(contract_address, offer_order.broker_id, dispatcher);
    dispatcher.create_order(order: offer_order, signer: offer_signer);

    // Create an auction
    let start_date = 1699556828;
    let end_date = start_date + (10 * 24 * 60 * 60);
    let (auction_listing_order, auction_signer, order_hash, token_hash) = setup_auction_order(
        start_date, end_date, 1, 10, Option::None
    );
    dispatcher.create_order(order: auction_listing_order, signer: auction_signer);

    start_warp(contract_address, start_date + 3600);

    let fulfill_info = FulfillInfo {
        order_hash: order_hash,
        related_order_hash: Option::Some(offer_order_hash),
        fulfiller: auction_listing_order.offerer,
        token_chain_id: auction_listing_order.token_chain_id,
        token_address: auction_listing_order.token_address,
        token_id: Option::Some(11),
    };

    let fulfill_info_hash = serialized_hash(fulfill_info);
    let signer = sign_mock(fulfill_info_hash, auction_listing_order.offerer);
    dispatcher.fulfill_order(fulfill_info, signer);
    let auction_status = dispatcher.get_order_status(order_hash);
    let offer_status = dispatcher.get_order_status(offer_order_hash);
}

// try to fulfill an auction with a non existing related order hash
#[should_panic(expected: ('OB: order not found',))]
#[test]
fn test_fulfill_auction_with_non_existing_related_order_hash() {
    // contract declaration
    let contract = declare('orderbook');
    let chain_id = 0x534e5f4d41494e;
    let contract_data = array![
        0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078, chain_id
    ];
    let contract_address = contract.deploy(@contract_data).unwrap();
    let dispatcher = OrderbookDispatcher { contract_address };

    // Create an auction
    let start_date = 1699556828;
    let end_date = start_date + (10 * 24 * 60 * 60);
    let (auction_listing_order, auction_signer, order_hash, token_hash) = setup_auction_order(
        start_date, end_date, 1, 10, Option::None
    );
    whitelist_creator_broker(contract_address, auction_listing_order.broker_id, dispatcher);
    dispatcher.create_order(order: auction_listing_order, signer: auction_signer);

    start_warp(contract_address, start_date + 3600);

    let fulfill_info = FulfillInfo {
        order_hash: order_hash,
        related_order_hash: Option::Some(0x1234567890987654321),
        fulfiller: auction_listing_order.offerer,
        token_chain_id: auction_listing_order.token_chain_id,
        token_address: auction_listing_order.token_address,
        token_id: Option::Some(10),
    };

    let fulfill_info_hash = serialized_hash(fulfill_info);
    let signer = sign_mock(fulfill_info_hash, auction_listing_order.offerer);
    dispatcher.fulfill_order(fulfill_info, signer);
}

// try to fulfill an auction with an order that is not an offer (a listing order)
#[should_panic(expected: ('OB: order is not an offer',))]
#[test]
fn test_fulfill_auction_with_listing_order() {
    // contract declaration
    let contract = declare('orderbook');
    let chain_id = 0x534e5f4d41494e;
    let contract_data = array![
        0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078, chain_id
    ];
    let contract_address = contract.deploy(@contract_data).unwrap();
    let dispatcher = OrderbookDispatcher { contract_address };

    // Create an auction
    let start_date = 1699556828;
    let end_date = start_date + (10 * 24 * 60 * 60);
    let (auction_listing_order, auction_signer, order_hash, token_hash) = setup_auction_order(
        start_date, end_date, 1, 10, Option::None
    );
    whitelist_creator_broker(contract_address, auction_listing_order.broker_id, dispatcher);
    dispatcher.create_order(order: auction_listing_order, signer: auction_signer);

    //create a listing order
    let (listing_order, listing_signer, listing_order_hash, listing_order_token_hash) =
        setup_listing(
        start_date, end_date, Option::Some(123)
    );
    whitelist_creator_broker(contract_address, listing_order.broker_id, dispatcher);
    dispatcher.create_order(order: listing_order, signer: listing_signer);

    start_warp(contract_address, start_date + 3600);

    let fulfill_info = FulfillInfo {
        order_hash: order_hash,
        related_order_hash: Option::Some(listing_order_hash),
        fulfiller: auction_listing_order.offerer,
        token_chain_id: auction_listing_order.token_chain_id,
        token_address: auction_listing_order.token_address,
        token_id: Option::Some(10),
    };

    let fulfill_info_hash = serialized_hash(fulfill_info);
    let signer = sign_mock(fulfill_info_hash, auction_listing_order.offerer);
    dispatcher.fulfill_order(fulfill_info, signer);
}
// TODO update this test when https://github.com/ArkProjectNFTs/ark-project/pull/188 is merged
// try to fulfill an auction with a non open offer
// #[should_panic(expected: ('OB: order not open',))]
// #[test]
// fn test_fulfill_auction_with_non_open_offer() {
//     // contract declaration
//     let contract = declare('orderbook');
//     let contract_data = array![0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078];
//     let contract_address = contract.deploy(@contract_data).unwrap();
//     let dispatcher = OrderbookDispatcher { contract_address };

//     // Create an offer
//     let offer_start_date = 1699556828;
//     let offer_end_date = offer_start_date + (10 * 24 * 60 * 60);
//     let (mut offer_order, offer_signer, offer_order_hash, offer_order_token_hash) = setup_offer(
//         offer_start_date, offer_end_date, Option::None, Option::None
//     );
//     dispatcher.create_order(order: offer_order, signer: offer_signer);

//     // Create an auction
//     let start_date = 1699556828;
//     let end_date = start_date + (10 * 24 * 60 * 60);
//     let (auction_listing_order, auction_signer, order_hash, token_hash) = setup_auction_order(
//         start_date, end_date, 1, 10, Option::None
//     );
//     dispatcher.create_order(order: auction_listing_order, signer: auction_signer);

//     start_warp(contract_address, start_date + 3600);

//     let fulfill_info = FulfillInfo {
//         order_hash: order_hash,
//         related_order_hash: Option::Some(offer_order_hash),
//         fulfiller: auction_listing_order.offerer,
//         token_chain_id: auction_listing_order.token_chain_id,
//         token_address: auction_listing_order.token_address,
//         token_id: Option::Some(10),
//     };

//     // close the offer
//     // fulfill the offer order

//     let fulfill_info_hash = serialized_hash(fulfill_info);
//     let signer = sign_mock(fulfill_info_hash, Option::None);
//     dispatcher.fulfill_order(fulfill_info, signer);
// }


