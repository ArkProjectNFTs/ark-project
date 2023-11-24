use core::traits::TryInto;
use core::traits::Into;
use core::option::OptionTrait;
use snforge_std::{PrintTrait, declare, ContractClassTrait};
use arkchain::orderbook::Orderbook;
use arkchain::orderbook::orderbook;
use arkchain::order::order_v1::OrderV1;
use arkchain::order::order_v1::RouteType;
use arkchain::crypto::{hash::{serialized_hash}, signer::{Signer, SignInfo}};
use arkchain::order::order_v1::OrderTrait;
use arkchain::order::order_v1::OrderType;
use arkchain::order::types::{OrderStatus, FulfillInfo};
use arkchain::orderbook::{OrderbookDispatcher, OrderbookDispatcherTrait};
use starknet::deploy_syscall;

use super::super::common::signer::sign_mock;
use super::super::common::setup::{setup_orders, setup_listing_order_with_sign};


// TODO: collection offer

// TODO: fulfill expired offer

// TODO: fulfill offer (status = OPEN)

// TODO: fulfill offer (with startdate > current date)

// TODO: fulfill expired collection offer

// TODO: fulfill non existing offer

#[test]
fn test_fulfill_classic_offer() {
    let block_timestamp = 1699556828;
    let (order_listing, mut order_offer, order_auction, order_collection_offer) = setup_orders();

    let contract = declare('orderbook');
    let contract_data = array![0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078];
    let contract_address = contract.deploy(@contract_data).unwrap();
    let dispatcher = OrderbookDispatcher { contract_address };

    let listing_order_hash = order_listing.compute_order_hash();
    let signer = sign_mock(listing_order_hash, Option::None);
    dispatcher.create_order(order: order_listing, signer: signer);

    order_offer.start_date = order_listing.start_date;
    order_offer.end_date = order_listing.start_date + 1000;

    let offer_order_hash = order_offer.compute_order_hash();
    let offer_signer = sign_mock(offer_order_hash, Option::None);
    dispatcher.create_order(order: order_offer, signer: offer_signer);

    let fulfill_info = FulfillInfo {
        order_hash: order_offer.compute_order_hash(),
        related_order_hash: Option::None,
        fulfiller: order_listing.offerer,
        token_chain_id: order_listing.token_chain_id,
        token_address: order_listing.token_address,
        token_id: order_listing.token_id,
    };

    let fulfill_info_hash = serialized_hash(fulfill_info);
    let signer = sign_mock(fulfill_info_hash, Option::None);
    dispatcher.fulfill_order(fulfill_info, signer);
}
