use starknet::ContractAddress;

#[starknet::interface]
trait IFreeMint<T> {
    fn mint(ref self: T, recipient: ContractAddress, token_uri: felt252);
    fn get_current_token_id(self: @T) -> felt252;
}

#[starknet::contract]
mod FreeMintNFTRoyalty {
    use openzeppelin::introspection::src5::SRC5Component;
    use openzeppelin::token::erc721::ERC721Component;
    use starknet::ContractAddress;
    use core::traits::Into;
    use core::serde::Serde;
    use core::traits::TryInto;
    use super::IFreeMint;
    use core::array::ArrayTrait;

    use ark_common::oz::erc2981::{IERC2981_ID, IERC2981};

    component!(path: ERC721Component, storage: erc721, event: ERC721Event);
    component!(path: SRC5Component, storage: src5, event: SRC5Event);

    // ERC721 Mixin
    #[abi(embed_v0)]
    impl ERC721MixinImpl = ERC721Component::ERC721MixinImpl<ContractState>;
    impl ERC721InternalImpl = ERC721Component::InternalImpl<ContractState>;
    impl ERC721MetadataImpl = ERC721Component::ERC721MetadataImpl<ContractState>;
    impl ERC721CamelOnly = ERC721Component::ERC721CamelOnlyImpl<ContractState>;
    impl ERC721MetadataCamelOnly = ERC721Component::ERC721MetadataCamelOnlyImpl<ContractState>;
    impl SRC5Impl = SRC5Component::SRC5Impl<ContractState>;
    impl InternalImpl = SRC5Component::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        erc721: ERC721Component::Storage,
        #[substorage(v0)]
        src5: SRC5Component::Storage,
        latest_token_id: u256,
        creator: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        ERC721Event: ERC721Component::Event,
        #[flat]
        SRC5Event: SRC5Component::Event,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        name: core::byte_array::ByteArray,
        symbol: core::byte_array::ByteArray,
        base_uri: core::byte_array::ByteArray,
        creator: ContractAddress,
    ) {
        self.erc721.initializer(name, symbol, base_uri);
        self.src5.register_interface(IERC2981_ID);
        self.latest_token_id.write(0);
        self.creator.write(creator);
    }

    #[abi(embed_v0)]
    impl ImplFreeMint of IFreeMint<ContractState> {
        fn get_current_token_id(self: @ContractState) -> felt252 {
            self.latest_token_id.read().try_into().unwrap()
        }

        fn mint(ref self: ContractState, recipient: ContractAddress, token_uri: felt252) {
            let token_id = self.latest_token_id.read();
            self.erc721._mint(recipient, token_id);
            self.latest_token_id.write(token_id + 1);
        }
    }

    #[abi(embed_v0)]
    impl ImplERC2981 of IERC2981<ContractState> {
        fn royalty_info(
            self: @ContractState, token_id: u256, sale_price: u256
        ) -> (ContractAddress, u256) {
            // same fees for every token
            let num = 2;
            let denom = 100;
            let fees_amount = (sale_price * num) / denom;
            (self.creator.read(), fees_amount)
        }
    }
}
