FROM ghcr.io/cargo-lambda/cargo-lambda

ENV AWS_DEFAULT_REGION=us-east-1

WORKDIR /app

COPY . .

# Install Development Tools and necessary dependencies
RUN apt-get update && \
    apt-get install -y build-essential curl openssl zip awscli

# Install Rust using rustup
RUN curl https://sh.rustup.rs -sSf | sh -s -- -y

# Source the Rust environment
RUN /bin/bash -c "source $HOME/.cargo/env"

# Build the Rust project
RUN cd ./crates/ark-transfers && cargo lambda build --release

# Copy the built binary to the /app directory
RUN cp ./crates/ark-transfers/target/release/ark-transfers /app/bootstrap

# Install AWS CLI
RUN yum install -y awscli

# Zip the binary
RUN cd /app && zip lambda.zip bootstrap

CMD aws lambda update-function-code --function-name $LAMBDA_FUNCTION_NAME --handler rust.handler --zip-file fileb://lambda.zip
