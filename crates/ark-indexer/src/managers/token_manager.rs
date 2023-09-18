use anyhow::{anyhow, Result};
use ark_starknet::client::StarknetClient;
use ark_storage::storage_manager::StorageManager;
use ark_storage::types::{EventType, TokenEvent, TokenFromEvent};
use starknet::core::types::*;
use starknet::macros::selector;

#[derive(Debug)]
pub struct TokenManager<'a, T: StorageManager, C: StarknetClient> {
    storage: &'a T,
    client: &'a C,
    // TODO: Same as event manager, we should use the stack instead.
    // check with @kwiss.
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
    pub async fn format_token(&mut self, event: &TokenEvent) -> Result<()> {
        self.reset_token();

        self.token.address = event.contract_address.clone();
        self.token.padded_token_id = event.padded_token_id.clone();
        self.token.from_address = event.from_address.clone();
        self.token.to_address = event.to_address.clone();
        self.token.timestamp = event.timestamp;
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

        // TODO: @kwiss, do we want a default value in case we can't get the token owner?
        // or do we want to return an error and abort before saving in the storage?
        let token_owner = self
            .get_token_owner(
                FieldElement::from_hex_be(&event.contract_address)
                    .expect("Contract address bad format"),
                event.token_id.low,
                event.token_id.high,
            )
            .await?[0];

        self.token.owner = format!("{:#064x}", token_owner);

        log::trace!(
            "Registering token: {} {}",
            event.token_id.format().token_id,
            event.contract_address
        );

        // TODO: do we need to be atomic for register_token and register_mint?
        // What is the logic if one of the two fails?

        if event.event_type == EventType::Mint {
            self.storage.register_mint(&self.token)?;
        } else {
            self.storage.register_token(&self.token)?;
        }

        Ok(())
    }

    ///
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
