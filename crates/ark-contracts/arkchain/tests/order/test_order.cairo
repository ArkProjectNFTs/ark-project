use arkchain::order::order::OrderStatus;

#[test]
fn order_enum_into_felt252() {
    let s = OrderStatus::Open;
    let felt: felt252 = s.into();

    assert(felt == 'OPEN', 'bad status');
}
