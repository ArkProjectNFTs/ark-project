use core::option::OptionTrait;
use core::result::ResultTrait;
use core::traits::Into;
use core::traits::TryInto;
use ark_orderbook::order::order_v1::OrderV1;
use ark_orderbook::order::order_v1::OrderTraitOrderV1;
use ark_orderbook::orderbook::{
    orderbook, orderbook_errors, OrderbookDispatcher, OrderbookDispatcherTrait
};
use ark_common::protocol::order_types::{OrderType, OrderTrait, RouteType};
use ark_common::crypto::signer::{SignInfo, Signer, SignerValidator};
use debug::PrintTrait;
use super::super::super::common::setup::{setup_orders, whitelist_creator_broker};
use snforge_std::{ContractClassTrait, declare};

// *********************************************************
// validate_common_data
// *********************************************************

#[test]
fn test_validate_common_data_with_valid_order() {
    let (order_listing, _, _, _) = setup_orders();
    let block_timestmap: u64 = 1699556828;
    let mut state = orderbook::contract_state_for_testing();
    orderbook::ImplOrderbook::whitelist_broker(ref state, order_listing.broker_id);

    let result = order_listing.validate_common_data(block_timestmap);
    assert(result.is_ok(), 'Invalid result');
}

#[test]
fn should_returns_invalid_order_with_zero_quantity() {
    let (order_listing, _, _, _) = setup_orders();
    let block_timestmap: u64 = 1699556828;

    let mut invalid_order = order_listing.clone();
    invalid_order.quantity = 0;
    let result = invalid_order.validate_common_data(block_timestmap);
    assert(!result.is_ok(), 'zero quantity');
}

#[test]
fn should_returns_invalid_order_with_zero_salt() {
    let (order_listing, _, _, _) = setup_orders();
    let block_timestmap: u64 = 1699556828;

    let mut invalid_order = order_listing.clone();
    invalid_order.salt = 0;
    let result = invalid_order.validate_common_data(block_timestmap);
    assert(!result.is_ok(), 'zero salt');
}

#[test]
fn should_returns_invalid_order_with_no_token_id() {
    let (order_listing, _, _, _) = setup_orders();
    let block_timestmap: u64 = 1699556828;
    let mut state = orderbook::contract_state_for_testing();
    orderbook::ImplOrderbook::whitelist_broker(ref state, order_listing.broker_id);

    let mut invalid_order = order_listing.clone();
    invalid_order.token_id = Option::None;
    assert(invalid_order.token_id.is_none(), 'token_id should be none');
    let result = invalid_order.validate_common_data(block_timestmap);
    assert(result.is_ok(), 'Result should be valid');
}

#[test]
fn should_returns_invalid_order_with_invalid_token_address() {
    let (order_listing, _, _, _) = setup_orders();
    let block_timestmap: u64 = 1699556828;

    let mut invalid_order = order_listing.clone();
    invalid_order.token_address = 0.try_into().unwrap();
    let result = invalid_order.validate_common_data(block_timestmap);
    assert(!result.is_ok(), 'invalid token address');
}

#[test]
fn should_returns_invalid_order_with_invalid_dates() {
    let (order_listing, _, _, _) = setup_orders();
    let block_timestmap: u64 = 1699556828;

    let mut invalid_order = order_listing.clone();
    invalid_order.end_date = 0;
    let result = invalid_order.validate_common_data(block_timestmap);
    assert(!result.is_ok(), 'zero end date');

    let mut invalid_order = order_listing.clone();
    invalid_order.end_date = invalid_order.start_date;
    let result = invalid_order.validate_common_data(block_timestmap);
    assert(!result.is_ok(), 'start date = end date');

    let mut invalid_order = order_listing.clone();
    let result = invalid_order.validate_common_data(1699643230);
    assert(!result.is_ok(), 'past start date');

    let mut invalid_order = order_listing.clone();
    invalid_order.end_date = 1731225255;
    let result = invalid_order.validate_common_data(block_timestmap);
    assert(!result.is_ok(), 'end date too far');
}

#[test]
fn test_validate_order_listing() {
    let (order_listing, _, _, _) = setup_orders();
    let validated_order = order_listing.validate_order_type();
    // test for order type detection validity
    assert(validated_order.is_ok(), 'Fail to validate order type');
    assert(validated_order.unwrap() == OrderType::Listing, 'Fail for type listing');
}

#[test]
fn test_validate_order_offer() {
    let (_, order_offer, _, _) = setup_orders();
    let validated_order = order_offer.validate_order_type();
    // test for order type detection validity
    assert(validated_order.is_ok(), 'Fail to validate order type');
    assert(validated_order.unwrap() == OrderType::Offer, 'Fail for type offer');
}

#[test]
fn test_validate_order_auction() {
    let (_, _, order_auction, _) = setup_orders();
    let validated_order = order_auction.validate_order_type();
    // test for order type detection validity
    assert(validated_order.is_ok(), 'Fail to validate order type');
    assert(validated_order.unwrap() == OrderType::Auction, 'Fail for type auction');
}

#[test]
fn test_validate_order_collection_offer() {
    let (_, _, _, order_collection_offer) = setup_orders();
    let validated_order = order_collection_offer.validate_order_type();
    // test for order type detection validity
    assert(validated_order.is_ok(), 'Fail to validate order type');
    assert(
        validated_order.unwrap() == OrderType::CollectionOffer, 'Fail for type collection offer'
    );
}
