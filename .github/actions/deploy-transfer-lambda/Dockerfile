FROM ghcr.io/cargo-lambda/cargo-lambda:0.20.2

ENV AWS_DEFAULT_REGION=us-east-1

# Set the current working directory inside the container
WORKDIR /app

# Copy the entire repo into the container
COPY . .

RUN cd ./crates/ark-transfers && cargo lambda build --output-format zip
RUN mkdir -p app/target/lambda/arkMainnetTransferEventProcessor
RUN cp ./target/lambda/ark-transfers/bootstrap.zip ./target/lambda/arkMainnetTransferEventProcessor/bootstrap.zip

# Use shell form to ensure environment variable is expanded
CMD cargo lambda deploy $LAMBDA_FUNCTION_NAME
