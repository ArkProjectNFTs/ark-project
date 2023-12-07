FROM rust:latest

# Set the default values for your environment variables
ENV EXECUTOR_ADDRESS=""
ENV ORDERBOOK_ADDRESS=""
ENV RPC_URL=""
ENV CONTRACT_ADDRESS=""
ENV SENDER_ADDRESS=""
ENV PRIVATE_KEY=""

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
