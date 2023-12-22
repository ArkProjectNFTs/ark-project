const STARKNET_MESSAGE_PREFIX: felt252 = 'StarkNet Message';

// sn_keccak('StarkNetDomain(name:felt252,chainId:felt252,version:felt252)')
const STARKNET_DOMAIN_TYPE_HASH: felt252 = 0x38938178ebdf241a3764698e540ead3e19ed2fb6120e27429961a2378e8b51;

// sn_keccak('u256(low:felt252,high:felt252)')
const U256_TYPE_HASH: felt252 = 0x1094260a770342332e6a73e9256b901d484a438925316205b4b6ff25df4a97a;