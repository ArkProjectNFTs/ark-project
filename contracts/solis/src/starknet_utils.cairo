//! Starknet utils contract, to generate
//! and ABI usable by Solis to interact with
//! starknet.
#[starknet::contract]
mod starknet_utils {
    use starknet::ContractAddress;

    #[storage]
    struct Storage {}

    #[external(v0)]
    fn owner_of(self: @ContractState, token_id: u256) -> ContractAddress {
        0.try_into().unwrap()
    }

    #[external(v0)]
    fn ownerOf(self: @ContractState, token_id: u256) -> ContractAddress {
        0.try_into().unwrap()
    }

    #[external(v0)]
    fn is_approved_for_all(
        self: @ContractState, owner: ContractAddress, operator: ContractAddress
    ) -> bool {
        false
    }

    #[external(v0)]
    fn isApprovedForAll(
        self: @ContractState, owner: ContractAddress, operator: ContractAddress
    ) -> bool {
        false
    }

    #[external(v0)]
    fn is_valid_signature(self: @ContractState, hash: felt252, signature: Span<felt252>) -> bool {
        false
    }

    #[external(v0)]
    fn balanceOf(self: @ContractState, account: ContractAddress) -> u256 {
        0_u256
    }

    #[external(v0)]
    fn allowance(self: @ContractState, owner: ContractAddress, spender: ContractAddress) -> u256 {
        0_u256
    }
}
