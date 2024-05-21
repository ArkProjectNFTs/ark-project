use starknet::{
    accounts::{ExecutionEncoding, SingleOwnerAccount},
    core::types::FieldElement,
    providers::{jsonrpc::HttpTransport, AnyProvider, JsonRpcClient, Provider},
    signers::{LocalWallet, SigningKey},
};

use url::Url;

/// Initializes a new account to interact with Starknet.
///
/// # Arguments
///
/// * `provider_url` - Starknet provider's url.
/// * `account_address` - Starknet account's address.
/// * `private_key` - Private key associated to the Starknet account.
#[allow(dead_code)]
pub async fn new_account(
    provider_url: &str,
    account_address: FieldElement,
    private_key: FieldElement,
) -> SingleOwnerAccount<AnyProvider, LocalWallet> {
    let rpc_url = Url::parse(provider_url).expect("Expecting valid Starknet RPC URL");
    let provider =
        AnyProvider::JsonRpcHttp(JsonRpcClient::new(HttpTransport::new(rpc_url.clone())));

    // TODO: need error instead of expect.
    let chain_id = provider
        .chain_id()
        .await
        .expect("couldn't get chain_id from provider");

    let signer = LocalWallet::from(SigningKey::from_secret_scalar(private_key));

    SingleOwnerAccount::new(
        provider,
        signer,
        account_address,
        chain_id,
        ExecutionEncoding::Legacy,
    )
}
