FROM ghcr.io/cargo-lambda/cargo-lambda:0.20.2
ARG LAMBDA_FUNCTION_NAME

ENV AWS_DEFAULT_REGION=us-east-1

# Set the current working directory inside the container
WORKDIR /app

# Copy the entire repo into the container
COPY . .

RUN cd ./crates/ark-transfers && cargo lambda build
RUN mkdir -p ./target/lambda/test
RUN cp ./target/lambda/ark-transfers/bootstrap ./target/lambda/test/bootstrap
RUN cd /app/target/lambda && ls -la && pwd
RUN cd /app/target/lambda/ark-transfers && ls -la && pwd
RUN cd /app/target/lambda/test && ls -la && pwd

# Use shell form to ensure environment variable is expanded
CMD cargo lambda deploy test
