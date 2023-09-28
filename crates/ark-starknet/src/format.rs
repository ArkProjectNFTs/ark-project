use std::fmt::LowerHex;

/// Returns the padded hex of '0x' prefixed
/// representation of the given felt.
pub fn to_hex_str<T: LowerHex>(value: &T) -> String {
    format!("{:#064x}", value)
}
