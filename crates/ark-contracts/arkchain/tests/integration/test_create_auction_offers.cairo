use core::traits::TryInto;
use core::traits::Into;
use core::option::OptionTrait;
use snforge_std::{PrintTrait, declare, ContractClassTrait};
use arkchain::orderbook::Orderbook;
use arkchain::order::order_v1::OrderV1;
use arkchain::order::order_v1::RouteType;
use arkchain::crypto::signer::{Signer, SignInfo};
use arkchain::order::order_v1::OrderTrait;
use arkchain::order::order_v1::OrderType;
use arkchain::order::types::OrderStatus;
use arkchain::orderbook::{OrderbookDispatcher, OrderbookDispatcherTrait};
use starknet::deploy_syscall;

use super::super::common::setup::{setup_auction_order};

#[test]
fn test_create_valid_auction_offer() {
    let start_date = 1699556828;
    let end_date = start_date + (30 * 24 * 60 * 60);

    let (auction_listing_order, signer, order_hash, token_hash) = setup_auction_order(
        start_date, end_date, 1, 10
    );

    let contract = declare('orderbook');
    let contract_data = array![0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078];
    let contract_address = contract.deploy(@contract_data).unwrap();
    let dispatcher = OrderbookDispatcher { contract_address };
    dispatcher.create_order(order: auction_listing_order, signer: signer);

    // TODO: create auction offer
}
