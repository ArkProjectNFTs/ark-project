use ark_common::protocol::order_types::{OrderStatus, OrderTrait, OrderType, RouteType};
use ark_common::protocol::order_v1::OrderV1;

use ark_component::orderbook::OrderbookComponent;
use ark_component::orderbook::interface::{IOrderbookDispatcher, IOrderbookDispatcherTrait,};

use ark_starknet::executor::executor;

use ark_starknet::interfaces::{
    IExecutorDispatcher, IExecutorDispatcherTrait, IMaintenanceDispatcher,
    IMaintenanceDispatcherTrait
};
use ark_tokens::erc1155::IFreeMintDispatcher as Erc1155Dispatcher;
use ark_tokens::erc1155::IFreeMintDispatcherTrait as Erc1155DispatcherTrait;

use ark_tokens::erc20::IFreeMintDispatcher as Erc20Dispatcher;
use ark_tokens::erc20::IFreeMintDispatcherTrait as Erc20DispatcherTrait;
use ark_tokens::erc721::IFreeMintDispatcher as Erc721Dispatcher;
use ark_tokens::erc721::IFreeMintDispatcherTrait as Erc721DispatcherTrait;

use openzeppelin::token::erc721::interface::{IERC721Dispatcher, IERC721DispatcherTrait};

use snforge_std::{
    cheat_caller_address, CheatSpan, spy_events, EventSpyAssertionsTrait,
    start_cheat_block_timestamp_global, stop_cheat_block_timestamp_global
};
use starknet::{ContractAddress, contract_address_const};

use super::super::common::setup::{
    setup, setup_auction_order, setup_collection_offer_order, setup_listing_order,
    setup_offer_order, setup_erc1155, setup_order_erc1155
};

//
// ERC 721
//

#[test]
fn test_create_offer_order_ok() {
    let (executor_address, erc20_address, nft_address) = setup();
    let offerer = contract_address_const::<'offerer'>();
    let start_amount = 10_000_000;
    let token_id = 10_u256;
    Erc20Dispatcher { contract_address: erc20_address }.mint(offerer, start_amount);

    let order = setup_offer_order(erc20_address, nft_address, offerer, token_id, start_amount);
    let order_hash = order.compute_order_hash();
    let order_version = order.get_version();

    let mut spy = spy_events();
    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);

    spy
        .assert_emitted(
            @array![
                (
                    executor_address,
                    executor::Event::OrderbookEvent(
                        OrderbookComponent::Event::OrderPlaced(
                            OrderbookComponent::OrderPlaced {
                                order_hash,
                                order_version,
                                order_type: OrderType::Offer,
                                version: OrderbookComponent::ORDER_PLACED_EVENT_VERSION,
                                cancelled_order_hash: Option::None,
                                order,
                            }
                        )
                    )
                )
            ]
        );

    assert_eq!(
        IOrderbookDispatcher { contract_address: executor_address }.get_order_type(order_hash),
        OrderType::Offer,
        "Wrong order type"
    );
    assert_eq!(
        IOrderbookDispatcher { contract_address: executor_address }.get_order_status(order_hash),
        OrderStatus::Open,
        "Wrong order status"
    );
}

#[test]
fn test_create_listing_order_ok() {
    let (executor_address, erc20_address, nft_address) = setup();
    let offerer = contract_address_const::<'offerer'>();
    let start_amount = 10_000_000;
    let token_id: u256 = Erc721Dispatcher { contract_address: nft_address }
        .get_current_token_id()
        .into();
    Erc721Dispatcher { contract_address: nft_address }.mint(offerer, 'base_uri');

    let order = setup_listing_order(erc20_address, nft_address, offerer, token_id, start_amount);
    let order_hash = order.compute_order_hash();
    let order_version = order.get_version();

    let mut spy = spy_events();
    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);

    spy
        .assert_emitted(
            @array![
                (
                    executor_address,
                    executor::Event::OrderbookEvent(
                        OrderbookComponent::Event::OrderPlaced(
                            OrderbookComponent::OrderPlaced {
                                order_hash,
                                order_version,
                                order_type: OrderType::Listing,
                                version: OrderbookComponent::ORDER_PLACED_EVENT_VERSION,
                                cancelled_order_hash: Option::None,
                                order,
                            }
                        )
                    )
                )
            ]
        );

    assert_eq!(
        IOrderbookDispatcher { contract_address: executor_address }.get_order_type(order_hash),
        OrderType::Listing,
        "Wrong order type"
    );
    assert_eq!(
        IOrderbookDispatcher { contract_address: executor_address }.get_order_status(order_hash),
        OrderStatus::Open,
        "Wrong order status"
    );
}

