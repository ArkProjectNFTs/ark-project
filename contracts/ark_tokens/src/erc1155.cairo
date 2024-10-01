use starknet::ContractAddress;

#[starknet::interface]
trait IFreeMint<T> {
    fn mint(ref self: T, recipient: ContractAddress, token_uri: felt252);
    fn get_current_token_id(self: @T) -> felt252;
}

#[starknet::contract]
mod FreeMintERC1155 {
    use core::array::ArrayTrait;
    use core::serde::Serde;
    use core::traits::Into;
    use core::traits::TryInto;
    use openzeppelin::introspection::src5::SRC5Component;
    use openzeppelin::token::erc1155::ERC1155Component;
    use openzeppelin::token::erc1155::ERC1155HooksEmptyImpl;
    use starknet::ContractAddress;
    use super::IFreeMint;

    component!(path: ERC1155Component, storage: erc1155, event: ERC1155Event);
    component!(path: SRC5Component, storage: src5, event: SRC5Event);

    // ERC1155 Mixin
    #[abi(embed_v0)]
    impl ERC1155MixinImpl = ERC1155Component::ERC1155MixinImpl<ContractState>;
    impl ERC1155InternalImpl = ERC1155Component::InternalImpl<ContractState>;
    impl ERC1155MetadataURIImpl = ERC1155Component::ERC1155MetadataURIImpl<ContractState>;
    impl ERC1155CamelImpl = ERC1155Component::ERC1155CamelImpl<ContractState>;
    impl SRC5Impl = SRC5Component::SRC5Impl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        erc1155: ERC1155Component::Storage,
        #[substorage(v0)]
        src5: SRC5Component::Storage,
        latest_token_id: u256
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        ERC1155Event: ERC1155Component::Event,
        #[flat]
        SRC5Event: SRC5Component::Event
    }

    #[constructor]
    fn constructor(ref self: ContractState, base_uri: core::byte_array::ByteArray) {
        self.erc1155.initializer(base_uri);
        self.latest_token_id.write(0);
    }

    #[abi(embed_v0)]
    impl ImplFreeMint of IFreeMint<ContractState> {
        fn get_current_token_id(self: @ContractState) -> felt252 {
            self.latest_token_id.read().try_into().unwrap()
        }

        fn mint(
            ref self: ContractState, recipient: ContractAddress, value: u256, token_uri: felt252
        ) {
            let token_id = self.latest_token_id.read();
            self.erc1155.mint_with_acceptance_check(recipient, token_id, value, array![].span());
            self.latest_token_id.write(token_id + 1);
        }
    }
}
