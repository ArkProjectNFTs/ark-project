use core::option::OptionTrait;
use core::traits::Into;
use arkchain::order::types::OrderTrait;
use arkchain::order::order_v1::OrderV1;
use arkchain::order::types::RouteType;
use arkchain::crypto::signer::{Signer, SignInfo};
use snforge_std::signature::{
    StarkCurveKeyPair, StarkCurveKeyPairTrait, Signer as SNSigner, Verifier
};

use super::super::common::signer::sign_mock;
/// Utility function to setup orders for test environment.
///
/// # Returns a tuple of the different orders
/// * order_listing - A listing order of type OrderV1
/// * order_offer - An offer order of type OrderV1
/// * order_auction - An auction order of type OrderV1
/// * order_collection_offer - An offer order of type OrderV1 for a collection
///
fn setup_orders() -> (OrderV1, OrderV1, OrderV1, OrderV1,) {
    let data = array![];
    let data_span = data.span();

    let order_listing = OrderV1 {
        route: RouteType::Erc721ToErc20.into(),
        currency_address: 0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7
            .try_into()
            .unwrap(),
        currency_chain_id: 0x534e5f4d41494e.try_into().unwrap(),
        salt: 1,
        offerer: 0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078
            .try_into()
            .unwrap(),
        token_chain_id: 0x534e5f4d41494e.try_into().unwrap(),
        token_address: 0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672
            .try_into()
            .unwrap(),
        token_id: Option::Some(10),
        quantity: 1,
        start_amount: 600000000000000000,
        end_amount: 0,
        start_date: 1699556828,
        end_date: 1702148828,
        broker_id: 123,
        additional_data: data_span,
    };
    let order_offer = OrderV1 {
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
        token_id: Option::Some(10),
        quantity: 1,
        start_amount: 600000000000000000,
        end_amount: 0,
        start_date: 1699525884797,
        end_date: 1702117884797,
        broker_id: 123,
        additional_data: data_span,
    };
    let order_auction = OrderV1 {
        route: RouteType::Erc721ToErc20.into(),
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
        token_id: Option::Some(10),
        quantity: 1,
        start_amount: 600000000000000000,
        end_amount: 600000000000000000,
        start_date: 1696874828,
        end_date: 1699556828,
        broker_id: 123,
        additional_data: data_span,
    };

    let order_collection_offer = OrderV1 {
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
        token_id: Option::None,
        quantity: 1,
        start_amount: 600000000000000000,
        end_amount: 0,
        start_date: 1699525884797,
        end_date: 1702117884797,
        broker_id: 123,
        additional_data: data_span,
    };

    (order_listing, order_offer, order_auction, order_collection_offer)
}

fn setup_auction_offer(start_date: u64, end_date: u64) -> (OrderV1, Signer, felt252, felt252) {
    let data = array![];
    let data_span = data.span();

    let order_offer = OrderV1 {
        route: RouteType::Erc20ToErc721.into(),
        currency_address: 0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7
            .try_into()
            .unwrap(),
        currency_chain_id: 0x534e5f4d41494e.try_into().unwrap(),
        salt: 1,
        offerer: 0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078
            .try_into()
            .unwrap(),
        token_chain_id: 0x534e5f4d41494e.try_into().unwrap(),
        token_address: 0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672
            .try_into()
            .unwrap(),
        token_id: Option::Some(10),
        quantity: 1,
        start_amount: 600000000000000000,
        end_amount: 0,
        start_date,
        end_date,
        broker_id: 123,
        additional_data: data_span,
    };

    let order_hash = order_offer.compute_order_hash();
    let token_hash = order_offer.compute_token_hash();
    let signer = sign_mock(order_hash);

    (order_offer, signer, order_hash, token_hash)
}

/// Utility function to setup a listing order for test environment.
///
/// # Arguments
/// * `price` - The price of the listing
///
/// # Returns a tuple of the different orders
///
fn setup_listing_order(price: felt252) -> (OrderV1, felt252, felt252) {
    let block_timestamp = starknet::get_block_timestamp();
    let end_date = block_timestamp + (30 * 24 * 60 * 60);
    let data = array![];
    let data_span = data.span();
    let order_listing = OrderV1 {
        route: RouteType::Erc721ToErc20.into(),
        currency_address: 0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7
            .try_into()
            .unwrap(),
        currency_chain_id: 0x534e5f4d41494e.try_into().unwrap(),
        salt: 1,
        offerer: 0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078
            .try_into()
            .unwrap(),
        token_chain_id: 0x534e5f4d41494e.try_into().unwrap(),
        token_address: 0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672
            .try_into()
            .unwrap(),
        token_id: Option::Some(10),
        quantity: 1,
        start_amount: price.into(),
        end_amount: 0,
        start_date: block_timestamp,
        end_date: end_date,
        broker_id: 123,
        additional_data: data_span,
    };
    let order_hash = order_listing.compute_order_hash();
    let token_hash = order_listing.compute_token_hash();
    (order_listing, order_hash, token_hash)
}

