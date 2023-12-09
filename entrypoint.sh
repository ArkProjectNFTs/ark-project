#!/bin/bash
# entrypoint.sh

# Generate the messaging.json file
cat >crates/solis/messaging.json <<EOF
{
  "chain": "starknet",
  "rpc_url": "$RPC_URL",
  "contract_address": "$CONTRACT_ADDRESS",
  "sender_address": "$SENDER_ADDRESS",
  "private_key": "$PRIVATE_KEY",
  "interval": 2,
  "from_block": 0
}
EOF

# Then start your application
exec ./target/release/solis --messaging crates/solis/messaging.json