#[test]
fn test_create_auction_order_ok() {
    let (executor_address, erc20_address, nft_address) = setup();
    let offerer = contract_address_const::<'offerer'>();
    let start_amount = 10_000_000;
    let end_amount = start_amount * 2;
    let token_id: u256 = Erc721Dispatcher { contract_address: nft_address }
        .get_current_token_id()
        .into();
    Erc721Dispatcher { contract_address: nft_address }.mint(offerer, 'base_uri');

    let order = setup_auction_order(
        erc20_address, nft_address, offerer, token_id, start_amount, end_amount
    );
    let order_hash = order.compute_order_hash();
    let order_version = order.get_version();

    let mut spy = spy_events();
    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);

    spy
        .assert_emitted(
            @array![
                (
                    executor_address,
                    executor::Event::OrderbookEvent(
                        OrderbookComponent::Event::OrderPlaced(
                            OrderbookComponent::OrderPlaced {
                                order_hash,
                                order_version,
                                order_type: OrderType::Auction,
                                version: OrderbookComponent::ORDER_PLACED_EVENT_VERSION,
                                cancelled_order_hash: Option::None,
                                order,
                            }
                        )
                    )
                )
            ]
        );

    assert_eq!(
        IOrderbookDispatcher { contract_address: executor_address }.get_order_type(order_hash),
        OrderType::Auction,
        "Wrong order type"
    );
    assert_eq!(
        IOrderbookDispatcher { contract_address: executor_address }.get_order_status(order_hash),
        OrderStatus::Open,
        "Wrong order status"
    );
}

#[test]
fn test_create_collection_offer_order_ok() {
    let (executor_address, erc20_address, nft_address) = setup();
    let offerer = contract_address_const::<'offerer'>();
    let start_amount = 10_000_000;
    Erc20Dispatcher { contract_address: erc20_address }.mint(offerer, start_amount);

    let order = setup_collection_offer_order(erc20_address, nft_address, offerer, start_amount);
    let order_hash = order.compute_order_hash();
    let order_version = order.get_version();

    let mut spy = spy_events();
    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);

    spy
        .assert_emitted(
            @array![
                (
                    executor_address,
                    executor::Event::OrderbookEvent(
                        OrderbookComponent::Event::OrderPlaced(
                            OrderbookComponent::OrderPlaced {
                                order_hash,
                                order_version,
                                order_type: OrderType::CollectionOffer,
                                version: OrderbookComponent::ORDER_PLACED_EVENT_VERSION,
                                cancelled_order_hash: Option::None,
                                order,
                            }
                        )
                    )
                )
            ]
        );

    assert_eq!(
        IOrderbookDispatcher { contract_address: executor_address }.get_order_type(order_hash),
        OrderType::CollectionOffer,
        "Wrong order type"
    );
    assert_eq!(
        IOrderbookDispatcher { contract_address: executor_address }.get_order_status(order_hash),
        OrderStatus::Open,
        "Wrong order status"
    );
}

