FROM ghcr.io/cargo-lambda/cargo-lambda:0.20.2

ENV AWS_DEFAULT_REGION=us-east-1

# Set the current working directory inside the container
WORKDIR /app

# Copy the entire repo into the container
COPY . .

RUN cd ./crates/ark-transfers && cargo lambda build --release --output-format zip
RUN pwd && ls -la
RUN cd ./target && pwd && ls -la
RUN cd ./target/lambda/ark-transfers && pwd && ls -la
RUN cd ./target/release && pwd && ls -la

RUN cp ./target/lambda/ark-transfers/bootstrap.zip /app/bootstrap.zip

RUN cd /app/bootstrap && pwd && ls -la

# Use shell form to ensure environment variable is expanded
CMD cargo lambda deploy --function-name $LAMBDA_FUNCTION_NAME --zip-file fileb://bootstrap.zip
# CMD --env-vars FOO=BAR --function-name $LAMBDA_FUNCTION_NAME --zip-file fileb://bootstrap.zip
