FROM rust:latest

# Set the default values for your environment variables
ENV STARKNET_NODE_URL=""
ENV STARKNET_APPCHAIN_MESSAGING_ADDRESS=""
ENV STARKNET_SOLIS_ACCOUNT_ADDRESS=""
ENV STARKNET_SOLIS_ACCOUNT_PRIVATE_KEY=""
ENV RUST_LOG=info

RUN apt-get update && apt-get install -y \
  libclang-dev \
  build-essential \
  clang \
  libssl-dev \
  pkg-config \
  libpq-dev &&
  groupadd -g 1000 appgroup &&
  useradd -u 1000 -g appgroup -m appuser &&
  mkdir -p /app &&
  chown -R appuser:appgroup /app

WORKDIR /app

# Copy the entire workspace context into the container
COPY . .

RUN apt-get update && apt-get install -y libclang-dev

# Build the 'solis' crate within the workspace
RUN cargo build -p solis --release

# Copy your entrypoint script
COPY entrypoint.sh .

# Make the entrypoint script executable
RUN chmod +x entrypoint.sh

# Set the entrypoint script as the entrypoint
ENTRYPOINT ["./entrypoint.sh"]
