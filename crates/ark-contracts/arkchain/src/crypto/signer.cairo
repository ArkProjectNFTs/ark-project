//! Signing related functions.
//!

trait SignatureChecker {
    fn verify(hash: felt252, sign_info: SignInfo);
}

impl WeierstrassSignatureChecker of SignatureChecker {
    fn verify(hash: felt252, sign_info: SignInfo) {
        let is_valid = ecdsa::check_ecdsa_signature(
            hash, sign_info.user_pubkey, sign_info.user_sig_r, sign_info.user_sig_s
        );
        assert(is_valid, 'INVALID_SIGNATURE',);
    }
}

#[derive(Serde, Copy, Drop)]
enum SignType {
    WEIERSTRESS_STARKNET
}

/// The info about a data hash that has been signed.
#[derive(starknet::Store, Serde, Copy, Drop)]
struct SignInfo {
    // User public key to verify the signature.
    user_pubkey: felt252,
    // User signature on data hash.
    user_sig_r: felt252,
    user_sig_s: felt252,
}
