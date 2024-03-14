use starknet::ContractAddress;

#[derive(Drop, Serde, Copy)]
struct SwapInfos {
    nft_address: ContractAddress,
    nft_from: ContractAddress,
    nft_to: ContractAddress,
    nft_token_id: u256,
}