use starknet::{ContractAddress, contract_address_const};

use ark_starknet::interfaces::{
    IExecutorDispatcher, IExecutorDispatcherTrait, FeesAmount, FeesRatio
};

use snforge_std as snf;
use snf::{ContractClass, ContractClassTrait, CheatTarget};

use super::super::common::setup::setup;


#[test]
fn test_get_fees_amount_default_creator() {
    let admin = contract_address_const::<'admin'>();
    let creator = contract_address_const::<'creator'>();
    let listing_broker = contract_address_const::<'listing_broker'>();
    let fulfill_broker = contract_address_const::<'fulfill_broker'>();

    let amount = 10_000_000;
    let (executor_address, _, nft_address) = setup();
    let executor = IExecutorDispatcher { contract_address: executor_address };

    let fulfill_fees_ratio = FeesRatio { numerator: 10, denominator: 100 };
    let listing_fees_ratio = FeesRatio { numerator: 5, denominator: 100 };
    let ark_fees_ratio = FeesRatio { numerator: 1, denominator: 100 };
    let default_creator_fees_ratio = FeesRatio { numerator: 2, denominator: 100 };

    snf::start_prank(CheatTarget::One(executor.contract_address), fulfill_broker);
    executor.set_broker_fees(fulfill_fees_ratio);
    snf::stop_prank(CheatTarget::One(executor.contract_address));

    snf::start_prank(CheatTarget::One(executor.contract_address), listing_broker);
    executor.set_broker_fees(listing_fees_ratio);
    snf::stop_prank(CheatTarget::One(executor.contract_address));

    snf::start_prank(CheatTarget::One(executor.contract_address), admin);
    executor.set_ark_fees(ark_fees_ratio);
    executor.set_default_creator_fees(creator, default_creator_fees_ratio);
    snf::stop_prank(CheatTarget::One(executor.contract_address));

    let fees_amount = executor
        .get_fees_amount(fulfill_broker, listing_broker, nft_address, 1, amount);

    assert_eq!(fees_amount.fulfill_broker, 1_000_000, "Wrong amount for fulfill broker");
    assert_eq!(fees_amount.listing_broker, 500_000, "Wrong amount for listing broker");
    assert_eq!(fees_amount.ark, 100_000, "Wrong amount for Ark");
    assert_eq!(fees_amount.creator, 200_000, "Wrong amount for creator");
}

#[test]
fn test_get_fees_amount_collection_creator() {
    let admin = contract_address_const::<'admin'>();
    let creator = contract_address_const::<'creator'>();
    let listing_broker = contract_address_const::<'listing_broker'>();
    let fulfill_broker = contract_address_const::<'fulfill_broker'>();

    let amount = 10_000_000;
    let (executor_address, _, nft_address) = setup();
    let executor = IExecutorDispatcher { contract_address: executor_address };

    let fulfill_fees_ratio = FeesRatio { numerator: 10, denominator: 100 };
    let listing_fees_ratio = FeesRatio { numerator: 5, denominator: 100 };
    let ark_fees_ratio = FeesRatio { numerator: 1, denominator: 100 };
    let default_creator_fees_ratio = FeesRatio { numerator: 2, denominator: 100 };
    let collection_creator_fees_ratio = FeesRatio { numerator: 3, denominator: 100 };

    snf::start_prank(CheatTarget::One(executor.contract_address), fulfill_broker);
    executor.set_broker_fees(fulfill_fees_ratio);
    snf::stop_prank(CheatTarget::One(executor.contract_address));

    snf::start_prank(CheatTarget::One(executor.contract_address), listing_broker);
    executor.set_broker_fees(listing_fees_ratio);
    snf::stop_prank(CheatTarget::One(executor.contract_address));

    snf::start_prank(CheatTarget::One(executor.contract_address), admin);
    executor.set_ark_fees(ark_fees_ratio);
    executor.set_default_creator_fees(creator, default_creator_fees_ratio);
    executor.set_collection_creator_fees(nft_address, creator, collection_creator_fees_ratio);
    snf::stop_prank(CheatTarget::One(executor.contract_address));

    let fees_amount = executor
        .get_fees_amount(fulfill_broker, listing_broker, nft_address, 1, amount);

    assert_eq!(fees_amount.fulfill_broker, 1_000_000, "Wrong amount for fulfill broker");
    assert_eq!(fees_amount.listing_broker, 500_000, "Wrong amount for listing broker");
    assert_eq!(fees_amount.ark, 100_000, "Wrong amount for Ark");
    assert_eq!(fees_amount.creator, 300_000, "Wrong amount for creator");
}
