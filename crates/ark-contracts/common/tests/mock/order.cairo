use ark_common::crypto::typed_data::Message;

// Mock
#[derive(Serde, Copy, Drop)]
struct Order {
    order_hash: felt252,
}

const ORDER_TYPE_HASH: felt252 =
    0x228E77DF26991D8080A98C30BD722382C9A4EDB7F650C2FB62941186934573F;

impl OrderMessage of Message<Order> {
    #[inline(always)]
    fn compute_hash(self: @Order) -> felt252 {
        let mut hash = pedersen::pedersen(0, ORDER_TYPE_HASH);
        hash = pedersen::pedersen(hash, *self.order_hash);
        pedersen::pedersen(hash, 2)
    }
}
