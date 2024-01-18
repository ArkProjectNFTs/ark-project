use core::option::OptionTrait;
use ark_common::crypto::signer::{Signer, SignInfo};
use snforge_std::signature::{
    StarkCurveKeyPair, StarkCurveKeyPairTrait, Signer as SNSigner, Verifier
};
use ark_common::crypto::typed_data::{OrderSign, TypedDataTrait};

fn ORDER(order_hash: felt252) -> OrderSign {
    OrderSign { hash: order_hash }
}

fn sign_mock(message_hash: felt252, signer: starknet::ContractAddress) -> Signer {
    let order = ORDER(message_hash);
    let order_hash = order.compute_hash_from(signer, 0x534e5f4d41494e);
    let private_key: felt252 = 0x1234567890987654321;
    let mut key_pair = StarkCurveKeyPairTrait::from_private_key(private_key);
    let (r, s) = key_pair.sign(order_hash).unwrap();
    Signer::WEIERSTRESS_STARKNET(
        SignInfo { user_pubkey: key_pair.public_key, user_sig_r: r, user_sig_s: s, }
    )
}
