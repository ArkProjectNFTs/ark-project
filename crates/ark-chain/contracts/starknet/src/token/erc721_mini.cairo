use starknet::ContractAddress;

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

    fn approve(ref self: T, to: ContractAddress, token_id: u256);
    fn set_approval_for_all(ref self: T, operator: ContractAddress, approved: bool);
    fn get_approved(self: @T, token_id: u256) -> ContractAddress;
    fn is_approved_for_all(
        self: @T, owner: ContractAddress, operator: ContractAddress
    ) -> bool;
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
        token_approvals: LegacyMap<u256, ContractAddress>,
        operator_approvals: LegacyMap<(ContractAddress, ContractAddress), bool>,
    }

    #[constructor]
    fn constructor(ref self: ContractState, name: felt252, symbol: felt252, ) {
        self.name.write(name);
        self.symbol.write(symbol);
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        Transfer: Transfer,
        Approval: Approval,
        ApprovalForAll: ApprovalForAll,
    }

    #[derive(Drop, starknet::Event)]
    struct Transfer {
        from: ContractAddress,
        to: ContractAddress,
        token_id: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct Approval {
        owner: ContractAddress,
        approved: ContractAddress,
        token_id: u256
    }

    #[derive(Drop, starknet::Event)]
    struct ApprovalForAll {
        owner: ContractAddress,
        operator: ContractAddress,
        approved: bool
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

        fn mint_uri_free(
            ref self: ContractState, to: ContractAddress, token_id: u256, token_uri: felt252
        ) {
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

        fn approve(ref self: ContractState, to: ContractAddress, token_id: u256) {
            let owner = get_owner_of(@self, token_id);

            let caller = starknet::get_caller_address();
            assert(
                owner == caller || ERC721MiniImpl::is_approved_for_all(@self, owner, caller),
                'ERC721: unauthorized caller'
            );
            _approve(ref self, to, token_id);
        }

        fn set_approval_for_all(
            ref self: ContractState, operator: ContractAddress, approved: bool
        ) {
            _set_approval_for_all(ref self, starknet::get_caller_address(), operator, approved)
        }

        fn get_approved(self: @ContractState, token_id: u256) -> ContractAddress {
            assert(exists(self, token_id), 'ERC721: invalid token ID');
            self.token_approvals.read(token_id)
        }

        fn is_approved_for_all(
            self: @ContractState, owner: ContractAddress, operator: ContractAddress
        ) -> bool {
            self.operator_approvals.read((owner, operator))
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

    fn _approve(ref self: ContractState, to: ContractAddress, token_id: u256) {
        let owner = get_owner_of(@self, token_id);
        assert(owner != to, 'ERC721: approval to owner');

        self.token_approvals.write(token_id, to);
        self.emit(Approval { owner, approved: to, token_id });
    }

    fn _set_approval_for_all(
        ref self: ContractState,
        owner: ContractAddress,
        operator: ContractAddress,
        approved: bool
    ) {
        assert(owner != operator, 'ERC721: self approval');
        self.operator_approvals.write((owner, operator), approved);
        self.emit(ApprovalForAll { owner, operator, approved });
    }
}
