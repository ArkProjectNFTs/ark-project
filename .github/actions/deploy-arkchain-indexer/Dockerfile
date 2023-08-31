FROM rust:latest

WORKDIR /app

COPY . .

RUN cd ./crates/arkchain-indexer && cargo build --release

CMD ["cargo", "run"]