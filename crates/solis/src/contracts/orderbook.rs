use cainome::rs::abigen;
use starknet::{accounts::ConnectedAccount, core::types::FieldElement};

abigen!(OrderbookContract, "./artifacts/orderbook.json");

#[allow(dead_code)]
pub fn new_orderbook<A: ConnectedAccount + Send + Sync + 'static>(
    contract_address: FieldElement,
    account: A,
) -> OrderbookContract<A> {
    OrderbookContract::new(contract_address, account)
}