#[test]
#[should_panic(expected: "Caller is not the offerer")]
fn test_create_offer_order_offerer_shall_be_caller() {
    let (executor_address, erc20_address, nft_address) = setup();
    let offerer = contract_address_const::<'offerer'>();
    let caller = contract_address_const::<'caller'>();
    let start_amount = 10_000_000;
    let token_id = 10_u256;

    Erc20Dispatcher { contract_address: erc20_address }.mint(offerer, start_amount);

    let order = setup_offer_order(erc20_address, nft_address, offerer, token_id, start_amount);

    cheat_caller_address(executor_address, caller, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
}

#[test]
#[should_panic(expected: "Offerer does not own enough ERC20 tokens")]
fn test_create_offer_order_offerer_not_enough_erc20_tokens() {
    let (executor_address, erc20_address, nft_address) = setup();
    let offerer = contract_address_const::<'offerer'>();
    let start_amount = 10_000_000;
    let minted = 10_000;
    let token_id = 10_u256;

    Erc20Dispatcher { contract_address: erc20_address }.mint(offerer, minted);

    let order = setup_offer_order(erc20_address, nft_address, offerer, token_id, start_amount);

    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
}

#[test]
#[should_panic(expected: "Offerer does not own the specified ERC721 token")]
fn test_create_listing_order_offerer_not_own_ec721_token() {
    let (executor_address, erc20_address, nft_address) = setup();
    let offerer = contract_address_const::<'offerer'>();
    let other = contract_address_const::<'other'>();
    let start_amount = 10_000_000;

    let token_id: u256 = Erc721Dispatcher { contract_address: nft_address }
        .get_current_token_id()
        .into();
    Erc721Dispatcher { contract_address: nft_address }.mint(other, 'base_uri');

    let order = setup_listing_order(erc20_address, nft_address, offerer, token_id, start_amount);

    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
}

#[test]
#[should_panic(expected: 'Executor not enabled')]
fn test_create_offer_order_disabled() {
    let (executor_address, erc20_address, nft_address) = setup();
    let admin = contract_address_const::<'admin'>();
    let offerer = contract_address_const::<'offerer'>();
    let start_amount = 10_000_000;
    let token_id = 10_u256;

    Erc20Dispatcher { contract_address: erc20_address }.mint(offerer, start_amount);

    let order = setup_offer_order(erc20_address, nft_address, offerer, token_id, start_amount);

    cheat_caller_address(executor_address, admin, CheatSpan::TargetCalls(1));
    IMaintenanceDispatcher { contract_address: executor_address }.set_maintenance_mode(true);

    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
}

#[test]
#[should_panic(expected: 'Executor not enabled')]
fn test_create_listing_order_disabled() {
    let (executor_address, erc20_address, nft_address) = setup();
    let admin = contract_address_const::<'admin'>();
    let offerer = contract_address_const::<'offerer'>();
    let start_amount = 10_000_000;
    let token_id: u256 = Erc721Dispatcher { contract_address: nft_address }
        .get_current_token_id()
        .into();
    Erc721Dispatcher { contract_address: nft_address }.mint(offerer, 'base_uri');

    let order = setup_listing_order(erc20_address, nft_address, offerer, token_id, start_amount);

    cheat_caller_address(executor_address, admin, CheatSpan::TargetCalls(1));
    IMaintenanceDispatcher { contract_address: executor_address }.set_maintenance_mode(true);

    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
}

#[test]
#[should_panic(expected: 'OB: order already exists')]
fn test_create_offer_order_twice() {
    let (executor_address, erc20_address, nft_address) = setup();
    let offerer = contract_address_const::<'offerer'>();
    let start_amount = 10_000_000;
    let token_id = 10_u256;
    Erc20Dispatcher { contract_address: erc20_address }.mint(offerer, start_amount);

    let order = setup_offer_order(erc20_address, nft_address, offerer, token_id, start_amount);

    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(2));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
}

#[test]
#[should_panic(expected: 'OB: order already exists')]
fn test_create_listing_order_twice() {
    let (executor_address, erc20_address, nft_address) = setup();
    let offerer = contract_address_const::<'offerer'>();
    let start_amount = 10_000_000;
    let token_id: u256 = Erc721Dispatcher { contract_address: nft_address }
        .get_current_token_id()
        .into();
    Erc721Dispatcher { contract_address: nft_address }.mint(offerer, 'base_uri');

    let order = setup_listing_order(erc20_address, nft_address, offerer, token_id, start_amount);

    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(2));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
}

#[test]
#[should_panic(expected: 'OB: order already exists')]
fn test_create_auction_order_twice() {
    let (executor_address, erc20_address, nft_address) = setup();
    let offerer = contract_address_const::<'offerer'>();
    let start_amount = 10_000_000;
    let end_amount = start_amount * 2;
    let token_id: u256 = Erc721Dispatcher { contract_address: nft_address }
        .get_current_token_id()
        .into();
    Erc721Dispatcher { contract_address: nft_address }.mint(offerer, 'base_uri');

    let order = setup_auction_order(
        erc20_address, nft_address, offerer, token_id, start_amount, end_amount
    );

    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(2));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
}

