FROM rust:latest

WORKDIR /app

COPY . .

RUN cargo build --release -p arkchain-indexer

CMD ["cargo run -p arkchain-indexer"]