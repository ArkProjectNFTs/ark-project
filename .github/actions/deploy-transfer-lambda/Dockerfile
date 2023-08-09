FROM ghcr.io/cargo-lambda/cargo-lambda:0.20.2

ENV AWS_DEFAULT_REGION=us-east-1

# Set the current working directory inside the container
WORKDIR /app

# Copy the entire repo into the container
COPY . .

RUN cd ./crates/ark-transfers && cargo lambda build
RUN mkdir -p "./target/lambda/$LAMBDA_FUNCTION_NAME"
RUN cp ./target/lambda/ark-transfers/bootstrap "./target/lambda/$LAMBDA_FUNCTION_NAME/bootstrap"

# Use shell form to ensure environment variable is expanded
CMD cargo lambda deploy $LAMBDA_FUNCTION_NAME
