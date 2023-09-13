use anyhow::{anyhow, Result};
use ark_starknet::client::StarknetClient;
use ark_storage::storage_manager::StorageManager;
use ark_storage::types::{ContractInfo, ContractType};
use starknet::core::types::{BlockId, BlockTag, FieldElement};
use starknet::core::utils::{get_selector_from_name, parse_cairo_short_string};
use std::collections::HashMap;

pub struct CollectionManager<'a, T: StorageManager, C: StarknetClient> {
    storage: &'a T,
    client: &'a C,
    /// A cache with contract address mapped to it's type.
    cache: HashMap<FieldElement, ContractInfo>,
}

impl<'a, T: StorageManager, C: StarknetClient> CollectionManager<'a, T, C> {
    /// Initializes a new instance.
    pub fn new(storage: &'a T, client: &'a C) -> Self {
        Self {
            storage,
            client,
            cache: HashMap::new(),
        }
    }

    /// Gets the contract info from local cache, or fetch is from the DB.
    fn get_cached_or_fetch_info(&mut self, address: FieldElement) -> Result<ContractInfo> {
        match self.cache.get(&address) {
            Some(info) => Ok(info.clone()),
            None => {
                log::trace!("Cache miss for contract {address}");
                // TODO: self.storage.get_contract_info();
                // If no info available -> return error.
                // For now, return error to simulate it's not available.
                Err(anyhow!("Info not found in storage for contract {address}"))
            }
        }
    }

    /// Identifies a contract from it's address only.
    pub async fn identify_contract(&mut self, address: FieldElement) -> Result<ContractInfo> {
        // The cache is more efficient that formatting to check the BLACKLIST.
        match self.get_cached_or_fetch_info(address) {
            Ok(info) => Ok(info),
            Err(_) => {
                // Can't find info, try to identify with calls.
                let contract_type = self.get_contract_type(address).await?;

                log::info!(
                    "New contract identified [{:#064x}] : {}",
                    address,
                    contract_type.to_string()
                );

                let info = ContractInfo {
                    name: String::new(),
                    symbol: String::new(),
                    r#type: contract_type,
                };

                self.cache.insert(address, info.clone());
                // TODO: self.storage.register_contract_info(...);

                Ok(info)
            }
        }
    }

    pub async fn get_contract_type(&self, contract_address: FieldElement) -> Result<ContractType> {
        let block = BlockId::Tag(BlockTag::Latest);
        let token_uri_cairo_0 = self
            .get_contract_property_string(
                contract_address,
                "tokenURI",
                vec![FieldElement::ONE, FieldElement::ZERO],
                block,
            )
            .await
            .unwrap_or("undefined".to_string());

        let token_uri = self
            .get_contract_property_string(
                contract_address,
                "token_uri",
                vec![FieldElement::ONE, FieldElement::ZERO],
                block,
            )
            .await
            .unwrap_or("undefined".to_string());

        let uri_result = self
            .get_contract_property_string(contract_address, "uri", vec![], block)
            .await
            .unwrap_or("undefined".to_string());

        if (token_uri_cairo_0 != "undefined" && !token_uri_cairo_0.is_empty())
            || (token_uri != "undefined" && !token_uri.is_empty())
        {
            Ok(ContractType::ERC721)
        } else if uri_result != "undefined" {
            Ok(ContractType::ERC1155)
        } else {
            Ok(ContractType::Other)
        }
    }

    pub async fn get_contract_property_string(
        &self,
        contract_address: FieldElement,
        selector_name: &str,
        calldata: Vec<FieldElement>,
        block: BlockId,
    ) -> Result<String> {
        let response = self
            .client
            .call_contract(
                contract_address,
                get_selector_from_name(selector_name)?,
                calldata,
                block,
            )
            .await?;

        decode_string_array(&response)
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
