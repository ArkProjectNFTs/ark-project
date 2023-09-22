# 🖼️ ark_metadata

`ark_metadata` is a library designed to fetch all NFT metadata on Starknet. It allows for efficient refreshing of specific token metadata or capturing metadata for an entire collection in a streamlined manner.

## Features
### MetadataManager

- `refresh_token_metadata()`: Refresh metadata for a specific token, and caches images if available.
- `refresh_collection_token_metadata()`: Refresh metadata for all tokens in a collection.

## Getting Started

To integrate `ark_metadata`, include ```ark-rs``` in your `Cargo.toml`.
*Check out the provided example to see its usage in various scenarios.*

To instantiate a new `MetadataManager`, you'll need some implementations:

- **Storage**: Implements the data access layer.
- **StarknetClient**: Facilitates interactions with Starknet and contract calls.
- **FileManager**: Handles file storage. Within `ark_metadata`, two defaults are available:
  - **LocalFileManager**: For local file storage.
  - **AWSFileManager**: For AWS S3 cloud storage.

## Dependencies

- `ReqwestClient`: Used for making HTTP requests, crucial for fetching metadata from URIs.

## Testing

Run tests with: 
```bash
cargo test --workspace
