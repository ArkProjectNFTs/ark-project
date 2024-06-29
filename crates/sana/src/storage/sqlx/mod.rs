//! Module implementing Sqlx backend for Sana.
//!
//! The main objective of this module is to add a default
//! implementation for examples and testing.
//! No optimization was made at database level.
pub mod default_storage;
pub use default_storage::PostgresStorage;

pub mod types;
