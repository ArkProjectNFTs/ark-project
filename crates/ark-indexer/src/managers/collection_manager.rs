use anyhow::Result;
use ark_storage::storage_manager::StorageManager;
use ark_storage::types::StorageError;
use ark_storage::types::{ContractInfo, ContractType};
use starknet::core::types::{BlockId, BlockTag, FieldElement};
use starknet::core::utils::{get_selector_from_name, parse_cairo_short_string};
use std::collections::HashMap;
use std::sync::Arc;

pub struct CollectionManager<T: StorageManager> {
    storage: Arc<T>,
    /// A cache with contract address mapped to it's type.
    cache: HashMap<FieldElement, ContractInfo>,
}

impl<T: StorageManager> CollectionManager<T> {
    /// Initializes a new instance.
    pub fn new(storage: Arc<T>) -> Self {
        Self {
            storage,
            cache: HashMap::new(),
        }
    }

    /// Gets the contract info from local cache, or fetch is from the DB.
    fn get_cached_or_fetch_info(
        &mut self,
        address: FieldElement,
    ) -> Result<ContractInfo, StorageError> {
        if let Some(info) = self.cache.get(&address) {
            return Ok(info.clone());
        }

        log::trace!("Cache miss for contract {}", address);

        let info = self.storage.get_contract_info(&address)?;

        self.cache.insert(address, info.clone()); // Adding to the cache

        Ok(info)
    }

    /// Identifies a contract from it's address only.
    pub async fn identify_contract(
        &mut self,
        client: &StarknetClientHttp,
        address: FieldElement,
    ) -> Result<ContractInfo> {
        // The cache is more efficient that formatting to check the BLACKLIST.
        match self.get_cached_or_fetch_info(address) {
            Ok(info) => Ok(info),
            Err(_) => {
                // Can't find info, try to identify with calls.
                let contract_type = self.get_contract_type(client, address).await?;

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

                self.storage.register_contract_info(&address, &info)?;

                Ok(info)
            }
        }
    }

    pub async fn get_contract_type(
        &self,
        client: &StarknetClientHttp,
        contract_address: FieldElement,
    ) -> Result<ContractType> {
        let block = BlockId::Tag(BlockTag::Latest);
        let token_uri_cairo_0 = self
            .get_contract_property_string(
                client,
                contract_address,
                "tokenURI",
                vec![FieldElement::ONE, FieldElement::ZERO],
                block,
            )
            .await
            .unwrap_or("undefined".to_string());

        let token_uri = self
            .get_contract_property_string(
                client,
                contract_address,
                "token_uri",
                vec![FieldElement::ONE, FieldElement::ZERO],
                block,
            )
            .await
            .unwrap_or("undefined".to_string());

        let uri_result = self
            .get_contract_property_string(client, contract_address, "uri", vec![], block)
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
        client: &StarknetClientHttp,
        contract_address: FieldElement,
        selector_name: &str,
        calldata: Vec<FieldElement>,
        block: BlockId,
    ) -> Result<String> {
        let response = client
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

#[cfg(test)]
mod tests {
    use super::*;
    use ark_starknet::client::MockStarknetClient;
    use ark_storage::storage_manager::MockStorageManager;
    use mockall::predicate::*;

    #[tokio::test]
    async fn test_identify_contract_cached() {
        let storage = MockStorageManager::default();
        let client = MockStarknetClient::default();

        let address = FieldElement::ONE; // Example address
        let info: ContractInfo = ContractInfo {
            name: "Everai".to_string(),
            symbol: "Everai".to_string(),
            r#type: ContractType::ERC721,
        };

        storage
            .expect_get_contract_info()
            .with(eq(address))
            .times(1)
            .returning(move |_| Ok(info.clone()));

        let manager = CollectionManager::<MockStorageManager>::new(Arc::new(storage));
        let result = manager.identify_contract(&client, FieldElement::ONE).await;

        assert_eq!(result.unwrap(), info);
    }
}
