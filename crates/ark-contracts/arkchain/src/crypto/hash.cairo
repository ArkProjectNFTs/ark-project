//! Crypto hashes computation.

/// Computes the starknet keccak on the input data.
/// Starknet keccak is used to fit into one felt, and being easily
/// computed with off-chain components using starknet-rs or starknetjs.
///
/// # Arguments
///
/// * `data` - Data to hash.
fn starknet_keccak(data: Span<felt252>) -> felt252 {
    let mut u256_data: Array<u256> = array![];

    let mut i = 0_usize;
    loop {
        if i == data.len() {
            break;
        }
        u256_data.append((*data[i]).into());
        i += 1;
    };

    let mut hash = keccak::keccak_u256s_be_inputs(u256_data.span());
    let low = integer::u128_byte_reverse(hash.high);
    let high = integer::u128_byte_reverse(hash.low);
    hash = u256 { low, high };
    hash = hash & 0x03ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff_u256;
    hash.try_into().expect('starknet keccak overflow')
}

fn serialized_hash<T, +Serde<T>, +Drop<T>>(value: T) -> felt252 {
    let mut buf = array![];
    value.serialize(ref buf);
    starknet_keccak(buf.span())
}
