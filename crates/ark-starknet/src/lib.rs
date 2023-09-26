pub mod client;
pub mod format;

use num_bigint::BigUint;

#[derive(Debug, Clone)]
pub struct CairoU256 {
    pub low: u128,
    pub high: u128,
}

impl CairoU256 {
    pub fn to_biguint(&self) -> BigUint {
        let low_bytes = self.low.to_be_bytes();
        let high_bytes = self.high.to_be_bytes();

        let mut bytes: Vec<u8> = Vec::new();
        bytes.extend(high_bytes);
        bytes.extend(low_bytes);

        BigUint::from_bytes_be(&bytes[..])
    }

    pub fn to_hex(&self) -> String {
        let token_id_big_uint = self.to_biguint();
        format!("{:#064x}", token_id_big_uint)
    }

    pub fn to_decimal(&self, padded: bool) -> String {
        let token_id_big_uint = self.to_biguint();
        let token_id_str: String = token_id_big_uint.to_str_radix(10);

        if padded {
            format!("{:0>width$}", token_id_str, width = 78)
        } else {
            token_id_str
        }
    }
}
