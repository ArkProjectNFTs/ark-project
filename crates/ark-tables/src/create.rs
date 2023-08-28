use aws_sdk_dynamodb::types::{
    AttributeDefinition, KeySchemaElement, KeyType, ProvisionedThroughput, ScalarAttributeType,
};
use aws_sdk_dynamodb::Client;
use log::{error, info};

#[derive(Debug)]
pub struct TableCreationData {
    pub name: String,
    pub primary_key_name: String,
    pub sort_key_name: Option<String>,
}

pub async fn create_table(
    client: &Client,
    table_data: &TableCreationData,
) -> Result<(), Box<dyn std::error::Error>> {

    let ad_primary = AttributeDefinition::builder()
        .attribute_name(&table_data.primary_key_name)
        .attribute_type(ScalarAttributeType::S)
        .build();

    let mut attribute_definitions = vec![ad_primary];
    let mut key_schema_elements = vec![KeySchemaElement::builder()
        .attribute_name(&table_data.primary_key_name)
        .key_type(KeyType::Hash)
        .build()];

    if let Some(sort_key) = &table_data.sort_key_name {
        let ad_sort = AttributeDefinition::builder()
            .attribute_name(sort_key)
            .attribute_type(ScalarAttributeType::S)
            .build();

        attribute_definitions.push(ad_sort);

        let ks_sort = KeySchemaElement::builder()
            .attribute_name(sort_key)
            .key_type(KeyType::Range)
            .build();

        key_schema_elements.push(ks_sort);
    }

    let pt = ProvisionedThroughput::builder()
        .read_capacity_units(50)
        .write_capacity_units(25)
        .build();

    let create_table_builder = client
        .create_table()
        .table_name(&table_data.name)
        .set_attribute_definitions(Some(attribute_definitions))
        .set_key_schema(Some(key_schema_elements))
        .provisioned_throughput(pt);

    // Send the CreateTable request
    let create_table_response = create_table_builder.send().await;

    match create_table_response {
        Ok(_) => {
            info!("Added table {}", table_data.name);
            Ok(())
        }
        Err(e) => {
            error!("Got an error creating table:");
            error!("{}", e);
            Err(Box::new(e))
        }
    }
}
