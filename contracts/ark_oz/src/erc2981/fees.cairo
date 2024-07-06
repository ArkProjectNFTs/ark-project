#[derive(Serde, Drop, PartialEq, Copy, Debug, starknet::Store)]
pub struct FeesRatio {
    numerator: u256,
    denominator: u256,
}

pub trait IFees<T> {
    fn compute_amount(self: T, sale_price: u256) -> u256;
}


pub impl FeesRatioDefault of Default<FeesRatio> {
    fn default() -> FeesRatio {
        FeesRatio { numerator: 0, denominator: 1, }
    }
}

pub impl FeesImpl of IFees<FeesRatio> {
    fn compute_amount(self: FeesRatio, sale_price: u256) -> u256 {
        (sale_price * self.numerator) / self.denominator
    }
}
