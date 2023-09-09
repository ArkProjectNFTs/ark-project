pub mod token_manager {
    use ark_starknet::client2::StarknetClient;
    use super::storage_manager::{StorageManager, Token, TokenEvent};
    use anyhow::Result;
    use starknet::core::types::{EmittedEvent, FieldElement};

    pub struct TokenManager<'a, T: StorageManager> {
        storage: &'a T,
        client: StarknetClient,
        // Other dependencies if needed...
    }

    impl<'a, T: StorageManager> TokenManager<'a, T> {
        pub fn new(storage: &'a T, client: StarknetClient) -> Self {
            Self { storage, client }
        }

        fn format_event_data(&self, event: &EmittedEvent) -> Result<TokenEvent> {
            // Your logic to extract and format data from event
            // ...

            Ok(TokenEvent { /* ... */ })
        }

        fn get_token_data(&self, event: &EmittedEvent) -> Result<Token> {
            // Your logic to extract and format token data from event
            // ...

            Ok(Token { /* ... */ })
        }

        pub async fn get_token_uri(
            client: &ReqwestClient,
            token_id_low: u128,
            token_id_high: u128,
            contract_address: &str,
            block_number: u64,
        ) -> String {
            info!("get_token_id: [{:?}, {:?}]", token_id_low, token_id_high);

            let token_id_low_hex = format!("{:x}", token_id_low);
            let token_id_high_hex = format!("{:x}", token_id_high);

            let token_uri_cairo0 = get_contract_property_string(
                client,
                contract_address,
                "tokenURI",
                vec![token_id_low_hex.clone(), token_id_high_hex.clone()],
                block_number,
            )
            .await;

            if token_uri_cairo0 != "undefined" && !token_uri_cairo0.is_empty() {
                return token_uri_cairo0;
            }

            let token_uri = get_contract_property_string(
                client,
                contract_address,
                "token_uri",
                vec![token_id_low_hex.clone(), token_id_high_hex.clone()],
                block_number,
            )
            .await;

            info!("token_uri: {:?}", token_uri);

            if token_uri != "undefined" && !token_uri.is_empty() {
                return token_uri;
            }

            "undefined".to_string()
        }

        // Add other helper methods like get_event_block get_token_owner, etc...
    }
}
