use aws_sdk_dynamodb::types::TableDescription;
use log::info;

pub fn table_log(table_description: TableDescription) {
    info!(
        "Table: {}",
        table_description
            .table_name
            .as_ref()
            .unwrap_or(&"N/A".to_string())
    );

    if let Some(key_schema) = &table_description.key_schema {
        info!("- Key Schema:");
        for key in key_schema {
            info!(
                "  - attribute_name: {:?}, key_type: {:?}",
                key.attribute_name, key.key_type
            );
        }
    }

    if let Some(provisioned_throughput) = &table_description.provisioned_throughput {
        info!(
            "- Read Capacity: {}",
            provisioned_throughput.read_capacity_units.unwrap_or(0)
        );
        info!(
            "- Write Capacity: {}",
            provisioned_throughput.write_capacity_units.unwrap_or(0)
        );
    }
}
