//! A broker is usually a marketplace that
//! can place orders.
//!
use debug::PrintTrait;

#[derive(starknet::Store, Serde, Drop)]
struct Broker {
    name: felt252,
    public_key: felt252,
    chain_id: felt252,
}

impl BrokerPrintImpl of PrintTrait<Broker> {
    fn print(self: Broker) {
        self.name.print();
        self.public_key.print();
        self.chain_id.print();
    }
}
