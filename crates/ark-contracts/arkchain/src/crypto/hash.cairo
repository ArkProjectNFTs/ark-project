use poseidon::poseidon_hash_span;

fn serialized_hash<T, +Serde<T>, +Drop<T>>(value: T) -> felt252 {
    let mut buf = array![];
    value.serialize(ref buf);
    poseidon_hash_span(buf.span())
}
