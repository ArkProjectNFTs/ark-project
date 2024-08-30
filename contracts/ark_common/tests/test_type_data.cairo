use core::traits::TryInto;
use traits::Into;
use box::BoxTrait;

use ark_common::crypto::typed_data::{OrderSign, TypedDataTrait};

use core::option::OptionTrait;
use ark_common::crypto::signer::{Signer, SignInfo};
use snforge_std::signature::KeyPairTrait;
use snforge_std::signature::stark_curve::{
    StarkCurveKeyPairImpl, StarkCurveSignerImpl, StarkCurveVerifierImpl
};

fn sign_mock(message_hash: felt252) -> Signer {
    let key_pair = KeyPairTrait::<felt252, felt252>::generate();
    let (r, s): (felt252, felt252) = key_pair.sign(message_hash).unwrap();
    Signer::WEIERSTRESS_STARKNET(
        SignInfo { user_pubkey: key_pair.public_key, user_sig_r: r, user_sig_s: s, }
    )
}

fn SIGNER() -> starknet::ContractAddress {
    0x2284a6517b487be8114013f277f9e2010ac001a24a93e3c48cdf5f8f345a81b.try_into().unwrap()
}

fn ORDER() -> OrderSign {
    OrderSign { hash: 1 }
}

fn ORDER_HASH() -> felt252 {
    0x232DD797D0E66C2F6B9AD5427565B23158DE6328C3186B644DDB1767F81D504
}

#[test]
fn ark_test_type_data() {
    let order = ORDER();
    let order_hash = order.compute_hash_from(from: SIGNER(), chain_id: 0x534e5f4d41494e);
    sign_mock(order_hash);
    assert(order_hash == ORDER_HASH(), 'Invalid order hash');
}
