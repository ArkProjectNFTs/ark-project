use starknet::ContractAddress;

// TODO: compute interface ID
const IERC2981_ID: felt252 = 0x020c8d7f792d748c72d5a4bd64e1d352ef0a9f32a2cb0f281fe929c2c127ded4;

#[starknet::interface]
trait IERC2981<T> {
    fn royalty_info(self: @T, token_id: u256, sale_price: u256) -> (ContractAddress, u256);
}