#[test]
#[should_panic(expected: 'OB: order already exists')]
fn test_create_collection_offer_order_twice() {
    let (executor_address, erc20_address, nft_address) = setup();
    let offerer = contract_address_const::<'offerer'>();
    let start_amount = 10_000_000;
    Erc20Dispatcher { contract_address: erc20_address }.mint(offerer, start_amount);

    let order = setup_collection_offer_order(erc20_address, nft_address, offerer, start_amount);

    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(2));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
}

#[test]
#[should_panic(expected: 'END_DATE_IN_THE_PAST')]
fn test_create_offer_order_expired() {
    let (executor_address, erc20_address, nft_address) = setup();
    let offerer = contract_address_const::<'offerer'>();
    let start_amount = 10_000_000;
    let token_id = 10_u256;
    Erc20Dispatcher { contract_address: erc20_address }.mint(offerer, start_amount);

    let mut order = setup_offer_order(erc20_address, nft_address, offerer, token_id, start_amount);
    let current = starknet::get_block_timestamp();
    order.end_date = current + 10;
    start_cheat_block_timestamp_global(current + 30);
    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
    stop_cheat_block_timestamp_global();
}

#[test]
#[should_panic(expected: 'END_DATE_IN_THE_PAST')]
fn test_create_listing_order_expired() {
    let (executor_address, erc20_address, nft_address) = setup();
    let offerer = contract_address_const::<'offerer'>();
    let start_amount = 10_000_000;
    let token_id: u256 = Erc721Dispatcher { contract_address: nft_address }
        .get_current_token_id()
        .into();
    Erc721Dispatcher { contract_address: nft_address }.mint(offerer, 'base_uri');

    let mut order = setup_listing_order(
        erc20_address, nft_address, offerer, token_id, start_amount
    );
    let current = starknet::get_block_timestamp();
    order.end_date = current + 10;
    start_cheat_block_timestamp_global(current + 30);
    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
    stop_cheat_block_timestamp_global();
}

#[test]
#[should_panic(expected: 'END_DATE_IN_THE_PAST')]
fn test_create_auction_order_expired() {
    let (executor_address, erc20_address, nft_address) = setup();
    let offerer = contract_address_const::<'offerer'>();
    let start_amount = 10_000_000;
    let end_amount = start_amount * 2;
    let token_id: u256 = Erc721Dispatcher { contract_address: nft_address }
        .get_current_token_id()
        .into();
    Erc721Dispatcher { contract_address: nft_address }.mint(offerer, 'base_uri');

    let mut order = setup_auction_order(
        erc20_address, nft_address, offerer, token_id, start_amount, end_amount
    );
    let current = starknet::get_block_timestamp();
    order.end_date = current + 10;
    start_cheat_block_timestamp_global(current + 30);
    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
    stop_cheat_block_timestamp_global();
}

#[test]
#[should_panic(expected: 'END_DATE_IN_THE_PAST')]
fn test_create_collection_offer_order_expired() {
    let (executor_address, erc20_address, nft_address) = setup();
    let offerer = contract_address_const::<'offerer'>();
    let start_amount = 10_000_000;
    Erc20Dispatcher { contract_address: erc20_address }.mint(offerer, start_amount);

    let mut order = setup_collection_offer_order(erc20_address, nft_address, offerer, start_amount);
    let current = starknet::get_block_timestamp();
    order.end_date = current + 10;
    start_cheat_block_timestamp_global(current + 30);
    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
    stop_cheat_block_timestamp_global();
}

//
// ERC1155
//

#[test]
fn test_create_order_erc20_to_erc1155_ok() {
    let (executor_address, erc20_address, erc1155_address) = setup_erc1155();
    let offerer = contract_address_const::<'offerer'>();
    let quantity = 50_u256;
    let start_amount = 10_000_000;

    Erc20Dispatcher { contract_address: erc20_address }.mint(offerer, start_amount);

    let mut order = setup_order_erc1155(erc20_address, erc1155_address, quantity);
    order.route = RouteType::Erc20ToErc1155.into();
    order.offerer = offerer;
    order.start_amount = start_amount;

    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
}

#[test]
fn test_create_order_erc1155_to_erc20_ok() {
    let (executor_address, erc20_address, erc1155_address) = setup_erc1155();
    let offerer = erc1155_address;
    let quantity = 50_u256;

    let token_id = Erc1155Dispatcher { contract_address: erc1155_address }.mint(offerer, quantity);

    let mut order = setup_order_erc1155(erc20_address, erc1155_address, quantity);
    order.route = RouteType::Erc1155ToErc20.into();
    order.offerer = offerer;
    order.token_id = Option::Some(token_id.into());

    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
}

