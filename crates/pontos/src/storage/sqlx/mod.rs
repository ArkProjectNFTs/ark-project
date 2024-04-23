//! Module implementing Sqlx backend for Pontos.
//!
//! The main objective of this module is to add a default
//! implementation for examples and testing.
//! No optimization was made at database level.
pub mod default_storage;
pub use default_storage::DefaultSqlxStorage;

pub mod marketplace_storage;
pub use marketplace_storage::MarketplaceSqlxStorage;

pub mod types;
