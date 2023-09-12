use crate::storage_manager::StorageManager;
use crate::types::{EventType, TokenEvent, TokenFromEvent};
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

    pub fn format_token_from_event(&mut self, event: &TokenEvent) {
        self.token.address = event.contract_address.clone();
        self.token.padded_token_id = event.padded_token_id.clone();
        self.token.from_address = event.from_address.clone();
        self.token.to_address = event.to_address.clone();
        self.token.timestamp = event.timestamp.clone();
        self.token.owner = event.to_address.clone();
        self.token.mint_transaction_hash = if event.event_type == EventType::Mint {
            Some(event.transaction_hash.clone())
        } else {
            None
        };
        self.token.block_number_minted = if event.event_type == EventType::Mint {
            Some(event.block_number)
        } else {
            None
        };
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
