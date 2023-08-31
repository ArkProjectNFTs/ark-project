FROM rust:latest

WORKDIR /app

COPY crates/arkchain-indexer/ .

RUN cargo build

CMD ["cargo", "run"]