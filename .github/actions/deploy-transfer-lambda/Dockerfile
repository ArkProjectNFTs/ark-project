FROM public.ecr.aws/lambda/provided:al2

ENV AWS_DEFAULT_REGION=us-east-1

WORKDIR /app

COPY . .

# Install Development Tools
RUN yum groupinstall -y "Development Tools"

# Install necessary dependencies
RUN yum install -y curl openssl-devel zip

# Install Rust using rustup
RUN curl https://sh.rustup.rs -sSf | sh -s -- -y

# Source the Rust environment
RUN source $HOME/.cargo/env

# Build the Rust project
RUN cd ./crates/ark-transfers && cargo build --release

# Copy the built binary to the /app directory
RUN cp ./crates/ark-transfers/target/release/ark-transfers /app/bootstrap

# Install AWS CLI
RUN yum install -y awscli

# Zip the binary
RUN cd /app && zip lambda.zip bootstrap

CMD aws lambda update-function-code --function-name $LAMBDA_FUNCTION_NAME --handler rust.handler --zip-file fileb://lambda.zip
