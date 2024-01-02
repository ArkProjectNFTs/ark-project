use cainome::rs::abigen;

// TODO: check a way to fix the path... because when compiled from
// ark-services, the path is not valid as it's relative to Cargo manifest file.
abigen!(Orderbook, "./artifacts/orderbook.abi.json");
