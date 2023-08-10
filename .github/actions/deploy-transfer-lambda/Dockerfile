FROM ghcr.io/cargo-lambda/cargo-lambda:0.20.2

ENV AWS_DEFAULT_REGION=us-east-1

# Set the current working directory inside the container
WORKDIR /app

# Copy the entire repo into the container
COPY . .

# Building the Rust Lambda function
RUN cd ./crates/ark-transfers && cargo lambda build

# Copying the binary to both Lambda directories
RUN mkdir -p ./target/lambda/arkMainnetTransferEventProcessor
RUN cp ./target/lambda/ark-transfers/bootstrap ./target/lambda/arkMainnetTransferEventProcessor/bootstrap

RUN mkdir -p ./target/lambda/arkTestnetTransferEventProcessor
RUN cp ./target/lambda/ark-transfers/bootstrap ./target/lambda/arkTestnetTransferEventProcessor/bootstrap
