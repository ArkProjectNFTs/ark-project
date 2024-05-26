#!/bin/bash
# entrypoint.sh

set -e # Exit immediately if a command exits with a non-zero status

echo "Starting entrypoint.sh..."

# Ensure the /efs/mnt directory is mounted
if mountpoint -q /efs/mnt; then
  echo "/efs/mnt is mounted."
else
  echo "Error: /efs/mnt is not mounted." >&2
  exit 1
fi

# Ensure the /db directory exists
mkdir -p /efs/mnt/db

# Ensure the /db directory exists
mkdir -p /efs/mnt/db/test

# Check if /db is writable
if [ -w /efs/mnt/db ]; then
  echo "/efs/mnt/db is writable."
else
  echo "Error: /efs/mnt/db is not writable." >&2
  exit 1
fi

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

# Log the creation of messaging.json
echo "Generated messaging.json with the following content:"
cat crates/solis/messaging.json

# Display the contents of the /efs/mnt directory
echo "Contents of /efs/mnt directory:"
ls -l /efs/mnt

# Display the contents of the /efs/mnt/db directory
echo "Contents of /efs/mnt/db directory:"
ls -l /efs/mnt/db

# Display the contents of the crates/solis directory
echo "Contents of crates/solis directory:"
ls -l crates/solis

# Start the application
echo "Starting the solis application..."
exec ./target/release/solis --db-dir /efs/mnt/db --messaging crates/solis/messaging.json --dev
