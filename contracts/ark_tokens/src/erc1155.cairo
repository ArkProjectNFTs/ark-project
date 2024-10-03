use starknet::ContractAddress;

#[starknet::interface]
trait IFreeMint<T> {
    fn mint(ref self: T, recipient: ContractAddress, value: u256) -> u256;
    fn get_current_token_id(self: @T) -> felt252;
}

#[starknet::contract]
mod FreeMintERC1155 {
    use ark_tokens::components::erc1155::ERC1155Component;
    use openzeppelin::introspection::src5::SRC5Component;
    use starknet::ContractAddress;
    use super::IFreeMint;

    component!(path: ERC1155Component, storage: erc1155, event: ERC1155Event);
    component!(path: SRC5Component, storage: src5, event: SRC5Event);

    #[abi(embed_v0)]
    impl ERC1155Impl = ERC1155Component::ERC1155Impl<ContractState>;
    // impl ERC1155MetadataURIImpl = ERC1155Component::ERC1155MetadataURIImpl<ContractState>;
    // impl ERC1155CamelImpl = ERC1155Component::ERC1155CamelImpl<ContractState>;
    #[abi(embed_v0)]
    impl SRC5Impl = SRC5Component::SRC5Impl<ContractState>;

    impl ERC1155InternalImpl = ERC1155Component::InternalImpl<ContractState>;

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
    fn constructor(ref self: ContractState, base_uri: ByteArray) {
        self.erc1155.initializer(base_uri);
        self.latest_token_id.write(1);
    }

    #[abi(embed_v0)]
    impl ImplFreeMint of IFreeMint<ContractState> {
        fn get_current_token_id(self: @ContractState) -> felt252 {
            self.latest_token_id.read().try_into().unwrap()
        }

        fn mint(ref self: ContractState, recipient: ContractAddress, value: u256) -> u256 {
            let token_id = self.latest_token_id.read();
            self._mint(recipient, token_id, value);
            self.latest_token_id.write(token_id + 1);
            token_id
        }
    }


    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _mint(ref self: ContractState, to: ContractAddress, token_id: u256, value: u256) {
            self.erc1155.mint(to, token_id, value);
        }
    }
}
