# Build Stage
FROM rust:latest AS builder
WORKDIR /app
COPY . .
RUN cargo build --release -p arkchain-indexer

# Final Stage
FROM debian:buster-slim
COPY --from=builder /app/target/release/arkchain-indexer /usr/local/bin/
CMD ["arkchain-indexer"]