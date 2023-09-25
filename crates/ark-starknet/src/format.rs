use starknet::core::types::FieldElement;

/// Returns the padded hex of '0x' prefixed
/// representation of the given felt.
pub fn felt_to_hex_str(f: &FieldElement) -> String {
    format!("{:#064x}", f)
}
