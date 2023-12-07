# Solis

## Introduction

Solis, the ArkChain's sequencer.

Solis is a modified version of `Katana` from [Dojo](https://github.com/dojoengine/dojo).
For now, Solis uses a modified version of Katana from the [ArkProject fork](https://github.com/ArkProjectNFTs/dojo). But some features implemented here may be integrated into Katana itself.

## Architecture

Katana contains two crates: `core` and `rpc`.

The `core` crate is responsible to handle all the sequencer logic and executes transactions using the [blockifier](https://github.com/starkware-libs/blockifier). The core was modified to add a `KatanaHooker`, which enables Solis to execute some code during the transaction lifecycle into the `core` crate of Katana. This was done to avoid modifying too much katana to add Solis customization.

The `rpc` crate receives JSON RPC requests (+ some custom endpoints). This crate must be modified in order to remove all testing features from Katana and ensure that Solis is safe to run. Some custom endpoints for Solis may therefore be added to facilitate interactions with the chain.

Finally, this crate contains all the processing that Solis must do in order to validate an order. The `KatanaHooker` is used at this effect, and implemented to verify that the orders contains valid assets and owners.

There is a `args.rs` and `solis_args.rs` files. Those are related to `clap` arguments. For now the arguments are very similar to Katana, but they must be personalized for Solis.

## How to run Solis

To run, Solis requires some important information:

1. A messaging configuration to interact with Starknet. You can choose between `messaging.json` and `messaging.local.json`. Those files contain all the configuration required by Katana to send/receive messages to/from a Starknet sequencer. This Starknet sequencer only required the `appchain_messaging` contract to be deployed. No other modifications.
   As this configuration also contains the RPC URL of the Starknet node, Solis will then be able to call some functions on the node to verify the orders content.

2. The orderbook address: in fact, Solis must interact with the orderbook with `l1_hander` functions. This may happen when a transaction comes in, or when a message is about to be sent to Starknet. To create the `L1HandlerTransaction`, Solis required the Orderbook's address.

3. An admin account: the ArkChain orderbook contract is only modifiable by the ArkProject maintainer. This means that an account must be deployed to deploy and take ownership of the orderbook contract. No pre-funded account can be used for that, so you have to deploy an account (using Starkli for instance) to then use this account to operate on Solis.

```bash
cargo run -p solis -- \
    --messaging crates/solis/messaging.local.json \
    --orderbook-address 0x1234
```

As you can see, the orderbook address must be known before Solis starts. To ensure that, you have to deploy the orderbook with a known `salt`.

## Solis default

- port: default port is `7777`, to refer to the Everai collection with 7777 Everais. So, in order to run a Starknet node with Katana, you can keep using the default port `5050` (be sure this Katana node is up and running before starting Solis).

- fees: by default, fees are currently disabled on Solis.

- pre-funded accounts: dev accounts are for now limited to 2, and the seed used is the same as Katana (to ease the re-use of Starkli built-in accounts like `katana-0` and `katana-1`).

## Work locally with Katana as Starknet node

1. First, opens a terminal and start Katana:

```bash
dojoup -v nightly
katana
```

(be aware if you have a previous version of Katana installed, you may have to remove the `~/.katana` folder)

2. Start Solis with `messaging.local.json`, already configured with the deployed `appchain_messaging` address:

```bash
cargo run -p solis -- \
    --messaging crates/solis/messaging.local.json \
    --orderbook-address 0x024df499c7b1b14c0e52ea237e26a7401ef70507cf72eaef105316dfb5a207a7 \
    --executor-address 0x1234
```

3. Deploy the `contracts` contract on Katana:

```bash
cd scripts/deployer
node index.js
```
