use ark_common::crypto::typed_data::Message;

// Mock
#[derive(Serde, Copy, Drop)]
struct Order {
    orderHash: felt252,
}

const ORDER_TYPE_HASH: felt252 =
    0x3EF396E5982605BABE3F82B27D4CFA1C1B3B01EC94DCC6B30BB47AD9C3CA277;

impl OrderMessage of Message<Order> {
    #[inline(always)]
    fn compute_hash(self: @Order) -> felt252 {
        let mut hash = pedersen::pedersen(0, ORDER_TYPE_HASH);
        hash = pedersen::pedersen(hash, *self.orderHash);
        pedersen::pedersen(hash, 2)
    }
}