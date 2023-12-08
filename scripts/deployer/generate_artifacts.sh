#!/bin/bash

scarb --manifest-path ../../crates/ark-contracts/arkchain/Scarb.toml build
scarb --manifest-path ../../crates/ark-contracts/starknet/Scarb.toml build

jq .abi ../../crates/ark-contracts/arkchain/target/dev/arkchain_orderbook.contract_class.json > ../../artifacts/orderbook.json
