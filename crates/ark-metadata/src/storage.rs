use crate::types::{StorageError, TokenMetadata};
use anyhow::Result;
use ark_starknet::CairoU256;
use async_trait::async_trait;
#[cfg(any(test, feature = "mock"))]
use mockall::automock;
use starknet::core::types::FieldElement;

#[cfg_attr(any(test, feature = "mock"), automock)]
#[async_trait]
pub trait Storage {
    async fn register_token_metadata(
        &self,
        contract_address: &FieldElement,
        token_id: CairoU256,
        token_metadata: TokenMetadata,
    ) -> Result<(), StorageError>;

    async fn has_token_metadata(
        &self,
        contract_address: FieldElement,
        token_id: CairoU256,
    ) -> Result<bool, StorageError>;

    async fn find_token_ids_without_metadata_in_collection(
        &self,
        contract_address: FieldElement,
    ) -> Result<Vec<CairoU256>, StorageError>;

    async fn find_token_ids_without_metadata(
        &self,
    ) -> Result<Vec<(FieldElement, CairoU256)>, StorageError>;
}
