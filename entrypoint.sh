#!/bin/bash
# entrypoint.sh

set -e # Exit immediately if a command exits with a non-zero status

echo "Starting entrypoint.sh..."

# List mounted volumes
echo "Listing mounted volumes:"
df -h

# Ensure the /mnt/efs directory is mounted
if mountpoint -q /mnt/efs; then
  echo "/mnt/efs is mounted."
else
  echo "Error: /mnt/efs is not mounted." >&2
  exit 1
fi

# Debugging: Check current user
echo "Current user: $(whoami)"
id

# Debugging: List directory permissions
echo "Directory permissions for /mnt/efs:"
ls -ld /mnt/efs

# Debugging: List contents of /mnt/efs
echo "Contents of /mnt/efs:"
ls -l /mnt/efs

# Try creating a test directory with root user
sudo mkdir /mnt/efs/test_root_dir && echo "Created /mnt/efs/test_root_dir with sudo"

# Ensure the /mnt/efs/db directory exists
mkdir -p /mnt/efs/db

# Ensure the /mnt/efs/db/test directory exists
mkdir -p /mnt/efs/db/test

# Check if /mnt/efs/db is writable
if [ -w /mnt/efs/db ]; then
  echo "/mnt/efs/db is writable."
else
  echo "Error: /mnt/efs/db is not writable." >&2
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

# Display the contents of the /mnt/efs directory
echo "Contents of /mnt/efs directory:"
ls -l /mnt/efs

# Display the contents of the /mnt/efs/db directory
echo "Contents of /mnt/efs/db directory:"
ls -l /mnt/efs/db

# Display the contents of the crates/solis directory
echo "Contents of crates/solis directory:"
ls -l crates/solis

# Start the application
echo "Starting the solis application..."
exec ./target/release/solis --db-dir /mnt/efs/db --messaging crates/solis/messaging.json --dev