#[test]
#[should_panic(expected: "Offerer does not own enough of the specified ERC1155 token")]
fn test_create_order_offerer_not_own_enough_erc1155_token() {
    let (executor_address, erc20_address, erc1155_address) = setup_erc1155();
    let offerer = erc1155_address;
    let quantity = 50_u256;

    let token_id = Erc1155Dispatcher { contract_address: erc1155_address }.mint(offerer, 2_u256);

    let mut order = setup_order_erc1155(erc20_address, erc1155_address, quantity);
    order.route = RouteType::Erc1155ToErc20.into();
    order.offerer = offerer;
    order.token_id = Option::Some(token_id);

    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
}

#[test]
#[should_panic(expected: 'Executor not enabled')]
fn test_create_order_erc20_to_erc1155_disabled() {
    let (executor_address, erc20_address, erc1155_address) = setup_erc1155();
    let admin = contract_address_const::<'admin'>();
    let offerer = contract_address_const::<'offerer'>();
    let start_amount = 10_000_000;
    let quantity = 50_u256;

    Erc20Dispatcher { contract_address: erc20_address }.mint(offerer, start_amount);

    let mut order = setup_order_erc1155(erc20_address, erc1155_address, quantity);
    order.route = RouteType::Erc20ToErc1155.into();
    order.offerer = offerer;
    order.start_amount = start_amount;

    cheat_caller_address(executor_address, admin, CheatSpan::TargetCalls(1));
    IMaintenanceDispatcher { contract_address: executor_address }.set_maintenance_mode(true);

    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
}

#[test]
#[should_panic(expected: 'Executor not enabled')]
fn test_create_order_erc1155_to_erc20_disabled() {
    let (executor_address, erc20_address, erc1155_address) = setup_erc1155();
    let admin = contract_address_const::<'admin'>();
    let offerer = erc1155_address;
    let quantity = 50_u256;

    let token_id = Erc1155Dispatcher { contract_address: erc1155_address }.mint(offerer, quantity);

    let mut order = setup_order_erc1155(erc20_address, erc1155_address, quantity);
    order.route = RouteType::Erc1155ToErc20.into();
    order.offerer = offerer;
    order.token_id = Option::Some(token_id);

    cheat_caller_address(executor_address, admin, CheatSpan::TargetCalls(1));
    IMaintenanceDispatcher { contract_address: executor_address }.set_maintenance_mode(true);

    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
}


#[test]
fn test_create_listing_order_transfer_token_to_other_user() {
    let (executor_address, erc20_address, nft_address) = setup();
    let offerer = contract_address_const::<'offerer'>();
    let other_offerer = contract_address_const::<'other_offerer'>();

    let start_amount = 10_000_000;
    let other_start_amount = 20_000_000;

    let token_id: u256 = Erc721Dispatcher { contract_address: nft_address }
        .get_current_token_id()
        .into();
    Erc721Dispatcher { contract_address: nft_address }.mint(offerer, 'base_uri');

    let order = setup_listing_order(erc20_address, nft_address, offerer, token_id, start_amount);
    let order_hash = order.compute_order_hash();

    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);

    cheat_caller_address(nft_address, offerer, CheatSpan::TargetCalls(1));
    IERC721Dispatcher { contract_address: nft_address }
        .transfer_from(offerer, other_offerer, token_id);

    let other_order = setup_listing_order(
        erc20_address, nft_address, other_offerer, token_id, other_start_amount
    );
    let other_order_hash = other_order.compute_order_hash();
    let order_version = other_order.get_version();

    let mut spy = spy_events();
    cheat_caller_address(executor_address, other_offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(other_order);

    spy
        .assert_emitted(
            @array![
                (
                    executor_address,
                    executor::Event::OrderbookEvent(
                        OrderbookComponent::Event::OrderCancelled(
                            OrderbookComponent::OrderCancelled {
                                order_hash,
                                reason: OrderStatus::CancelledByNewOrder.into(),
                                order_type: OrderType::Listing,
                                version: OrderbookComponent::ORDER_CANCELLED_EVENT_VERSION,
                            }
                        )
                    )
                ),
                (
                    executor_address,
                    executor::Event::OrderbookEvent(
                        OrderbookComponent::Event::OrderPlaced(
                            OrderbookComponent::OrderPlaced {
                                order_hash: other_order_hash,
                                order_version,
                                order_type: OrderType::Listing,
                                version: OrderbookComponent::ORDER_PLACED_EVENT_VERSION,
                                cancelled_order_hash: Option::Some(order_hash),
                                order: other_order,
                            }
                        )
                    )
                )
            ]
        );

    assert_eq!(
        IOrderbookDispatcher { contract_address: executor_address }.get_order_type(order_hash),
        OrderType::Listing,
        "Wrong order type"
    );
    assert_eq!(
        IOrderbookDispatcher { contract_address: executor_address }
            .get_order_type(other_order_hash),
        OrderType::Listing,
        "Wrong other order type"
    );

    assert_eq!(
        IOrderbookDispatcher { contract_address: executor_address }.get_order_status(order_hash),
        OrderStatus::CancelledByNewOrder,
        "Wrong order status"
    );

    assert_eq!(
        IOrderbookDispatcher { contract_address: executor_address }
            .get_order_status(other_order_hash),
        OrderStatus::Open,
        "Wrong other order status"
    );
}

