use core::traits::TryInto;
use core::option::OptionTrait;
use core::traits::Into;
use ark_common::protocol::order_types::{RouteType, FulfillInfo, OrderTrait, OrderType, OrderStatus};
use ark_common::crypto::signer::{Signer, SignInfo};
use ark_common::protocol::order_v1::OrderV1;
use ark_orderbook::orderbook::{OrderbookDispatcher, OrderbookDispatcherTrait};

use snforge_std::signature::KeyPairTrait;
use snforge_std::signature::stark_curve::{
    StarkCurveKeyPairImpl, StarkCurveSignerImpl, StarkCurveVerifierImpl
};

use snforge_std::{start_prank, stop_prank, test_address, CheatTarget};
use starknet::ContractAddress;

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
    let chain_id = 0x534e5f4d41494e;

    let order_listing = OrderV1 {
        route: RouteType::Erc721ToErc20.into(),
        currency_address: 0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7
            .try_into()
            .unwrap(),
        currency_chain_id: chain_id,
        salt: 1,
        offerer: 0x2284a6517b487be8114013f277f9e2010ac001a24a93e3c48cdf5f8f345a81b
            .try_into()
            .unwrap(),
        token_chain_id: chain_id,
        token_address: 0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672
            .try_into()
            .unwrap(),
        token_id: Option::Some(10),
        quantity: 1,
        start_amount: 600000000000000000,
        end_amount: 0,
        start_date: starknet::get_block_timestamp(),
        end_date: starknet::get_block_timestamp() + (30 * 24 * 60 * 60),
        broker_id: 0x123.try_into().unwrap(),
        additional_data: data_span,
    };
    let order_offer = OrderV1 {
        route: RouteType::Erc20ToErc721.into(),
        currency_address: 0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7
            .try_into()
            .unwrap(),
        currency_chain_id: chain_id,
        salt: 1,
        offerer: 0x2284a6517b487be8114013f277f9e2010ac001a24a93e3c48cdf5f8f345a81b
            .try_into()
            .unwrap(),
        token_chain_id: chain_id,
        token_address: 0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672
            .try_into()
            .unwrap(),
        token_id: Option::Some(10),
        quantity: 1,
        start_amount: 600000000000000000,
        end_amount: 0,
        start_date: 1699525884797,
        end_date: 1702117884797,
        broker_id: 0x123.try_into().unwrap(),
        additional_data: data_span,
    };
    let order_auction = OrderV1 {
        route: RouteType::Erc721ToErc20.into(),
        currency_address: 0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7
            .try_into()
            .unwrap(),
        currency_chain_id: chain_id,
        salt: 0,
        offerer: 0x2284a6517b487be8114013f277f9e2010ac001a24a93e3c48cdf5f8f345a81b
            .try_into()
            .unwrap(),
        token_chain_id: chain_id,
        token_address: 0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672
            .try_into()
            .unwrap(),
        token_id: Option::Some(10),
        quantity: 1,
        start_amount: 600000000000000000,
        end_amount: 600000000000000000,
        start_date: starknet::get_block_timestamp(),
        end_date: starknet::get_block_timestamp() + (30 * 24 * 60 * 60),
        broker_id: 0x123.try_into().unwrap(),
        additional_data: data_span,
    };

    let order_collection_offer = OrderV1 {
        route: RouteType::Erc20ToErc721.into(),
        currency_address: 0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7
            .try_into()
            .unwrap(),
        currency_chain_id: chain_id,
        salt: 0,
        offerer: 0x2284a6517b487be8114013f277f9e2010ac001a24a93e3c48cdf5f8f345a81b
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
        end_date: starknet::get_block_timestamp() + (30 * 24 * 60 * 60),
        broker_id: 0x123.try_into().unwrap(),
        additional_data: data_span,
    };

    (order_listing, order_offer, order_auction, order_collection_offer)
}

/// Utility function to setup a listing order for test environment.
///
/// # Arguments
/// * `price` - The price of the listing
///
/// # Returns a tuple of the different orders details
///
fn setup_listing_order(price: felt252) -> (OrderV1, felt252, felt252) {
    let block_timestamp = starknet::get_block_timestamp();
    let end_date = block_timestamp + (30 * 24 * 60 * 60);
    let data = array![];
    let data_span = data.span();
    let chain_id = 0x534e5f4d41494e;
    let order_listing = OrderV1 {
        route: RouteType::Erc721ToErc20.into(),
        currency_address: 0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7
            .try_into()
            .unwrap(),
        currency_chain_id: chain_id,
        salt: 1,
        offerer: 0x2284a6517b487be8114013f277f9e2010ac001a24a93e3c48cdf5f8f345a81b
            .try_into()
            .unwrap(),
        token_chain_id: chain_id,
        token_address: 0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672
            .try_into()
            .unwrap(),
        token_id: Option::Some(10),
        quantity: 1,
        start_amount: price.into(),
        end_amount: 0,
        start_date: block_timestamp,
        end_date: end_date,
        broker_id: 0x123.try_into().unwrap(),
        additional_data: data_span,
    };
    let order_hash = order_listing.compute_order_hash();
    let token_hash = order_listing.compute_token_hash();
    (order_listing, order_hash, token_hash)
}


fn get_offer_order() -> OrderV1 {
    let data = array![];
    let data_span = data.span();
    let chain_id = 0x534e5f4d41494e;
    OrderV1 {
        route: RouteType::Erc20ToErc721.into(),
        currency_address: 0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7
            .try_into()
            .unwrap(),
        currency_chain_id: chain_id,
        salt: 0,
        offerer: 0x2284a6517b487be8114013f277f9e2010ac001a24a93e3c48cdf5f8f345a81b
            .try_into()
            .unwrap(),
        token_chain_id: chain_id,
        token_address: 0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672
            .try_into()
            .unwrap(),
        token_id: Option::Some(1),
        quantity: 1,
        start_amount: 600000000000000000,
        end_amount: 0,
        start_date: starknet::get_block_timestamp(),
        end_date: starknet::get_block_timestamp() + (30 * 24 * 60 * 60),
        broker_id: test_address(),
        additional_data: data_span,
    }
}
