use starknet::ContractAddress;

use ark_oz::erc2981::FeesRatio;


// TODO: compute interface ID
const IERC2981_ID: felt252 = 0x020c8d7f792d748c72d5a4bd64e1d352ef0a9f32a2cb0f281fe929c2c127ded4;

#[starknet::interface]
pub trait IERC2981<TState> {
    fn royalty_info(self: @TState, token_id: u256, sale_price: u256) -> (ContractAddress, u256);
}


#[starknet::interface]
pub trait IERC2981Setup<TState> {
    fn default_royalty(self: @TState) -> (ContractAddress, FeesRatio);
    fn set_default_royalty(ref self: TState, receiver: ContractAddress, fees_ratio: FeesRatio);

    fn token_royalty(self: @TState, token_id: u256) -> (ContractAddress, FeesRatio);
    fn set_token_royalty(
        ref self: TState, token_id: u256, receiver: ContractAddress, fees_ratio: FeesRatio
    );
}