/// Utility function to setup a listing order for test environment.
///
/// # Returns a tuple of the different orders data
/// 
/// * order_listing
/// * sign_info
/// * order_hash
/// *token_hash
///
fn setup_listing_order_with_sign() -> (OrderV1, SignInfo, felt252, felt252) {
    let block_timestamp = starknet::get_block_timestamp();
    let end_date = block_timestamp + (30 * 24 * 60 * 60);
    let data = array![];
    let data_span = data.span();
    let order_listing = OrderV1 {
        route: RouteType::Erc721ToErc20.into(),
        currency_address: 0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7
            .try_into()
            .unwrap(),
        currency_chain_id: 0x534e5f4d41494e.try_into().unwrap(),
        salt: 1,
        offerer: 0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078
            .try_into()
            .unwrap(),
        token_chain_id: 0x534e5f4d41494e.try_into().unwrap(),
        token_address: 0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672
            .try_into()
            .unwrap(),
        token_id: Option::Some(10),
        quantity: 1,
        start_amount: 600000000000000000,
        end_amount: 0,
        start_date: block_timestamp,
        end_date: end_date,
        broker_id: 123,
        additional_data: data_span,
    };
    let order_hash = order_listing.compute_order_hash();
    let token_hash = order_listing.compute_token_hash();
    let sign_info = SignInfo { user_pubkey: 0, user_sig_r: 0, user_sig_s: 0, };
    (order_listing, sign_info, order_hash, token_hash)
}

/// Utility function to setup a auction order for test environment.
///
/// # Arguments
/// * `start_price` - The start price of the auction
/// * `end_price` - The end price of the auction
///
/// # Returns a tuple of the different orders data
///
fn setup_auction_order(
    start_date: u64, end_date: u64, start_price: felt252, end_price: felt252
) -> (OrderV1, arkchain::crypto::signer::Signer, felt252, felt252) {
    let data = array![];
    let data_span = data.span();
    let order_listing = OrderV1 {
        route: RouteType::Erc721ToErc20.into(),
        currency_address: 0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7
            .try_into()
            .unwrap(),
        currency_chain_id: 0x534e5f4d41494e.try_into().unwrap(),
        salt: 1,
        offerer: 0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078
            .try_into()
            .unwrap(),
        token_chain_id: 0x534e5f4d41494e.try_into().unwrap(),
        token_address: 0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672
            .try_into()
            .unwrap(),
        token_id: Option::Some(10),
        quantity: 1,
        start_amount: start_price.into(),
        end_amount: end_price.into(),
        start_date,
        end_date,
        broker_id: 123,
        additional_data: data_span,
    };

    let order_hash = order_listing.compute_order_hash();
    let token_hash = order_listing.compute_token_hash();
    let signer = sign_mock(order_hash);

    (order_listing, signer, order_hash, token_hash)
}

fn setup(
    block_timestamp: u64, is_expired: bool
) -> (OrderV1, arkchain::crypto::signer::Signer, felt252, felt252) {
    let mut end_date = block_timestamp + (30 * 24 * 60 * 60);
    if (is_expired) {
        end_date = block_timestamp;
    }
    let data = array![];
    let data_span = data.span();

    let order_listing = OrderV1 {
        route: RouteType::Erc721ToErc20.into(),
        currency_address: 0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7
            .try_into()
            .unwrap(),
        currency_chain_id: 0x534e5f4d41494e.try_into().unwrap(),
        salt: 1,
        offerer: 0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078
            .try_into()
            .unwrap(),
        token_chain_id: 0x534e5f4d41494e.try_into().unwrap(),
        token_address: 0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672
            .try_into()
            .unwrap(),
        token_id: Option::Some(10),
        quantity: 1,
        start_amount: 600000000000000000,
        end_amount: 0,
        start_date: block_timestamp,
        end_date: end_date,
        broker_id: 123,
        additional_data: data_span,
    };

    let order_hash = order_listing.compute_order_hash();
    let token_hash = order_listing.compute_token_hash();
    let signer = sign_mock(order_hash);
    (order_listing, signer, order_hash, token_hash)
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
        token_id: Option::Some(1),
        quantity: 1,
        start_amount: 600000000000000000,
        end_amount: 0,
        start_date: 1699525884797,
        end_date: 1702117884797,
        broker_id: 123,
        additional_data: data_span,
    }
}
