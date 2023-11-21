//! Signing related functions.
//!

trait SignatureChecker {
    // fn verify_raw(hash: felt252, signer_r: felt252, signer_s: felt252, signer_pubkey: felt252);
    fn verify(hash: felt252, signer: Signer) -> felt252;
}

impl SignerValidator of SignatureChecker {
    fn verify(hash: felt252, signer: Signer) -> felt252 {
        match signer {
            Signer::WEIERSTRESS_STARKNET(sign_info) => {
                let is_valid = ecdsa::check_ecdsa_signature(
                    hash, sign_info.user_pubkey, sign_info.user_sig_r, sign_info.user_sig_s
                );
                assert(is_valid, 'INVALID_SIGNATURE');
                sign_info.user_pubkey
            }
        }
    }
}

#[derive(Serde, Copy, Drop)]
enum Signer {
    WEIERSTRESS_STARKNET: SignInfo,
}

#[generate_trait]
impl SignerImpl of SignerTrait {
    fn set_public_key(ref self: Signer, public_key: felt252) {
        match self {
            Signer::WEIERSTRESS_STARKNET(mut signer) => { signer.user_pubkey = public_key; }
        }
    }

    fn get_public_key(ref self: Signer) -> felt252 {
        match self {
            Signer::WEIERSTRESS_STARKNET(signer) => signer.user_pubkey,
        }
    }
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
