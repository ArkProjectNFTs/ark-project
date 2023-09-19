use std::fs::{File, create_dir_all};
use std::io::prelude::*;
use std::path::Path;

use anyhow::{Result, Context};
use async_trait::async_trait;
use log::info;

#[cfg(any(test, feature = "mock"))]
use mockall::automock;

pub struct FileInfo {
    pub name: String,
    pub content: Vec<u8>,
}

#[cfg_attr(any(test, feature = "mock"), automock)]
#[async_trait]
pub trait FileManager {
    async fn save(&self, file: &FileInfo) -> Result<()>;
}

#[derive(Default)]
pub struct LocalFileManager;

#[async_trait]
impl FileManager for LocalFileManager {
    async fn save(&self, file: &FileInfo) -> Result<()> {
        // Construct the path
        let path = Path::new("./tmp").join(&file.name);

        // Ensure directory exists
        create_dir_all(path.parent().unwrap())
            .context("Failed to create directory")?;

        // Create and write to the file
        let mut dest_file = File::create(&path)
            .context("Failed to create file")?;

        dest_file.write_all(&file.content)
            .context("Failed to write to file")?;
    
        info!("File saved: {}", file.name);
        Ok(())
    }
}

// pub struct AWSFileManager;

// impl FileManager for AWSFileManager {
//     async fn save(&self, file: &FileInfo) -> Result<()> {

//         let config = aws_config::load_from_env().await;
//         let client = aws_sdk_s3::Client::new(&config);

//         println!("Uploading {} to AWS...", file.name);
//         Ok(())
//     }
// }
