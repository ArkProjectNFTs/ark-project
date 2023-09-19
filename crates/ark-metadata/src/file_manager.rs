use std::fs::File;
use std::io::prelude::*;
use std::path::Path;
use anyhow::Result;
use async_trait::async_trait;
use aws_sdk_s3 as s3;

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

pub struct LocalFileManager;

impl LocalFileManager {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl FileManager for LocalFileManager {

    async fn save(&self, file: &FileInfo) -> Result<()> {
        let path = Path::new("./images/").join(&file.name);
        let mut dest_file = File::create(&path)?;
    
        // Écrire le contenu dans le fichier
        dest_file.write_all(&file.content)?;
    
        println!("Saving {} to local disk...", file.name);
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
