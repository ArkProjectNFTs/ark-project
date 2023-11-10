use arkchain::orderbook::Orderbook;
use snforge_std::{declare, ContractClassTrait};

#[test]
fn test_create_offer() { // let (order_listing, _, _, _) = setup();
// let block_timestmap: u64 = 1699556828;
// let result = order_listing.validate_common_data(block_timestmap);
// assert(result.is_ok(), 'Invalid result');
}

fn setup() {
    // First declare and deploy a contract
    let contract = declare('orderbook');
    // Alternatively we could use `deploy_syscall` here
    let contract_address = contract.deploy(@ArrayTrait::new()).unwrap();
}
