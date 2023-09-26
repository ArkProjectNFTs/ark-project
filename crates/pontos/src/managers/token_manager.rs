use crate::storage::storage_manager::StorageManager;
use crate::storage::types::{EventType, TokenEvent, TokenFromEvent};
use anyhow::{anyhow, Result};
use ark_starknet::client::StarknetClient;
use starknet::core::types::*;
use starknet::macros::selector;

#[derive(Debug)]
pub struct TokenManager<'a, T: StorageManager, C: StarknetClient> {
    storage: &'a T,
    client: &'a C,
    token: TokenFromEvent,
}

impl<'a, T: StorageManager, C: StarknetClient> TokenManager<'a, T, C> {
    /// Initializes a new instance.
    pub fn new(storage: &'a T, client: &'a C) -> Self {
        Self {
            storage,
            client,
            token: TokenFromEvent::default(),
        }
    }

    /// Formats a token registry from the token event data.
    pub async fn format_and_register_token(&mut self, event: &TokenEvent) -> Result<()> {
        self.reset_token();

        self.token.address = event.contract_address.clone();
        self.token.token_id = event.token_id.clone();
        self.token.formated_token_id = event.formated_token_id.clone();
        let token_owner = self
            .get_token_owner(
                FieldElement::from_hex_be(&event.contract_address)
                    .expect("Contract address bad format"),
                event.token_id.low,
                event.token_id.high,
            )
            .await?[0];
        self.token.owner = format!("{:#064x}", token_owner);

        if event.event_type == EventType::Mint {
            self.token.mint_address = Some(event.to_address_field_element);
            self.token.mint_timestamp = Some(event.timestamp);
            self.token.mint_transaction_hash = Some(event.transaction_hash.clone());
            self.token.mint_block_number = Some(event.block_number);
            self.storage
                .register_mint(&self.token, event.block_number)
                .await?;
        } else {
            self.storage
                .register_token(&self.token, event.block_number)
                .await?;
        }
        Ok(())
    }

    /// Resets the token registry.
    pub fn reset_token(&mut self) {
        self.token = TokenFromEvent::default();
    }

    /// Retrieves the token owner for the last block.
    pub async fn get_token_owner(
        &self,
        contract_address: FieldElement,
        token_id_low: FieldElement,
        token_id_high: FieldElement,
    ) -> Result<Vec<FieldElement>> {
        let block = BlockId::Tag(BlockTag::Latest);

        match self
            .client
            .call_contract(
                contract_address,
                selector!("owner_of"),
                vec![token_id_low, token_id_high],
                block,
            )
            .await
        {
            Ok(res) => Ok(res),
            Err(_) => self
                .client
                .call_contract(
                    contract_address,
                    selector!("ownerOf"),
                    vec![token_id_low, token_id_high],
                    block,
                )
                .await
                .map_err(|_| anyhow!("Failed to get token owner from chain")),
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::storage::storage_manager::MockStorageManager;
    use ark_starknet::client::MockStarknetClient;

    use super::*;

    #[test]
    fn test_reset_token() {
        let mock_storage = MockStorageManager::default();
        let mock_client = MockStarknetClient::default();

        let mut token_manager = TokenManager::new(&mock_storage, &mock_client);

        // Modify some values
        token_manager.token.owner = String::from("some_owner");

        token_manager.reset_token();

        assert_eq!(token_manager.token, TokenFromEvent::default());
    }

    #[tokio::test]
    async fn test_get_token_owner() {
        let mock_storage = MockStorageManager::default();
        let mut mock_client = MockStarknetClient::default();

        let contract_address = FieldElement::from_dec_str("12345").unwrap();
        let token_id_low = FieldElement::from_dec_str("23456").unwrap();
        let token_id_high = FieldElement::from_dec_str("34567").unwrap();

        mock_client
            .expect_call_contract()
            .returning(|_, _, _, _| Ok(vec![FieldElement::from_dec_str("1").unwrap()]));

        let token_manager = TokenManager::new(&mock_storage, &mock_client);

        let result = token_manager
            .get_token_owner(contract_address, token_id_low, token_id_high)
            .await;

        assert!(result.is_ok());
        let owners = result.unwrap();

        assert_eq!(owners.len(), 1);
        assert_eq!(owners[0], FieldElement::from_dec_str("1").unwrap());
    }
}
