use starknet::ContractAddress;

#[starknet::interface]
trait IFreeMint<T> {
    fn mint(ref self: T, recipient: ContractAddress, value: u256) -> u256;
    fn get_current_token_id(self: @T) -> felt252;
}

#[starknet::contract]
mod FreeMintERC1155 {
    use openzeppelin::introspection::src5::SRC5Component;
    use openzeppelin::token::erc1155::ERC1155Component;
    use openzeppelin::token::erc1155::ERC1155HooksEmptyImpl;
    use openzeppelin::token::erc1155::ERC1155ReceiverComponent;
    use starknet::ContractAddress;
    use super::IFreeMint;

    component!(path: ERC1155Component, storage: erc1155, event: ERC1155Event);
    component!(
        path: ERC1155ReceiverComponent, storage: erc1155_receiver, event: ERC1155ReceiverEvent
    );
    component!(path: SRC5Component, storage: src5, event: SRC5Event);

    // Externals
    #[abi(embed_v0)]
    impl ERC1155Impl = ERC1155Component::ERC1155Impl<ContractState>;
    #[abi(embed_v0)]
    impl ERC1155ReceiverImpl =
        ERC1155ReceiverComponent::ERC1155ReceiverImpl<ContractState>;
    #[abi(embed_v0)]
    impl SRC5Impl = SRC5Component::SRC5Impl<ContractState>;

    // Internal impl
    impl ERC1155InternalImpl = ERC1155Component::InternalImpl<ContractState>;
    impl ERC1155ReceiverInternalImpl = ERC1155ReceiverComponent::InternalImpl<ContractState>;


    #[storage]
    struct Storage {
        #[substorage(v0)]
        erc1155: ERC1155Component::Storage,
        #[substorage(v0)]
        erc1155_receiver: ERC1155ReceiverComponent::Storage,
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
        ERC1155ReceiverEvent: ERC1155ReceiverComponent::Event,
        #[flat]
        SRC5Event: SRC5Component::Event
    }

    #[constructor]
    fn constructor(ref self: ContractState, base_uri: ByteArray) {
        self.erc1155.initializer(base_uri);
        self.erc1155_receiver.initializer();
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
            self.erc1155.mint_with_acceptance_check(to, token_id, value, array![].span());
        }
    }
}
