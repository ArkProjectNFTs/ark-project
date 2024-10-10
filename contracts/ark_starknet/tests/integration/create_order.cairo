use ark_common::protocol::order_types::{OrderStatus, OrderTrait, OrderType, RouteType};
use ark_common::protocol::order_v1::OrderV1;

use ark_component::orderbook::OrderbookComponent;
use ark_component::orderbook::interface::{IOrderbookDispatcher, IOrderbookDispatcherTrait,};

use ark_starknet::executor::executor;

use ark_starknet::interfaces::{
    IExecutorDispatcher, IExecutorDispatcherTrait, IMaintenanceDispatcher,
    IMaintenanceDispatcherTrait
};

use ark_tokens::erc20::IFreeMintDispatcher as Erc20Dispatcher;
use ark_tokens::erc20::IFreeMintDispatcherTrait as Erc20DispatcherTrait;
use ark_tokens::erc721::IFreeMintDispatcher as Erc721Dispatcher;
use ark_tokens::erc721::IFreeMintDispatcherTrait as Erc721DispatcherTrait;

use snforge_std::{
    cheat_caller_address, CheatSpan, spy_events, EventSpyAssertionsTrait,
    start_cheat_block_timestamp_global, stop_cheat_block_timestamp_global
};
use starknet::{ContractAddress, contract_address_const};

use super::super::common::setup::{
    setup, setup_erc20_order, setup_auction_order, setup_collection_offer_order,
    setup_listing_order, setup_offer_order, setup_limit_sell_order, setup_limit_buy_order
};


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
fn test_create_limit_buy_order_ok() {
    let (executor_address, erc20_address, token_address) = setup_erc20_order();
    let offerer = contract_address_const::<'offerer'>();
    let start_amount = 10_000_000;
    let quantity = 5_000_000;
    Erc20Dispatcher { contract_address: erc20_address }.mint(offerer, start_amount);

    let order = setup_limit_buy_order(
        erc20_address, token_address, offerer, start_amount, quantity
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
                                order_type: OrderType::LimitBuy,
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
        OrderType::LimitBuy,
        "Wrong order type"
    );
    assert_eq!(
        IOrderbookDispatcher { contract_address: executor_address }.get_order_status(order_hash),
        OrderStatus::Open,
        "Wrong order status"
    );
}

#[test]
fn test_create_limit_sell_order_ok() {
    let (executor_address, erc20_address, token_address) = setup_erc20_order();
    let offerer = contract_address_const::<'offerer'>();
    let end_amount = 10_000_000;
    let quantity = 5_000_000;
    Erc20Dispatcher { contract_address: token_address }.mint(offerer, quantity);

    let order = setup_limit_sell_order(erc20_address, token_address, offerer, end_amount, quantity);
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
                                order_type: OrderType::LimitSell,
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
        OrderType::LimitSell,
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

#[test]
#[should_panic(expected: "Oferrer does not own enough ERC20 tokens to buy")]
fn test_create_limit_buy_order_offerer_not_enough_erc20_tokens() {
    let (executor_address, erc20_address, token_address) = setup_erc20_order();
    let offerer = contract_address_const::<'offerer'>();
    let start_amount = 10_000_000;
    let minted = 10_000;
    let quantity = 100_000;

    Erc20Dispatcher { contract_address: erc20_address }.mint(offerer, minted);

    let order = setup_limit_buy_order(
        erc20_address, token_address, offerer, start_amount, quantity
    );

    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
}

#[test]
#[should_panic(expected: "Oferrer does not own enough ERC20 tokens to sell")]
fn test_create_limit_sell_order_offerer_not_enough_erc20_tokens() {
    let (executor_address, erc20_address, token_address) = setup_erc20_order();
    let offerer = contract_address_const::<'offerer'>();
    let end_amount = 10_000_000;
    let minted = 10_000;
    let quantity = 100_000;

    Erc20Dispatcher { contract_address: token_address }.mint(offerer, minted);

    let order = setup_limit_sell_order(erc20_address, token_address, offerer, end_amount, quantity);

    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
}

#[test]
#[should_panic(expected: 'OB: order already exists')]
fn test_create_limit_buy_order_twice() {
    let (executor_address, erc20_address, token_address) = setup_erc20_order();
    let offerer = contract_address_const::<'offerer'>();
    let start_amount = 10_000_000;
    let quantity = 5_000_000;
    Erc20Dispatcher { contract_address: erc20_address }.mint(offerer, start_amount);

    let order = setup_limit_buy_order(
        erc20_address, token_address, offerer, start_amount, quantity
    );

    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(2));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
}

#[test]
#[should_panic(expected: 'OB: order already exists')]
fn test_create_limit_sell_order_twice() {
    let (executor_address, erc20_address, token_address) = setup_erc20_order();
    let offerer = contract_address_const::<'offerer'>();
    let end_amount = 10_000_000;
    let quantity = 5_000_000;
    Erc20Dispatcher { contract_address: token_address }.mint(offerer, quantity);

    let order = setup_limit_sell_order(erc20_address, token_address, offerer, end_amount, quantity);

    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(2));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
}
