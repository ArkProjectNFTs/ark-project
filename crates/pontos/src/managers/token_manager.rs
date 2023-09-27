use crate::storage::storage_manager::StorageManager;
use crate::storage::types::{EventType, TokenEvent, TokenFromEvent};
use anyhow::{anyhow, Result};
use ark_starknet::client::StarknetClient;
use starknet::core::types::*;
use starknet::macros::selector;
use std::sync::Arc;

#[derive(Debug)]
pub struct TokenManager<S: StorageManager, C: StarknetClient> {
    storage: Arc<S>,
    client: Arc<C>,
}

impl<S: StorageManager, C: StarknetClient> TokenManager<S, C> {
    /// Initializes a new instance.
    pub fn new(storage: Arc<S>, client: Arc<C>) -> Self {
        Self {
            storage: Arc::clone(&storage),
            client: Arc::clone(&client),
        }
    }

    /// Formats a token registry from the token event data.
    pub async fn format_and_register_token(&self, event: &TokenEvent) -> Result<()> {
        let mut token = TokenFromEvent {
            address: event.contract_address.clone(),
            token_id: event.token_id.clone(),
            formated_token_id: event.formated_token_id.clone(),
            ..Default::default()
        };

        let token_owner = self
            .get_token_owner(
                FieldElement::from_hex_be(&event.contract_address)
                    .expect("Contract address bad format"),
                event.token_id.low,
                event.token_id.high,
            )
            .await?[0];
        token.owner = format!("{:#064x}", token_owner);

        if event.event_type == EventType::Mint {
            token.mint_address = Some(event.to_address_field_element);
            token.mint_timestamp = Some(event.timestamp);
            token.mint_transaction_hash = Some(event.transaction_hash.clone());
            token.mint_block_number = Some(event.block_number);
            self.storage
                .register_mint(&token, event.block_number)
                .await?;
        } else {
            self.storage
                .register_token(&token, event.block_number)
                .await?;
        }
        Ok(())
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

        let token_manager = TokenManager::new(Arc::new(mock_storage), Arc::new(mock_client));

        let result = token_manager
            .get_token_owner(contract_address, token_id_low, token_id_high)
            .await;

        assert!(result.is_ok());
        let owners = result.unwrap();

        assert_eq!(owners.len(), 1);
        assert_eq!(owners[0], FieldElement::from_dec_str("1").unwrap());
    }
}
