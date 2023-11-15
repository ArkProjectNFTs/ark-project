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
use arkchain::tests_lib::setup_listing_order_with_sign;

#[test]
fn test_create_listing_order() {
    let block_timestamp = 1699556828; // starknet::get_block_timestamp();
    let (order_listing, signer, _order_hash, token_hash) = setup(block_timestamp);
    let contract = declare('orderbook');
    let contract_data = array![0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078];
    let contract_address = contract.deploy(@contract_data).unwrap();
    let dispatcher = OrderbookDispatcher { contract_address };

    let order = dispatcher.create_order(order: order_listing, signer: signer);
    let order = dispatcher.get_order(_order_hash);
    let order_status = dispatcher.get_order_status(_order_hash);
    let order_type = dispatcher.get_order_type(_order_hash);
    let order_hash = dispatcher.get_order_hash(token_hash);

    assert(order.broker_id == 123, 'Broker id is not equal');
    assert(order.token_id == 10, 'Token id is not equal');
    assert(
        order
            .token_address == 0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672
            .try_into()
            .unwrap(),
        'Token address is not equal'
    );
    assert(
        order
            .currency_address == 0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7
            .try_into()
            .unwrap(),
        'Currency address is not equal'
    );
    assert(order.quantity == 1, 'Quantity is not equal');
    assert(order.start_amount == 600000000000000000, 'Start amount is not equal');
    assert(order.end_amount == 0, 'End amount is not equal');
    assert(order.start_date == block_timestamp, 'Start date is not equal');
    assert(order.end_date == block_timestamp + (30 * 24 * 60 * 60), 'End date is not equal');
    assert(
        order
            .offerer == 0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078
            .try_into()
            .unwrap(),
        'Offerer is not equal'
    );
    assert(order_hash == _order_hash, 'Order hash is not equal');
    assert(order_type == OrderType::Listing.into(), 'Order type is not listing');
    assert(order_status == OrderStatus::Open.into(), 'Order status is not open');
}

fn setup(block_timestamp: u64) -> (OrderV1, Signer, felt252, felt252) {
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
        token_id: 10,
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

    let signer = Signer::WEIERSTRESS_STARKNET(
        SignInfo {
            user_pubkey: 0x20c29f1c98f3320d56f01c13372c923123c35828bce54f2153aa1cfe61c44f2,
            user_sig_s: 1931487909678821646066898054890254502623510667594888599224414019481722659060,
            user_sig_r: 2002183686227392431291655286012605841000867232983156743245162872729965254511
        }
    );

    (order_listing, signer, order_hash, token_hash)
}
