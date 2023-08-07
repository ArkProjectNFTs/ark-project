FROM rust:latest

ENV RPC_PROVIDER=https://starknode.thearkproject.dev/mainnet
ENV RUST_BACKTRACE=1
ENV AWS_DEFAULT_REGION=us-east-1

WORKDIR /app

COPY . .

RUN cargo build

CMD ["cargo", "run"]