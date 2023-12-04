use core::debug::PrintTrait;
use ark_common::crypto::hash::serialized_hash;
use ark_common::crypto::signer;
use core::option::OptionTrait;
use ark_common::crypto::signer::{Signer, SignInfo};
use snforge_std::signature::{
    StarkCurveKeyPair, StarkCurveKeyPairTrait, Signer as SNSigner, Verifier
};

fn sign_mock(message_hash: felt252, pk: Option<felt252>) -> Signer {
    let private_key: felt252 = 0x1234567890987654321;
    if pk.is_some() {
        let private_key = pk.unwrap();
    }
    let mut key_pair = StarkCurveKeyPairTrait::from_private_key(private_key);
    let (r, s) = key_pair.sign(message_hash).unwrap();

    key_pair.public_key.print();
    r.print();
    s.print();
    Signer::WEIERSTRESS_STARKNET(
        SignInfo { user_pubkey: key_pair.public_key, user_sig_r: r, user_sig_s: s, }
    )
}

#[test]
fn test_create_listing() {
    let order_hash = 1764615887178257798256857785248619434416610229900350535689529518115442866464;
    let poseidon_hash = serialized_hash(order_hash);
    poseidon_hash.print();
    let signer = sign_mock(poseidon_hash, Option::None);
}