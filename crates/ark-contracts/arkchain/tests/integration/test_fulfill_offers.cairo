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
use super::super::common::setup::{setup_orders, setup, setup_listing_order_with_sign};

#[test]
fn test_fulfill_classic_offer() {
    let block_timestamp = 1699556828;
    let (order_listing, order_offer, order_auction, order_collection_offer) = setup_orders();

    let contract = declare('orderbook');
    let contract_data = array![0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078];
    let contract_address = contract.deploy(@contract_data).unwrap();
    let dispatcher = OrderbookDispatcher { contract_address };

    let order_hash = order_listing.compute_order_hash();
    let token_hash = order_listing.compute_token_hash();
    let signer = sign_mock(order_hash);
    dispatcher.create_order(order: order_listing, signer: signer);

    // let order = dispatcher.get_order(_order_hash);
    // let order_status = dispatcher.get_order_status(_order_hash);
    // let order_type = dispatcher.get_order_type(_order_hash);
    // let order_hash = dispatcher.get_order_hash(token_hash);

    let order_hash = order_listing.compute_order_hash();
    let token_hash = order_listing.compute_token_hash();
    let signer = sign_mock(order_hash);
    dispatcher.create_order(order: order_offer, signer: signer);
    
// let fulfill_info = FulfillInfo {
//     order_hash: 0x00E4769a444F7FF9C70951A333eBA5c32707Cef3CdfB6B27cA63567f51cdd078
//         .try_into()
//         .unwrap(),
//     related_order_hash: Option::None,
//     fulfiller: 0x00E4769a4d2F7F69C70951A333eBA5c32707Cef3CdfB6B27cA63567f51cdd078
//         .try_into()
//         .unwrap(),
//     token_chain_id: 0x534e5f4d41494e.try_into().unwrap(),
//     token_address: 0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672
//         .try_into()
//         .unwrap(),
//     token_id: Option::Some(8),
// };

// let fulfill_info_hash = serialized_hash(fulfill_info);
// let signer = sign_mock(fulfill_info_hash);

// dispatcher.fulfill_order(fulfill_info, signer);
}
