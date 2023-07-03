FROM rust:latest

ENV RPC_PROVIDER=https://starknode.thearkproject.dev/mainnet
ENV RUST_BACKTRACE=1
ENV AWS_DEFAULT_REGION=us-east-1

WORKDIR /app

COPY . .

# RUN export RPC_PROVIDER=RPC_PROVIDER
# RUN export RUST_BACKTRACE=RUST_BACKTRACE
# RUN export ARK_COLLECTIONS_TABLE_NAME="arkproject_nft_collections"
# RUN export ARK_BLOCKS_TABLE_NAME="ark_blocks"
# RUN export AWS_DEFAULT_REGION=AWS_DEFAULT_REGION
# RUN export RUST_BACKTRACE=RUST_BACKTRACE

# RUN cargo build

# CMD ["cargo", "run"]

CMD []