FROM ghcr.io/cargo-lambda/cargo-lambda:0.20.2

ENV AWS_DEFAULT_REGION=us-east-1

# Set the current working directory inside the container
WORKDIR /app

# Copy the entire repo into the container
COPY . .

# Building the Rust Lambda function
RUN cd ./crates/ark-collection-update-lambda && cargo lambda build --release

# Copying the binary to both Lambda directories
RUN mkdir -p ./target/lambda/arkMainnetCollectionUpdateProcessor
RUN cp ./target/lambda/ark-collection-update-lambda/bootstrap ./target/lambda/arkMainnetCollectionUpdateProcessor/bootstrap

RUN mkdir -p ./target/lambda/arkTestnetCollectionUpdateProcessor
RUN cp ./target/lambda/ark-collection-update-lambda/bootstrap ./target/lambda/arkTestnetCollectionUpdateProcessor/bootstrap
