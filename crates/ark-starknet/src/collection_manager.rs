use log::info;
use serde::{Deserialize, Serialize};
use starknet::core::utils::{get_selector_from_name, parse_cairo_short_string};
use starknet::core::{types::FieldElement, types::*};
use starknet::macros::selector;

use super::client2::StarknetClient;
use anyhow::{anyhow, Result};

///
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ContractType {
    Unknown,
    ERC721,
    ERC1155,
}

///
impl ToString for ContractType {
    fn to_string(&self) -> String {
        match self {
            ContractType::Unknown => String::from("unknown"),
            ContractType::ERC721 => String::from("erc721"),
            ContractType::ERC1155 => String::from("erc1155"),
        }
    }
}

pub struct CollectionManager {
    pub client: StarknetClient,
}

impl CollectionManager {
    /// Initializes a new CollectionManager.
    pub fn new(client: StarknetClient) -> CollectionManager {
        CollectionManager { client }
    }

    pub async fn get_token_owner(
        &self,
        contract_address: FieldElement,
        token_id_low: FieldElement,
        token_id_high: FieldElement,
        block_id: Option<BlockId>,
    ) -> Result<Vec<FieldElement>> {
        let effective_block_id = block_id.unwrap_or(BlockId::Tag(BlockTag::Latest));

        match self
            .client
            .call_contract(
                contract_address,
                selector!("ownerOf"),
                vec![token_id_low, token_id_high],
                effective_block_id,
            )
            .await
        {
            Ok(result) => {
                info!("ownerOf result: {:?}", result);
                Ok(result)
            }
            Err(_error) => {
                match self
                    .client
                    .call_contract(
                        contract_address,
                        selector!("owner_of"),
                        vec![token_id_low, token_id_high],
                        effective_block_id,
                    )
                    .await
                {
                    Ok(result) => {
                        info!("owner_of result: {:?}", result);
                        Ok(result)
                    }
                    Err(_error) => {
                        return Err(anyhow!("Failed to get token owner"));
                    }
                }
            }
        }
    }

    /// Retrieves the contract type for the given contract address.
    pub async fn get_contract_type(
        &self,
        contract_address: FieldElement,
        block: BlockId,
    ) -> Result<ContractType> {
        let token_uri_cairo_0 = self
            .get_contract_property_string(
                contract_address,
                "tokenURI",
                vec![FieldElement::ONE, FieldElement::ZERO],
                block,
            )
            .await?;

        let token_uri = self
            .get_contract_property_string(
                contract_address,
                "token_uri",
                vec![FieldElement::ONE, FieldElement::ZERO],
                block,
            )
            .await?;

        // Get uri
        let uri_result: String = self
            .get_contract_property_string(contract_address, "uri", vec![], block)
            .await?;

        if (token_uri_cairo_0 != "undefined" && !token_uri_cairo_0.is_empty())
            || (token_uri != "undefined" && !token_uri.is_empty())
        {
            Ok(ContractType::ERC721)
        } else if uri_result != "undefined" {
            Ok(ContractType::ERC1155)
        } else {
            Ok(ContractType::Unknown)
        }
    }

    pub async fn get_contract_property_string(
        &self,
        contract_address: FieldElement,
        selector_name: &str,
        calldata: Vec<FieldElement>,
        block: BlockId,
    ) -> Result<String> {
        info!("Getting contract property: {:?}", selector_name);

        let r = self
            .client
            .call_contract(
                contract_address,
                get_selector_from_name(selector_name)?,
                calldata,
                block,
            )
            .await?;

        decode_string_array(&r)
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
