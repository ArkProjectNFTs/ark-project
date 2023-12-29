## Update Katana Accounts in Environment Settings

Navigate to the `root` directory and copy the .env.example for your needs

```bash
cp env.example .env
```

## Choose your networks and change the env accordingly

```bash
STARKNET_NETWORK_ID=local
SOLIS_NETWORK_ID=local
```

## Clear contracts.json File if needed

the contract.json file is a reference of the deployed contract and is used to deploy contracts if empty or upgrade them is it has values

## Deploy starknet contracts

- Execute the following commands in the `root` directory:

  - `pnpm run deploy:starknet`
  - `pnpm run deploy:starknet:tokens`

## Run Solis with Updated Configuration

- Use the following command:

  - `RUST_LOG=trace cargo run -p solis -- --messaging ./messaging.local.json --dev`

- Deploy Solis using:

  - `(core/deployer) pnpm run deploy:solis`

## Update Core SDK constants

- Modify the addresses in `packages/core/src/constants.ts` as needed using the root file contract.json

## Use the SDK

-In the (core) directory, run:

```bash
npx ts-node ./examples/fulfillListing.ts
```
