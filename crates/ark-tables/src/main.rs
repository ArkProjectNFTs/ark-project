extern crate aws_sdk_dynamodb;
extern crate clap;
use aws_config::meta::region::RegionProviderChain;
use aws_sdk_dynamodb::Client;
use clap::Parser;
use dotenv::dotenv;
mod create;
mod delete;
mod logger;
use create::{create_table, TableCreationData};
use delete::delete_table;
use log::{info, debug, error, LevelFilter};
use simple_logger::SimpleLogger;
use tokio::time::{sleep, Duration};

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Name of table prefix
    #[arg(short, long)]
    prefix: String,
    /// Base table to be copied in new tables with prefix name.
    #[arg(short, long)]
    base: String,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();
    SimpleLogger::new()
        .env()
        .with_level(LevelFilter::Warn)
        .with_module_level("ark_tables", LevelFilter::Info)
        .init()
        .unwrap();
    // args
    let args = Args::parse();
    info!("table to rebuild {}!", args.prefix);
    // config
    let region_provider = RegionProviderChain::default_provider().or_else("us-east-1");
    let config = aws_config::from_env().region(region_provider).load().await;
    let client = Client::new(&config);
    let resp = client.list_tables().send().await?;
    let table_names = resp.table_names.unwrap_or_default();
    let filtered_tables: Vec<&String> = table_names
        .iter()
        .filter(|&table_name| table_name.contains(&args.base))
        .collect();

    let mut tables_to_create = Vec::new();

    for table_name in &filtered_tables {
        let desc = client
            .describe_table()
            .table_name(table_name.clone())
            .send()
            .await;
        match desc {
            Ok(response) => match &response.table {
                Some(table_description) => {
                    println!("TABLE DESC: {:?}", table_description);
                    let primary_key_name = table_description
                        .key_schema
                        .as_ref()
                        .and_then(|schema| schema.get(0))
                        .and_then(|key| key.attribute_name.as_ref())
                        .unwrap_or(&"N/A".to_string())
                        .clone();

                    let sort_key_name = table_description
                        .key_schema
                        .as_ref()
                        .and_then(|schema| schema.get(1))
                        .and_then(|key| key.attribute_name.as_ref())
                        .map(|name| name.clone());

                    tables_to_create.push(TableCreationData {
                        name: table_name.replace(&args.base, &args.prefix),
                        primary_key_name,
                        sort_key_name,
                    });

                    // table_log(table_description.clone());
                }
                None => info!("No table description available"),
            },
            Err(e) => {
                info!("Failed to describe table {}: {:?}", table_name, e);
            }
        }
    }

    for table_data in &tables_to_create {
        delete_table(client.clone(), table_data.name.clone()).await;
    }

    sleep(Duration::from_secs(5)).await;

    println!("Table to create: {:?}", tables_to_create);

    for table_data in &tables_to_create {
        let result = create_table(&client, table_data).await;
        if let Err(e) = result {
            error!("Failed to create table {}: {}", &table_data.name, e);
        }
    }
    Ok(())
}
