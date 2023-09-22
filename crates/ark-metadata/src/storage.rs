use crate::types::{StorageError, TokenMetadata};
use ark_starknet::CairoU256;
#[cfg(any(test, feature = "mock"))]
use mockall::automock;
use starknet::core::types::FieldElement;

#[cfg_attr(any(test, feature = "mock"), automock)]
pub trait Storage {
    fn register_token_metadata(
        &self,
        contract_address: &FieldElement,
        token_id: CairoU256,
        token_metadata: TokenMetadata,
    ) -> Result<(), StorageError>;

    fn has_token_metadata(
        &self,
        contract_address: FieldElement,
        token_id: CairoU256,
    ) -> Result<bool, StorageError>;

    fn find_token_ids_without_metadata_in_collection(
        &self,
        contract_address: FieldElement,
    ) -> Result<Vec<CairoU256>, StorageError>;
}
