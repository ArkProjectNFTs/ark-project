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
use tracing::{info, trace};

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

        trace!("Cache miss for contract {}", address);

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

                info!(
                    "New contract identified [0x{:064x}] : {}",
                    address,
                    contract_type.to_string()
                );

                self.cache.insert(address, contract_type.clone());

                let info = ContractInfo {
                    contract_address: to_hex_str(&address),
                    contract_type: contract_type.to_string(),
                };

                self.storage
                    .register_contract_info(&info, block_timestamp)
                    .await?;

                Ok(contract_type)
            }
        }
    }

    /// Verifies if the contracft is an ERC721, ERC1155 or an other one by calling the `balance_of`
    /// function (with the two cases at the moment).
    /// ERC721 `balance_of` expects only the `owner` address.
    pub async fn get_contract_type(&self, contract_address: FieldElement) -> Result<ContractType> {
        let block = BlockId::Tag(BlockTag::Pending);
        let balance_of_0 = self
            .get_contract_property_string(
                contract_address,
                "balanceOf",
                vec![FieldElement::ZERO],
                block,
            )
            .await;

        let balance_of = match balance_of_0 {
            Ok(_) => return Ok(ContractType::ERC721),
            Err(e) => match e {
                StarknetClientError::EntrypointNotFound(_) => {
                    self.get_contract_property_string(
                        contract_address,
                        "balance_of",
                        vec![FieldElement::ZERO],
                        block,
                    )
                    .await
                }
                StarknetClientError::InputTooShort => return Ok(ContractType::ERC1155),
                _ => return Err(e.into()),
            },
        };

        match balance_of {
            Ok(_) => Ok(ContractType::ERC721),
            Err(e) => match e {
                StarknetClientError::EntrypointNotFound(_) => Ok(ContractType::Other),
                StarknetClientError::InputTooShort => Ok(ContractType::ERC1155),
                _ => Err(e.into()),
            },
        }
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
