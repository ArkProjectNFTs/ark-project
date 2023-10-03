/// Provides file management capabilities.
///
/// This module offers functionality to save files.
/// You may choose to implement the `FileManager` trait
/// to save files remotely (i.g. AWS S3).
use std::fs::{create_dir_all, File};
use std::io::prelude::*;
use std::path::Path;

use anyhow::{Context, Ok, Result};
use async_trait::async_trait;
use log::info;

#[cfg(any(test, feature = "mock"))]
use mockall::automock;

/// Represents information about a file.
///
/// This struct contains the name, content, and directory path (if any) of a file.
pub struct FileInfo {
    pub name: String,
    pub content: Vec<u8>,
    pub dir_path: Option<String>,
}

/// A trait that defines file management operations.
///
/// Implementors of this trait provide functionality to save files.
#[cfg_attr(any(test, feature = "mock"), automock)]
#[async_trait]
pub trait FileManager {
    /// Save the provided file.
    ///
    /// Implementors will provide the logic to save `file` and will return a `Result`.
    async fn save(&self, file: &FileInfo) -> Result<()>;
}

/// FileManager implementation that saves files locally.
#[derive(Default)]
pub struct LocalFileManager;

#[async_trait]
impl FileManager for LocalFileManager {
    async fn save(&self, file: &FileInfo) -> Result<()> {
        let dir_path = file.dir_path.clone().unwrap_or(String::from("./tmp"));

        // Construct the path
        let path = Path::new("images").join(dir_path.as_str()).join(&file.name);

        // Ensure directory exists
        create_dir_all(path.parent().unwrap()).context("Failed to create directory")?;

        // Create and write to the file
        let mut dest_file = File::create(&path).context("Failed to create file")?;

        dest_file
            .write_all(&file.content)
            .context("Failed to write to file")?;

        info!("File saved: {}", file.name);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[tokio::test]
    async fn test_local_file_save() {
        // Prepare a dummy file
        let file_info = FileInfo {
            name: "test_file.txt".to_string(),
            content: b"Hello, world!".to_vec(),
            dir_path: Some("some_subdir".to_string()),
        };

        // Use the LocalFileManager to save the file
        let manager = LocalFileManager;
        let result = manager.save(&file_info).await;
        assert!(result.is_ok());

        // Verify that the file has been saved correctly
        let content = fs::read("./images/some_subdir/test_file.txt").unwrap();
        assert_eq!(content, b"Hello, world!");

        // Clean up
        fs::remove_file("./images/some_subdir/test_file.txt").unwrap();
        fs::remove_dir("./images/some_subdir").unwrap();
    }

    #[tokio::test]
    async fn test_local_file_save_without_subdir() {
        // Prepare a dummy file without subdir
        let file_info = FileInfo {
            name: "test_file.txt".to_string(),
            content: b"Hello, world!".to_vec(),
            dir_path: None,
        };

        // Use the LocalFileManager to save the file
        let manager = LocalFileManager;
        let result = manager.save(&file_info).await;
        assert!(result.is_ok());

        // Verify that the file has been saved correctly
        let content = fs::read("./images/tmp/test_file.txt").unwrap();
        assert_eq!(content, b"Hello, world!");

        // Clean up
        fs::remove_file("./images/tmp/test_file.txt").unwrap();
        fs::remove_dir("./images/tmp").unwrap();
    }
}
