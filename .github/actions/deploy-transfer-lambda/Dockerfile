FROM rust:latest

# Set the current working directory inside the container
WORKDIR /app

# Copy the entire repo into the container
COPY . .

# Build the project in the crates/ark-transfers directory
RUN cd ./crates/ark-transfers && cargo build --release

# Zip the built binary (adjust the path if necessary)
RUN zip lambda.zip ./crates/ark-transfers/target/release/ark-transfers

# Install AWS CLI
RUN apt-get update && apt-get install -y awscli

# Default command to run when starting the container
CMD ["aws", "lambda", "update-function-code", "--function-name", "$LAMBDA_FUNCTION_NAME", "--zip-file", "fileb://lambda.zip"]
