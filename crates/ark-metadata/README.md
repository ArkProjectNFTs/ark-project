# ark_metadata

```ark_metadata``` is a Starknet library for NFT metadata management. Efficiently refresh specific tokens or capture an entire collection with this streamlined solution.

## 📜 Features
### MetadataManager

  - Use ```refresh_token_metadata()``` to metadata for a specific token, and caches images if available.

- Use ```refresh_collection_token_metadata()``` to metadata for all tokens in a collection.


## 🚀 Getting Started

To integrate `ark_metadata`, include it in your `Cargo.toml`. Check out the example provided to see its usage in various scenarios.

For `MetadataManager::new()`, you'll need:

- **Storage**: Implements the data access layer.
- **StarknetClient**: Facilitates interactions with Starknet and contract calls.
- **FileManager**: Handles file storage. Within `ark_metadata`, two defaults are available:
  - **LocalFileManager**: For local file storage.
  - **AWSFileManager**: For AWS S3 cloud storage.


## 🔗 Dependencies

- ```ReqwestClient```: Used for making HTTP requests, essential for fetching metadata from URIs.

## 🧪 Testing

 ```cargo test --workspace```
