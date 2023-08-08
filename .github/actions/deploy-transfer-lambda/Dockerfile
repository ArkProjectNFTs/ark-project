FROM ghcr.io/cargo-lambda/cargo-lambda:0.20.2

ENV AWS_DEFAULT_REGION=us-east-1

# Set the current working directory inside the container
WORKDIR /app

# Copy the entire repo into the container
COPY . .

# Build the project in the crates/ark-transfers directory and rename the binary to 'bootstrap'
RUN cd ./crates/ark-transfers && cargo lambda build --release --output-format zip && \
    cp ../../target/lambda/ark-transfers /app/bootstrap

# Use shell form to ensure environment variable is expanded
CMD aws lambda update-function-code --function-name $LAMBDA_FUNCTION_NAME --zip-file fileb://lambda.zip
