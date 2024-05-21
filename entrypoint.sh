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
  "from_block": 630600
}
EOF

# Ensure the database directory exists
mkdir -p /mnt/efs/db

# Then start your application
exec ./target/release/solis --messaging crates/solis/messaging.json --dev --db-dir /mnt/efs/db --chain-id 0x736f6c6973 --disable-fee -p 7777
