use arkchain::crypto::signer::SignerTrait;
use core::traits::TryInto;
use core::traits::Into;
use core::option::OptionTrait;
use arkchain::orderbook::Orderbook;
use arkchain::order::order_v1::{RouteType, FulfillInfo, OrderV1};
use arkchain::crypto::{signer::{Signer, SignInfo}, hash::serialized_hash};
use arkchain::order::order_v1::OrderTrait;
use arkchain::order::order_v1::OrderType;
use arkchain::order::types::OrderStatus;
use arkchain::orderbook::{OrderbookDispatcher, OrderbookDispatcherTrait};
use starknet::deploy_syscall;
use snforge_std::{
    start_warp, declare, ContractClassTrait, spy_events, EventSpy, EventFetcher, EventAssertions,
    Event, SpyOn, test_address, signature::{StarkCurveKeyPair, StarkCurveKeyPairTrait, Verifier}
};
use super::super::common::setup::{setup_auction_order, setup, sign_mock, setup_orders, setup_offer};

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
    let contract_data = array![0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078];
    let contract_address = contract.deploy(@contract_data).unwrap();

    let dispatcher = OrderbookDispatcher { contract_address };
    dispatcher.create_order(order: auction_listing_order, signer: auction_signer);

    let (auction_offer, related_order_signer, related_order_hash, related_order_token_hash) =
        setup_offer(
        start_date, end_date, Option::None
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
    let offer_signer = sign_mock(fulfill_info_hash, Option::None);
    let mut original_order_hash_signer = sign_mock(order_hash, Option::None);
    let public_key = original_order_hash_signer.get_public_key();
    // sign original orderhash 
    // from signer send public key
    dispatcher.fulfill_order(fulfill_info, offer_signer);
}

/// Test
///
/// Create one offer one auction and fulfill the auction with a classic offer.
///
// #[test]
// fn test_fulfill_auction_with_non_auction_offer() {
//     // contract declaration
//     let contract = declare('orderbook');
//     let contract_data = array![0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078];
//     let contract_address = contract.deploy(@contract_data).unwrap();
//     let dispatcher = OrderbookDispatcher { contract_address };

//     // Create an offer
//     let offer_start_date = 1699556828;
//     let offer_end_date = offer_start_date + (10 * 24 * 60 * 60);
//     let (offer_order, offer_signer, offer_order_hash, offer_order_token_hash) =
//         setup_offer(
//         offer_start_date, offer_end_date, Option::None
//     );
//     dispatcher.create_order(order: offer_order, signer: offer_signer);

//     // Create an auction
//     // let start_date = 1699556828;
//     // let end_date = start_date + (10 * 24 * 60 * 60);
//     // let (auction_listing_order, auction_signer, order_hash, token_hash) = setup_auction_order(
//     //     start_date, end_date, 1, 10, Option::None
//     // );
//     // dispatcher.create_order(order: auction_listing_order, signer: auction_signer);

//     // let fulfill_info = FulfillInfo {
//     //     order_hash: order_hash,
//     //     related_order_hash: Option::Some(related_order_hash),
//     //     fulfiller: auction_listing_order.offerer,
//     //     token_chain_id: auction_listing_order.token_chain_id,
//     //     token_address: auction_listing_order.token_address,
//     //     token_id: Option::Some(10),
//     // };

//     // let fulfill_info_hash = serialized_hash(fulfill_info);
//     // let signer = sign_mock(fulfill_info_hash, Option::None);
//     // dispatcher.fulfill_order(fulfill_info, signer);
//     // let auction_status = dispatcher.get_order_status(order_hash);
//     // let offer_status = dispatcher.get_order_status(related_order_hash);
//     // assert(auction_status == OrderStatus::Fulfilled.into(), 'Auction status is not fulfilled');
//     // assert(offer_status == OrderStatus::Fulfilled.into(), 'Offer status is not fulfilled');
// }
