use crate::storage::{
    types::{ContractInfo, ContractType, StorageError},
    Storage,
};
use anyhow::Result;
use ark_starknet::client::{StarknetClient, StarknetClientError};
use ark_starknet::format::to_hex_str;
use starknet::core::types::{BlockId, BlockTag, FieldElement};
use starknet::core::utils::{get_selector_from_name, parse_cairo_short_string};
use std::collections::HashMap;
use std::sync::Arc;
use tracing::trace;

pub struct ContractManager<S: Storage, C: StarknetClient> {
    storage: Arc<S>,
    client: Arc<C>,
    /// A cache with contract address mapped to its type.
    cache: HashMap<FieldElement, ContractType>,
}

impl<S: Storage, C: StarknetClient> ContractManager<S, C> {
    /// Initializes a new instance.
    pub fn new(storage: Arc<S>, client: Arc<C>) -> Self {
        Self {
            storage,
            client,
            cache: HashMap::new(),
        }
    }

    /// Gets the contract info from local cache, or fetch is from the DB.
    async fn get_cached_or_fetch_info(
        &mut self,
        address: FieldElement,
    ) -> Result<ContractType, StorageError> {
        if let Some(contract_type) = self.cache.get(&address) {
            return Ok(contract_type.clone());
        }

        trace!("Cache miss for contract {:#064x}", address);

        let contract_type = self
            .storage
            .get_contract_type(&to_hex_str(&address))
            .await?;

        self.cache.insert(address, contract_type.clone()); // Adding to the cache

        Ok(contract_type)
    }

    /// Identifies a contract from its address only.
    pub async fn identify_contract(
        &mut self,
        address: FieldElement,
        block_timestamp: u64,
    ) -> Result<ContractType> {
        match self.get_cached_or_fetch_info(address).await {
            Ok(contract_type) => Ok(contract_type),
            Err(_) => {
                // Can't find info, try to identify with calls.
                let contract_type = self.get_contract_type(address).await?;

                trace!(
                    "New contract identified [0x{:064x}] : {}",
                    address,
                    contract_type.to_string()
                );

                self.cache.insert(address, contract_type.clone());

                let info = ContractInfo {
                    contract_address: to_hex_str(&address),
                    contract_type: contract_type.to_string(),
                    name: None,
                    symbol: None,
                    image: None,
                };

                self.storage
                    .register_contract_info(&info, block_timestamp)
                    .await?;

                Ok(contract_type)
            }
        }
    }

    /// Verifies if the contract is an ERC721, ERC1155 or an other type.
    /// `owner_of` is specific to ERC721.
    /// `balance_of` is specific to ERC1155 and different from ERC20 as 2 arguments are expected.
    pub async fn get_contract_type(&self, contract_address: FieldElement) -> Result<ContractType> {
        let _block = BlockId::Tag(BlockTag::Pending);

        if self.is_erc721(contract_address).await? {
            Ok(ContractType::ERC721)
        } else if self.is_erc1155(contract_address).await? {
            Ok(ContractType::ERC1155)
        } else {
            Ok(ContractType::Other)
        }
    }

    /// Returns true if the contract is ERC721, false otherwise.
    pub async fn is_erc721(&self, contract_address: FieldElement) -> Result<bool> {
        let block = BlockId::Tag(BlockTag::Pending);
        let token_id = vec![FieldElement::ONE, FieldElement::ZERO]; // u256.

        match self
            .get_contract_response(contract_address, "ownerOf", token_id.clone(), block)
            .await
        {
            Ok(_) => return Ok(true),
            Err(e) => match e {
                StarknetClientError::Contract(s) => {
                    // Token ID may not exist, but the entrypoint was hit.
                    if s.contains("not found in contract") {
                        // do nothing and go to the next selector.
                    } else {
                        return Ok(true);
                    }
                }
                StarknetClientError::EntrypointNotFound(_) => (),
                _ => return Ok(false),
            },
        };

        match self
            .get_contract_response(contract_address, "owner_of", token_id, block)
            .await
        {
            Ok(_) => Ok(true),
            Err(e) => match e {
                StarknetClientError::Contract(s) => {
                    // Token ID may not exist, but the entrypoint was hit.
                    if s.contains("not found in contract") {
                        Ok(false)
                    } else {
                        Ok(true)
                    }
                }
                StarknetClientError::EntrypointNotFound(_) => Ok(false),
                _ => Ok(false),
            },
        }
    }

    /// Returns true if the contract is ERC1155, false otherwise.
    pub async fn is_erc1155(&self, contract_address: FieldElement) -> Result<bool> {
        let block = BlockId::Tag(BlockTag::Pending);
        // felt and u256 expected.
        let address_and_token_id = vec![FieldElement::ZERO, FieldElement::ONE, FieldElement::ZERO];

        match self
            .get_contract_response(
                contract_address,
                "balanceOf",
                address_and_token_id.clone(),
                block,
            )
            .await
        {
            Ok(_) => return Ok(true),
            Err(e) => match e {
                StarknetClientError::EntrypointNotFound(_) => (),
                StarknetClientError::InputTooLong => return Ok(false), // ERC20.
                _ => return Ok(false),
            },
        };

        match self
            .get_contract_response(contract_address, "balance_of", address_and_token_id, block)
            .await
        {
            Ok(_) => Ok(true),
            Err(e) => match e {
                StarknetClientError::EntrypointNotFound(_) => Ok(false),
                StarknetClientError::InputTooLong => Ok(false), // ERC20.
                _ => Ok(false),
            },
        }
    }

    pub async fn get_contract_response(
        &self,
        contract_address: FieldElement,
        selector_name: &str,
        calldata: Vec<FieldElement>,
        block: BlockId,
    ) -> Result<Vec<FieldElement>, StarknetClientError> {
        self.client
            .call_contract(
                contract_address,
                get_selector_from_name(selector_name).map_err(|_| {
                    StarknetClientError::Other(format!("Invalid selector: {}", selector_name))
                })?,
                calldata,
                block,
            )
            .await
    }

    pub async fn get_contract_property_string(
        &self,
        contract_address: FieldElement,
        selector_name: &str,
        calldata: Vec<FieldElement>,
        block: BlockId,
    ) -> Result<String, StarknetClientError> {
        let response = self
            .client
            .call_contract(
                contract_address,
                get_selector_from_name(selector_name).map_err(|_| {
                    StarknetClientError::Other(format!("Invalid selector: {}", selector_name))
                })?,
                calldata,
                block,
            )
            .await?;

        decode_string_array(&response).map_err(|e| {
            StarknetClientError::Other(format!("Impossible to decode response string: {}", e))
        })
    }
}

pub fn decode_string_array(string_array: &Vec<FieldElement>) -> Result<String> {
    match string_array.len() {
        0 => Ok("".to_string()),
        1 => Ok(parse_cairo_short_string(&string_array[0])?),
        2 => Ok(format!(
            "{}{}",
            parse_cairo_short_string(&string_array[0])?,
            parse_cairo_short_string(&string_array[1])?,
        )),
        _ => {
            // The first element is the length of the string,
            // we can skip it as it's implicitely given by the vector itself.
            let mut result = String::new();

            for s in &string_array[1..] {
                result.push_str(&parse_cairo_short_string(s)?);
            }

            Ok(result)
        }
    }
}
