use starknet::ContractAddress;

#[starknet::interface]
trait IFreeMint<T> {
    fn mint(ref self: T, recipient: ContractAddress, token_uri: felt252);
    fn get_current_token_id(self: @T) -> felt252;
}

#[starknet::contract]
mod FreeMintNFTRoyalty {
    use ark_oz::erc2981::ERC2981Component;
    use ark_oz::erc2981::FeesRatioDefault;
    use core::array::ArrayTrait;
    use core::serde::Serde;
    use core::traits::Into;
    use core::traits::TryInto;
    use openzeppelin::access::ownable::OwnableComponent;

    use openzeppelin::introspection::src5::SRC5Component;
    use openzeppelin::token::erc721::ERC721Component;
    use openzeppelin::token::erc721::ERC721HooksEmptyImpl;
    use openzeppelin::access::ownable::OwnableComponent;

    use ark_oz::erc2981::ERC2981Component;
    use ark_oz::erc2981::FeesRatioDefault;

    use super::IFreeMint;

    component!(path: ERC721Component, storage: erc721, event: ERC721Event);
    component!(path: ERC2981Component, storage: erc2981, event: ERC2981Event);
    component!(path: SRC5Component, storage: src5, event: SRC5Event);
    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);

    #[storage]
    struct Storage {
        #[substorage(v0)]
        erc721: ERC721Component::Storage,
        #[substorage(v0)]
        erc2981: ERC2981Component::Storage,
        #[substorage(v0)]
        src5: SRC5Component::Storage,
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
        latest_token_id: u256,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        ERC721Event: ERC721Component::Event,
        #[flat]
        ERC2981Event: ERC2981Component::Event,
        #[flat]
        SRC5Event: SRC5Component::Event,
        #[flat]
        OwnableEvent: OwnableComponent::Event,
    }

    // ERC721 Mixin
    #[abi(embed_v0)]
    impl ERC721MixinImpl = ERC721Component::ERC721MixinImpl<ContractState>;
    impl ERC721InternalImpl = ERC721Component::InternalImpl<ContractState>;

    #[abi(embed_v0)]
    impl ERC2981 = ERC2981Component::ERC2981Impl<ContractState>;
    impl ERC2981InternalImpl = ERC2981Component::InternalImpl<ContractState>;

    #[abi(embed_v0)]
    impl ERC2981Setup = ERC2981Component::ERC2981SetupImpl<ContractState>;

    #[abi(embed_v0)]
    impl OwnableMixin = OwnableComponent::OwnableMixinImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;


    #[constructor]
    fn constructor(
        ref self: ContractState,
        name: core::byte_array::ByteArray,
        symbol: core::byte_array::ByteArray,
        base_uri: core::byte_array::ByteArray,
        owner: ContractAddress,
    ) {
        self.erc721.initializer(name, symbol, base_uri);
        self.erc2981.initializer(owner, Default::default());
        self.ownable.initializer(owner);
        self.latest_token_id.write(0);
    }

    #[abi(embed_v0)]
    impl ImplFreeMint of IFreeMint<ContractState> {
        fn get_current_token_id(self: @ContractState) -> felt252 {
            self.latest_token_id.read().try_into().unwrap()
        }

        fn mint(ref self: ContractState, recipient: ContractAddress, token_uri: felt252) {
            let token_id = self.latest_token_id.read();
            self.erc721.mint(recipient, token_id);
            self.latest_token_id.write(token_id + 1);
        }
    }
}