#[test]
fn test_create_auction_order_transfer_token_to_other_user() {
    let (executor_address, erc20_address, nft_address) = setup();
    let offerer = contract_address_const::<'offerer'>();
    let other_offerer = contract_address_const::<'other_offerer'>();

    let start_amount = 10_000_000;
    let other_start_amount = 15_000_000;
    let end_amount = start_amount * 2;

    let token_id: u256 = Erc721Dispatcher { contract_address: nft_address }
        .get_current_token_id()
        .into();
    Erc721Dispatcher { contract_address: nft_address }.mint(offerer, 'base_uri');

    let order = setup_auction_order(
        erc20_address, nft_address, offerer, token_id, start_amount, end_amount
    );
    let order_hash = order.compute_order_hash();

    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);

    cheat_caller_address(nft_address, offerer, CheatSpan::TargetCalls(1));
    IERC721Dispatcher { contract_address: nft_address }
        .transfer_from(offerer, other_offerer, token_id);

    let other_order = setup_auction_order(
        erc20_address, nft_address, other_offerer, token_id, other_start_amount, end_amount
    );
    let other_order_hash = other_order.compute_order_hash();
    let order_version = other_order.get_version();

    let mut spy = spy_events();
    cheat_caller_address(executor_address, other_offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(other_order);

    spy
        .assert_emitted(
            @array![
                (
                    executor_address,
                    executor::Event::OrderbookEvent(
                        OrderbookComponent::Event::OrderCancelled(
                            OrderbookComponent::OrderCancelled {
                                order_hash,
                                reason: OrderStatus::CancelledByNewOrder.into(),
                                order_type: OrderType::Auction,
                                version: OrderbookComponent::ORDER_CANCELLED_EVENT_VERSION,
                            }
                        )
                    )
                ),
                (
                    executor_address,
                    executor::Event::OrderbookEvent(
                        OrderbookComponent::Event::OrderPlaced(
                            OrderbookComponent::OrderPlaced {
                                order_hash: other_order_hash,
                                order_version,
                                order_type: OrderType::Auction,
                                version: OrderbookComponent::ORDER_PLACED_EVENT_VERSION,
                                cancelled_order_hash: Option::Some(order_hash),
                                order: other_order,
                            }
                        )
                    )
                )
            ]
        );

    assert_eq!(
        IOrderbookDispatcher { contract_address: executor_address }.get_order_type(order_hash),
        OrderType::Auction,
        "Wrong order type"
    );
    assert_eq!(
        IOrderbookDispatcher { contract_address: executor_address }
            .get_order_type(other_order_hash),
        OrderType::Auction,
        "Wrong other order type"
    );

    assert_eq!(
        IOrderbookDispatcher { contract_address: executor_address }.get_order_status(order_hash),
        OrderStatus::CancelledByNewOrder,
        "Wrong order status"
    );

    assert_eq!(
        IOrderbookDispatcher { contract_address: executor_address }
            .get_order_status(other_order_hash),
        OrderStatus::Open,
        "Wrong other order status"
    );
}
