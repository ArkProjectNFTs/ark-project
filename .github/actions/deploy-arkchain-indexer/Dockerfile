FROM rust:latest

WORKDIR /app

COPY . .

RUN cd ./crates/arkchain-indexer && cargo build --release

CMD ["cd crates/arkchain-indexer/", "cargo", "run"]