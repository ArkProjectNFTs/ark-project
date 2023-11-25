use core::option::OptionTrait;
use arkchain::order::types::OrderTrait;
use core::result::ResultTrait;
use core::traits::Into;
use core::traits::TryInto;
use arkchain::order::order_v1::OrderV1;
use arkchain::order::order_v1::OrderTraitOrderV1;
use arkchain::order::types::OrderType;
use arkchain::order::types::RouteType;
use debug::PrintTrait;
use arkchain::crypto::signer::{SignInfo, Signer, SignerValidator};
use super::super::super::common::setup::setup_orders;
use snforge_std::{CheatTarget, start_prank, stop_prank};

// *********************************************************
// validate_common_data
// *********************************************************

#[test]
fn test_validate_common_data_with_valid_order() {
    start_prank(CheatTarget::All(()), 123.try_into().unwrap());
    let (order_listing, _, _, _) = setup_orders();
    let block_timestmap: u64 = 1699556828;
    let result = order_listing.validate_common_data(block_timestmap);
    assert(result.is_ok(), 'Invalid result');
    stop_prank(CheatTarget::All(()));
}

#[test]
fn test_order_signature() {
    start_prank(CheatTarget::All(()), 123.try_into().unwrap());
    let block_timestamp = 1700069210;
    let (order_listing, order_offer, order_auction, order_collection_offer) = setup_orders();

    let order_hash = order_listing.compute_order_hash();

    let signer = Signer::WEIERSTRESS_STARKNET(
        SignInfo {
            user_pubkey: 0x20c29f1c98f3320d56f01c13372c923123c35828bce54f2153aa1cfe61c44f2,
            user_sig_r: 1489698813778371355144251950338771124997774846063061621537328046839877802074,
            user_sig_s: 3108595483860555652530443442785498132521754673633088480599648397307624361634,
        }
    );

    order_hash.print();
    SignerValidator::verify(order_hash, signer);
    stop_prank(CheatTarget::All(()));
}

#[test]
fn should_returns_invalid_order_with_zero_quantity() {
    start_prank(CheatTarget::All(()), 123.try_into().unwrap());
    let (order_listing, _, _, _) = setup_orders();
    let block_timestmap: u64 = 1699556828;

    let mut invalid_order = order_listing.clone();
    invalid_order.quantity = 0;
    let result = invalid_order.validate_common_data(block_timestmap);
    assert(!result.is_ok(), 'zero quantity');
    stop_prank(CheatTarget::All(()));
}

#[test]
fn should_returns_invalid_order_with_zero_salt() {
    start_prank(CheatTarget::All(()), 123.try_into().unwrap());
    let (order_listing, _, _, _) = setup_orders();
    let block_timestmap: u64 = 1699556828;

    let mut invalid_order = order_listing.clone();
    invalid_order.salt = 0;
    let result = invalid_order.validate_common_data(block_timestmap);
    assert(!result.is_ok(), 'zero salt');
    stop_prank(CheatTarget::All(()));
}

#[test]
fn should_returns_invalid_order_with_no_token_id() {
    start_prank(CheatTarget::All(()), 123.try_into().unwrap());
    let (order_listing, _, _, _) = setup_orders();
    let block_timestmap: u64 = 1699556828;

    let mut invalid_order = order_listing.clone();
    invalid_order.token_id = Option::None;
    assert(invalid_order.token_id.is_none(), 'token_id should be none');
    let result = invalid_order.validate_common_data(block_timestmap);
    assert(result.is_ok(), 'Result should be valid');
    stop_prank(CheatTarget::All(()));
}

#[test]
fn should_returns_invalid_order_with_invalid_token_address() {
    start_prank(CheatTarget::All(()), 0x123.try_into().unwrap());
    let (order_listing, _, _, _) = setup_orders();
    let block_timestmap: u64 = 1699556828;

    let mut invalid_order = order_listing.clone();
    invalid_order.token_address = 0.try_into().unwrap();
    let result = invalid_order.validate_common_data(block_timestmap);
    assert(!result.is_ok(), 'invalid token address');
    stop_prank(CheatTarget::All(()));
}

#[test]
fn should_returns_invalid_order_with_invalid_dates() {
    start_prank(CheatTarget::All(()), 123.try_into().unwrap());
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
    stop_prank(CheatTarget::All(()));
}

#[test]
fn test_validate_order_listing() {
    start_prank(CheatTarget::All(()), 123.try_into().unwrap());
    let (order_listing, _, _, _) = setup_orders();
    let validated_order = order_listing.validate_order_type();
    // test for order type detection validity
    assert(validated_order.is_ok(), 'Fail to validate order type');
    assert(validated_order.unwrap() == OrderType::Listing, 'Fail for type listing');
    stop_prank(CheatTarget::All(()));
}

#[test]
fn test_validate_order_offer() {
    start_prank(CheatTarget::All(()), 123.try_into().unwrap());
    let (_, order_offer, _, _) = setup_orders();
    let validated_order = order_offer.validate_order_type();
    // test for order type detection validity
    assert(validated_order.is_ok(), 'Fail to validate order type');
    assert(validated_order.unwrap() == OrderType::Offer, 'Fail for type offer');
    stop_prank(CheatTarget::All(()));
}

#[test]
fn test_validate_order_auction() {
    start_prank(CheatTarget::All(()), 123.try_into().unwrap());
    let (_, _, order_auction, _) = setup_orders();
    let validated_order = order_auction.validate_order_type();
    // test for order type detection validity
    assert(validated_order.is_ok(), 'Fail to validate order type');
    assert(validated_order.unwrap() == OrderType::Auction, 'Fail for type auction');
    stop_prank(CheatTarget::All(()));
}

#[test]
fn test_validate_order_collection_offer() {
    start_prank(CheatTarget::All(()), 123.try_into().unwrap());
    let (_, _, _, order_collection_offer) = setup_orders();
    let validated_order = order_collection_offer.validate_order_type();
    // test for order type detection validity
    assert(validated_order.is_ok(), 'Fail to validate order type');
    assert(
        validated_order.unwrap() == OrderType::CollectionOffer, 'Fail for type collection offer'
    );
    stop_prank(CheatTarget::All(()));
}
