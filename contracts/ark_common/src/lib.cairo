mod protocol {
    mod order_types;
    mod order_v1;
    mod order_database;
    mod broker;
}

mod crypto {
    mod hash;
    mod signer;
    mod typed_data;
    mod constants;
    mod common;
}

mod oz {
    mod erc2981;
}

//#[cfg(feature: 'snforge_tests')] // not supported before scarb 2.7.x
mod test_data {
    mod mock_erc2981;
}
