#[starknet::contract]
mod MockERC2981 {
    use starknet::ContractAddress;

    use openzeppelin::introspection::src5::SRC5Component;
    use openzeppelin::access::ownable::OwnableComponent;

    use ark_common::oz::erc2981::ERC2981Component;
    use ark_common::oz::erc2981::interface::FeesRatio;

    component!(path: ERC2981Component, storage: erc2981, event: ERC2981Event);
    component!(path: SRC5Component, storage: src5, event: SRC5Event);
    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);

    #[storage]
    struct Storage {
        #[substorage(v0)]
        erc2981: ERC2981Component::Storage,
        #[substorage(v0)]
        src5: SRC5Component::Storage,
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        ERC2981Event: ERC2981Component::Event,
        #[flat]
        SRC5Event: SRC5Component::Event,
        #[flat]
        OwnableEvent: OwnableComponent::Event,
    }

    // SRC5
    #[abi(embed_v0)]
    impl SRC5Impl = SRC5Component::SRC5Impl<ContractState>;

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
        owner: ContractAddress,
        default_receiver: ContractAddress,
        default_fees: FeesRatio
    ) {
        self.ownable.initializer(owner);
        self.erc2981.initializer(default_receiver, default_fees);
    }
}
