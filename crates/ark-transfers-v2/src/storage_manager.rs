
#[derive(Debug, Clone, Default)]
pub struct TokenEvent {
    pub address: String,
    pub timestamp: u64,
    pub block_number: u64,
    pub event_type: String,
    pub from_address: String,
    pub padded_token_id: String,
    pub token_uri: String,
    pub to_address: String,
    pub transaction_hash: String,
    pub token_type: String,
    pub token_image: Option<String>,  // assuming Option because of the Default::default()
    pub token_name: Option<String>,  // assuming Option because of the Default::default()
}

#[derive(Debug, Clone, Default)]
pub struct Token {
    pub address: String,
    pub padded_token_id: String,
    pub from_address: String,
    pub to_address: String,
    pub timestamp: u64,
    pub token_uri: String,
    pub raw_metadata: String,
    pub normalized_metadata: String,
    pub owner: String,
    pub mint_transaction_hash: String,
    pub block_number_minted: u64,
}

pub mod storage_manager {
  use super::{Token, TokenEvent};

  pub trait StorageManager {
      // Store a new token in the storage
      fn create_token(&self, token: &Token);
      
      // Update an existing token's owner in the storage
      fn update_token(&self, token: &Token, new_owner: &str);
      
      // Log or store a token-related event
      fn create_event(&self, event: &TokenEvent);
 
      // Potentially other methods...
  }

  // Default implementation (Logging for this example)
  pub struct DefaultStorage;

  impl DefaultStorage {
      pub fn new() -> Self {
          Self
      }
  }

  impl StorageManager for DefaultStorage {
      fn create_token(&self, token: &Token) {
          println!("Token created: {:?}", token);
      }
      
      fn update_token(&self, token: &Token, new_owner: &str) {
          println!("Token updated. Previous Owner: {}, New Owner: {}", token.owner, new_owner);
      }

      fn create_event(&self, event: &TokenEvent) {
          println!("Event logged: {:?}", event);
      }
  }
}
