FROM rust:latest as builder

# Set the working directory inside the container.
WORKDIR /usr/src/arkindexer

# Install system dependencies:
# 1. musl-tools for musl target build support
# 2. openssl & pkg-config for OpenSSL dependencies
RUN apt-get update && \
    apt-get install -y musl-tools openssl pkg-config libssl-dev && \
    rustup target add x86_64-unknown-linux-musl

# Copy the full repo into the container.
COPY . .

# Build the crate
WORKDIR /usr/src/arkindexer/crates/ark-transfers
RUN cargo build --release --target x86_64-unknown-linux-musl

# Package binary and bootstrap into zip
RUN zip -j lambda.zip target/x86_64-unknown-linux-musl/release/your_binary_name bootstrap
