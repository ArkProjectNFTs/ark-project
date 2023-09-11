pub mod storage_manager {
    use crate::types::{TokenEvent, TokenFromEvent};

    pub trait StorageManager {
        // Store a new token in the storage
        fn create_token(&self, token: &TokenFromEvent);

        // Update an existing token's owner in the storage
        fn update_token_owner(&self, token: &TokenFromEvent, new_owner: &str);

        // Log or store a token-related event
        fn create_event(&self, event: &TokenEvent);
    }

    // Default implementation (Logging for this example)
    pub struct DefaultStorage;

    impl DefaultStorage {
        pub fn new() -> Self {
            Self
        }
    }

    impl StorageManager for DefaultStorage {
        fn create_event(&self, event: &TokenEvent) {
            println!("STORAGE MANAGER: Event created: {:?}", event);
        }

        fn create_token(&self, token: &TokenFromEvent) {
            println!("STORAGE MANAGER: Token created: {:?}", token);
        }

        fn update_token_owner(&self, token: &TokenFromEvent, new_owner: &str) {
            println!(
                "STORAGE MANAGER: Token updated. Previous Owner: {}, New Owner: {}",
                token.owner, new_owner
            );
        }
    }
}
