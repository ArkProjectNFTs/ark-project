pub mod token_manager {
    use crate::storage_manager::storage_manager::StorageManager;
    use crate::types::{TokenEvent, TokenFromEvent};
    use anyhow::Result;
    
    #[derive(Debug)]
    pub struct TokenManager<'a, T: StorageManager> {
        storage: &'a T,
        token: TokenFromEvent,
        // client: StarknetClient,
    }

    impl<'a, T: StorageManager> TokenManager<'a, T> {
        pub fn new(
            storage: &'a T,
            // client: StarknetClient
        ) -> Self {
            Self {
                storage,
                token: TokenFromEvent::default(),
                // client
            }
        }

        pub fn format_token_from_event(&self, event: &TokenEvent) {
            let token = TokenFromEvent {
                address: event.contract_address.clone(),
                padded_token_id: event.padded_token_id.clone(),
                from_address: event.from_address.clone(),
                to_address: event.to_address.clone(),
                timestamp: event.timestamp,
                owner: event.to_address.clone(),
                // TODO add optional fields
                mint_transaction_hash: None,
                block_number_minted: None,
            };
            self.storage.create_token(&token);
        }

        pub fn create_token(&self) -> Result<()> {
            self.storage.create_token(&self.token);
            Ok(())
        }

        pub fn reset_token(&mut self) {
            self.token = TokenFromEvent::default();
        }

        // pub fn update_token_owner(&self, event: &EmittedEvent, new_owner: &str) -> Result<()> {
        //     let token = self
        //         .storage
        //         .get_token(event.contract_address.clone(), event.token_id.clone())?;
        //     self.storage.update_token_owner(&token, new_owner);
        //     Ok(())
        // }
    }
}
