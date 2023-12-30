#[cfg(test)]
mod tests {
    use snforge_std::{declare, deploy, PreparedContract};

    #[test]
    fn test_execute_buy_order() {
        let class_hash = declare('executor');

        let prepared = PreparedContract {
            class_hash: class_hash, constructor_calldata: @array![0x0, 0x0]
        };
        let contract_address = deploy(prepared);
    }
}
