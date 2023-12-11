use traits::Into;
use box::BoxTrait;
use snforge_std::PrintTrait;
use super::constants;

const ORDER_TYPE_HASH: felt252 = 0x228E77DF26991D8080A98C30BD722382C9A4EDB7F650C2FB62941186934573F;

#[derive(Serde, Copy, Drop)]
struct Domain {
    name: felt252,
    version: felt252,
}

fn DOMAIN() -> Domain {
    Domain { name: 'Ark', version: '1.1', }
}

#[derive(Serde, Copy, Drop)]
struct OrderSign {
    order_hash: felt252,
}

trait Message<T> {
    fn compute_hash(self: @T) -> felt252;
}

impl OrderMessage of Message<OrderSign> {
    #[inline(always)]
    fn compute_hash(self: @OrderSign) -> felt252 {
        let mut hash = pedersen::pedersen(0, ORDER_TYPE_HASH);
        hash = pedersen::pedersen(hash, *self.order_hash);
        pedersen::pedersen(hash, 2)
    }
}

trait TypedDataTrait<T> {
    fn compute_hash_from(self: @T, from: starknet::ContractAddress) -> felt252;
}

impl TypedDataImpl<T, impl TMessage: Message<T>> of TypedDataTrait<T> {
    #[inline(always)]
    fn compute_hash_from(self: @T, from: starknet::ContractAddress) -> felt252 {
        let prefix = constants::STARKNET_MESSAGE_PREFIX;
        let domain_hash = hash_domain(chain_id: 'SN_MAIN', domain: DOMAIN());
        let account = from.into();
        let message_hash = self.compute_hash();

        let mut hash = pedersen::pedersen(0, prefix);
        hash = pedersen::pedersen(hash, domain_hash);
        hash = pedersen::pedersen(hash, account);
        hash = pedersen::pedersen(hash, message_hash);

        pedersen::pedersen(hash, 4)
    }
}

fn hash_domain(chain_id: felt252, domain: Domain) -> felt252 {
    let mut hash = pedersen::pedersen(0, constants::STARKNET_DOMAIN_TYPE_HASH);
    hash = pedersen::pedersen(hash, domain.name);
    hash = pedersen::pedersen(hash, chain_id);
    hash = pedersen::pedersen(hash, domain.version);

    pedersen::pedersen(hash, 4)
}
