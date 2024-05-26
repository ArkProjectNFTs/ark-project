FROM rust:slim

# Set environment variables
ENV STARKNET_NODE_URL="" \
  STARKNET_APPCHAIN_MESSAGING_ADDRESS="" \
  STARKNET_SOLIS_ACCOUNT_ADDRESS="" \
  STARKNET_SOLIS_ACCOUNT_PRIVATE_KEY="" \
  RUST_LOG=info

WORKDIR /app

# Copy the entire workspace context into the container
COPY . .

# Build the 'solis' crate within the workspace
RUN cargo build -p solis --release

# Copy your entrypoint script
COPY entrypoint.sh .

# Make the entrypoint script executable
RUN chmod +x entrypoint.sh

# Set the entrypoint script as the entrypoint
ENTRYPOINT ["./entrypoint.sh"]
