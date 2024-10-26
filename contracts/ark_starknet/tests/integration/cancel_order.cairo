use ark_common::protocol::order_types::{CancelInfo, OrderStatus, OrderType};

use ark_component::orderbook::OrderbookComponent;
use ark_component::orderbook::interface::{IOrderbookDispatcher, IOrderbookDispatcherTrait,};

use ark_starknet::executor::executor;

use ark_starknet::interfaces::{
    IExecutorDispatcher, IExecutorDispatcherTrait, IMaintenanceDispatcher,
    IMaintenanceDispatcherTrait
};

use snforge_std::{cheat_caller_address, CheatSpan, spy_events, EventSpyAssertionsTrait,};

use starknet::{ContractAddress, contract_address_const};
use super::super::common::setup::{
    create_auction_order, create_collection_offer_order, create_listing_order, create_offer_order,
    setup, setup_erc20_order, setup_default_order, setup_auction_order,
    setup_collection_offer_order, setup_listing_order, setup_offer_order, create_limit_buy_order,
    create_limit_sell_order
};

#[test]
fn test_cancel_offer_order() {
    let (executor_address, erc20_address, nft_address) = setup();
    let token_id = 10;
    let (order_hash, offerer, _) = create_offer_order(
        executor_address, erc20_address, nft_address, token_id
    );

    let cancel_info = CancelInfo {
        order_hash,
        canceller: offerer,
        token_chain_id: 'SN_MAIN',
        token_address: nft_address,
        token_id: Option::Some(token_id),
    };

    let mut spy = spy_events();
    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.cancel_order(cancel_info);

    spy
        .assert_emitted(
            @array![
                (
                    executor_address,
                    executor::Event::OrderbookEvent(
                        OrderbookComponent::Event::OrderCancelled(
                            OrderbookComponent::OrderCancelled {
                                order_hash,
                                reason: OrderStatus::CancelledUser.into(),
                                order_type: OrderType::Offer,
                                version: OrderbookComponent::ORDER_CANCELLED_EVENT_VERSION,
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
        OrderStatus::CancelledUser,
        "Wrong order status"
    );
}

#[test]
fn test_cancel_listing_order() {
    let (executor_address, erc20_address, nft_address) = setup();
    let start_amount = 10_000_000;

    let (order_hash, offerer, token_id) = create_listing_order(
        executor_address, erc20_address, nft_address, start_amount
    );

    let cancel_info = CancelInfo {
        order_hash,
        canceller: offerer,
        token_chain_id: 'SN_MAIN',
        token_address: nft_address,
        token_id: Option::Some(token_id),
    };

    let mut spy = spy_events();
    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.cancel_order(cancel_info);

    spy
        .assert_emitted(
            @array![
                (
                    executor_address,
                    executor::Event::OrderbookEvent(
                        OrderbookComponent::Event::OrderCancelled(
                            OrderbookComponent::OrderCancelled {
                                order_hash,
                                reason: OrderStatus::CancelledUser.into(),
                                order_type: OrderType::Listing,
                                version: OrderbookComponent::ORDER_CANCELLED_EVENT_VERSION,
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
        OrderStatus::CancelledUser,
        "Wrong order status"
    );
}

#[test]
fn test_cancel_auction_order() {
    let (executor_address, erc20_address, nft_address) = setup();
    let start_amount = 10_000_000;
    let end_amount = 20_000_000;

    let (order_hash, offerer, token_id) = create_auction_order(
        executor_address, erc20_address, nft_address, start_amount, end_amount
    );

    let cancel_info = CancelInfo {
        order_hash,
        canceller: offerer,
        token_chain_id: 'SN_MAIN',
        token_address: nft_address,
        token_id: Option::Some(token_id),
    };

    let mut spy = spy_events();
    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.cancel_order(cancel_info);

    spy
        .assert_emitted(
            @array![
                (
                    executor_address,
                    executor::Event::OrderbookEvent(
                        OrderbookComponent::Event::OrderCancelled(
                            OrderbookComponent::OrderCancelled {
                                order_hash,
                                reason: OrderStatus::CancelledUser.into(),
                                order_type: OrderType::Auction,
                                version: OrderbookComponent::ORDER_CANCELLED_EVENT_VERSION,
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
        OrderStatus::CancelledUser,
        "Wrong order status"
    );
}

#[test]
fn test_cancel_collection_offer_order() {
    let (executor_address, erc20_address, nft_address) = setup();
    let (order_hash, offerer, _) = create_collection_offer_order(
        executor_address, erc20_address, nft_address
    );

    let cancel_info = CancelInfo {
        order_hash,
        canceller: offerer,
        token_chain_id: 'SN_MAIN',
        token_address: nft_address,
        token_id: Option::None
    };

    let mut spy = spy_events();
    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.cancel_order(cancel_info);

    spy
        .assert_emitted(
            @array![
                (
                    executor_address,
                    executor::Event::OrderbookEvent(
                        OrderbookComponent::Event::OrderCancelled(
                            OrderbookComponent::OrderCancelled {
                                order_hash,
                                reason: OrderStatus::CancelledUser.into(),
                                order_type: OrderType::CollectionOffer,
                                version: OrderbookComponent::ORDER_CANCELLED_EVENT_VERSION,
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
        OrderStatus::CancelledUser,
        "Wrong order status"
    );
}

#[test]
fn test_cancel_limit_buy_order() {
    let (executor_address, erc20_address, token_address) = setup_erc20_order();
    let start_amount = 10_000_000;
    let quantity = 5000;

    let (order_hash, offerer, _) = create_limit_buy_order(
        executor_address, erc20_address, token_address, start_amount, quantity
    );

    let cancel_info = CancelInfo {
        order_hash,
        canceller: offerer,
        token_chain_id: 'SN_MAIN',
        token_address: token_address,
        token_id: Option::None,
    };

    let mut spy = spy_events();
    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.cancel_order(cancel_info);

    spy
        .assert_emitted(
            @array![
                (
                    executor_address,
                    executor::Event::OrderbookEvent(
                        OrderbookComponent::Event::OrderCancelled(
                            OrderbookComponent::OrderCancelled {
                                order_hash,
                                reason: OrderStatus::CancelledUser.into(),
                                order_type: OrderType::LimitBuy,
                                version: OrderbookComponent::ORDER_CANCELLED_EVENT_VERSION,
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
        OrderStatus::CancelledUser,
        "Wrong order status"
    );
}

#[test]
fn test_cancel_limit_sell_order() {
    let (executor_address, erc20_address, token_address) = setup_erc20_order();
    let end_amount = 10_000_000;
    let quantity = 5000;

    let (order_hash, offerer, _) = create_limit_sell_order(
        executor_address, erc20_address, token_address, end_amount, quantity
    );

    let cancel_info = CancelInfo {
        order_hash,
        canceller: offerer,
        token_chain_id: 'SN_MAIN',
        token_address: token_address,
        token_id: Option::None,
    };

    let mut spy = spy_events();
    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.cancel_order(cancel_info);

    spy
        .assert_emitted(
            @array![
                (
                    executor_address,
                    executor::Event::OrderbookEvent(
                        OrderbookComponent::Event::OrderCancelled(
                            OrderbookComponent::OrderCancelled {
                                order_hash,
                                reason: OrderStatus::CancelledUser.into(),
                                order_type: OrderType::LimitSell,
                                version: OrderbookComponent::ORDER_CANCELLED_EVENT_VERSION,
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
        OrderStatus::CancelledUser,
        "Wrong order status"
    );
}

#[test]
#[should_panic(expected: 'OB: order fulfilled')]
fn test_cancel_offer_order_already_cancelled() {
    let (executor_address, erc20_address, nft_address) = setup();
    let token_id = 10;
    let (order_hash, offerer, _) = create_offer_order(
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

    assert_eq!(
        IOrderbookDispatcher { contract_address: executor_address }.get_order_status(order_hash),
        OrderStatus::CancelledUser,
        "Wrong order status"
    );

    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.cancel_order(cancel_info);
}

#[test]
#[should_panic(expected: 'OB: order not found')]
fn test_cancel_offer_order_bad_order_hash() {
    let (executor_address, erc20_address, nft_address) = setup();
    let token_id = 10;
    let (order_hash, offerer, _) = create_offer_order(
        executor_address, erc20_address, nft_address, token_id
    );

    let cancel_info = CancelInfo {
        order_hash: order_hash + 1,
        canceller: offerer,
        token_chain_id: 'SN_MAIN',
        token_address: nft_address,
        token_id: Option::Some(token_id),
    };

    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.cancel_order(cancel_info);
}


#[test]
#[should_panic(expected: "Caller is not the canceller")]
fn test_cancel_offer_order_caller_is_not_offerer() {
    let (executor_address, erc20_address, nft_address) = setup();
    let token_id = 10;
    let other = contract_address_const::<'other'>();

    let (order_hash, offerer, _) = create_offer_order(
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


#[test]
#[should_panic(expected: "Canceller is not the offerer")]
fn test_cancel_offer_order_offerer_is_not_the_canceller() {
    let (executor_address, erc20_address, nft_address) = setup();
    let token_id = 10;
    let other = contract_address_const::<'other'>();

    let (order_hash, _offerer, _start_amount) = create_offer_order(
        executor_address, erc20_address, nft_address, token_id
    );

    let cancel_info = CancelInfo {
        order_hash,
        canceller: other,
        token_chain_id: 'SN_MAIN',
        token_address: nft_address,
        token_id: Option::Some(token_id),
    };

    cheat_caller_address(executor_address, other, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.cancel_order(cancel_info);
}
