//! Signing related functions.
//!

/// The info about a data hash that has been signed.
#[derive(starknet::Store, Serde, Copy, Drop)]
struct SignInfo {
    // User public key to verify the signature.
    user_pubkey: felt252,
    // User signature on data hash.
    user_sig_r: felt252,
    user_sig_s: felt252,
}
