## Update Katana Accounts in Environment Settings

Navigate to the `package/core/env` directory and update the following environment variables:

- `ACCOUNT_CLASS_HASH`: `0x04d07e40e93398ed3c76981e72dd1fd22557a78ce36c0515f679e27f0bb5bc5f`
- `ACCOUNT1_ADDRESS`: `0x517ececd29116499f4a1b64b094da79ba08dfd54a3edaa316134c41f8160973`
- `ACCOUNT1_PRIVATE_KEY`: `0x1800000000300000180000000000030000000000003006001800006600`
- `ACCOUNT2_ADDRESS`: `0x5686a647a9cdd63ade617e0baf3b364856b813b508f03903eb58a7e622d5855`
- `ACCOUNT2_PRIVATE_KEY`: `0x33003003001800009900180300d206308b0070db00121318d17b5e6262150b`
- `STARKNET_RPC_URL`: `http://0.0.0.0:5050`
- `ARKCHAIN_RPC_URL`: `http://0.0.0.0:7777`

## Choose your network and addit to your env

```bash
NETWORK=katana
```

## for the selected network add a new file to the `package/deployer/account/[network].json` directory

```json
[
  {
    "address": "0x517ececd29116499f4a1b64b094da79ba08dfd54a3edaa316134c41f8160973",
    "privateKey": "0x1800000000300000180000000000030000000000003006001800006600",
    "publicKey": "0x2b191c2f3ecf685a91af7cf72a43e7b90e2e41220175de5c4f7498981b10053",
    "deployed": true
  },
  {
    "address": "0x5686a647a9cdd63ade617e0baf3b364856b813b508f03903eb58a7e622d5855",
    "privateKey": "0x33003003001800009900180300d206308b0070db00121318d17b5e6262150b",
    "publicKey": "0x4c0f884b8e5b4f00d97a3aad26b2e5de0c0c76a555060c837da2e287403c01d",
    "deployed": true
  }
]
```

## Clear contracts.json File if needed

## Deploy starknet contracts

- Execute the following commands in the `(core/deployer)` directory:
  - `pnpm run deploy:starknet`
  - `pnpm run deploy:starknet:nft`

## Update Addresses in constants.ts

- Modify the addresses in `packages/core/src/constants.ts` as needed.

## Run Solis with Updated Configuration

- Use the following command:

  - `RUST_LOG=trace cargo run -p solis -- --messaging ./messaging.local.json --dev`

- Deploy Solis using:
  - `(core/deployer) pnpm run deploy:solis`

## Update Solis Addresses

- Execute the following `curl` command to update Solis addresses:
  ```bash
  curl -X POST \
       -H 'Content-Type: application/json' \
       -d '{"jsonrpc":"2.0","id":"1","method":"katana_setSolisAddresses","params":{"addresses": {"orderbook_arkchain":"0x4277b065d4e8e013505ce42ced85ef6fd716fc4f9638ddc8dafb452a60c41da", "executor_starknet":"0x82f949e92d9aeedee6bfaa3ddbd9dbbd7deaffbd1409837b7811d3ccc61d9e"}}}' \
       http://localhost:7777
  ```

## Additional Script Execution

-In the (core) directory, run:

```bash
npx ts-node ./examples/fulfillListing.ts
```
