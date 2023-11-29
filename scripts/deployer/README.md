# I'm a noob in js.

...

# Run the setup script

Open three terminals:
1. Katana: to simulate Starknet network, and run:
```bash
dojoup -v nightly
katana
```

2. Solis: to run the Arkchain:
```bash
cd ark-project/

cargo run -p solis -- \
    --messaging crates/solis/messaging.local.json \
    --orderbook-address 0x2f70330d19cbab1fd9292d17122bf1d688b2358300e61ca69d2bfc626785d13 \
    --executor-address 0x4a052aefd734a7076a9baa7c4ab1ad84845b45aefcd1ea48f0a503fe8f07f18
```

3. One to execute the script:
```bash
cd ark-project/scripts/deployer/
npm install

node index.js
```

# Important notes

1. The version of Starknet js must be 5.22.0 for now, as Katana does not support RPC v0.5.x, which contains a `getTransactionStatus` method, used by Starknet js to check the transaction status.
