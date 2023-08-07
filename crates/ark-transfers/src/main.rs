use lambda_runtime::{service_fn, Error, LambdaEvent};
use serde_json::Value;
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
struct Request {
    body: String,
}

#[derive(Debug, Serialize)]
struct Response {
    req_id: String,
    body: String,
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    lambda_runtime::run(service_fn(|event: LambdaEvent<Request>| async {
      handle_request(event).await
    }))
    .await
}

async fn handle_request(event: LambdaEvent<Request>) -> Result<(), Error> {
    // Your Lambda logic here
    log::info!("Request: {:?}", event.context);
    Ok(()) // Return the event or any response
}
