#!/bin/bash
# entrypoint.sh

# Generate the messaging.json file
cat >crates/solis/messaging.json <<EOF
{
  "chain": "starknet",
  "rpc_url": "$STARKNET_NODE_URL",
  "contract_address": "$STARKNET_APPCHAIN_MESSAGING_ADDRESS",
  "sender_address": "$STARKNET_SOLIS_ACCOUNT_ADDRESS",
  "private_key": "$STARKNET_SOLIS_ACCOUNT_PRIVATE_KEY",
  "interval": 2,
  "from_block": 929303
}
EOF

# Then start your application
exec ./target/release/solis --messaging crates/solis/messaging.json --dev
