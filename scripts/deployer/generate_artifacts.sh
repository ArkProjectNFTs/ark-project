#!/bin/bash

scarb --manifest-path ../../crates/ark-contracts/arkchain/Scarb.toml build
scarb --manifest-path ../../crates/ark-contracts/starknet/Scarb.toml build
