FROM rust:slim

# Set the default values for your environment variables
ENV STARKNET_NODE_URL=""
ENV STARKNET_APPCHAIN_MESSAGING_ADDRESS=""
ENV STARKNET_SOLIS_ACCOUNT_ADDRESS=""
ENV STARKNET_SOLIS_ACCOUNT_PRIVATE_KEY=""
ENV RUST_LOG=info

# Install dependencies and create a user with the correct UID and GID
RUN apt-get update && apt-get install -y \
  libclang-dev \
  build-essential \
  clang \
  libssl-dev \
  pkg-config \
  libpq-dev &&
  groupadd -r appgroup &&
  useradd -r -g appgroup -d /app -s /sbin/nologin appuser &&
  mkdir -p /app &&
  chown -R appuser:appgroup /app

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
