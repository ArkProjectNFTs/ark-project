use starknet::ContractAddress;
use ark_operator::string::LongString;

//! ERC721 with long string implem for testing.
#[starknet::interface]
trait IERC721LongString<T> {
    fn name(self: @T) -> LongString;
    fn symbol(self: @T) -> LongString;
    fn owner_of(self: @T, token_id: u256) -> ContractAddress;
    fn token_uri(self: @T, token_id: u256) -> LongString;

    fn mint_free(ref self: T, to: ContractAddress, token_id: u256);
    fn mint_uri_free(ref self: T, to: ContractAddress, token_id: u256, token_uri: LongString);

    fn transfer_from(ref self: T, from: ContractAddress, to: ContractAddress, token_id: u256);

    fn approve(ref self: T, to: ContractAddress, token_id: u256);
    fn set_approval_for_all(ref self: T, operator: ContractAddress, approved: bool);
    fn get_approved(self: @T, token_id: u256) -> ContractAddress;
    fn is_approved_for_all(
        self: @T, owner: ContractAddress, operator: ContractAddress
    ) -> bool;
}

#[starknet::contract]
mod erc721_longstring {
    use starknet::{ContractAddress, ClassHash};
    use starknet::contract_address::ContractAddressZeroable;

    use super::IERC721LongString;
    use ark_operator::string::{
        LongString, Felt252IntoLongString, long_string_storage_read, long_string_storage_write
    };

    #[storage]
    struct Storage {
        owners: LegacyMap<u256, ContractAddress>, 
        token_approvals: LegacyMap<u256, ContractAddress>,
        operator_approvals: LegacyMap<(ContractAddress, ContractAddress), bool>,
    }

    #[constructor]
    fn constructor(ref self: ContractState, name: LongString, symbol: LongString) {
        long_string_storage_write('ERC721', 'name', name);
        long_string_storage_write('ERC721', 'symbol', symbol);
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
    impl ERC721LL of IERC721LongString<ContractState> {
        fn name(self: @ContractState) -> LongString {
            long_string_storage_read('ERC721', 'name')
        }

        fn symbol(self: @ContractState) -> LongString {
            long_string_storage_read('ERC721', 'symbol')
        }

        fn owner_of(self: @ContractState, token_id: u256) -> ContractAddress {
            get_owner_of(self, token_id)
        }

        fn token_uri(self: @ContractState, token_id: u256) -> LongString {
            assert(exists(self, token_id), 'ERC721: invalid token ID');
            long_string_storage_read(token_id.low.into(), token_id.high.into())
        }

        fn mint_free(ref self: ContractState, to: ContractAddress, token_id: u256) {
            mint(ref self, to, token_id);
        }

        fn mint_uri_free(
            ref self: ContractState, to: ContractAddress, token_id: u256, token_uri: LongString
        ) {
            mint(ref self, to, token_id);
            long_string_storage_write(token_id.low.into(), token_id.high.into(), token_uri);
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
                owner == caller || ERC721LL::is_approved_for_all(@self, owner, caller),
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
