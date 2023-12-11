use core::traits::TryInto;
use ark_common::crypto::typed_data::TypedDataTrait;
use traits::Into;
use box::BoxTrait;
use snforge_std::PrintTrait;

use super::mock::order::Order;
use ark_common::crypto::typed_data::Domain;

use core::option::OptionTrait;
use ark_common::crypto::signer::{Signer, SignInfo};
use snforge_std::signature::{
    StarkCurveKeyPair, StarkCurveKeyPairTrait, Signer as SNSigner, Verifier
};

// fn sign_mock(message_hash: felt252) -> Signer {
//     let private_key: felt252 = 0x1234567890987654321;
//     let mut key_pair = StarkCurveKeyPairTrait::from_private_key(private_key);
//     let (r, s) = key_pair.sign(message_hash).unwrap();
//     Signer::WEIERSTRESS_STARKNET(
//         SignInfo { user_pubkey: key_pair.public_key, user_sig_r: r, user_sig_s: s, }
//     )
// }

fn DOMAIN() -> Domain {
    Domain { name: 'Ark', version: '1.1', }
}

fn SIGNER() -> starknet::ContractAddress {
  starknet::contract_address_const::<'signer'>()
}

fn ORDER() -> Order {
    Order { order_hash: 1 }
}

fn ORDER_HASH() -> felt252 {
  0x51cf3229352fd8c0265d8897fedf67f86d4b5ec580513f922b963ce47ae1a16
}

#[test]
fn ark_test_type_data() {
    let order = ORDER();
    let order_hash = order.compute_hash_from(from: SIGNER(), domain: DOMAIN());
    order_hash.print();
    assert(order_hash == ORDER_HASH(), 'Invalid order hash');
    // let signer = sign_mock(order_hash);
}
