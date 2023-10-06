use std::fmt::LowerHex;

/// Returns the padded hex of '0x' prefixed
/// representation of the given felt.
pub fn to_hex_str<T: LowerHex>(value: &T) -> String {
    format!("0x{:064x}", value)
}

#[cfg(test)]
mod tests {
    use starknet::core::types::FieldElement;

    use super::*;

    #[test]
    fn test_to_hex_str() {
        let address = FieldElement::from_hex_be(
            "0x7fec6349248dc1a35f3f9fafd19e1ef873b687e04b7b9db4806f9e54f9ef000",
        )
        .unwrap();
        let value = to_hex_str(&address);
        assert_eq!(
            value,
            "0x07fec6349248dc1a35f3f9fafd19e1ef873b687e04b7b9db4806f9e54f9ef000"
        );
    }

    #[test]
    fn test_to_hex_str_short() {
        let address = FieldElement::from_hex_be("0x1234").unwrap();
        let value = to_hex_str(&address);
        assert_eq!(
            value,
            "0x0000000000000000000000000000000000000000000000000000000000001234"
        );
    }
}
