# Using the Deployer

First use case local starknet with local solis

### Environment Settings

Navigate to the `root` directory and copy the .env.example for your needs,

**Warning** env.example use the default katana accounts, if they change you need to update your .env file

### Contracts.json file

the contract.json file is a reference of the deployed contracts, when working locally you may need to clear it to redeploy the contracts

## Contracts

### Starknet

- appchain_messaging - appchain messaging contract to receive & send messages from starknet
- executor - executor contract to execute the messages from the appchain (swap assets)
- nft - nft contract to mint & transfer nft from starknet used as a test contract
- erc20 - erc20 contract to mint & transfer erc20 from starknet used as a test contract only on katana becase base one doesn't support erc20

### Solis

- orderbook - orderbook contract to store the orders

## Deployer cmd list

Execute the following commands in the `root` directory:

**Deploy all Starknet contracts**

`pnpm run deploy:starknet:all`

- Using this cmd will clean the contracts.json file
- Deploy all starknet contract:
  - appchain_messaging
  - executor
  - nft
  - erc20

**Deploy ArkProject Starknet contracts**

`pnpm run deploy:starknet`

- Deploy starknet contracts:
  - appchain_messaging
  - executor
- additional args:
  - `-sn, --starknet <network>` - starknet network to deploy on (default: "dev")

**Deploy Starknet tokens contracts, for testing purpose**

`pnpm run deploy:starknet:tokens`

- Deploy starknet contracts:

  - nft
  - erc20

- additional args:
  - `-sn, --starknet <network>` - starknet network to deploy on (default: "dev")

**Deploy ArkProject Solis contracts**

`pnpm run deploy:solis`

- Deploy solis contracts:

  - orderbook

- additional args:
  - `-sn, --starknet <network>` - starknet network to deploy on (default: "dev")
  - `-so, --solis <network>` - solis network to deploy on (default: "dev")

## Running & deploying ArkProject locally

**Use the following command:**

Start a katana for starknet

`katana`

Deploy all Starknet contracts on katana

`pnpm run deploy:starknet:all`

Start Solis

`RUST_LOG=trace cargo run -p solis -- --messaging ./messaging.local.json --dev`

**Deploy Solis contracts using:**

`pnpm run deploy:solis`

You can now use the SDK locally
