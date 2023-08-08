FROM rust:latest

ENV AWS_DEFAULT_REGION=us-east-1

# Set the current working directory inside the container
WORKDIR /app

# Copy the entire repo into the container
COPY . .

# Build the project in the crates/ark-transfers directory and rename the binary to 'bootstrap'
RUN cd ./crates/ark-transfers && cargo build --release && \
    cp ../../target/release/ark-transfers /app/bootstrap && \
    apt-get update && apt-get install -y zip awscli && \
    zip /app/lambda.zip bootstrap

# Use shell form to ensure environment variable is expanded
CMD aws lambda update-function-code --function-name $LAMBDA_FUNCTION_NAME --zip-file fileb://lambda.zip
