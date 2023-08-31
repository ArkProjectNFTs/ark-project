FROM rust:latest

WORKDIR /app

COPY . .

RUN cargo build

CMD ["cd crates/arkchain-indexer/", "cargo", "run"]