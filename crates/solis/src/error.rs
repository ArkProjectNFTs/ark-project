//! Error and Result module.
//!
use thiserror::Error;

#[derive(Error, Debug)]
pub enum Error {
    #[error("Felt conversion error: {0}")]
    FeltConversion(String),
    #[error("Transaction verification error: {0}")]
    TransactionVerification(String),
    #[error("An error occurred: {0}")]
    General(String),
}

pub type SolisResult<T, E = Error> = Result<T, E>;
