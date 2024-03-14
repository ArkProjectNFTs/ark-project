#[starknet::contract]
mod ark_router {
    use ark_starknet::route_types::SwapInfos;
    use ark_starknet::interfaces::{Irouter, IUpgradable};
    use starknet::{ContractAddress, ClassHash};
    use openzeppelin::token::{
        erc721::interface::{IERC721, IERC721Dispatcher, IERC721DispatcherTrait},
        erc20::interface::{IERC20, IERC20Dispatcher, IERC20DispatcherTrait}
    };

    #[storage]
    struct Storage {
        admin_address: ContractAddress
    }
    
    #[constructor]
    fn constructor(
        ref self: ContractState,
        admin_address: ContractAddress,
    ) {
        self.admin_address.write(admin_address);
    }

    #[external(v0)]
    impl ExecutorImpl of Irouter<ContractState> {
        fn execute_swap(ref self: ContractState, swap_info: SwapInfos) {
            let nft_contract = IERC721Dispatcher { contract_address: swap_info.nft_address };
            nft_contract
                .transfer_from(
                    swap_info.nft_from, swap_info.nft_to, swap_info.nft_token_id
                );
        }
    }

    #[external(v0)]
    impl ExecutorUpgradeImpl of IUpgradable<ContractState> {
        fn upgrade(ref self: ContractState, class_hash: ClassHash) {
            assert(
                starknet::get_caller_address() == self.admin_address.read(),
                'Unauthorized replace class'
            );

            match starknet::replace_class_syscall(class_hash) {
                Result::Ok(_) => (), // emit event
                Result::Err(revert_reason) => panic(revert_reason),
            };
        }
    }
}
