FROM rust:slim

# Install dependencies
RUN apt-get update && apt-get install -y \
  libclang-dev \
  build-essential \
  clang \
  libssl-dev \
  pkg-config \
  libpq-dev

# Create a new group and user
RUN groupadd --system appgroup &&
  useradd --system --gid appgroup --shell /bin/bash --create-home appuser

# Set environment variables
ENV STARKNET_NODE_URL="" \
  STARKNET_APPCHAIN_MESSAGING_ADDRESS="" \
  STARKNET_SOLIS_ACCOUNT_ADDRESS="" \
  STARKNET_SOLIS_ACCOUNT_PRIVATE_KEY="" \
  RUST_LOG=info

# Switch to the new user
USER appuser

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
