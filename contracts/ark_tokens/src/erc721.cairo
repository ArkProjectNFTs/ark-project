use starknet::ContractAddress;

#[starknet::interface]
trait IFreeMint<T> {
    fn mint(ref self: T, recipient: ContractAddress, token_uri: felt252);
    fn get_current_token_id(self: @T) -> felt252;
}

#[starknet::contract]
mod FreeMintNFT {
    use openzeppelin::token::erc721::interface::IERC721Metadata;
    use core::traits::Into;
    use core::serde::Serde;
    use core::traits::TryInto;
    use super::IFreeMint;
    use core::array::ArrayTrait;
    use openzeppelin::introspection::src5::SRC5Component;
    use openzeppelin::token::erc721::ERC721Component;
    use starknet::ContractAddress;

    component!(path: ERC721Component, storage: erc721, event: ERC721Event);
    component!(path: SRC5Component, storage: src5, event: SRC5Event);

    // ERC721
    #[abi(embed_v0)]
    impl ERC721Impl = ERC721Component::ERC721Impl<ContractState>;
    #[abi(embed_v0)]
    impl ERC721MetadataImpl = ERC721Component::ERC721MetadataImpl<ContractState>;
    #[abi(embed_v0)]
    impl ERC721CamelOnly = ERC721Component::ERC721CamelOnlyImpl<ContractState>;
    #[abi(embed_v0)]
    impl ERC721MetadataCamelOnly =
        ERC721Component::ERC721MetadataCamelOnlyImpl<ContractState>;
    impl ERC721InternalImpl = ERC721Component::InternalImpl<ContractState>;

    // SRC5
    #[abi(embed_v0)]
    impl SRC5Impl = SRC5Component::SRC5Impl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        erc721: ERC721Component::Storage,
        #[substorage(v0)]
        src5: SRC5Component::Storage,
        latest_token_id: u256
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        ERC721Event: ERC721Component::Event,
        #[flat]
        SRC5Event: SRC5Component::Event
    }

    #[constructor]
    fn constructor(ref self: ContractState, name: felt252, symbol: felt252) {
        self.erc721.initializer(name, symbol);
        self.latest_token_id.write(0);
    }

    #[external(v0)]
    impl ImplFreeMint of IFreeMint<ContractState> {
        fn get_current_token_id(self: @ContractState) -> felt252 {
            self.latest_token_id.read().try_into().unwrap()
        }

        fn mint(ref self: ContractState, recipient: ContractAddress, token_uri: felt252) {
            let token_id = self.latest_token_id.read();
            self.erc721._mint(recipient, token_id);
            self.latest_token_id.write(token_id + 1);
            self.erc721._set_token_uri(token_id, token_uri);
        }
    }
}
