use starknet::ContractAddress;
use cairo_test::string::LongString;

//! ERC721 with long string implem for testing.
#[starknet::interface]
trait IERC721Mini<T> {
    fn name(self: @T) -> felt252;
    fn symbol(self: @T) -> felt252;
    fn owner_of(self: @T, token_id: u256) -> ContractAddress;
    fn token_uri(self: @T, token_id: u256) -> felt252;

    fn mint_free(ref self: T, to: ContractAddress, token_id: u256);
    fn mint_uri_free(ref self: T, to: ContractAddress, token_id: u256, token_uri: felt252);

    fn transfer_from(ref self: T, from: ContractAddress, to: ContractAddress, token_id: u256);
}

#[starknet::contract]
mod erc721_mini {
    use starknet::{ContractAddress, ClassHash};
    use traits::{TryInto, Into};
    use zeroable::Zeroable;
    use starknet::contract_address::ContractAddressZeroable;
    use option::OptionTrait;
    use array::{ArrayTrait, SpanTrait};

    use super::IERC721Mini;

    #[storage]
    struct Storage {
        name: felt252,
        symbol: felt252,
        owners: LegacyMap<u256, ContractAddress>,
        uris: LegacyMap<u256, felt252>,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        name: felt252,
        symbol: felt252,
    ) {
        self.name.write(name);
        self.symbol.write(symbol);
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        Transfer: Transfer,
    }

    #[derive(Drop, starknet::Event)]
    struct Transfer {
        from: ContractAddress,
        to: ContractAddress,
        token_id: u256,
    }

    #[external(v0)]
    impl ERC721MiniImpl of IERC721Mini<ContractState> {
        fn name(self: @ContractState) -> felt252 {
            self.name.read()
        }

        fn symbol(self: @ContractState) -> felt252 {
            self.symbol.read()
        }

        fn owner_of(self: @ContractState, token_id: u256) -> ContractAddress {
            get_owner_of(self, token_id)
        }

        fn token_uri(self: @ContractState, token_id: u256) -> felt252 {
            assert(exists(self, token_id), 'ERC721: invalid token ID');
            self.uris.read(token_id)
        }

        fn mint_free(ref self: ContractState, to: ContractAddress, token_id: u256) {
            mint(ref self, to, token_id);
        }

        fn mint_uri_free(ref self: ContractState, to: ContractAddress, token_id: u256, token_uri: felt252) {
            mint(ref self, to, token_id);
            self.uris.write(token_id, token_uri);
        }

        fn transfer_from(
            ref self: ContractState, from: ContractAddress, to: ContractAddress, token_id: u256
        ) {
            assert(!to.is_zero(), 'ERC721: invalid receiver');

            assert(from == get_owner_of(@self, token_id), 'ERC721: wrong sender');

            self.owners.write(token_id, to);

            self.emit(Transfer { from, to, token_id });
        }
    }

    //
    // *** INTERNALS ***
    //
    fn get_owner_of(self: @ContractState, token_id: u256) -> ContractAddress {
        let owner = self.owners.read(token_id);
        assert(!owner.is_zero(), 'ERC721: invalid token ID');
        owner
    }

    fn exists(self: @ContractState, token_id: u256) -> bool {
        !self.owners.read(token_id).is_zero()
    }

    fn mint(ref self: ContractState, to: ContractAddress, token_id: u256) {
        assert(!to.is_zero(), 'ERC721: invalid receiver');
        assert(!exists(@self, token_id), 'ERC721: token already minted');

        // Update token_id owner
        self.owners.write(token_id, to);

        self.emit(Transfer { from: Zeroable::zero(), to, token_id,  });
    }

    fn burn(ref self: ContractState, token_id: u256) {
        let owner = get_owner_of(@self, token_id);
        self.owners.write(token_id, Zeroable::zero());

        self.emit(Transfer { from: owner, to: Zeroable::zero(), token_id,  });
    }
}
