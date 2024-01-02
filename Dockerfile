FROM rust:latest

# Set the default values for your environment variables
ENV RPC_URL_GOERLI=""
ENV MESSAGING_ADDRESS_GOERLI=""
ENV SENDER_ADDRESS=""
ENV PRIVATE_KEY=""

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
