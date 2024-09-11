use ark_common::protocol::order_types::CancelInfo;

use ark_starknet::interfaces::{
    IExecutorDispatcher, IExecutorDispatcherTrait, IMaintenanceDispatcher,
    IMaintenanceDispatcherTrait
};

use snforge_std::{cheat_caller_address, CheatSpan, spy_events, EventSpyAssertionsTrait,};

use starknet::{ContractAddress, contract_address_const};
use super::super::common::setup::{
    create_auction_order, create_collection_offer_order, create_listing_order, create_offer_order,
    setup, setup_default_order, setup_auction_order, setup_collection_offer_order,
    setup_listing_order, setup_offer_order
};

#[test]
fn test_cancel_offer_order() {
    let (executor_address, erc20_address, nft_address) = setup();
    let token_id = 10;

    let (order_hash, offerer, start_amount) = create_offer_order(
        executor_address, erc20_address, nft_address, token_id
    );

    let cancel_info = CancelInfo {
        order_hash,
        canceller: offerer,
        token_chain_id: 'SN_MAIN',
        token_address: nft_address,
        token_id: Option::Some(token_id),
    };

    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.cancel_order(cancel_info);
}

// #[test]
// fn test_cancel_listing_order() {}
//
// #[test]
// fn test_cancel_auction_order() {}
//
// #[test]
// fn test_cancel_collection_offer_order() {}

#[test]
#[should_panic]
fn test_cancel_offer_order_only_offerer() {
    let (executor_address, erc20_address, nft_address) = setup();
    let token_id = 10;
    let other = contract_address_const::<'other'>();

    let (order_hash, offerer, start_amount) = create_offer_order(
        executor_address, erc20_address, nft_address, token_id
    );

    let cancel_info = CancelInfo {
        order_hash,
        canceller: offerer,
        token_chain_id: 'SN_MAIN',
        token_address: nft_address,
        token_id: Option::Some(token_id),
    };

    cheat_caller_address(executor_address, other, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.cancel_order(cancel_info);
}
