pub mod interface {
    use starknet::ContractAddress;

    // TODO: compute interface ID
    const IERC2981_ID: felt252 = 0x020c8d7f792d748c72d5a4bd64e1d352ef0a9f32a2cb0f281fe929c2c127ded4;

    #[starknet::interface]
    trait IERC2981<TState> {
        fn royalty_info(self: @TState, token_id: u256, sale_price: u256) -> (ContractAddress, u256);
    }

    #[derive(Serde, Drop, PartialEq, Copy, Debug, starknet::Store)]
    struct FeesRatio {
        numerator: u256,
        denominator: u256,
    }

    trait IFees<T> {
        fn compute_amount(self: T, sale_price: u256) -> u256;
    }

    #[starknet::interface]
    trait IERC2981Setup<TState> {
        fn default_royalty(self: @TState) -> (ContractAddress, FeesRatio);
        fn set_default_royalty(ref self: TState, receiver: ContractAddress, fees_ratio: FeesRatio);

        fn token_royalty(self: @TState, token_id: u256) -> (ContractAddress, FeesRatio);
        fn set_token_royalty(
            ref self: TState, token_id: u256, receiver: ContractAddress, fees_ratio: FeesRatio
        );
    }
}

#[starknet::component]
pub mod ERC2981Component {
    use starknet::ContractAddress;
    use openzeppelin::introspection::src5::SRC5Component::InternalTrait as SRC5InternalTrait;
    use openzeppelin::introspection::src5::SRC5Component::SRC5Impl;
    use openzeppelin::introspection::src5::SRC5Component;

    use openzeppelin::access::ownable::OwnableComponent::InternalTrait as OwnableInternalTrait;
    use openzeppelin::access::ownable::OwnableComponent;

    use super::interface::FeesRatio;
    use super::fees::{FeesImpl, FeesRatioDefault};

    #[storage]
    struct Storage {
        default_receiver: ContractAddress,
        default_fees: FeesRatio,
        token_receiver: LegacyMap<u256, ContractAddress>,
        token_fees: LegacyMap<u256, FeesRatio>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        TokenRoyaltyUpdated: TokenRoyaltyUpdated,
        DefaultRoyaltyUpdated: DefaultRoyaltyUpdated,
    }

    #[derive(Drop, starknet::Event)]
    struct TokenRoyaltyUpdated {
        #[key]
        token_id: u256,
        fees_ratio: FeesRatio,
        receiver: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct DefaultRoyaltyUpdated {
        fees_ratio: FeesRatio,
        receiver: ContractAddress,
    }

    #[embeddable_as(ERC2981Impl)]
    impl ERC2981<
        TContractState, +HasComponent<TContractState>
    > of super::interface::IERC2981<ComponentState<TContractState>> {
        fn royalty_info(
            self: @ComponentState<TContractState>, token_id: u256, sale_price: u256
        ) -> (ContractAddress, u256) {
            let receiver = self.token_receiver.read(token_id);
            if !receiver.is_zero() {
                let fees_ratio = self.token_fees.read(token_id);
                (receiver, fees_ratio.compute_amount(sale_price))
            } else {
                let fees_ratio = self.default_fees.read();
                (self.default_receiver.read(), fees_ratio.compute_amount(sale_price))
            }
        }
    }

    #[embeddable_as(ERC2981SetupImpl)]
    impl ERC2981Setup<
        TContractState,
        +HasComponent<TContractState>,
        impl Ownable: OwnableComponent::HasComponent<TContractState>,
    > of super::interface::IERC2981Setup<ComponentState<TContractState>> {
        fn default_royalty(self: @ComponentState<TContractState>) -> (ContractAddress, FeesRatio) {
            (self.default_receiver.read(), self.default_fees.read())
        }

        fn set_default_royalty(
            ref self: ComponentState<TContractState>,
            receiver: ContractAddress,
            fees_ratio: FeesRatio
        ) {
            let ownable_component = get_dep_component!(@self, Ownable);
            ownable_component.assert_only_owner();

            self.default_receiver.write(receiver);
            let new_fees_ratio = if fees_ratio.denominator.is_zero() {
                Default::default()
            } else {
                fees_ratio
            };

            self.default_fees.write(new_fees_ratio);
            self.emit(DefaultRoyaltyUpdated { fees_ratio: new_fees_ratio, receiver: receiver, });
        }

        fn token_royalty(
            self: @ComponentState<TContractState>, token_id: u256
        ) -> (ContractAddress, FeesRatio) {
            let fees_ratio: FeesRatio = self.token_fees.read(token_id);
            if !fees_ratio.denominator.is_zero() {
                (self.token_receiver.read(token_id), fees_ratio)
            } else {
                (self.token_receiver.read(token_id), Default::default())
            }
        }

        fn set_token_royalty(
            ref self: ComponentState<TContractState>,
            token_id: u256,
            receiver: ContractAddress,
            fees_ratio: FeesRatio
        ) {
            let ownable_component = get_dep_component!(@self, Ownable);
            ownable_component.assert_only_owner();

            self.token_receiver.write(token_id, receiver);
            let new_fees_ratio = if fees_ratio.denominator.is_zero() {
                Default::default()
            } else {
                fees_ratio
            };

            self.token_fees.write(token_id, new_fees_ratio);
            self
                .emit(
                    TokenRoyaltyUpdated {
                        token_id: token_id, fees_ratio: new_fees_ratio, receiver: receiver,
                    }
                );
        }
    }

    //
    // Internal
    //

    #[generate_trait]
    pub impl InternalImpl<
        TContractState,
        +HasComponent<TContractState>,
        impl SRC5: SRC5Component::HasComponent<TContractState>,
        +Drop<TContractState>
    > of InternalTrait<TContractState> {
        fn initializer(
            ref self: ComponentState<TContractState>,
            default_receiver: ContractAddress,
            default_fees: FeesRatio
        ) {
            let mut src5_component = get_dep_component_mut!(ref self, SRC5);
            src5_component.register_interface(super::interface::IERC2981_ID);

            self.default_receiver.write(default_receiver);
            self.default_fees.write(default_fees);
        }
    }
}


pub mod fees {
    use super::interface::{IFees, FeesRatio};

    impl FeesRatioDefault of Default<FeesRatio> {
        fn default() -> FeesRatio {
            FeesRatio { numerator: 0, denominator: 1, }
        }
    }

    impl FeesImpl of IFees<FeesRatio> {
        fn compute_amount(self: FeesRatio, sale_price: u256) -> u256 {
            (sale_price * self.numerator) / self.denominator
        }
    }
}
