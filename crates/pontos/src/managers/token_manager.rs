use crate::storage::types::{EventType, TokenEvent, TokenInfo, TokenMintInfo};
use crate::storage::Storage;
use anyhow::{anyhow, Result};
use ark_starknet::client::StarknetClient;
use ark_starknet::format::to_hex_str;
use ark_starknet::CairoU256;
use starknet::core::types::*;
use starknet::macros::selector;
use std::sync::Arc;

#[derive(Debug)]
pub struct TokenManager<S: Storage, C: StarknetClient> {
    storage: Arc<S>,
    client: Arc<C>,
}

impl<S: Storage, C: StarknetClient> TokenManager<S, C> {
    /// Initializes a new instance.
    pub fn new(storage: Arc<S>, client: Arc<C>) -> Self {
        Self {
            storage: Arc::clone(&storage),
            client: Arc::clone(&client),
        }
    }

    /// Formats a token registry from the token event data.
    pub async fn format_and_register_token(
        &self,
        token_id: &CairoU256,
        event: &TokenEvent,
        block_timestamp: u64,
        block_number: u64,
    ) -> Result<()> {
        let mut token = TokenInfo {
            contract_address: event.contract_address.clone(),
            token_id: event.token_id.clone(),
            token_id_hex: event.token_id_hex.clone(),
            ..Default::default()
        };

        let token_owner_raw_result = self
            .get_token_owner(
                FieldElement::from_hex_be(&event.contract_address)
                    .expect("Contract address bad format"),
                token_id.low.into(),
                token_id.high.into(),
            )
            .await;

        token.owner = token_owner_raw_result
            .ok()
            .and_then(|owner| owner.first().map(to_hex_str))
            .unwrap_or_default();

        self.storage.register_token(&token, block_timestamp).await?;

        if event.event_type == EventType::Mint {
            let info = TokenMintInfo {
                address: event.to_address.clone(),
                timestamp: event.timestamp,
                transaction_hash: event.transaction_hash.clone(),
                block_number,
            };

            self.storage
                .register_mint(&token.contract_address, &token.token_id_hex, &info)
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
        let block = BlockId::Tag(BlockTag::Pending);
        let selectors = vec![selector!("owner_of"), selector!("ownerOf")];

        for selector in selectors {
            if let Ok(res) = self
                .client
                .call_contract(
                    contract_address,
                    selector,
                    vec![token_id_low, token_id_high],
                    block,
                )
                .await
            {
                return Ok(res);
            }
        }

        Err(anyhow!("Failed to get token owner from chain"))
    }
}

#[cfg(test)]
mod tests {
    use crate::storage::MockStorage;
    use ark_starknet::client::MockStarknetClient;

    use super::*;

    #[tokio::test]
    async fn test_get_token_owner() {
        let mock_storage = MockStorage::default();
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
