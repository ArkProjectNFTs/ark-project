// TODO: need to rework the tests with new snforge version.

#[cfg(test)]
mod tests {
    use snforge_std::{declare, ContractClassTrait};
    use result::ResultTrait;
    use option::OptionTrait;
    use zeroable::Zeroable;
    use traits::{Into, TryInto};
    use arkchain::orderbook::{IOrderbookDispatcher, IOrderbookDispatcherTrait};
    use arkchain::order::{OrderListing, OrderBuy, OrderBuyExecute, compute_order_hash};
    use starknet::ContractAddress;
    use debug::PrintTrait;

    #[test]
    fn test_listing() {
        let calldata = array![0x123];
        let contract = declare('orderbook');
        let contract_address = contract.deploy(@calldata).unwrap();

        assert(!contract_address.is_zero(), 'Invalid address');
    // let d = IOrderbookDispatcher { contract_address };
    // d.register_broker('b1', 1, 'starknet_testnet');

    // let o = OrderListing {
    //     seller: 1.try_into().unwrap(),
    //     collection: 2.try_into().unwrap(),
    //     token_id: 3_u256,
    //     price: 1_u256,
    //     end_date: 0,
    //     broker_name: 'b1',
    //     broker_sig_r: 0,
    //     broker_sig_s: 0,
    // };

    // let hash = compute_order_hash(o);
    // assert(hash == 0x14490bddefa3defc5c0f48326f7ee243bc2ecc23021e61140b3abaf865db3f1, 'Invalid hash');
    }

    #[test]
    fn test_buying() {
        let calldata = array![0x123];
        let contract = declare('orderbook');
        let contract_address = contract.deploy(@calldata).unwrap();

        assert(!contract_address.is_zero(), 'Invalid address');
    // let d = IOrderbookDispatcher { contract_address };
    // d.register_broker('b1', 1, 'starknet_testnet');

    // let o = OrderListing {
    //     seller: 1.try_into().unwrap(),
    //     collection: 2.try_into().unwrap(),
    //     token_id: 3_u256,
    //     price: 1_u256,
    //     end_date: 0,
    //     broker_name: 'b1',
    //     broker_sig_r: 0,
    //     broker_sig_s: 0,
    // };

    // let hash = compute_order_hash(o);
    // hash.print();

    // d.add_order_listing(o);

    // let buy = OrderBuy {
    //     order_listing_hash: hash,
    //     buyer: 0x1234.try_into().unwrap(),
    //     broker_name: 'b1',
    //     broker_sig_r: 0,
    //     broker_sig_s: 0,
    // };

    // d.submit_order_buy(buy);

    // let o2 = OrderListing {
    //     seller: 1.try_into().unwrap(),
    //     collection: 1.try_into().unwrap(),
    //     token_id: 2_u256,
    //     price: 2_u256,
    //     end_date: 0,
    //     broker_name: 'b1',
    //     broker_sig_r: 0,
    //     broker_sig_s: 0,
    // };

    // let hash = compute_order_hash(o2);
    // hash.print();

    // d.add_order_listing(o2);

    // let buy2 = OrderBuy {
    //   order_listing_hash: 0x2c3f3d59dcddddcfdf48276e3269e746bb22f6bc9c99c9e0e402ce3bbf7f64c,
    //     buyer: 0x33c627a3e5213790e246a917770ce23d7e562baa5b4d2917c23b1be6d91961c.try_into().unwrap(),
    //     broker_name: 'b1',
    //     broker_sig_r: 0,
    //     broker_sig_s: 0,
    // };

    // d.submit_order_buy(buy2);

    }
}
