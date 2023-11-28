#[starknet::contract]
mod arktoken {
    use openzeppelin::token::erc721::ERC721Component;
    use starknet::ContractAddress;
    use openzeppelin::token::erc721::interface::IERC721;

    component!(path: ERC721Component, storage: erc721, event: ERC721Event);

    #[abi(embed_v0)]
    impl ERC721Impl = ERC721Component::ERC721Impl<ContractState>;

    impl ERC721InternalImpl = ERC721Component::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        erc721: ERC721Component::Storage
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        ERC721Event: ERC721Component::Event
    }

    #[constructor]
    fn constructor(ref self: ContractState, recipient: ContractAddress) {
        let name = 'ArkToken';
        let symbol = 'ARKT';

        self.erc721.initializer(name, symbol);
    //self.erc721._mint(recipient, 0);
    }
}
