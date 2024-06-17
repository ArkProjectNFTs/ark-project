#[derive(Serde, Drop, PartialEq, Copy, Debug, starknet::Store)]
struct FeesRatio {
    numerator: u256,
    denominator: u256,
}


impl FeesRatioDefault of Default<FeesRatio> {
    fn default() -> FeesRatio {
        FeesRatio { numerator: 0, denominator: 1, }
    }
}
