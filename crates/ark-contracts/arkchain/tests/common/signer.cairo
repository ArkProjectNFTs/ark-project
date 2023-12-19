use core::option::OptionTrait;
use ark_common::crypto::signer::{Signer, SignInfo};
use snforge_std::signature::{
    StarkCurveKeyPair, StarkCurveKeyPairTrait, Signer as SNSigner, Verifier
};
use ark_common::crypto::typed_data::{OrderSign, TypedDataTrait};

fn SIGNER() -> starknet::ContractAddress {
    0x2284a6517b487be8114013f277f9e2010ac001a24a93e3c48cdf5f8f345a81b.try_into().unwrap()
}

fn ORDER(order_hash: felt252) -> OrderSign {
    OrderSign { hash: order_hash }
}

fn ORDER_HASH() -> felt252 {
    0x32c0fac84cfd23ed5a608215640aea894432b9f57c2f0eeeef8890b69c9857a
}

fn sign_mock(message_hash: felt252) -> Signer {
    let order = ORDER(message_hash);
    let order_hash = order.compute_hash_from(from: SIGNER());
    let private_key: felt252 = 0x1234567890987654321;
    let mut key_pair = StarkCurveKeyPairTrait::from_private_key(private_key);
    let (r, s) = key_pair.sign(order_hash).unwrap();
    Signer::WEIERSTRESS_STARKNET(
        SignInfo { user_pubkey: key_pair.public_key, user_sig_r: r, user_sig_s: s, }
    )
}
