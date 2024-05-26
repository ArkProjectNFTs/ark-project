FROM rust:latest

# Set the default values for your environment variables
ENV STARKNET_NODE_URL=""
ENV STARKNET_APPCHAIN_MESSAGING_ADDRESS=""
ENV STARKNET_SOLIS_ACCOUNT_ADDRESS=""
ENV STARKNET_SOLIS_ACCOUNT_PRIVATE_KEY=""
ENV RUST_LOG=info

# Install dependencies
RUN apt-get update
RUN apt-get install -y libclang-dev
RUN apt-get install -y build-essential
RUN apt-get install -y clang
RUN apt-get install -y libssl-dev
RUN apt-get install -y pkg-config
RUN apt-get install -y libpq-dev
RUN apt-get install -y passwd

# Create a user with the correct UID and GID
RUN groupadd -g 1000 appgroup
RUN useradd -u 1000 -g appgroup -m appuser
RUN mkdir -p /app
RUN chown -R appuser:appgroup /app

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
